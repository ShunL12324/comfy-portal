import { SchemaFieldDef, changedFieldCount, partitionFields } from '@/features/comfy-node/utils/schema-fields';
import { normalizeSchema } from '@/services/node-schema';

jest.mock('@/features/server/stores/server-store', () => ({ useServersStore: { getState: () => ({ servers: [] }) } }));
jest.mock('@/services/network', () => ({ buildServerUrl: jest.fn(), fetchWithAuth: jest.fn() }));

const schema = normalizeSchema({
  input: {
    required: {
      prompt: ['STRING', { multiline: true }],
      width: ['INT', { default: 1280, min: 32, max: 4096, step: 32 }],
      height: ['INT', { default: 720, min: 32, max: 4096, step: 32 }],
      temperature: ['FLOAT', { default: -1, min: -1, max: 2, step: 0.01, advanced: true }],
      detail: ['COMBO', { options: ['auto', 'low', 'high'], advanced: true }],
      timeout: ['INT', { default: 120, min: 5, max: 3600, advanced: true }],
    },
  },
});

const FIELDS: SchemaFieldDef[] = [
  { inputKey: 'prompt', title: 'Prompt', fallback: { kind: 'string', multiline: true } },
  { inputKey: 'temperature', title: 'Temperature', fallback: { kind: 'float' } },
  {
    inputKey: 'width',
    title: 'Width',
    fallback: { kind: 'int' },
    pairedWith: { inputKey: 'height', title: 'Height', rowTitle: 'Width × Height' },
  },
  { inputKey: 'detail', title: 'Detail', fallback: { kind: 'combo', options: [] } },
  { inputKey: 'timeout', title: 'Timeout', fallback: { kind: 'int' }, visible: (inputs) => inputs.detail !== 'low' },
  { inputKey: 'missing', title: 'Missing', fallback: { kind: 'int' }, advanced: true },
];

const keys = (fields: SchemaFieldDef[]) => fields.map((field) => field.inputKey);

describe('partitionFields', () => {
  const inputs = { prompt: 'a cat', temperature: 0.7, width: 1280, height: 720, detail: 'auto', timeout: 120 };

  it('moves server-flagged fields to the advanced list, keeping the editor order', () => {
    const { main, advanced } = partitionFields(FIELDS, schema, inputs);
    expect(keys(main)).toEqual(['prompt', 'width']);
    expect(keys(advanced)).toEqual(['temperature', 'detail', 'timeout']);
  });

  it('lets the editor decide before the schema arrives', () => {
    const { main, advanced } = partitionFields(
      [...FIELDS, { inputKey: 'timeout', title: 'Again', fallback: { kind: 'int' }, advanced: true }],
      null,
      inputs,
    );
    expect(keys(main)).toEqual(['prompt', 'temperature', 'width', 'detail', 'timeout']);
    expect(keys(advanced)).toEqual(['timeout']);
  });

  it('drops hidden fields and ones the workflow does not carry', () => {
    const { advanced } = partitionFields(FIELDS, schema, { ...inputs, detail: 'low' });
    expect(keys(advanced)).toEqual(['temperature', 'detail']);
    expect(keys(partitionFields(FIELDS, schema, { height: 720 }).main)).toEqual(['width']);
  });

  it('lets an editor override the server flag', () => {
    const { main } = partitionFields(
      [{ inputKey: 'temperature', title: 'T', fallback: { kind: 'float' }, advanced: false }],
      schema,
      inputs,
    );
    expect(keys(main)).toEqual(['temperature']);
  });
});

describe('changedFieldCount', () => {
  it('counts inputs off their defaults, both sides of a pair included', () => {
    const inputs = { temperature: 0.7, width: 720, height: 1280, detail: 'auto', timeout: ['9', 0] };
    expect(changedFieldCount(FIELDS, schema, inputs)).toBe(3);
    expect(changedFieldCount(FIELDS, schema, { temperature: -1, width: 1280, height: 720, detail: 'auto' })).toBe(0);
  });
});
