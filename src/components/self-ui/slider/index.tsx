import { Action, useDesign } from '@/components/ui/design-system/primitives';
import RNSlider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { Minus, Plus } from '@/constants/icons';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SheetAwareTextInput } from '../adaptive-sheet-components';
import { normalizeSliderValue, parseSliderDraft, sliderPrecision } from './slider-value';
import { designTokens as t } from '@/constants/design-tokens';

/**
 * Props for the SmoothSlider component
 * @interface CustomSliderProps
 */
interface CustomSliderProps {
  /** Current value of the slider (optional if defaultValue is provided) */
  value?: number;
  /** Initial value of the slider (used if value is not provided) */
  defaultValue?: number;
  /** Minimum value of the slider (default: 0) */
  minValue?: number;
  /** Maximum value of the slider (default: 100) */
  maxValue?: number;
  /** Step size for value changes (default: 1) */
  step?: number;
  /** Callback fired when the value changes */
  onChange?: (value: number) => void;
  /** Callback fired when the sliding gesture ends */
  onChangeEnd?: (value: number) => void;
  /** Whether to show the buttons (default: true) */
  showButtons?: boolean;
  /** Decimal places (auto-calculated from step by default) */
  decimalPlaces?: number;
}

// Optimize styles with animated components
const styles = {
  container: 'flex-row items-center',
  // Bare icon buttons rather than filled tiles. The sheet's slider is track
  // plus readout and nothing else; these stay because dragging alone is a
  // poor way to nudge a value by one on a touch screen, but they shouldn't
  // read as two objects floating either side of the track.
  button: {
    base: 'items-center justify-center rounded-md',
    disabled: 'opacity-disabled',
  },
  icon: 'text-content-tertiary',
  sliderContainer: 'flex-1',
} as const;

const sliderStyles = StyleSheet.create({
  slider: {
    flex: 1,
  },
});

/**
 * A smooth, animated slider component with haptic feedback
 */
export function NumberSlider({
  value: controlledValue,
  defaultValue = 0,
  minValue = 0,
  maxValue = 100,
  step = 1,
  onChange,
  onChangeEnd,
  showButtons = true,
  decimalPlaces,
}: CustomSliderProps) {
  const [draftValue, setLocalValue] = useState(() => {
    const initial = controlledValue ?? defaultValue ?? 0;
    return typeof initial === 'number' && !isNaN(initial) ? initial : 0;
  });

  const [inputDraft, setInputDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  const c = useDesign();
  const { fontScale } = useWindowDimensions();
  const [dragging, setDragging] = useState(false);
  const localValue = dragging ? draftValue : (controlledValue ?? draftValue);

  const precision = useCallback(() => {
    return Math.min(12, Math.max(decimalPlaces ?? 0, sliderPrecision(step), sliderPrecision(minValue)));
  }, [decimalPlaces, step, minValue]);

  const normalize = useCallback(
    (value: number) => normalizeSliderValue(value, minValue, maxValue, step),
    [minValue, maxValue, step],
  );

  const formatValue = useCallback(
    (val: number) => {
      const num = typeof val === 'number' && !isNaN(val) ? val : 0;
      return num.toFixed(precision());
    },
    [precision],
  );

  // Reserve the full range, including sign/decimals, rather than the current
  // digit count. Larger text and longer ranges can grow without clipping.
  const readoutCharacters = Math.max(formatValue(minValue).length, formatValue(maxValue).length);
  const readoutWidth =
    Math.max(t.slider.readoutMinWidth, readoutCharacters * t.slider.readoutCharacterWidth + t.layout.related * 2) *
    fontScale;
  const readoutHeight = Math.max(t.height.control, t.leading.label * fontScale + t.layout.related * 2);

  const adjustValue = useCallback(
    (delta: number) => {
      const newValue = normalize(localValue + delta);
      setLocalValue(newValue);
      if (onChange) {
        onChange(newValue);
      }
      if (onChangeEnd) {
        onChangeEnd(newValue);
      }
      Haptics.selectionAsync();
    },
    [localValue, normalize, onChange, onChangeEnd],
  );

  const handleChange = useCallback(
    (rawValue: number) => {
      const newValue = normalize(rawValue);
      setLocalValue(newValue);
      if (onChange) {
        onChange(newValue);
      }
    },
    [normalize, onChange],
  );

  const handleComplete = useCallback(
    (rawValue: number) => {
      const newValue = normalize(rawValue);
      setLocalValue(newValue);
      setDragging(false);
      if (onChangeEnd) {
        onChangeEnd(newValue);
      }
      Haptics.selectionAsync();
    },
    [normalize, onChangeEnd],
  );

  const commitInput = () => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setEditing(false);
    const parsed = parseSliderDraft(inputDraft);
    if (parsed === null) return; // Empty/incomplete input restores the current value.
    const next = normalize(parsed);
    setLocalValue(next);
    if (next !== localValue) {
      onChange?.(next);
      onChangeEnd?.(next);
    }
  };

  return (
    <View className="w-full">
      <View className={styles.container}>
        {showButtons && (
          <Action
            kind="text"
            icon={Minus}
            label="Decrease slider"
            disabled={localValue <= minValue}
            onPress={() => adjustValue(-step)}
          />
        )}

        <View className={styles.sliderContainer}>
          <RNSlider
            style={[sliderStyles.slider, { height: t.height.touch }]}
            value={localValue}
            minimumValue={minValue}
            maximumValue={maxValue}
            step={step}
            onSlidingStart={() => setDragging(true)}
            onValueChange={handleChange}
            onSlidingComplete={handleComplete}
            minimumTrackTintColor={c.tint}
            maximumTrackTintColor={c.boundary}
            thumbTintColor={c.tint}
          />
        </View>

        {showButtons && (
          <Action
            kind="text"
            icon={Plus}
            label="Increase slider"
            disabled={localValue >= maxValue}
            onPress={() => adjustValue(step)}
          />
        )}

        <View
          testID="slider-readout"
          style={{
            width: readoutWidth,
            height: readoutHeight,
            flexShrink: 0,
            marginLeft: t.layout.label,
            paddingHorizontal: t.layout.related,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: t.radius.control,
            borderWidth: 1,
            borderColor: editing ? c.boundary : 'transparent',
            backgroundColor: c.well,
          }}
        >
          <SheetAwareTextInput
            accessibilityLabel="Slider value"
            testID="slider-value-input"
            value={editing ? inputDraft : formatValue(localValue)}
            onFocus={() => {
              setInputDraft(formatValue(localValue));
              editingRef.current = true;
              setEditing(true);
            }}
            onChangeText={setInputDraft}
            onBlur={commitInput}
            onSubmitEditing={commitInput}
            selectTextOnFocus
            keyboardType={minValue < 0 ? 'numbers-and-punctuation' : precision() > 0 ? 'decimal-pad' : 'number-pad'}
            returnKeyType="done"
            style={{
              width: '100%',
              height: '100%',
              color: c.ink,
              fontFamily: t.font.medium,
              fontSize: t.type.label,
              fontVariant: ['tabular-nums'],
              textAlign: 'center',
              padding: 0,
            }}
          />
        </View>
      </View>
    </View>
  );
}
