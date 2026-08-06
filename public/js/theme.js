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
    try {
      localStorage.setItem('nexora_theme', theme);
    } catch (e) {}
    updateIcons(theme);
  }

  function updateIcons(theme) {
    const sunIcons = document.querySelectorAll('#themeSunIcon, #admSunIcon, .sun-icon');
    const moonIcons = document.querySelectorAll('#themeMoonIcon, #admMoonIcon, .moon-icon');

    sunIcons.forEach(icon => {
      if (icon) icon.style.display = theme === 'light' ? 'block' : 'none';
    });
    moonIcons.forEach(icon => {
      if (icon) icon.style.display = theme === 'light' ? 'none' : 'block';
    });
  }

  // Apply immediately to prevent FOUC
  const initialTheme = getSavedTheme();
  applyTheme(initialTheme);

  function init() {
    applyTheme(getSavedTheme());

    document.addEventListener('click', function (e) {
      const btn = e.target.closest('#themeToggleBtn, #adminThemeToggleBtn, .theme-toggle-btn');
      if (btn) {
        e.preventDefault();
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const next = isLight ? 'dark' : 'light';
        applyTheme(next);
      }
    });

    window.addEventListener('storage', function (e) {
      if (e.key === 'nexora_theme' && e.newValue) {
        applyTheme(e.newValue);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
