import { spoken } from '@/utils/spoken';

describe('spoken', () => {
  it('joins the parts that exist with a comma', () => {
    expect(spoken('127.0.0.1:8188', 'Ready · 32 ms, 12 models')).toBe('127.0.0.1:8188, Ready · 32 ms, 12 models');
  });
  it('skips missing and blank parts so a card without a subtitle still has a clean hint', () => {
    expect(spoken(undefined, 'Offline')).toBe('Offline');
    expect(spoken('Image generation with FLUX', undefined)).toBe('Image generation with FLUX');
    expect(spoken('', '  ', false, '1 model')).toBe('1 model');
    expect(spoken()).toBe('');
  });
});
