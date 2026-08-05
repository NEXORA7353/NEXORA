// NEXORA Theme Toggle Module (Light / Dark Mode)
(function () {
  function getSavedTheme() {
    return localStorage.getItem('nexora_theme') || 'dark';
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('nexora_theme', theme);
    updateIcons(theme);
  }

  function updateIcons(theme) {
    const sunIcons = document.querySelectorAll('#themeSunIcon, #admSunIcon');
    const moonIcons = document.querySelectorAll('#themeMoonIcon, #admMoonIcon');

    sunIcons.forEach(icon => {
      if (icon) icon.style.display = theme === 'light' ? 'block' : 'none';
    });
    moonIcons.forEach(icon => {
      if (icon) icon.style.display = theme === 'light' ? 'none' : 'block';
    });
  }

  function init() {
    const current = getSavedTheme();
    applyTheme(current);

    document.addEventListener('click', function (e) {
      const btn = e.target.closest('#themeToggleBtn, #adminThemeToggleBtn');
      if (btn) {
        e.preventDefault();
        const now = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const next = now === 'light' ? 'dark' : 'light';
        applyTheme(next);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
