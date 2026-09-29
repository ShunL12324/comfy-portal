import AsyncStorage from '@react-native-async-storage/async-storage';

import catalog from './model-catalog.json';
import { AIProviderType } from './types';

/**
 * Known models per provider, used to turn the model field into a picker.
 *
 * The AI SDK ships no model lists, so this comes from models.dev. A trimmed
 * copy is bundled (see tools/update-model-catalog.mjs) so the picker works
 * offline and before a key is entered; `refreshCatalog` pulls a current copy on
 * demand for models released since the build.
 *
 * Entries are only ever suggestions — the field stays free text, so a model
 * missing here is never a dead end.
 */

export interface CatalogModel {
  id: string;
  name: string;
  reasoning?: boolean;
  context?: number;
}

type RawModels = Record<string, { name: string; reasoning?: boolean; context?: number }>;
type RawProviders = Partial<Record<AIProviderType, RawModels>>;

const SOURCE_URL = 'https://models.dev/api.json';
const CACHE_KEY = 'model-catalog-cache';

/** models.dev provider ids that differ from our provider type. */
const SOURCE_IDS: Partial<Record<AIProviderType, string>> = {
  fireworks: 'fireworks-ai',
};

const bundled = catalog.providers as RawProviders;

/** Refreshed copy for this session, if the user pulled one. */
let live: RawProviders | null = null;

function toList(models: RawModels | undefined): CatalogModel[] {
  if (!models) return [];
  return Object.entries(models)
    .map(([id, model]) => ({ id, ...model }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Known tool-capable models for a provider, best available copy. */
export function getCatalogModels(type: AIProviderType): CatalogModel[] {
  return toList(live?.[type] ?? bundled[type]);
}

export function getCatalogDate(): string {
  return catalog.generatedAt;
}

/**
 * Fetch a current catalogue from models.dev.
 *
 * Downloads the full ~4 MB payload and filters locally — models.dev has no
 * per-provider endpoint — so this is user-initiated, never automatic.
 */
export async function refreshCatalog(): Promise<number> {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) throw new Error(`models.dev returned HTTP ${response.status}`);
  const data = await response.json();

  const providers: RawProviders = {};
  let count = 0;

  for (const type of Object.keys(bundled) as AIProviderType[]) {
    const source = data[SOURCE_IDS[type] ?? type];
    if (!source?.models) continue;

    const models: RawModels = {};
    for (const [id, model] of Object.entries(source.models as Record<string, any>)) {
      // A model that can't call tools can't drive the workflow.
      if (!model.tool_call) continue;
      models[id] = {
        name: model.name ?? id,
        ...(model.reasoning ? { reasoning: true } : {}),
        ...(model.limit?.context ? { context: model.limit.context } : {}),
      };
      count++;
    }
    providers[type] = models;
  }

  live = providers;
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(providers)).catch(() => {});
  return count;
}

/** Load a previously refreshed catalogue, if any. Safe to call at startup. */
export async function loadCachedCatalog(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) live = JSON.parse(raw);
  } catch {
    // A bad cache just means we fall back to the bundled copy.
  }
}
