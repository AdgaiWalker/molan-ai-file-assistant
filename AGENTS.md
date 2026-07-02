# AGENTS.md

This file provides guidance to the AI agent when working with code in this repository.

## Project layout

Three subprojects in one folder (no workspaces):
- `mobile/` — React Native reader app (Expo SDK 57). Has its own `@mobile/AGENTS.md` with the Expo versioned-docs rule — read it before touching mobile code.
- `desktop/` — Electron + Vite + React md↔word converter GUI.
- Root — early Python prototype (`mdconvert.py`) and the product spec.

`PRD.md` is the product source of truth. Consult the relevant section before implementing any feature (use the `/prd` skill).

## Commands

desktop/ (run inside `desktop/`):
- `npm run dev` — electron-vite dev
- `npm run build` — build
- `npm run build:dist` — build + NSIS installer (bundles pandoc.exe)
- `npm run typecheck` — tsc on node + web configs (main correctness check)

mobile/ (run inside `mobile/`):
- `npm run start` — `expo start`
- `npm run android` / `ios` / `web`
- Expo SDK 57 is recent; if writing Expo code, read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ first.

Root Python:
- `python mdconvert.py <file...>` — convert .md↔.docx (drag-drop or CLI)
- `pyinstaller mdconvert.spec` — build standalone exe into `dist/`
- Requires `pypandoc` and a pandoc binary on PATH.

## Conversion engine (differs per subproject — don't mix up)
- desktop/ calls pandoc (bundled at `desktop/resources/pandoc.exe`).
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
- No test suite yet.
- `build/`, `dist/`, `logs/`, `.expo/`, `out/`, `release/` are generated — don't edit.
