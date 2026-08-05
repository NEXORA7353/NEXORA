// NEXORA Click Analytics Tracker Module
(function () {
  window.trackNexoraLinkClick = function (appName, linkTitle, linkUrl) {
    if (!linkUrl) return;
    const urlKey = linkUrl.trim();

    // 1. Save to Local Storage immediately
    try {
      const stored = JSON.parse(localStorage.getItem('nexora_link_clicks') || '{}');
      if (!stored[urlKey]) {
        stored[urlKey] = {
          appName: appName || 'Platform',
          linkTitle: linkTitle || 'Access Link',
          url: urlKey,
          count: 0,
          lastClicked: new Date().toISOString()
        };
      }
      stored[urlKey].count = (stored[urlKey].count || 0) + 1;
      stored[urlKey].lastClicked = new Date().toISOString();
      localStorage.setItem('nexora_link_clicks', JSON.stringify(stored));
    } catch (e) {}

    // 2. Post to API in background
    try {
      fetch('/api/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: appName || 'Platform',
          linkTitle: linkTitle || 'Access Link',
          linkUrl: urlKey,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {});
    } catch (e) {}
  };

  // Delegate global click listener for link-access-btn
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.link-access-btn');
    if (btn) {
      const url = btn.getAttribute('href');
      const card = btn.closest('.platform-card');
      const appName = card ? card.querySelector('.platform-name')?.textContent || 'Platform' : 'Platform';
      const linkTitle = btn.closest('.link-item')?.querySelector('.link-title')?.textContent || 'Access Link';
      
      window.trackNexoraLinkClick(appName, linkTitle, url);
    }
  });
})();
