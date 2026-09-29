import { fromByteArray } from 'react-native-quick-base64';
import QuickCrypto from 'react-native-quick-crypto';

import { secureStorage } from './secure-store';

/**
 * The device's own SSH identity.
 *
 * Generated once and kept for the life of the install — every launch reuses
 * it rather than minting a new key per instance, so it only has to be
 * registered with vast.ai (`registerSshKey`) the first time.
 */

const PRIVATE_KEY_KEY = 'cp-ssh-private-key';
const PUBLIC_KEY_KEY = 'cp-ssh-public-key';
const REGISTERED_KEY = 'cp-ssh-key-registered';

export interface SshKeyPair {
  /** PKCS1 PEM — what the SSH client library expects for `connectWithKey`. */
  privateKeyPem: string;
  /** OpenSSH wire format ("ssh-rsa AAAA... comfy-portal") — what vast's API expects. */
  publicKeyOpenSsh: string;
}

/** Reads one DER TLV at `offset`, checking the tag. Only handles definite-form
 *  lengths — everything OpenSSL emits for a key this size. */
function readDerTlv(bytes: Uint8Array, offset: number, expectedTag: number): { start: number; end: number } {
  if (bytes[offset] !== expectedTag) {
    throw new Error(`Expected DER tag 0x${expectedTag.toString(16)} at offset ${offset}`);
  }
  const first = bytes[offset + 1]!;
  let length: number;
  let start: number;
  if ((first & 0x80) === 0) {
    length = first;
    start = offset + 2;
  } else {
    const lengthBytes = first & 0x7f;
    length = 0;
    for (let i = 0; i < lengthBytes; i++) length = (length << 8) | bytes[offset + 2 + i]!;
    start = offset + 2 + lengthBytes;
  }
  return { start, end: start + length };
}

/**
 * Pulls modulus and exponent out of a DER-encoded SPKI RSA public key
 * (RFC 5280 §4.1 / RFC 8017 appx A.1.1). QuickCrypto's `generateKeyPairSync`
 * doesn't actually implement JWK output for RSA despite the type signature
 * claiming it does — it silently falls back to raw PKCS1 DER instead — so
 * this is the only way to get n/e out of what it gives us.
 *
 * DER's INTEGER already prepends a 0x00 whenever the high bit would otherwise
 * make a positive number look negative — the exact rule SSH's mpint format
 * uses — so these bytes drop straight into the wire format with no reframing.
 */
function parseSpkiRsaPublicKey(der: Uint8Array): { n: Uint8Array; e: Uint8Array } {
  const outer = readDerTlv(der, 0, 0x30); // SubjectPublicKeyInfo SEQUENCE
  const algorithm = readDerTlv(der, outer.start, 0x30); // AlgorithmIdentifier SEQUENCE
  const bitString = readDerTlv(der, algorithm.end, 0x03); // subjectPublicKey BIT STRING
  const rsaPublicKey = readDerTlv(der, bitString.start + 1, 0x30); // skip the "unused bits" byte
  const modulus = readDerTlv(der, rsaPublicKey.start, 0x02); // INTEGER n
  const exponent = readDerTlv(der, modulus.end, 0x02); // INTEGER e
  return { n: der.slice(modulus.start, modulus.end), e: der.slice(exponent.start, exponent.end) };
}

function asciiBytes(value: string): Uint8Array {
  const out = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) out[i] = value.charCodeAt(i);
  return out;
}

function sshString(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + bytes.length);
  new DataView(out.buffer).setUint32(0, bytes.length, false);
  out.set(bytes, 4);
  return out;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Builds the OpenSSH wire format (RFC 4253 §6.6) from raw modulus/exponent. */
function toOpenSshRsaPublicKey(n: Uint8Array, e: Uint8Array): string {
  const blob = concatBytes([sshString(asciiBytes('ssh-rsa')), sshString(e), sshString(n)]);
  return `ssh-rsa ${fromByteArray(blob, false)} comfy-portal`;
}

/** Generates and stores the keypair on first call; every call after that
 *  reads it back from the keychain. */
export async function ensureSshKeyPair(): Promise<SshKeyPair> {
  const [privateKeyPem, publicKeyOpenSsh] = await Promise.all([
    secureStorage.getItem(PRIVATE_KEY_KEY),
    secureStorage.getItem(PUBLIC_KEY_KEY),
  ]);
  if (privateKeyPem && publicKeyOpenSsh) return { privateKeyPem, publicKeyOpenSsh };

  const generated = QuickCrypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  }) as unknown as { privateKey: string; publicKey: ArrayBuffer };

  const { n, e } = parseSpkiRsaPublicKey(new Uint8Array(generated.publicKey));
  const pair: SshKeyPair = {
    privateKeyPem: generated.privateKey,
    publicKeyOpenSsh: toOpenSshRsaPublicKey(n, e),
  };

  await Promise.all([
    secureStorage.setItem(PRIVATE_KEY_KEY, pair.privateKeyPem),
    secureStorage.setItem(PUBLIC_KEY_KEY, pair.publicKeyOpenSsh),
  ]);
  return pair;
}

/**
 * vast only pushes an account's registered keys into `authorized_keys` at
 * instance-creation time — adding one after the fact does not reach an
 * already-running instance. So this must be checked (and satisfied) before
 * every `createInstance` call, not lazily on first SSH attempt.
 */
export async function isSshKeyRegistered(accountHash: string): Promise<boolean> {
  return (await secureStorage.getItem(REGISTERED_KEY + '-' + accountHash)) === '1';
}

export async function markSshKeyRegistered(accountHash: string): Promise<void> {
  await secureStorage.setItem(REGISTERED_KEY + '-' + accountHash, '1');
}
