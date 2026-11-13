# Handover: ONLYOFFICE add-on for Thunderbird

## 1. Integration type

- **Plugin inside the host**: Thunderbird MailExtension, manifest v2, id `support@onlyoffice.com`,
  `strict_min_version: 128.0` (128 ESR and newer) **[code]**. 140 ESR - verify with the smoke checklist.
- No backend of its own. The add-on works with **ONLYOFFICE Docs** (Document Server):
  - loads `https://<server>/web-apps/apps/api/documents/api.js` into the extension page
    (the server is allowed in the manifest CSP and host permissions at build time);
  - passes the file **directly as bytes**: `document.url = '_data_'`, `type: 'desktop'`, then on `onAppReady`
    calls `docEditor.openDocument(Uint8Array)` **[code]**. No storage, no callbackUrl; Docs neither downloads
    nor stores the file;
  - saving goes through the `onSaveDocument` / `onDownloadAs` events, which hand the file back to the add-on.
- Production server: `https://thunderbird.docs.onlyoffice.com` (responds `/healthcheck: true`). It is a dedicated
  ONLYOFFICE Docs Cloud instance **[unconfirmed: who administers it, which Docs version]**.
  The minimum Docs version for the `_data_`/`openDocument` mode is not documented; it is the desktop-editors
  mechanism that appeared around 8.x-9.x **[unconfirmed]**.
- JWT: the config is signed **on the client** (HS256, WebCrypto, exp = 10 min); the secret is embedded in
  `config/config.json` inside the XPI. See §5.

## 2. Key features

| # | Scenario | Where in code |
|---|----------|---------------|
| F1 | View/edit an attachment of a received message: attachment context menu "Open with ONLYOFFICE" (shown only for a single supported attachment) | `window.js: openAttachmentViewer`, `pages/viewer.js` |
| F2 | List of a message's supported attachments: ONLYOFFICE button in the message window or the message list context menu; each file has "open" (✏️ if editable, 👁 if view-only) and "download" | `openMessageViewer`, `FileListPage` |
| F3 | Saving in a received message: the message cannot be modified, so "Save" = download the file | `editor.js: onSaveDocument - downloadFile` |
| F4 | Compose window - ONLYOFFICE button (menu): "Open files list" - list of the draft's attachments | `openComposeViewer` |
| F5 | Edit a draft attachment and save it back into the message (the attachment is removed and re-added, its id changes) | `saveFile`, `handlers.saveComposeAttachment` |
| F6 | "Create a document": docx/xlsx/pptx from a template matching the UI language (fallback `default`), attached to the draft | `handlers.createNewDocument`, `pages/create.js` |
| F7 | Browser warning about unsaved changes when closing the editor window | `setupUnsavedChangesWarning` |
| F8 | Dark theme (`*_dark.svg` icons, CSS), 9 locales: de, en-US, es, fr, it, ja, pt-BR, ru, zh | `styles/global.css`, `_locales` |

Viewable and editable formats come from the `document-formats` submodule (`actions: view/edit/fill...`), see README.
The user name in the editor is the first identity of the first Thunderbird account.

## 3. Build

- Toolchain: Node >= 18 (CI uses Node 20; tests verified on 20 and 23), GNU make, `zip`. Global tools: `terser`,
  `clean-css-cli`, `html-minifier-terser` (`make install-tools`). The last one is checked by the Makefile but never used.
- Submodules (public, no access needed):
  - `vendor/document-formats` - `ONLYOFFICE/document-formats`;
  - `vendor/document-templates` - `ONLYOFFICE/document-templates`, branch **`main/new-2letter-code`**
    (two-letter locale codes + `default/`). The code looks up the template in `<locale>`, `<lang>`, then `default`.
- `make build SERVER_URL=... SERVER_SECRET=...`:
  1. copies sources into `build/`;
  2. sed-substitutes `$SERVER_URL$` in `config/config.json` **and** `manifest.json` (CSP + permissions),
     `$SERVER_SECRET$` in config. Without `SERVER_URL` it substitutes `http://127.0.0.1`, and **such a build does
     not work**: `config.js` accepts only `https://`;
  3. minifies JS (terser) and CSS (cleancss);
  4. packs `dist/thunderbird.zip` (this is the XPI, manifest at the root) and `dist/thunderbird.tar.gz`.
- Secrets: in CI, `SERVER_URL` / `SERVER_SECRET` are read from the repository GitHub Secrets (`secrets.SERVER_URL`,
  `secrets.SERVER_SECRET`) or from `workflow_dispatch` inputs. Whether they are set in the repository and who else
  holds the `thunderbird.docs.onlyoffice.com` server secret: **[unconfirmed]**. Most likely the Docs Cloud admins
  and the previous owner; the value is also in the previous owner's local `build/config/config.json`. Request it
  from the server owner.
