import { NumberInput } from '@/components/self-ui/number-input';
import { NumberSlider } from '@/components/self-ui/slider';
import { NumberControl, numberFieldFor } from '@/features/comfy-node/utils/number-control';
import { NumberSpec } from '@/features/comfy-node/utils/schema-inputs';
import { ReactNode } from 'react';
import SubItem from './sub-item';

interface NumberFieldProps {
  title: string;
  inputKey: string;
  spec: NumberSpec;
  value: unknown;
  /** Overrides the slider/stepper choice; see `numberControlFor`. */
  control?: NumberControl;
  /** Overrides the ± increment (not the precision). */
  step?: number;
  onChange: (value: number) => void;
  /** Rendered under the control. */
  children?: ReactNode;
}

/**
 * One numeric input as a slider or a stepper, chosen by `numberControlFor`
 * from the parameter's name and the server's range. The saved value is shown
 * as it is; only an edit clamps it.
 */
export default function NumberField({
  title,
  inputKey,
  spec,
  value,
  control,
  step,
  onChange,
  children,
}: NumberFieldProps) {
  const field = numberFieldFor(spec, inputKey, value, { control, step });
  const write = (next: number) => onChange(spec.kind === 'int' ? Math.round(next) : next);
  return (
    <SubItem title={title}>
      {field.control === 'slider' ? (
        <NumberSlider
          value={field.value}
          minValue={field.min}
          maxValue={field.max}
          step={field.step}
          decimalPlaces={field.decimalPlaces}
          onChangeEnd={write}
        />
      ) : (
        <NumberInput
          value={field.value}
          minValue={field.min}
          maxValue={field.max}
          step={field.step}
          decimalPlaces={field.decimalPlaces}
          onChange={write}
        />
      )}
      {children}
    </SubItem>
  );
}
