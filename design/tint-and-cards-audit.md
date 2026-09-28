# Tint, typography and list-card follow-up

## Completed implementation

- [x] Light paper / white cards / neutral wells; Dark neutral surfaces with clear separation.
- [x] User-approved orange tint for primary actions, selection, focus and links across shared controls.
- [x] Two registered families: Newsreader headings and IBM Plex Sans body, controls and numbers. Numeric figures use the same Sans family, including weighted/italic styles.
- [x] Shared corner scale, refined with user approval: badge 3, filter/segment 6 (thumb 4), control 8, panel 12, sheet top 20; preserve deliberate circles and 44-point touch targets.
- [x] Server, Env and Launch use the shared card composition: 16-point padding, 4-point title/description gap, 12-point summary gap, no inner divider or decorative leading tile.
- [x] Env retains three distributed counts with labels; no total GB or inline create action.
- [x] Server retains origin, endpoint, status/latency; GPU and live VRAM/meter share the lower-right group. Multiple devices retain identity/counts, while the first-device memory reading is labeled GPU 1. Cached GPU identity survives offline; live memory does not.
- [x] Remove hardware details sheet and footer chevron/action. The whole server card opens Workflows.

## Font provenance

IBM official plex repository at `1da12f02587b630c07e92692d21492d722f53614`, complete Plex Sans static TTFs (Regular, Medium, SemiBold, Bold and four italics). Source and OFL license accompany assets. Default numeric glyph advances are all 600 units; no separate numeric family is loaded. Native PostScript names, including Medm/SmBld, match the actual font metadata. DOM typography converts React Native fontVariant arrays to CSS values.

## Validation

- TypeScript: passed.
- Typography Jest: 13 tests passed.
- Full lint: 0 errors, 79 warnings.
- Whitespace diff check: passed.
- Typography inventory: 303 production modules scanned, 234 UI/style modules, 116 direct declarations; no unmanaged fonts.
- Orange text contrast (Light / Dark): tint on tintSurface 4.75 / 6.97; onTint on tint 5.29 / 8.66. Neutral contrast unchanged: muted on well 4.89 / 5.85; muted on raised 4.89 / 4.86.
- E2E omitted at the user’s explicit request; visual acceptance is on their physical iPhone.
- Release build: passed (`.expo/tint-device-build.log`). Wireless attempts were blocked by CoreDevice error 4016. After the user connected by cable, installation and launch on the physical iPhone 15 Pro both succeeded (exit 0; `.expo/tint-device-install-wired.log` and `.expo/tint-device-launch-wired.log`). Visual acceptance remains with the user.

## Design references

The local design contract and existing-specimen mapping are updated. Remote Figma specimen revisions remain pending; no claim of remote synchronization.

## Mobile radius follow-up

Only corner geometry changed; dimensions and spacing retained. Shared token consumers include Server/Env/Node cards, controls, filters and modal/persistent sheets. TypeScript and whitespace checks passed. Lint passed with 0 errors and 79 warnings. Release build and physical iPhone installation succeeded (`.expo/radii-device-build.log`, `.expo/radii-device-install.log`). E2E remains omitted at user request.

## Orange tint follow-up

User approved Light #B9470A / #FFFFFF / #FFF0E5 and Dark #FF9A52 / #211208 / #382419 for tint / onTint / tintSurface. Shared token change propagates to actions, links, focus, filters, segments, selectors and navigation selection. Neutral and status colors unchanged. Final combined native build, physical installation and launch succeeded; see orange-final logs below.

## Typography hierarchy follow-up

User delegated final visual judgment. Shared Newsreader titles now SemiBold600; Plex Sans body remains400, filter/segment labels and slider readouts use500. Actions already selected the real Medium face and remain500. TypeScript and 13 typography tests passed; lint has zero errors (79 warnings). Final color/weight/icon candidate successfully built, installed and launched on the physical iPhone.

## Full typography and icon pass

- [x] Navigation: Tab bar/sidebar500 in all states; AppBar600 serif.
- [x] Page/sheet/empty titles: Newsreader600; card/section labels500 Sans.
- [x] Actions, filters and segmented choices500; stable weight across selection.
- [x] Settings and selector item labels500; descriptions400.
- [x] Node titles/field labels500; editable values/prompts/hints400.
- [x] Slider readouts500; addresses/secondary counts remain400; no numeric font family.
- [x] Chat body400; semantic Markdown bold remains700, headings500.
- [x] Shared icon scaling corrected: previous formula shrank strokes twice with the SVG viewport. New effective strokes1.25/1.5/1.75/2 across metadata/control/hero/display roles.
- [x] Direct Lucide usage audited, four missing size/stroke usages normalized (settings chevron, password eye pair, workflow upload).
- [x] Existing decorative illustrations/native integrations preserved; no icon library change.
- [x] Final checks and device delivery: typecheck passed; 13 typography tests passed; lint 0 errors/79 warnings; 303-module typography inventory has no unmanaged fonts; direct Lucide scan has no remaining missing stroke definitions; whitespace check passed. Release build and iPhone installation exit0; launch succeeded. Logs: `.expo/orange-final-build.log`, `.expo/orange-final-install.log`, `.expo/orange-final-launch.log`. Visual acceptance by user; no E2E per instruction.

## Single-family and search refinement

Latest approval supersedes the earlier two-family design: only IBM Plex Sans is registered and used, with title600/label500/body400. Legacy title/serif aliases retain compatibility but resolve real Sans faces; typography resolver now preserves named static faces from classes as well as explicit styles. Newsreader assets remain on disk but are no longer required or bundled.

Search pages, selector headers and Run reuse the existing Gluestack Field composition and sheet-aware input. Card-neutral fill/subtle border unify their surfaces; tint indicates focus.44pt outer height,16pt icon,42pt input,8pt icon/text spacing, no forced lineHeight on single-line search. No control-density or content spacing change.

Checks: TypeScript passed,15 typography tests passed, lint0 errors/79 warnings, typography inventory clean, whitespace check passed. No E2E at user request. Release build and physical iPhone installation succeeded (both exit0); app launch succeeded. Evidence: `.expo/sans-search-build.log`, `.expo/sans-search-install.log`, `.expo/sans-search-launch.log`. User evaluates alignment on device. Remote Figma changes pending as before.

## Card hierarchy revision and Fast Refresh delivery

- [x] Search default border is transparent; focus border orange with reserved width.
- [x] Shared card hierarchy: title16/22 SemiBold, subtitle12/18,16pt summary gap.
- [x] Env: three equal count/label columns, left/center/right alignment, no redundant icons.
- [x] Server: status/GPU first row aligned, VRAM text/meter beneath GPU, no footer metadata icons. Manual badge and required cached/multi-GPU behavior retained.
- [x] TypeScript and whitespace checks passed; lint0 errors/79 warnings. No E2E as requested.
- [x] Debug development build compiled and installed successfully; payload launch succeeded. Metro on192.168.18.110:8081 bundled iOS (5941 modules), followed by incremental bundle. Native device now uses development build for Fast Refresh; UI-only edits need no reinstall.
- Evidence: `.expo/dev-fast-refresh-build.log`, `.expo/dev-fast-refresh-install.log`, `.expo/dev-fast-refresh-launch.log`; persistent Metro in `comfy-portal:1`.
- User reviews actual visual result. Remote Figma revisions remain pending.