- CI: `lint.yml` (lint + `npm test`, all branches) and `build.yml` (only `master` / PRs to master / manual run;
  the artifact is the `build/` folder, not the zip). **`origin/master` contains only `Initial commit`**, so
  production builds were made locally. Merge `develop` into `master` before the first release.
- Important: a CI artifact with the real secret is visible to anyone with access to the repository's Actions (the
  repo is public). Building production releases locally is safer.

## 4. Marketplace publication

- The only marketplace is **addons.thunderbird.net (ATN)**.
- Process: Developer Hub - Submit a New Add-on - listed - upload `dist/thunderbird.zip` - automatic
  validation - manual review (usually from a few days to a few weeks).
- Likely rejection reasons (per ATN/AMO policies; check in advance):
  1. **Minified code**: ATN requires attaching the sources and build instructions. The code is small anyway, so
     it is simpler to disable terser/cleancss for the marketplace build.
  2. **Remote code**: `api.js` is loaded from an external server into the extension page, plus `'unsafe-eval'` in
     the CSP. This is the main rejection risk. Argument for the reviewer: it is the official ONLYOFFICE Docs API,
     which works only inside the editor iframe. Other ONLYOFFICE add-ons use the same scheme.
  3. **Embedded secret and host permission** for a specific server: the reviewer may ask why.
  4. Description and privacy policy: the attachment file is sent to the ONLYOFFICE server; this must be stated in
     the listing.
- Thunderbird does not require signing for installation from a file, so outside the marketplace the XPI can be
  distributed directly (GitHub Releases).

## 5. Implicit knowledge

- **The secret in the client is a deliberate trade-off.** Without a backend there is nowhere to sign the config, so
  the secret ships in the XPI and can be extracted by unpacking it. Hence a separate server just for this add-on: a
  leaked secret does not affect other customers. Do not reuse this secret and server for other integrations.
- **`url: '_data_'` + `openDocument()`** - passes the file without storage (mail is not a storage with URLs). Do not
  touch without a new architecture: the normal mode requires Docs to download the file by URL and save it via a
  callback.
- **Random `document.key`** on every open: no co-editing, the Docs cache is not used. That's fine, the file lives
  only in the message.
- **`forcesave: false`, saving via `onSaveDocument`**: Ctrl+S in the editor hands the file to the add-on.
  In a draft the attachment is recreated (`removeAttachment` + `addAttachment`), so the attachment id changes:
  lookup is by name (`saveFile`). Two attachments with the same name - undefined behavior.
- A received message cannot be modified, so saving there = downloading.
- `api.js` passes `data` to sendMessage as `Array.from(Uint8Array)`: structured clone of an ArrayBuffer between the
  page and background was unreliable in TB. Slow for large files.
- `type: 'desktop'` and `scrolling="no"` on the iframe make the editor fill the popup window without scrolling.
- `WindowManager.openWindows` prevents opening the same window twice: it focuses the existing one.
- Compose menu icons switch dynamically on `prefers-color-scheme`.
- `limits.maxFileSizeMB` in the config is **not used**.
- `vendor/document-templates` is pinned to the `main/new-2letter-code` branch: the main branch uses a different
  locale folder scheme.

## 6. Known issues and tech debt

- `master` is empty, CI build never ran on it; versions are out of sync: manifest `1.0`, package.json
  `0.1.0`, CHANGELOG `1.0.0`.
- No protection against large files (`maxFileSizeMB` is not enforced); base64 and Array copies in memory.
- On error, `onSaveDocument` only logs to the console; the user does not see that saving failed.
- `getUserInfo` takes the first account, not the one the message was opened from.
- In the Makefile, `JS_*`/`HTML_FILES` and the html-minifier check are dead code.
- Automated tests (`tests/`) cover only logic without Thunderbird. UI and Docs integration must be checked
  manually, see §8.

## 7. Manual smoke checklist (before every release)

Install `dist/thunderbird.zip` into a clean profile of TB 128 ESR and the latest ESR.

- [ ] F1: message with a docx - right-click the attachment - "Open with ONLYOFFICE" - opens in edit mode.
- [ ] F1: `.doc` attachment - opens in view mode; `.zip`/`.exe` - no menu item.
- [ ] F2: ONLYOFFICE button in the message window - list of supported files only, sizes, type icons; "download" works.
- [ ] F2: message without attachments - empty state.
- [ ] F3: edit a docx from a received message - Ctrl+S - the file is downloaded.
- [ ] F4/F5: new message + xlsx attachment - ONLYOFFICE menu - "Open files list" - edit - Ctrl+S - close -
      the attachment in the draft is updated (reopen it - the edit is there).
- [ ] F6: "Create a document" - docx/xlsx/pptx with the given name appears in the attachments; with the UI in
      Russian the template is Russian.
- [ ] F7: modify a document and close the window - warning shown.
- [ ] F8: OS dark theme - menu and list icons are dark; switching the theme on the fly changes the compose menu icons.
- [ ] Clicking the same attachment again focuses the open window instead of opening a second one.
- [ ] PDF: opening and filling a form.
