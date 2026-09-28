import { compareWorkflowUsage, workflowUsageLabel } from './workflow-usage';
import type { WorkflowRecord } from '../types';

const now = new Date(2026, 8, 27, 0, 15);
test('usage dates follow local calendar days rather than elapsed hours', () => {
  expect(workflowUsageLabel(new Date(2026, 8, 27, 0, 1), now)).toBe('Used today');
  expect(workflowUsageLabel(new Date(2026, 8, 26, 23, 59), now)).toBe('Used yesterday');
  expect(workflowUsageLabel(new Date(2026, 8, 12), now)).toBe('Used Sep 12');
  expect(workflowUsageLabel(new Date(2025, 8, 12), now)).toBe('Used Sep 12, 2025');
  expect(workflowUsageLabel(undefined, now)).toBe('Not run yet');
  expect(workflowUsageLabel(new Date('invalid'), now)).toBe('Not run yet');
});

test('used bindings precede unused ones, with newer imports first among unused bindings', () => {
  const record = (id: string, createdAt: Date, lastUsed?: Date) => ({ id, createdAt, lastUsed }) as WorkflowRecord;
  const rows = [
    record('older import', new Date(2026, 8, 1)),
    record('older use', new Date(2026, 8, 20), new Date(2026, 8, 23)),
    record('new import', new Date(2026, 8, 27)),
    record('recent use', new Date(2026, 8, 1), new Date(2026, 8, 26)),
  ];
  expect([...rows].sort(compareWorkflowUsage).map(({ id }) => id)).toEqual([
    'recent use',
    'older use',
    'new import',
    'older import',
  ]);
  expect(rows[0].id).toBe('older import');
});
