# ONLYOFFICE add-on for Thunderbird

Thunderbird MailExtension (manifest v2, TB ≥ 128) that opens/edits mail attachments in ONLYOFFICE Docs.
Plain ES modules, no bundler, no framework, no runtime npm deps. See HANDOVER.md for background.

## Commands

```bash
git submodule update --init --recursive   # required: vendor/document-formats, vendor/document-templates
npm install                               # eslint only
npm test                                  # node:test unit/smoke tests (tests/*.test.js), needs submodules
make lint                                 # eslint (airbnb-base), CI runs this + npm test on every push/PR
make install-tools                        # global terser, clean-css-cli, html-minifier-terser
make build SERVER_URL=https://… SERVER_SECRET=…   # -> build/ (unpacked) + dist/thunderbird.zip
```

Run locally: Thunderbird → Tools → Developer Tools → Debug Add-ons → Load Temporary Add-on → `build/manifest.json`.
The unbuilt source tree does NOT run: `config/config.json` and `manifest.json` contain `$SERVER_URL$` placeholders.

## Layout

- `background.js` — entry: loads config, registers menus/actions, routes `runtime.onMessage` to `common/handlers.js`.
- `common/` — `config.js` (config + formats), `handlers.js` (background message handlers, compose API),
  `window.js` (menus, popup windows), `editor.js` (DocsAPI config, save), `api.js` (page → background calls),
  `jwt.js` (HS256 via WebCrypto), `file.js`, `i18n.js` (`data-i18n-<attr>` localizer), `constants.js`.
- `pages/` — `viewer.html` (file list / editor) and `create.html` (new file dialog); tiny router in `router.js`.
- `components/` — HTML `<template>`s + JS/CSS per component.
- `_locales/<lang>/messages.json` — 9 locales; all must have the same keys as `en-US` (tested).
- `vendor/` — git submodules; never edit, bump the submodule instead.
- `tests/` — `node --test`; `tests/helpers/env.js` stubs `browser`/`messenger`/`window`/`fetch`.

## Conventions

- Conventional commits with scope: `fix(common): ...`, `feat(pages): ...`, `chore(locales): ...`.
- Branches: work in `develop` / `feature/*`, release from `master`. CI build only runs on `master`.
- Every source file starts with the Apache-2.0 "(c) Copyright Ascensio System SIA" header.
- Any new UI string: add the key to ALL `_locales/*/messages.json`; use `messenger.i18n.getMessage` or
  `data-i18n-content` / `data-i18n-<attr>` (plain `data-i18n` is NOT handled).
- Max line length 120; `.js` extension in every import.

## Never

- Never commit `build/` or `dist/` (gitignored): they contain the real server URL and JWT secret.
- Never put a real URL or secret into `config/config.json` / `manifest.json` — keep the `$...$` placeholders (tested).
- Don't change the extension id `support@onlyoffice.com` — it identifies the add-on on ATN and for updates.
- Don't switch `document.url` away from `'_data_'` / `openDocument()` without a storage/callback design (see HANDOVER §5).
