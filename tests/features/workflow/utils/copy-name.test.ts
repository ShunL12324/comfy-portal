import { uniqueCopyName } from '@/features/workflow/utils/copy-name';
test('imports preserve the original and create readable case-insensitive copies', () => {
  expect(uniqueCopyName('Portrait', ['portrait', 'Portrait copy'])).toBe('Portrait copy 2');
  expect(uniqueCopyName('Portrait', ['Other'])).toBe('Portrait');
});
