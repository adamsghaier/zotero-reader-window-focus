# Reader Window Focus for Zotero

Zotero brings the main window to the front for every `zotero://` link. So a page
link (`zotero://open-pdf/...`, e.g. from an Obsidian note) to a paper that's
already open in a **separate reader window** jumps to the right page and then
hides it behind the main window.

This plugin keeps such links in their reader window: it runs the same link action
without focusing the main window, then focuses the reader window. Every other link
(a paper open in a tab, or not open at all) goes through Zotero's normal handling.
If Zotero's internals change so that the hook can't be installed, the plugin does
nothing.

Zotero 7–10. Written against Zotero 10's `Zotero.CommandLineIngester.ingest`.

## Install
Download `reader-window-focus.xpi` from the latest [release](../../releases/latest),
then in Zotero: **Tools → Plugins → ⚙ → Install Plugin From File…**. Updates arrive
through Zotero's own update check.

## Release (maintainer)
Bump `version` in `manifest.json`, commit, then run `./release.sh`.
