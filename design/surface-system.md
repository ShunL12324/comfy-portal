# Neutral surface system

Current decision, 2026-09-29. This supersedes older color/tint instructions in `design.md`.

`constants/design-tokens.ts` owns every color. `constants/Colors.ts` only adapts those roles to Gluestack's numbered API; it contains no independent palette. NativeWind surface utilities and native style props resolve to the same values. All neutral roles have equal RGB channels, so they introduce no warm/cool tint.

| Role | Use | Light | Dark | API |
| --- | --- | --- | --- | --- |
| Canvas | Page, AppBar, Tabbar, Run results | #F4F4F4 | #101010 | `paper`, `surface-base` |
| Card | Server, Env, content cards, sidebar | #FFFFFF | #1C1C1C | `card`, `surface-card` |
| Workspace | Run panel: handle, toolbar, node/agent content, composer | #EBEBEB | #1A1A1A | `workspace`, `surface-workspace` |
| Workspace card | Node cards and standalone controls inside Run | #FFFFFF | #242424 | `workspaceCard`, `surface-workspace-card` |
| Inset | Search, input, textarea, readout, segmented track | #EBEBEB | #141414 | `well`, `surface-inset` |
| Overlay | Modal sheet, popover, dialog, matching handle/footer | #FFFFFF | #242424 | `overlay`, `surface-overlay` |
| Selected | Selected item, segmented thumb, subdued control | #E3E3E3 | #303030 | `raised`, `surface-selected` |
| Subtle edge | Optional node/card decoration | #E6E6E6 | #282828 | `subtle` |
| Divider | Ordinary structural separators | #D5D5D5 | #3D3D3D | `line` |
| Control boundary | Essential control geometry | #7C7C7C | #868686 | `boundary` |
| Primary text | Titles, body, primary icons | #1C1C1C | #F5F5F5 | `ink` |
| Secondary text | Supporting information | #4C4C4C | #C4C4C4 | `secondary` |
| Muted text | Metadata, placeholder | #626262 | #A6A6A6 | `muted` |

These are functional roles, not a rule to wrap every element in another surface. In light mode, cards rise from the grey canvas toward white; controls are inset. In dark mode, canvas, inset, card, overlay and selected fill have strictly increasing luminance. Modal overlays are opaque. Persistent Run sheets use the workspace surface throughout the handle, toolbar, node/agent content and composer. Remove the panel outline; light mode uses a subtle upward shadow, dark mode relies on luminance separation. Node cards use the workspace-card role. Card treatment and node geometry are unchanged.

Use neutral primary/inverse colors for actions and focus. `tint`, `onTint` and `tintSurface` are compatibility aliases for `solid`, `onSolid` and `raised`; they do not introduce a brand color. Green, amber and red are reserved for actual status. Their foreground/solid pairs are checked separately. `faint` is decorative, never information-bearing text.

## Quantitative checks and limits

The palette uses WCAG 2.2 relative luminance (linearized sRGB), rather than treating numeric RGB differences as equivalent perceived contrast. Normal text target: at least 4.5:1. Essential control graphics target: at least 3:1. Decorative boundaries and surface fills themselves do not need 3:1; forcing that ratio on every card would add excessive contrast.

- All 21 neutral text/surface pairs per mode pass 4.5:1, including muted text on selected fills.
- Worst neutral pair: light 4.75:1, dark 5.42:1.
- Essential control boundary colors pass 3:1 on all seven surfaces.
- Ready/danger/warning text and filled primary/danger/warning button labels pass 4.5:1.
- These checks validate token pairs, not a claim of whole-app WCAG compliance. Opacity, photographs, disabled states, font rendering and local overrides still require visual review.

Run `npm run lint:colors`. It also rejects accidental hue in neutral roles, broken compatibility aliases and inverted surface ordering. Surface spacing and exact grey values remain design judgments; WCAG constrains legibility, not aesthetic quality.

References:
- [W3C: Contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [W3C: Non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

Legacy `surface-raised`/`surface-sunken` classes retain their existing inset-field meaning for compatibility. New code should use the explicit `surface-inset`, `surface-card`, `surface-overlay` or `surface-selected` names.

History uses iOS form-sheet presentation with `sheetCornerRadius = designTokens.radius.sheet`; the system modal default must not introduce a separate radius. Android retains its existing modal presentation.

Destructive action fills use `dangerSolid` (light #B91C1C, dark #C92A3E) with white `onDanger` labels. Error text/icons use `danger` (light #B91C1C, dark #F87171). Never reuse the lifted dark-mode text red for a large solid button. The contrast check validates each role against its actual background.
