# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

墨览 (Molan) — an AI file reader & converter. Two products in one repo:
- **mobile/** — React Native app (Expo SDK 57). Opens `.md`/`.json` from WeChat/QQ, reads, light-edits, copies prompts, converts to PDF/Word, shares back.
- **desktop/** — Electron + Vite + React GUI (reader + converter) + a standalone Node CLI for AI agents.

The PRD is at `PRD.md`. Task tracking at `TODO.md`. Both are source of truth.

## Subproject boundaries

Each subproject has its own `node_modules`, `tsconfig`, and `package.json`. No npm workspaces. Always `cd` into the target directory before running commands.

| | mobile | desktop GUI | desktop CLI |
|---|---|---|---|
| Dir | `mobile/` | `desktop/` | `desktop/cli/` |
| TS version | ~6.0.3 | ^5.6.0 | ^5.6.0 |
| Correctness | `npm run typecheck` | `npm run typecheck` | `npm run typecheck` |
| Test | `npm run test` (vitest) | none | none |
| Run | `npm run start` / `web` | `npm run dev` | `node dist/index.js` |

## Commands

### mobile/

```bash
cd mobile
npm run start          # Expo dev server
npm run web            # Expo web mode (for Chrome UI debugging)
npm run android / ios  # native
npm run typecheck      # tsc --noEmit
npm run test           # vitest run
```

Before writing mobile code, read the versioned Expo docs: https://docs.expo.dev/versions/v57.0.0/

### desktop/ (GUI)

```bash
cd desktop
npm run dev            # electron-vite dev (Vite + Electron window)
npm run typecheck      # tsc on node + web tsconfigs
npm run build          # production build
npm run build:dist     # build + NSIS Windows installer
```

The GUI has two tabs: **阅读** (reader) and **转换** (converter). The AI tab was removed (2026-07-03) — its functionality is handled by the CLI.

### desktop/cli/ (AI agent entry point)

```bash
cd desktop/cli
npm run build          # esbuild → dist/index.js (single CJS file)
npm run typecheck      # tsc
node dist/index.js check                        # verify pandoc is available
node dist/index.js convert report.docx --json   # single file → MD, JSON output
node dist/index.js convert ./docs --batch --json # batch glob → MD
node dist/index.js convert data.xlsx --to md     # Excel → Markdown table
```

The CLI is what AI agents call. It never opens a GUI. Output `--json` for structured machine-readable results.

## Architecture

### Conversion engine (shared)

`desktop/src/shared/converter.ts` is the single conversion engine used by both the Electron GUI (`electron/main/index.ts`) and the CLI (`cli/src/index.ts`). It wraps pandoc and provides:

- `convertFile(inputPath, outputFormat, outputDir)` → `ConvertResult`
- `convertBatch(inputs, outputFormat, outputDir, concurrency)` → `ConvertResult[]`
- Error codes: `E_PANDOC_MISSING`, `E_UNSUPPORTED_FORMAT`, `E_INPUT_NOT_FOUND`, `E_CONVERT_FAILED`, `E_OUTPUT_FAILED`
- Supported formats: `docx`, `pdf`, `pptx`, `xlsx`, `csv`, `md`, `json`
- `pandocPath()` resolves via: `PANDOC_PATH` env → `resources/pandoc.exe` → system PATH

**Do not duplicate pandoc-calling logic.** Always route through `converter.ts`.

### mobile conversion (separate, offline)

Mobile uses pure JS libraries (no pandoc):
- `mammoth` — docx → md
- `docx` — md → docx
- `marked` — md → HTML rendering
- `expo-print` — md → PDF

These are in `mobile/src/converter/`. Do not import from `desktop/src/shared/` in mobile.

### Key shared types

`desktop/src/shared/ipc.ts` — TypeScript interfaces shared between Electron main + renderer. Defines `ConvertTask`, `ReadableFile`, and `ipcChannels`. The preload script (`electron/preload/index.ts`) exposes these via `contextBridge`.

`desktop/src/global.d.ts` — `window.api` type declaration consumed by renderer React code.

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

`electron/main/index.ts` handles:
- Window creation + IPC handlers for file dialogs, conversion (via `converter.ts`), settings persistence
- `GET_PENDING_FILE` — serves files opened via OS file association before renderer is ready
- `app.on('open-file')` — Windows file association handler, pushes file to renderer via IPC

## File association

Mobile `app.json` registers `.md`/`.markdown`/`.json` open-with (iOS `CFBundleDocumentTypes` + Android `intentFilters`).

Desktop GUI registers via Electron's `app.on('open-file')` (dev) and `electron-builder.yml` `fileAssociations` (prod). On open, the reader tab auto-loads the file.

## Versioned docs rule

Expo SDK 57 has breaking changes from earlier versions. Always read https://docs.expo.dev/versions/v57.0.0/ before writing mobile code. The `mobile/CLAUDE.md` delegates to root `AGENTS.md` which includes this rule.

## Boundaries

- `config.json` — personal credentials, gitignored. Never read or commit.
- `build/`, `dist/`, `logs/`, `.expo/`, `out/`, `release/` — generated, never edit manually.
- `school_sdk (1).exe`, `analyze_exe.py`, `hello_tool.py` — unrelated personal files.
- mobile and desktop are separate products — don't import mobile code in desktop or vice versa.
- No lint/formatter config exists. TypeScript typechecking is the correctness gate.
