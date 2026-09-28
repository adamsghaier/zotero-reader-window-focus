/*
 * Reader Window Focus
 *
 * Problem: every zotero:// link (e.g. the "(Open page)" links in Obsidian notes)
 * is handled by Zotero.CommandLineIngester.ingest(), which ALWAYS focuses the main
 * window first and only then routes the link. If the paper is open in a separate
 * reader window, the reader jumps to the page, then the main window lands on top.
 *
 * Fix: for zotero://open-pdf (and zotero://open) links whose attachment is already
 * open in a separate reader window, run the same link action but skip the
 * main-window focus, then focus that reader window. Every other link, including a
 * paper open in a tab or not open at all, goes through Zotero's original code
 * unchanged.
 *
 * Fail-safe: if Zotero's internals change so this can't hook in, it does nothing
 * and Zotero behaves exactly as it would without the plugin. Any error falls back
 * to Zotero's original handling, so a link is never lost.
 */

var originalIngest = null;

function log(msg) {
  Zotero.debug("ReaderWindowFocus: " + msg);
}

// The separate reader window showing this link's attachment, or null.
function readerWindowFor(uri) {
  if (!uri || !uri.schemeIs("zotero") || !["open-pdf", "open"].includes(uri.host)) {
    return null;
  }
  let path = (uri.pathQueryRef || "").split("?")[0].replace(/^\/+/, "");
  let libraryID, key, m;
  if ((m = path.match(/^library\/items\/([A-Z0-9]{8})/))) {
    libraryID = Zotero.Libraries.userLibraryID;
    key = m[1];
  }
  else if ((m = path.match(/^groups\/(\d+)\/items\/([A-Z0-9]{8})/))) {
    libraryID = Zotero.Groups.getLibraryIDFromGroupID(parseInt(m[1]));
    key = m[2];
  }
  else {
    return null;
  }
  let item = libraryID && Zotero.Items.getByLibraryAndKey(libraryID, key);
  if (!item) return null;
  return (Zotero.Reader._readers || []).find(r =>
    r.itemID === item.id
    && r._window && !r._window.closed
    && r._window.document
    && r._window.document.documentURI === "chrome://zotero/content/reader.xhtml"
  ) || null;
}

async function patchedIngest(...args) {
  try {
    const { CommandLineOptions } = ChromeUtils.importESModule(
      "chrome://zotero/content/modules/commandLineOptions.mjs");
    const uri = CommandLineOptions.url;
    const reader = readerWindowFor(uri);
    if (reader) {
      const handler = Services.io.getProtocolHandler("zotero").wrappedJSObject;
      await handler.getExtension(uri).doAction(uri);   // same action Zotero runs, minus the main-window focus
      CommandLineOptions.url = false;                   // consumed, as Zotero's own ingest does
      CommandLineOptions.file = false;
      reader._window.focus();
      log("kept " + uri.spec + " in its reader window");
      return;
    }
  }
  catch (e) {
    Zotero.logError(e);   // fall through to Zotero's normal behaviour
  }
  return originalIngest.apply(Zotero.CommandLineIngester, args);
}

function install() {}
function uninstall() {}

function startup() {
  const ingester = Zotero.CommandLineIngester;
  if (!ingester || typeof ingester.ingest !== "function") {
    log("Zotero.CommandLineIngester not found; doing nothing");
    return;
  }
  originalIngest = ingester.ingest;
  ingester.ingest = patchedIngest;
  log("active");
}

function shutdown() {
  if (originalIngest && Zotero.CommandLineIngester) {
    Zotero.CommandLineIngester.ingest = originalIngest;
  }
  originalIngest = null;
}
