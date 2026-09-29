import { filterRNProps } from './web-props';
test('native line heights become CSS lengths rather than 32-times font-size', () => {
  const source = { fontSize: 26, lineHeight: 32 };
  const props = filterRNProps({ style: source }) as any;
  expect(props.style).toEqual({ fontSize: 26, lineHeight: '32px' });
  expect(source.lineHeight).toBe(32);
});
test('nested native style arrays preserve the final line height', () => {
  const props = filterRNProps({ style: [{ lineHeight: 20 }, [false, { lineHeight: 24 }]] }) as any;
  expect(props.style.lineHeight).toBe('24px');
});
