import { compactFieldStyle } from '@/components/ui/input/compact-field-style';
import { designTokens as t } from '@/constants/design-tokens';

describe('compactFieldStyle', () => {
  it('positions the field so the compact well paints underneath it on web', () => {
    expect(compactFieldStyle().position).toBe('relative');
  });

  it('keeps the compact node geometry and type', () => {
    expect(compactFieldStyle()).toMatchObject({
      ...t.node.body,
      height: t.height.control,
      paddingHorizontal: t.node.inset,
      paddingVertical: 0,
    });
  });

  it('uses tabular digits only for numeric keyboards', () => {
    expect(compactFieldStyle('numeric').fontVariant).toEqual(['tabular-nums']);
    expect(compactFieldStyle('numbers-and-punctuation').fontVariant).toEqual(['tabular-nums']);
    expect(compactFieldStyle('default').fontVariant).toBeUndefined();
  });
});
