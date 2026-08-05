// NEXORA Admin Click Analytics Module
(function () {
  function getLocalClicks() {
    try {
      return JSON.parse(localStorage.getItem('nexora_link_clicks') || '{}');
    } catch (e) {
      return {};
    }
  }

  async function fetchClickData() {
    let apiClicks = {};
    try {
      const res = await fetch('/api/track-click', { cache: 'no-store' });
      if (res.ok) {
        apiClicks = await res.json();
      }
    } catch (e) {}

    const localClicks = getLocalClicks();
    
    // Merge API and local clicks
    const merged = { ...apiClicks };
    Object.keys(localClicks).forEach(k => {
      if (!merged[k]) {
        merged[k] = {
          appName: k,
          linkTitle: 'Access Link',
          url: k,
          count: localClicks[k].count || localClicks[k] || 1,
          lastClicked: localClicks[k].lastClicked || new Date().toISOString()
        };
      } else {
        const localCount = localClicks[k].count || localClicks[k] || 0;
        if (localCount > merged[k].count) {
          merged[k].count = localCount;
        }
      }
    });

    return merged;
  }

  async function renderAnalytics() {
    const analyticsList = document.getElementById('analyticsList');
    const metricClickCount = document.getElementById('metricClickCount');
    if (!analyticsList) return;

    const clickData = await fetchClickData();
    analyticsList.innerHTML = '';

    const items = Object.values(clickData).sort((a, b) => (b.count || 0) - (a.count || 0));

    let totalHits = 0;
    items.forEach(i => totalHits += (i.count || 0));
    if (metricClickCount) metricClickCount.textContent = totalHits;

    if (items.length === 0) {
      analyticsList.innerHTML = `
        <div style="text-align: center; color: var(--ink-mute); padding: 20px; font-size: 13px; background: var(--canvas-card); border-radius: 12px; border: 1px solid var(--hairline);">
          No link clicks tracked yet. Real-time click counters will appear here when users open platforms.
        </div>`;
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'admin-item-card';
      card.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="font-size: 15px; font-weight: 600; color: var(--ink);">${escapeHtml(item.appName || item.linkTitle || 'Platform Link')}</div>
          <span style="font-size: 14px; font-weight: 700; color: #10b981; background: rgba(16, 185, 129, 0.15); padding: 4px 10px; border-radius: 999px;">
            ${item.count || 0} CLICKS
          </span>
        </div>
        <div style="font-size: 12px; color: var(--ink-mute); word-break: break-all;">URL: ${escapeHtml(item.url || '#')}</div>
        ${item.lastClicked ? `<div style="font-size: 11px; color: var(--ink-mute);">Last Clicked: ${new Date(item.lastClicked).toLocaleString()}</div>` : ''}
      `;
      analyticsList.appendChild(card);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {
    const refreshBtn = document.getElementById('refreshAnalyticsBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', renderAnalytics);
    }

    window.addEventListener('adminDashboardShown', renderAnalytics);
    window.addEventListener('adminTabChanged', (e) => {
      if (e.detail && e.detail.tab === 'tab-analytics') {
        renderAnalytics();
      }
    });

    renderAnalytics();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
