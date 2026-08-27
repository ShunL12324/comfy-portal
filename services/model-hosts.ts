/**
 * Key checks for the two model hosts.
 *
 * Kept out of services/vast.ts because these aren't about renting hardware —
 * they're the credentials the instance uses to fetch gated models. Both are
 * cheap authenticated GETs, so "test" costs nothing.
 */

/** Verifies a Civitai API key. */
export async function verifyCivitaiKey(apiKey: string): Promise<{ username?: string }> {
  // /api/v1/me, not /api/v1/models — the models endpoint is public and answers
  // 200 for any key at all, so it can't tell a valid one from a typo.
  const response = await fetch('https://civitai.com/api/v1/me', {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(
      response.status === 401 ? 'Civitai rejected the key' : `Civitai returned ${response.status}`,
    );
  }
  const data = await response.json();
  return { username: data?.username };
}

/** Verifies a HuggingFace token and reports what it's allowed to do. */
export async function verifyHuggingFaceToken(
  token: string,
): Promise<{ name?: string; role?: string }> {
  const response = await fetch('https://huggingface.co/api/whoami-v2', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? 'HuggingFace rejected the token'
        : `HuggingFace returned ${response.status}`,
    );
  }
  const data = await response.json();
  return { name: data?.name, role: data?.auth?.accessToken?.role };
}
