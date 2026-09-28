import { designTokens as t } from '@/constants/design-tokens';
import { inputTypography, resolveTypography, resolveWebTypography } from './typography';
import { StyleSheet } from 'react-native';

describe('shared font selection', () => {
  it.each([
    ['font-body', t.font.sans],
    ['font-body font-medium', t.font.medium],
    ['font-body font-semibold', t.font.semibold],
    ['font-body font-bold', t.font.bold],
    ['font-body font-semibold italic', t.font.semiboldItalic],
    ['font-body font-bold italic', t.font.boldItalic],
    ['font-serif', t.font.title],
    ['font-serif-semibold', t.font.semibold],
    ['font-serif-italic', t.font.sansItalic],
    ['font-sans font-bold italic', t.font.boldItalic],
  ])('uses a real face for %s', (className, family) => {
    expect(resolveTypography(undefined, className)).toEqual({
      fontFamily: family,
      fontWeight: '400',
      fontStyle: 'normal',
    });
  });

  it('resolves web NativeWind markers and honors explicit styles', () => {
    const css = { $$css: true, 'font-body font-semibold': 'font-body font-semibold' };
    expect(resolveTypography(css as any).fontFamily).toBe(t.font.semibold);
    expect(resolveTypography([css, { fontWeight: '500' }] as any).fontFamily).toBe(t.font.medium);
    expect(resolveTypography([css, { fontFamily: t.font.medium, fontWeight: '400' }] as any).fontFamily).toBe(
      t.font.medium,
    );
    expect(resolveTypography([css, { fontFamily: t.font.title, fontWeight: '400' }] as any).fontFamily).toBe(
      t.font.title,
    );
  });

  it('keeps named static faces and resolves emphasis without synthesis', () => {
    expect(resolveTypography({ fontFamily: t.font.semibold, fontWeight: '400' }).fontFamily).toBe(t.font.semibold);
    expect(resolveTypography({ fontFamily: t.font.semibold, fontStyle: 'italic' }).fontFamily).toBe(
      t.font.semiboldItalic,
    );
    expect(resolveTypography({ fontFamily: t.font.mono, fontWeight: '700', fontStyle: 'italic' })).toEqual({
      fontFamily: t.font.boldItalic,
      fontWeight: '400',
      fontStyle: 'normal',
    });
  });

  it('keeps numeric text in the sans family with tabular digits and real emphasis', () => {
    expect(resolveTypography(undefined, 'font-mono font-medium')).toEqual({
      fontFamily: t.font.medium,
      fontWeight: '400',
      fontStyle: 'normal',
      fontVariant: ['tabular-nums'],
    });
    expect(resolveTypography(undefined, 'font-sans tabular-nums')).toMatchObject({
      fontFamily: t.font.sans,
      fontVariant: ['tabular-nums'],
    });
  });

  it('converts numeric features for DOM text without changing its face', () => {
    expect(resolveWebTypography({ fontVariant: ['tabular-nums'] }, 'font-body')).toMatchObject({
      fontFamily: t.font.sans,
      fontVariant: 'tabular-nums',
    });
    expect(resolveWebTypography(undefined, 'font-mono font-medium')).toMatchObject({
      fontFamily: t.font.medium,
      fontVariant: 'tabular-nums',
    });
  });

  it('uses intrinsic metrics for single-line inputs without changing multiline leading', () => {
    const original = { lineHeight: 18, fontSize: 12, textAlign: 'right' as const };
    expect(StyleSheet.flatten(inputTypography(original))).toMatchObject({
      lineHeight: undefined,
      textAlignVertical: 'center',
      paddingVertical: 0,
      textAlign: 'right',
      fontSize: 12,
    });
    expect(StyleSheet.flatten(inputTypography(original, true))).toMatchObject({ lineHeight: 18 });
  });

  it('gives raw inputs the body font without losing custom sizing or editing geometry', () => {
    const original = {
      fontSize: t.type.label,
      lineHeight: t.leading.label,
      minHeight: t.height.touch,
      fontWeight: '600' as const,
    };
    const resolved = StyleSheet.flatten(inputTypography(original, true));
    expect(resolved).toMatchObject({ ...original, fontFamily: t.font.semibold, fontWeight: '400' });
    expect(original.fontWeight).toBe('600');
    expect(StyleSheet.flatten(inputTypography(undefined, true))).toMatchObject({
      fontFamily: t.font.sans,
      fontSize: t.type.body,
      lineHeight: t.leading.body,
    });
  });
});
