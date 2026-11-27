import { Buffer } from 'buffer';

export interface PreviewFrame {
  uri: string;
  promptId?: string;
}

// ComfyUI sends big-endian event IDs. Type 1 has a four-byte image
// format; type 4 has a four-byte JSON length followed by UTF-8 metadata.
export function decodePreviewFrame(data: ArrayBuffer | ArrayBufferView): PreviewFrame | null {
  if (data.byteLength <= 8 || data.byteLength > 16 * 1024 * 1024) return null;
  const raw = data instanceof ArrayBuffer
    ? new Uint8Array(data)
    : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const event = view.getUint32(0);
  const header = view.getUint32(4);
  let offset = 8;
  let mime: string;
  let promptId: string | undefined;

  if (event === 1) {
    if (header !== 1 && header !== 2) return null;
    mime = header === 2 ? 'image/png' : 'image/jpeg';
  } else if (event === 4) {
    if (header > 65536 || header >= data.byteLength - 8) return null;
    try {
      const metadata = JSON.parse(Buffer.from(raw.subarray(8, 8 + header)).toString('utf8'));
      if (metadata.image_type !== 'image/jpeg' && metadata.image_type !== 'image/png') return null;
      mime = metadata.image_type;
      if (typeof metadata.prompt_id === 'string' && metadata.prompt_id) {
        promptId = metadata.prompt_id;
      }
      offset += header;
    } catch {
      return null;
    }
  } else {
    return null;
  }

  const bytes = raw.subarray(offset);
  if (mime === 'image/jpeg') {
    if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null;
  } else {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (bytes.length < signature.length || !signature.every((b, i) => bytes[i] === b)) return null;
  }
  return { uri: 'data:' + mime + ';base64,' + Buffer.from(bytes).toString('base64'), promptId };
}
