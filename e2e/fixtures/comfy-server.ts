import type { Page, Route } from '@playwright/test';

/**
 * A stand-in ComfyUI server.
 *
 * Without this, an E2E suite has two bad options: point at a real GPU box —
 * which is exactly how the iPad screenshot attempt died, the machine was
 * simply switched off — or test nothing but empty states. Intercepting the
 * handful of endpoints the app actually calls makes the whole generation path
 * deterministic and free.
 *
 * The shapes come from the real server; see `services/comfy-client.ts` and
 * `services/node-schema.ts` for the consumers.
 */

export const MOCK_HOST = '127.0.0.1';
export const MOCK_PORT = 18188;

/** Files the mock reports in ComfyUI's `input/` directory. */
export const INPUT_IMAGES = ['example.png', 'selfie.png'];

/** Checkpoints the mock reports, matching what the bundled templates ask for. */
export const CHECKPOINTS = ['sd_xl_base_1.0.safetensors', 'dreamshaperXL_v21.safetensors'];

/**
 * `/object_info/<class>` returns `{ [ClassType]: { input: { required: {...} } } }`,
 * where a combo input is `[legalValues[], options]`. LoadImage builds its list
 * by scanning the input directory, so that list doubles as the inventory the
 * server-image picker reads.
 */
const OBJECT_INFO: Record<string, unknown> = {
  LoadImage: {
    input: { required: { image: [INPUT_IMAGES, { image_upload: true }] } },
    output: ['IMAGE', 'MASK'],
    name: 'LoadImage',
    display_name: 'Load Image',
  },
  CheckpointLoaderSimple: {
    input: { required: { ckpt_name: [CHECKPOINTS, {}] } },
    output: ['MODEL', 'CLIP', 'VAE'],
    name: 'CheckpointLoaderSimple',
    display_name: 'Load Checkpoint',
  },
};

interface InstallOptions {
  /** Make every request fail, for testing the offline paths. */
  offline?: boolean;
}

export async function installMockComfyServer(page: Page, options: InstallOptions = {}) {
  const json = (route: Route, body: unknown) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route(`**://${MOCK_HOST}:${MOCK_PORT}/**`, async (route) => {
    if (options.offline) return route.abort('connectionrefused');

    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === '/system_stats') {
      return json(route, {
        system: { comfyui_version: '0.3.68', python_version: '3.12.0', os: 'posix' },
        devices: [{ name: 'cuda:0 NVIDIA GeForce RTX 4090', type: 'cuda', vram_total: 25757220864 }],
      });
    }

    if (path.startsWith('/object_info/')) {
      const classType = decodeURIComponent(path.slice('/object_info/'.length));
      const def = OBJECT_INFO[classType];
      // An unknown class is a 200 with an empty object, not a 404 — the app
      // treats "no definition" and "server unreachable" differently.
      return json(route, def ? { [classType]: def } : {});
    }

    if (path === '/object_info') return json(route, OBJECT_INFO);

    // Model folder listings, used for preview images.
    if (path.startsWith('/models')) return json(route, path === '/models' ? ['checkpoints'] : CHECKPOINTS);

    if (path === '/history' || path.startsWith('/history/')) return json(route, {});
    if (path === '/queue') return json(route, { queue_running: [], queue_pending: [] });

    if (path === '/prompt' && route.request().method() === 'POST') {
      return json(route, { prompt_id: 'e2e-prompt-1', number: 1, node_errors: {} });
    }

    // A 1x1 PNG stands in for any image the app asks for — thumbnails in the
    // server picker, previews, generated results.
    if (path === '/view') {
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64',
        ),
      });
    }

    if (path.startsWith('/cpe/')) return route.fulfill({ status: 404, body: 'Not Found' });

    return json(route, {});
  });
}
