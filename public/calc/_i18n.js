/* engineers.ge shared i18n helper for standalone calculator iframes
 * Resolves locale from ?lang=, `lang` cookie, or parent <html lang>.
 * Exposes window.engCalcI18n.apply({ locale: {title, selectors} }).
 */
(function () {
  var SUPPORTED = ['ka', 'en', 'ru', 'tr', 'az', 'hy'];

  function normalizeLocale(input) {
    var raw = String(input || '').trim().toLowerCase();
    if (!raw) return 'ka';
    if (SUPPORTED.indexOf(raw) >= 0) return raw;
    var base = raw.split('-')[0];
    return SUPPORTED.indexOf(base) >= 0 ? base : 'ka';
  }

  function readCookie(name) {
    try {
      var match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : '';
    } catch (e) {
      return '';
    }
  }

  function resolveLocale() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.has('lang')) return normalizeLocale(params.get('lang'));
    } catch (e) {}
    var fromCookie = normalizeLocale(readCookie('lang'));
    if (fromCookie) return fromCookie;
    try {
      if (window.parent && window.parent !== window) {
        return normalizeLocale(window.parent.document.documentElement.lang);
      }
    } catch (e) {}
    return normalizeLocale(document.documentElement.lang);
  }

  function setLocale(locale) {
    var next = normalizeLocale(locale);
    document.documentElement.lang = next;
    window.ENG_LOCALE = next;
    return next;
  }

  function applyEntry(el, entry) {
    if (!el || entry == null) return;
    if (typeof entry === 'string') {
      el.textContent = entry;
      return;
    }
    if (entry.html != null) el.innerHTML = entry.html;
    if (entry.text != null) el.textContent = entry.text;
    if (entry.title != null) el.setAttribute('title', entry.title);
    if (entry.placeholder != null) el.setAttribute('placeholder', entry.placeholder);
    if (entry.ariaLabel != null) el.setAttribute('aria-label', entry.ariaLabel);
    if (entry.value != null && 'value' in el) el.value = entry.value;
  }

  function apply(defs) {
    var locale = setLocale(window.ENG_LOCALE || resolveLocale());
    var config = defs && (defs[locale] || defs.ka);
    if (!config) return locale;
    if (config.title) document.title = config.title;
    var selectors = config.selectors || {};
    Object.keys(selectors).forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (node) {
        applyEntry(node, selectors[selector]);
      });
    });
    return locale;
  }

  window.engCalcI18n = {
    locale: setLocale(resolveLocale()),
    resolveLocale: resolveLocale,
    setLocale: setLocale,
    apply: apply
  };
})();
