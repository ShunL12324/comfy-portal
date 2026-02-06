# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains Expo Router routes and layouts (`app/(tabs)`, `app/workflow/[serverId]`, `app/settings`, `app/guide`).
- `features/` holds domain modules (`server`, `workflow`, `generation`, `ai-assistant`, `comfy-node`) with colocated `components/`, `stores/`, and `utils/`.
- `components/` is for shared UI (`ui/`, `common/`, `layout/`, `self-ui/`), while `services/` handles ComfyUI/network/storage integration.
- `store/`, `constants/`, `utils/`, and `assets/` contain app-wide state, config, helpers, fonts, and images.
- `docs/` is VitePress content; CI workflows live in `.github/workflows/`.

## Build, Test, and Development Commands
- `npm install` or `npx expo install`: install dependencies.
- `npm run start`: start Expo dev server.
- `npm run ios`, `npm run android`, `npm run web`: start platform-specific targets.
- `npx expo run:ios -d`: build/run on iOS device.
- `npm run lint`: run lint checks.
- `npm test`: run Jest (`jest-expo`) in watch mode.
- `npm run docs:dev` and `npm run docs:build`: develop/build documentation.

## Expo/iOS Session Rules
- Run all Expo and iOS commands inside the persistent tmux session `comfy-portal`.
- Check current session output first: `tmux capture-pane -t comfy-portal -p | tail -30`.
- Send commands via `tmux send-keys -t comfy-portal '<command>' Enter`.
- Stop running processes with `tmux send-keys -t comfy-portal C-c` before starting a new one.
- Do not kill the tmux session (`tmux kill-session -t comfy-portal` is forbidden).

## Coding Style & Naming Conventions
- TypeScript strict mode is required.
- Format with Prettier (`tabWidth: 2`, `singleQuote: true`, semicolons, trailing commas, `printWidth: 120`).
- Prefer alias imports (`@/...`) over deep relative paths.
- Use `PascalCase` for components/types, `useXxx` for hooks, and kebab-case for route-oriented file names.
- Keep state in Zustand stores and follow existing store patterns.

## Testing Guidelines
- Framework: Jest with `jest-expo`.
- Add tests for new logic as `*.test.ts` or `*.test.tsx`, near source or in `__tests__/`.
- Before a PR, run `npm run lint` and `npm test`.

## Commit & Pull Request Guidelines
- Follow existing history style: short, imperative commits, commonly using `feat:`, `fix:`, `refactor:`, `docs:`, or `CI:`.
- Keep each commit focused on one change set.
- PRs should include summary, linked issues, validation steps, and screenshots/videos for UI changes.

## Security & Configuration Tips
- Never commit secrets in `.env.local` or server credentials.
- Remove sensitive data from shared workflow JSON files before posting in issues/PRs.
