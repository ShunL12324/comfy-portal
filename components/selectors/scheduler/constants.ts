import { SelectorOption } from '../types';

export const SCHEDULERS = [
  'normal',
  'karras',
  'exponential',
  'sgm_uniform',
  'simple',
  'ddim_uniform',
  'beta',
  'linear_quadratic',
  'kl_optimal',
] as const;

export type Scheduler = (typeof SCHEDULERS)[number];

export const SCHEDULER_OPTIONS: SelectorOption[] = SCHEDULERS.map((scheduler) => ({
  value: scheduler,
  label: scheduler,
}));
