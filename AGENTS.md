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
- `python download_pandoc.py` — download pandoc binary to `desktop/resources/`

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
- Test suite: `mobile/` — vitest (toc, JSONPath), run `npm run test` inside `mobile/`.
- `build/`, `dist/`, `logs/`, `.expo/`, `out/`, `release/` are generated — don't edit.
