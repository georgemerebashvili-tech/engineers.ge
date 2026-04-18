/* engineers.ge shared theme sync for calculator iframes
 * 1. Apply dark class ASAP via parent's <html class="dark"> or localStorage.theme
 * 2. Watch parent for changes via MutationObserver — flip .dark on this doc
 * Same-origin iframe assumption; iframe sandbox must include allow-same-origin.
 * Load as inline <script> in <head> BEFORE styles render to avoid flash.
 */
(function () {
  function applyDark(isDark) {
    var r = document.documentElement;
    r.classList.toggle('dark', !!isDark);
    r.style.colorScheme = isDark ? 'dark' : 'light';
  }
  function detectDarkFromParent() {
    try {
      if (window.parent && window.parent !== window) {
        return window.parent.document.documentElement.classList.contains('dark');
      }
    } catch (e) {}
    try {
      var stored = localStorage.getItem('theme') || 'system';
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) {
      return false;
    }
  }
  applyDark(detectDarkFromParent());

  function watchParent() {
    try {
      if (window.parent && window.parent !== window) {
        var parentHtml = window.parent.document.documentElement;
        var obs = new MutationObserver(function () {
          applyDark(parentHtml.classList.contains('dark'));
        });
        obs.observe(parentHtml, { attributes: true, attributeFilter: ['class'] });
      }
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchParent);
  } else {
    watchParent();
  }

  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      applyDark(detectDarkFromParent());
    });
  } catch (e) {}
})();
