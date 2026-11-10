// Runs on 123resume.de. When the user is logged in, their JWT lives in the
// page's localStorage (set by the site itself). We hand it to the extension so
// it can read the user's own resumes. We never send it anywhere else.

(function () {
  function readLogin() {
    try {
      const tokens = JSON.parse(localStorage.getItem("tokens") || "null");
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (tokens && tokens.access && tokens.refresh) {
        chrome.runtime.sendMessage({
          type: "store-login",
          access: tokens.access,
          refresh: tokens.refresh,
          user: user || null,
        });
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }

  // Try now, and again shortly after in case the app writes tokens on load.
  if (!readLogin()) {
    setTimeout(readLogin, 2000);
  }
})();
