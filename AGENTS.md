# AGENTS.md

This file provides guidance to the AI agent when working with code in this repository.

## Project layout

Three subprojects in one folder (no workspaces):
- `mobile/` — React Native reader app (Expo SDK 57). Has its own `@mobile/AGENTS.md` with the Expo versioned-docs rule — read it before touching mobile code.
- `desktop/` — Electron + Vite + React reader & converter GUI. Two tabs: reading + conversion. Office↔Markdown conversion uses shared engine with CLI.
- `desktop/cli/` — Node CLI tool (`molan convert`). Office/PDF/PPT/Excel → Markdown, structured JSON output for AI/agent consumption. Main AI entry point.
- Root — early Python prototype (`mdconvert.py`) and the product spec.

`PRD.md` is the product source of truth. Consult the relevant section before implementing any feature (use the `/prd` skill).

## Commands

desktop/ (run inside `desktop/`):
- `npm run dev` — electron-vite dev
- `npm run build` — build
- `npm run build:dist` — build + NSIS installer (bundles pandoc.exe)
- `npm run typecheck` — tsc on node + web configs (main correctness check)

desktop/cli/ (run inside `desktop/cli/`):
- `npm run build` — esbuild bundle → `dist/index.js`
- `npm run typecheck` — tsc
- `node dist/index.js convert <file> --json` — Office → Markdown
- `node dist/index.js check` — verify pandoc is available

mobile/ (run inside `mobile/`):
- `npm run start` — `expo start`
- `npm run android` / `ios` / `web`
- Expo SDK 57 is recent; if writing Expo code, read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ first.

Root:
- `python scripts/download_pandoc.py` — download pandoc binary to `desktop/resources/`

## Architecture

### Conversion engine (shared, desktop + CLI)

`desktop/src/shared/converter.ts` is the single conversion engine used by both the Electron GUI (`electron/main/index.ts`) and the CLI (`cli/src/index.ts`). It wraps pandoc and provides:

- `convertFile(inputPath, outputFormat, outputDir)` → `ConvertResult`
- `convertBatch(inputs, outputFormat, outputDir, concurrency)` → `ConvertResult[]`
- Error codes: `E_PANDOC_MISSING`, `E_UNSUPPORTED_FORMAT`, `E_INPUT_NOT_FOUND`, `E_CONVERT_FAILED`, `E_OUTPUT_FAILED`
- Supported formats: `docx`, `pdf`, `pptx`, `xlsx`, `csv`, `md`, `json`
- `pandocPath()` resolves via: `PANDOC_PATH` env → `resources/pandoc.exe` → system PATH

**Do not duplicate pandoc-calling logic.** Always route through `converter.ts`.

### mobile conversion (separate, offline)

Mobile uses pure JS libraries (no pandoc): `mammoth` (docx→md), `docx` (md→docx), `marked` (md→HTML), `expo-print` (md→PDF). These are in `mobile/src/converter/`. Do not import from `desktop/src/shared/` in mobile.

### Key shared types

- `desktop/src/shared/ipc.ts` — TypeScript interfaces shared between Electron main + renderer. Defines `ConvertTask`, `ReadableFile`, `ipcChannels`. The preload script (`electron/preload/index.ts`) exposes these via `contextBridge`.
- `desktop/src/global.d.ts` — `window.api` type declaration consumed by renderer React code.

### mobile code organization

- `App.tsx` — top-level: state machine (reader vs JSON view), bottom sheet orchestration, file open via `Linking` + `DocumentPicker`
- `src/components/Reader.tsx` — Markdown reader (marked-based), scroll position memory, theme-aware
- `src/components/JsonView.tsx` / `JsonTree.tsx` — JSON tree viewer with collapse/search/copy
- `src/components/EditSheet.tsx` — modal editor: source/preview toggle, JSON validate+format, auto-draft, save-as-copy, save-and-share
- `src/components/PromptSheet.tsx` — prompt library: list/search/import/copy, recent copies section
- `src/components/RecentSheet.tsx` — recent documents list
- `src/components/ConvertSheet.tsx` — format conversion panel
- `src/storage/` — AsyncStorage-backed persistence for prompts (`prompts.ts`) and recent docs (`recentDocs.ts`)
- `src/theme.ts` — day/night theme from system `useColorScheme()`

### desktop GUI code organization

- `App.tsx` — two tabs: reader (default), converter. Listens for `open-file` events from Electron main for file-association launch.
- `src/components/ReaderPanel.tsx` — markdown/JSON reader with file picker
- `src/components/ConvertPanel.tsx` — conversion panel: drag-drop, format selection, batch convert via `window.api.convert()`

