# Workflow sources and server observations

Implemented in production:

- One workflow list with Imported/Server badges and shared source filters when both origins exist.
- Stable server-file identity and persisted server baseline/incoming update; remote updates preserve local edits.
- Keep copy and update, confirmed replacement, removed-source conversion, durable hide and restoration.
- Failed discovery and missing extension preserve cached workflows; validated directory listings alone establish removal.
- Server cards keep their existing identity layout, show compact live VRAM/latency and cached GPU identity, and expose a separate read-only details sheet.
- The server destination starts with Workflows; settings editing remains a separate AppBar action.
- Native request timeouts use AbortController instead of browser-only AbortSignal static helpers.

Validation:

- TypeScript and targeted source ESLint passed before the device build.
- Typography inventory check passed: 304 source modules, 235 UI/style modules; no unmanaged fonts.
- Initial unit pass: 45/46 passed; the remaining failure was an expected-object assertion including an undefined property removed during cloning. Assertion corrected; rerun deferred for immediate device delivery.
- Initial browser run was interrupted by Metro running out of memory. E2E execution stopped at the user's explicit request; no passing browser-suite claim.
- Physical iPhone 15 Pro Release build succeeded; installation and launch both completed successfully (exit 0). Evidence: `.expo/workflow-source-device-build-retry.log`, `.expo/workflow-source-device-install.log`, `.expo/workflow-source-device-launch.log`. The initial build failed only at unauthenticated Sentry sourcemap upload; the successful retry disabled auto-upload for that command via `SENTRY_DISABLE_AUTO_UPLOAD=true`. App data was retained.
- Existing Figma specimens are mapped in the library manifest; extensions to those specimens remain explicitly pending, rather than claiming the remote file was updated.

Simplification follow-up:

- Single Workflows AppBar with Add/settings; no repeated heading/count or persistent sync-success text.
- Plain paper rows, text-aligned separators, origin/optional usage metadata; no individual card fills, origin badges, arrows or Not run yet labels.
- Full-width search/source-filter alignment retained; filters omit counts. Errors/restoration remain below the list; missing-extension guidance remains in the empty state.
- TypeScript, targeted ESLint and typography inventory check passed. No E2E run, per user preference.
- Release build and physical iPhone installation succeeded. Automatic launch was denied because the phone was locked; the installed app can be opened after unlocking. Evidence: `.expo/workflow-simple-device-{build,install,launch}.log`. Existing app data retained.
