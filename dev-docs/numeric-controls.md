# Numeric controls in node editors

How a numeric node input is drawn: as a **slider** or a **stepper** (a number field with − and +), with which range, step and precision. Every node editor, hand-built or schema-driven, follows this one rule.

- **Implementation:** `src/features/comfy-node/utils/number-control.ts`. It contains `numberControlFor`, `practicalStepFor` and `numberFieldFor`.
- **Rendering:** `components/node/common/number-field.tsx`, used by `SchemaField` and by unknown nodes.
- **Tests:** `tests/features/comfy-node/utils/number-control.test.ts`.

## The rule

**Decide by what the parameter means first, and by its range second.**

**Slider.** Use it for a value tuned by feel, where the thumb's position means something and roughly the whole declared range is useful. Examples: denoise 0–1, a 0–1 mask strength, opacity.

**Stepper.** Use it for an exact value (counts, sizes, rates, durations, seeds). Also use it where the declared range dwarfs the useful one: CFG is declared 0–100 but used around 1–12, and LoRA strength is declared −100–100.

| Parameter | Control | Why |
| --- | --- | --- |
| `denoise`, 0–1 `strength`, `opacity`, `blend*`, `mix` | Slider | Feel; the whole 0–1 range is useful |
| `feather`, `blur*`, `volume` | Slider when the range is short, else stepper | Feel, but never a narrowed range |
| `steps`, `*_at_step`, `batch_size`, `length`, `frame*`, `*_count`, `select_every_nth` | Stepper | Exact counts |
| `seed`, `noise_seed` | Stepper (seed control) | Exact; up to 2^64 |
| `width`, `height`, `*_width`, `*_side`, `multiple`, `divisible_by` | Stepper | Exact pixels |
| `fps`, `*_rate`, `seconds`, `duration`, `*_time` | Stepper (fps 1, time 0.1) | Exact rates and times |
| `cfg`, `guidance` | Stepper (0.5) | Declared 0–100, used about 1–12 |
| `shift*` | Stepper (0.5) | Declared 0–100, used about 1–12 |
| `megapixels`, `scale_by` | Stepper (0.1, 0.05) | Exact sizes |
| `crf`, `bitrate`, `*tokens` | Stepper | Exact encoder and API values |
| `strength_model`, `strength_clip`, LoRA rows | Stepper (0.05) | Declared −100–100 |
| A `strength` spanning more than 2 | Stepper | A multiplier, not a 0–1 amount |
| Anything else | See below | Range fallback |

**Names not in the table** fall back to the range:
- a 0–1 float is a slider;
- an unbounded input is a stepper;
- an int with more than 256 positions, or a float with more than 2000, is a stepper;
- any other short bounded range is a slider.

A **dotted key** (`mode.denoise`) is classified by the part after the dot.

## Ranges, steps and saved values

- **Ranges come from the server's node definition** (`/object_info`, via `src/services/node-schema.ts`).
  - An editor's fallback spec stands in only until the definition loads. It holds ComfyUI's own declared range, for example `types/base/core-number-specs.ts`.
  - An editor never narrows the server's range to a "nice" one.
- **A feel value whose range is too long to drag gets a stepper**, never a shortened slider.
- **Sliders keep the server's step**, because it is their grid.
- **Practical tap step.** When a stepper's server step is too fine to tap (CFG 0.1, a timestamp 0.001), − and + move by a practical step: CFG, guidance and shift 0.5; megapixels 0.1; LoRA strength and `scale_by` 0.05; times 0.1; fps 1.
  - Typing still accepts anything at the server's precision. Decimal places come from the server's step.
- **Saved values are shown as they are**, even out of range.
  - They are clamped only when the user edits them. Loading a workflow never rewrites a value.
  - Steppers clamp ComfyUI's ±2^63 INT bounds to JS safe integers.

## Adding or changing a parameter

1. **Prefer the rule.** If a new node's parameter is misclassified, fix the name patterns in `number-control.ts` and add a test case. Don't override it in the editor.
2. **Pass `control` (or `step`) on a field only for a genuine one-off**, and say why in a comment. The paired Width × Height row forces steppers on purpose.
3. **Hand-built editors** should render numbers through `NumberField` / `numberFieldFor` with the server spec, rather than `NumberSlider` or `NumberInput` with literal bounds.

Visual details of the two controls live in `design.md`: slider readout, stepper 1:2:1 layout and 44-point targets.