### desktop main process

`electron/main/index.ts` handles: window creation + IPC handlers for file dialogs, conversion (via `converter.ts`), settings persistence. `GET_PENDING_FILE` serves files opened via OS file association before renderer is ready. `app.on('open-file')` is the Windows file association handler, pushing file to renderer via IPC.

### File association

Mobile `app.json` registers `.md`/`.markdown`/`.json` open-with (iOS `CFBundleDocumentTypes` + Android `intentFilters`). Desktop GUI registers via Electron's `app.on('open-file')` (dev) and `electron-builder.yml` `fileAssociations` (prod). On open, the reader tab auto-loads the file.

## Conversion engine (differs per subproject — don't mix up)
- `desktop/src/shared/converter.ts` — shared conversion engine (CLI + Electron both use it). Wraps pandoc for Office→MD, Office→docx, MD→docx, with structured error codes.
- `desktop/cli/src/index.ts` — `molan` CLI entry point. Commander-based, supports single-file, batch, glob, `--json` output.
- desktop/ Electron main process calls pandoc (bundled at `desktop/resources/pandoc.exe`).
- mobile/ uses JS libs offline: `mammoth` (docx→md), `docx` (md→docx).
- root `mdconvert.py` uses `pypandoc`.

## App identity
- mobile bundle id: `com.mdreader.app` (slug `md-reader`)
- desktop app id: `com.mdreader.desktop`
- mobile `app.json` already registers `.md` open-with (iOS `CFBundleDocumentTypes` + Android intentFilters for `text/markdown` and `.*\.md`).

## Out-of-scope files (do NOT treat as part of the reader app)
- `config.json` — contains plaintext 教务系统 credentials. Gitignored. Never commit, never read into shared context.
- `school_sdk (1).exe`, `analyze_exe.py`, `hello_tool.py` — unrelated personal/exploration files, gitignored.

## Notes
- No lint/format config exists yet (no eslint/prettier/biome). Use `npm run typecheck` (desktop) as the main correctness check.
- TypeScript versions differ: mobile `~6.0.3`, desktop `^5.6.0`.
- Test suite: `mobile/` and `desktop/cli/` use vitest. Run `npm run test` inside each. Mobile tests cover markdown TOC parsing, JSON tree/path generation, and document status merging. CLI test covers the push/pull/read cloud roundtrip.
- `build/`, `dist/`, `logs/`, `.expo/`, `out/`, `release/` are generated — don't edit.

## Testing strategy (enforced)

Tests slow you down when AI writes them reflexively. Don't write tests to "match features 1:1" or to hit coverage. Write tests only when they catch a bug that would otherwise hide. Judge each candidate by one question: **if this breaks, how fast will you notice without the test?**

### Write tests for — do these immediately when the code lands
- **Pure logic with rules and edge cases.** State machines, parsers, path/ID generators, normalization, merge/dedup rules, regex-driven behavior. Examples in this repo: `parseToc` (Chinese punctuation in IDs, inline token recursion), `mergeDocumentStatuses` (unprocessed-removal ordering), `buildJsonRows` (JSONPath with quoted keys/array indices). These have no UI, no side effects, break silently, and are trivial to get wrong.
- **External output contracts.** Anything an AI or external consumer parses: `molan` CLI JSON output (`--json`), MCP responses, cloud/sync API schemas. `cloud.test.ts` is the model — it locks the push→pull→read roundtrip so a renamed field fails CI instead of silently breaking every AI consumer.

### Do NOT write tests for
- **Thin wrappers over the standard library.** Re-asserting what `JSON.parse`/`JSON.stringify` already guarantees is dead weight; TypeScript already covers the return shape. (We deleted `jsonFormat.test.ts` and `markdownSearch.test.ts` for exactly this.)
- **Functions invented only to be tested.** If a helper has zero references in real code, delete the function, not "test it". (We deleted `jsonPath.test.ts` — `getByPath` was never called anywhere.)
- **UI components, sheets, interactions, RN rendering.** V1 mocks cost more than they catch. Use the manual real-device acceptance checklist (TODO D5.1) and screenshot comparison instead.
- **Type-enforceable invariants.** If `tsc` already proves it, a runtime assertion is redundant.

### Pacing
- Logic/contract tests: written in the same change as the code they cover. They ARE the first way you run that code.
- UI/feature tests: deferred to V1.5+ at the earliest, behind a real acceptance script, never as mock-heavy unit tests.
- Each test must fail-meaningfully: break the SUT in your head and confirm the assertion catches it. If it wouldn't, delete the test.
