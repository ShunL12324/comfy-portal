/**
 * Turns whatever a user pastes into something an instance can actually
 * download.
 *
 * People copy the address bar, which is a web page. aria2 needs a direct file
 * URL. Resolving that at edit time — rather than discovering it when a launch
 * fails twenty minutes in, after the GPU has been billing the whole while — is
 * the entire point of this module.
 */

/** ComfyUI's model directories. The value is the folder under `models/`. */
export const MODEL_TYPES = [
  'checkpoints',
  'loras',
  'vae',
  'text_encoders',
  'diffusion_models',
  'clip_vision',
  'controlnet',
  'upscale_models',
  'embeddings',
] as const;

export type ModelType = (typeof MODEL_TYPES)[number] | (string & {});

export interface ResolvedModel {
  /** A URL aria2 can fetch directly. */
  url: string;
  /** Needed when the URL's basename isn't a filename — always so for Civitai. */
  filename?: string;
  /** Suggested folder, when the host tells us what the file is. */
  suggestedType?: ModelType;
  sizeBytes?: number;
  /** Shown under the field so the user can sanity-check what they pasted. */
  label?: string;
}

export class ModelUrlError extends Error {}

/** Civitai's model `type` strings mapped onto ComfyUI's folder names. */
const CIVITAI_TYPE_TO_FOLDER: Record<string, ModelType> = {
  Checkpoint: 'checkpoints',
  LORA: 'loras',
  LoCon: 'loras',
  DoRA: 'loras',
  TextualInversion: 'embeddings',
  VAE: 'vae',
  Controlnet: 'controlnet',
  Upscaler: 'upscale_models',
};

/**
 * HuggingFace: `/blob/` is the page a human reads, `/resolve/` is the file.
 * Pure rewrite, no network needed.
 */
function resolveHuggingFace(url: URL): ResolvedModel {
  const rewritten = url.pathname.includes('/blob/')
    ? new URL(url.toString().replace('/blob/', '/resolve/'))
    : url;

  const filename = decodeURIComponent(rewritten.pathname.split('/').pop() ?? '');
  if (!filename.includes('.')) {
    throw new ModelUrlError(
      "That looks like a repository page, not a file. Open the file on HuggingFace and copy that link.",
    );
  }
  return { url: rewritten.toString(), filename, label: filename };
}

/**
 * Civitai: a page URL carries a model id and sometimes a version id, neither of
 * which is downloadable. One API call gets the direct URL, the real filename —
 * the download endpoint's basename is just a number — and the model type,
 * which pre-fills the folder so the user doesn't have to know where a LoRA
 * goes.
 */
async function resolveCivitai(url: URL, apiKey?: string): Promise<ResolvedModel> {
  const versionId =
    url.searchParams.get('modelVersionId') ??
    url.pathname.match(/\/model-versions\/(\d+)/)?.[1] ??
    url.pathname.match(/\/api\/download\/models\/(\d+)/)?.[1];

  if (!versionId) {
    throw new ModelUrlError(
      'Pick a specific version on Civitai and copy that link — a model page alone doesn\'t say which version to download.',
    );
  }

  const response = await fetch(`https://civitai.com/api/v1/model-versions/${versionId}`, {
    headers: {
      Accept: 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
  });
  if (!response.ok) {
    throw new ModelUrlError(
      response.status === 401
        ? 'This model needs a Civitai API key — add one in Cloud GPU settings.'
        : `Civitai returned ${response.status} for that version.`,
    );
  }

  const data = await response.json();
  const primary = (data?.files ?? []).find((f: any) => f.primary) ?? data?.files?.[0];

  return {
    url: data?.downloadUrl ?? `https://civitai.com/api/download/models/${versionId}`,
    filename: primary?.name,
    suggestedType: CIVITAI_TYPE_TO_FOLDER[data?.model?.type],
    sizeBytes: primary?.sizeKB ? Math.round(primary.sizeKB * 1024) : undefined,
    label: [data?.model?.name, data?.name].filter(Boolean).join(' · '),
  };
}

/**
 * Anything else: accept it if it plausibly points at a file. We don't try to
 * be clever about hosts we don't know.
 */
function resolveGeneric(url: URL): ResolvedModel {
  const filename = decodeURIComponent(url.pathname.split('/').pop() ?? '');
  if (!filename.includes('.')) {
    throw new ModelUrlError("That URL doesn't end in a filename — is it a direct download link?");
  }
  return { url: url.toString(), filename, label: filename };
}

export async function resolveModelUrl(input: string, civitaiApiKey?: string): Promise<ResolvedModel> {
  const trimmed = input.trim();
  if (!trimmed) throw new ModelUrlError('Enter a URL.');

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new ModelUrlError('That is not a valid URL.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new ModelUrlError('Only http and https URLs can be downloaded.');
  }

  const host = url.hostname.replace(/^www\./, '');
  if (host === 'huggingface.co') return resolveHuggingFace(url);
  if (host === 'civitai.com') return resolveCivitai(url, civitaiApiKey);
  return resolveGeneric(url);
}

export function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  const gb = bytes / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
}
