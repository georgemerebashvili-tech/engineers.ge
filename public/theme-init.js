(function () {
  try {
    var s = localStorage.getItem('theme') || 'system';
    var d =
      s === 'dark' ||
      (s === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var r = document.documentElement;
    if (d) r.classList.add('dark');
    r.style.colorScheme = d ? 'dark' : 'light';
    r.setAttribute('data-mui-color-scheme', d ? 'dark' : 'light');
  } catch (e) {}
})();
