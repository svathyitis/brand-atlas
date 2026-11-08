/* Brand Atlas - service worker.
 * Deliberately small: no persistent storage, no browsing-history access,
 * no host permissions. It keeps only the id of the last web tab the user
 * viewed (so the popup knows which page it was opened from), and proxies
 * file downloads (chrome.downloads needs no host permission for public URLs).
 */
var lastHttpTabId = null;

function noteTab(tabId) {
  if (typeof tabId !== "number") return;
  chrome.tabs.get(tabId, function (tab) {
    if (!chrome.runtime.lastError && tab && /^https?:/.test(tab.url || "")) {
      lastHttpTabId = tabId;
    }
  });
}

chrome.tabs.onActivated.addListener(function (info) { noteTab(info.tabId); });
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
  if (changeInfo.status === "complete") noteTab(tabId);
});

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg && msg.type === "get-target-tab") {
    sendResponse({ tabId: lastHttpTabId });
    return false;
  }
  if (msg && msg.type === "download-asset" && typeof msg.url === "string") {
    chrome.downloads.download(
      { url: msg.url, saveAs: false, conflictAction: "uniquify" },
      function (downloadId) {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ ok: true, downloadId: downloadId });
        }
      }
    );
    return true; // async response
  }
  return false;
});
