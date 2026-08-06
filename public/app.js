document.addEventListener('DOMContentLoaded', () => {
  let allApps = [];
  let appSettings = {
    telegramEnabled: true,
    telegramLink: 'https://t.me/telegram',
    telegramTitle: 'Join Official Channel',
    telegramMessage: 'Get instant access to daily updates, live class links, and announcements!'
  };
  let activeCategory = 'ALL';
  let searchQuery = '';

  const searchInput = document.getElementById('searchInput');
  const categoryTabsContainer = document.getElementById('categoryTabs');
  const appsGrid = document.getElementById('appsGrid');
  const emptyState = document.getElementById('emptyState');
  const sectionEyebrow = document.getElementById('sectionEyebrow');

  const splashScreen = document.getElementById('splashScreen');
  const splashProgress = document.getElementById('splashProgress');
  const splashStatus = document.getElementById('splashStatus');
  const statAppCount = document.getElementById('statAppCount');

  // Telegram Modal elements
  const telegramModal = document.getElementById('telegramModal');
  const telegramModalClose = document.getElementById('telegramModalClose');
  const telegramModalTitle = document.getElementById('telegramModalTitle');
  const telegramModalMsg = document.getElementById('telegramModalMsg');
  const telegramJoinBtn = document.getElementById('telegramJoinBtn');
  const telegramDismissBtn = document.getElementById('telegramDismissBtn');

  const UPSTASH_URL = 'https://legible-loon-84378.upstash.io';
  const UPSTASH_TOKEN = 'gQAAAAAAAUmaAAIgcDE5M2IwMjM4MTczZjA0ZWQ5YWUwYzYzNTU1YzIyYTQ3Mg';

  let progressVal = 0;
  const progressInterval = setInterval(() => {
    if (progressVal < 85) {
      progressVal += 15;
      if (splashProgress) splashProgress.style.width = progressVal + '%';
    }
  }, 80);

  function hideSplashScreen() {
    if (splashProgress) splashProgress.style.width = '100%';
    if (splashStatus) splashStatus.textContent = 'Engine Ready';
    clearInterval(progressInterval);
    setTimeout(() => {
      if (splashScreen) splashScreen.classList.add('fade-out');
    }, 350);
  }

  // Fetch data
  initApp();

  async function initApp() {
    await Promise.all([fetchApps(), fetchSettings()]);
    setupTelegramModal();
  }

  async function fetchFromUpstash(key) {
    try {
      const res = await fetch(`${UPSTASH_URL}/get/${key}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      });
      const data = await res.json();
      if (data && data.result) {
        return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      }
    } catch (e) {}
    return null;
  }

  function getDefaultInitialPlatforms() {
    return [
      {
        id: 'pw_main',
        name: 'Physics Wallah',
        category: 'LIVE CLASS',
        logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w',
        order: 1,
        featured: true,
        addedAt: new Date().toISOString(),
        links: [
          {
            id: 'pw_link_1',
            title: 'Physics Wallah Main Portal',
            url: 'https://study.physicswallah.live',
            statusMode: 'online',
            keyRequirement: 'without_key',
            loginRequirement: 'login_not_required'
          },
          {
            id: 'pw_link_2',
            title: 'PW Yakeen NEET Batch',
            url: 'https://study.physicswallah.live/batches',
            statusMode: 'online',
            keyRequirement: 'with_key',
            loginRequirement: 'login_required'
          }
        ]
      },
      {
        id: 'netprep_main',
        name: 'NETprep Portal',
        category: 'EXAM PREP',
        logoUrl: '',
        order: 2,
        featured: false,
        addedAt: new Date().toISOString(),
        links: [
          {
            id: 'netprep_link_1',
            title: 'NETprep Study Hub',
            url: 'https://netprep.in',
            statusMode: 'online',
            keyRequirement: 'without_key',
            loginRequirement: 'login_not_required'
          }
        ]
      }
    ];
  }

  async function fetchApps() {
    // 1. Try API
    try {
      const res = await fetch('/api/apps', { cache: 'no-store' });
      if (res.ok) {
        const resData = await res.json();
        if (resData && (Array.isArray(resData) || Array.isArray(resData.data))) {
          const fetched = Array.isArray(resData) ? resData : (resData.data || []);
          if (fetched.length > 0) {
            allApps = fetched;
            try { localStorage.setItem('nexora_apps', JSON.stringify(allApps)); } catch (e) {}
            renderCategoryTabs();
            renderGrid();
            return;
          }
        }
      }
    } catch (e) {}

    // 2. Try Upstash Cloud Redis
    const upstashApps = await fetchFromUpstash('nexora_apps');
    if (Array.isArray(upstashApps) && upstashApps.length > 0) {
      allApps = upstashApps;
      try { localStorage.setItem('nexora_apps', JSON.stringify(allApps)); } catch (e) {}
      renderCategoryTabs();
      renderGrid();
      return;
    }

    // 3. Try LocalStorage
    try {
      const local = localStorage.getItem('nexora_apps');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          allApps = parsed;
          renderCategoryTabs();
          renderGrid();
          return;
        }
      }
    } catch (e) {}

    // 4. Default Pre-seeded Sample Platforms
    allApps = getDefaultInitialPlatforms();
    try { localStorage.setItem('nexora_apps', JSON.stringify(allApps)); } catch (e) {}
    renderCategoryTabs();
    renderGrid();
  }

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      if (res.ok) {
        const resData = await res.json();
        if (resData && resData.data) {
          appSettings = { ...appSettings, ...resData.data };
          return;
        }
      }
    } catch (e) {}

    const upstashSettings = await fetchFromUpstash('nexora_settings');
    if (upstashSettings) {
      appSettings = { ...appSettings, ...upstashSettings };
    }
  }

  function setupTelegramModal() {
    if (!appSettings || !appSettings.telegramEnabled) return;
    if (sessionStorage.getItem('telegram_dismissed') === 'true') return;

    if (telegramModalTitle) telegramModalTitle.textContent = appSettings.telegramTitle || 'Join Official Channel';
    if (telegramModalMsg) telegramModalMsg.textContent = appSettings.telegramMessage || 'Get live updates and direct links.';
    if (telegramJoinBtn) telegramJoinBtn.href = appSettings.telegramLink || 'https://t.me/telegram';

    setTimeout(() => {
      if (telegramModal) telegramModal.style.display = 'flex';
    }, 1200);

    const closeHandler = () => {
      if (telegramModal) telegramModal.style.display = 'none';
      sessionStorage.setItem('telegram_dismissed', 'true');
    };

    if (telegramModalClose) telegramModalClose.addEventListener('click', closeHandler);
    if (telegramDismissBtn) telegramDismissBtn.addEventListener('click', closeHandler);
  }

  function renderCategoryTabs() {
    const categories = ['ALL'];
    allApps.forEach(app => {
      if (app.category) {
        const catUpper = app.category.trim().toUpperCase();
        if (!categories.includes(catUpper)) {
          categories.push(catUpper);
        }
      }
    });

    categoryTabsContainer.innerHTML = '';
    categories.forEach(cat => {
      const tabBtn = document.createElement('button');
      tabBtn.type = 'button';
      tabBtn.className = `btn-outline category-tab ${cat === activeCategory ? 'active' : ''}`;
      tabBtn.textContent = cat === 'ALL' ? 'All' : cat;
      tabBtn.addEventListener('click', () => {
        activeCategory = cat;
        renderCategoryTabs();
        renderGrid();
      });
      categoryTabsContainer.appendChild(tabBtn);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderGrid();
    });
  }

  // Render Platforms Grid
  function renderGrid() {
    if (statAppCount) {
      statAppCount.textContent = allApps.length;
    }
    hideSplashScreen();

    const filtered = allApps.filter(app => {
      const matchesCat = (activeCategory === 'ALL') || (app.category && app.category.trim().toUpperCase() === activeCategory);
      const matchesSearch = !searchQuery || 
        (app.name && app.name.toLowerCase().includes(searchQuery)) || 
        (app.category && app.category.toLowerCase().includes(searchQuery));
      return matchesCat && matchesSearch;
    });

    if (sectionEyebrow) {
      sectionEyebrow.textContent = activeCategory === 'ALL' ? 'PLATFORMS' : activeCategory;
    }

    appsGrid.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      appsGrid.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    appsGrid.style.display = 'flex';

    filtered.forEach(app => {
      const card = document.createElement('article');
      card.className = `platform-card ${app.featured ? 'featured' : ''}`;
      card.style.cursor = 'pointer';

      const logoSrc = app.logoUrl || app.logo;
      const linksCount = Array.isArray(app.links) ? app.links.length : 0;

      card.innerHTML = `
        <div class="platform-header">
          <div class="logo-container" id="cardLogo_${app.id}"></div>
          <div class="platform-info">
            <h2 class="platform-title">${escapeHtml(app.name)}</h2>
            <div class="platform-category">${escapeHtml((app.category || 'GENERAL').toUpperCase())}</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--hairline);">
          <span class="attr-badge" style="font-size: 11px; padding: 4px 10px;">
            📁 ${linksCount} ${linksCount === 1 ? 'Portal / Batch' : 'Portals & Batches'}
          </span>
          <a href="/platform.html?id=${app.id}" class="link-access-btn" style="text-decoration: none;">
            <span>Open Folder</span>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
        </div>
      `;

      const logoContainer = card.querySelector(`#cardLogo_${app.id}`);
      if (logoSrc) {
        const img = document.createElement('img');
        img.src = logoSrc;
        img.alt = app.name;
        img.className = 'logo-img';
        img.onerror = () => renderLogoFallback(logoContainer, app.name);
        logoContainer.appendChild(img);
      } else {
        renderLogoFallback(logoContainer, app.name);
      }

      card.addEventListener('click', (e) => {
        if (!e.target.closest('a')) {
          window.location.href = `/platform.html?id=${app.id}`;
        }
      });

      appsGrid.appendChild(card);
    });
  }

  function setStatusBadge(element, isOnline) {
    if (!element) return;
    if (isOnline) {
      element.className = 'status-badge online';
      element.innerHTML = `<span class="status-dot"></span><span class="status-lbl">Online</span>`;
    } else {
      element.className = 'status-badge offline';
      element.innerHTML = `<span class="status-dot"></span><span class="status-lbl">Offline</span>`;
    }
  }

  // Automatic Link Health Detector
  function checkLinkStatus(targetUrl, callback) {
    if (!targetUrl) {
      callback(false);
      return;
    }
    let safeUrl = targetUrl;
    if (!/^https?:\/\//i.test(safeUrl)) safeUrl = 'https://' + safeUrl;

    let controller = new AbortController();
    let timeoutId = setTimeout(() => controller.abort(), 4000);

    fetch(safeUrl, { method: 'HEAD', mode: 'no-cors', signal: controller.signal })
      .then(() => {
        clearTimeout(timeoutId);
        callback(true);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        // Fallback favicon ping test
        try {
          const origin = new URL(safeUrl).origin;
          const img = new Image();
          let timer = setTimeout(() => callback(false), 3000);
          img.onload = () => { clearTimeout(timer); callback(true); };
          img.onerror = () => { clearTimeout(timer); callback(true); }; // Reachable domain responding
          img.src = `${origin}/favicon.ico?t=${Date.now()}`;
        } catch (e) {
          callback(false);
        }
      });
  }

  function renderLogoFallback(container, name) {
    container.innerHTML = '';
    const fallbackDiv = document.createElement('div');
    fallbackDiv.className = 'logo-fallback';
    fallbackDiv.textContent = getInitials(name);
    container.appendChild(fallbackDiv);
  }

  function getInitials(name) {
    if (!name) return 'ED';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .catch(err => console.error('ServiceWorker registration failed:', err));
    });
  }

  // FEEDBACK & NOTIFICATION SYSTEM
  const openFeedbackModalBtn = document.getElementById('openFeedbackModalBtn');
  const feedbackModal = document.getElementById('feedbackModal');
  const feedbackModalClose = document.getElementById('feedbackModalClose');
  const feedbackForm = document.getElementById('feedbackForm');
  const fbStatusMsg = document.getElementById('fbStatusMsg');

  const notifBellBtn = document.getElementById('notifBellBtn');
  const notifBadge = document.getElementById('notifBadge');
  const notifModal = document.getElementById('notifModal');
  const notifModalClose = document.getElementById('notifModalClose');
  const notifList = document.getElementById('notifList');

  let allNotifications = [];

  if (openFeedbackModalBtn && feedbackModal) {
    openFeedbackModalBtn.addEventListener('click', () => {
      feedbackModal.style.display = 'flex';
    });
  }

  if (feedbackModalClose) {
    feedbackModalClose.addEventListener('click', () => {
      feedbackModal.style.display = 'none';
    });
  }

  if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const type = document.getElementById('fbType').value;
      const userName = document.getElementById('fbName').value;
      const userEmail = document.getElementById('fbEmail').value;
      const message = document.getElementById('fbMessage').value;

      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, userName, userEmail, message })
        });
        if (res.ok) {
          if (fbStatusMsg) fbStatusMsg.style.display = 'block';
          feedbackForm.reset();
          setTimeout(() => {
            if (fbStatusMsg) fbStatusMsg.style.display = 'none';
            if (feedbackModal) feedbackModal.style.display = 'none';
          }, 2000);
          loadNotifications();
        }
      } catch (err) {
        alert('Failed to submit. Please try again.');
      }
    });
  }

  if (notifBellBtn && notifModal) {
    notifBellBtn.addEventListener('click', () => {
      notifModal.style.display = 'flex';
      markNotificationsRead();
    });
  }

  if (notifModalClose) {
    notifModalClose.addEventListener('click', () => {
      notifModal.style.display = 'none';
    });
  }

  async function loadNotifications() {
    try {
      const res = await fetch('/api/feedback', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          allNotifications = data.filter(item => item.status === 'REPLIED' || item.adminReply);
          renderNotifications();
        }
      }
    } catch (e) {}
  }

  function renderNotifications() {
    if (!notifList) return;
    notifList.innerHTML = '';

    const readIds = JSON.parse(localStorage.getItem('nexora_read_notifs') || '[]');
    const unread = allNotifications.filter(n => !readIds.includes(n.id));

    if (notifBadge) {
      if (unread.length > 0) {
        notifBadge.textContent = unread.length;
        notifBadge.style.display = 'flex';
      } else {
        notifBadge.style.display = 'none';
      }
    }

    if (allNotifications.length === 0) {
      notifList.innerHTML = `
        <div style="text-align: center; color: var(--ink-mute); padding: 24px; font-size: 13px;">
          No notifications yet. Submit a question or issue report to receive admin replies here!
        </div>`;
      return;
    }

    allNotifications.forEach(item => {
      const isUnread = !readIds.includes(item.id);
      const card = document.createElement('div');
      card.className = `notif-item-card ${isUnread ? 'unread' : ''}`;
      
      const typeClass = item.type === 'ERROR' ? 'error' : (item.type === 'IMPROVEMENT' ? 'improvement' : 'question');
      
      card.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span class="notif-type-badge ${typeClass}">${item.type || 'QUERY'}</span>
          <span style="font-size: 11px; color: var(--ink-mute);">${new Date(item.repliedAt || item.createdAt).toLocaleDateString()}</span>
        </div>
        <div style="font-size: 13px; color: #fff; font-weight: 500;">Q: ${escapeHtml(item.message)}</div>
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 10px; margin-top: 4px;">
          <div style="font-size: 11px; font-weight: 700; color: #10b981; margin-bottom: 2px;">ADMIN REPLY:</div>
          <div style="font-size: 13px; color: var(--ink-body); line-height: 1.4;">${escapeHtml(item.adminReply)}</div>
        </div>
      `;
      notifList.appendChild(card);
    });
  }

  function markNotificationsRead() {
    const ids = allNotifications.map(n => n.id);
    localStorage.setItem('nexora_read_notifs', JSON.stringify(ids));
    if (notifBadge) notifBadge.style.display = 'none';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // LINK CLICK TRACKING
  function trackLinkClick(appName, linkTitle, linkUrl) {
    try {
      // 1. Local Storage tracking
      const clicks = JSON.parse(localStorage.getItem('nexora_link_clicks') || '{}');
      const key = linkUrl || appName;
      clicks[key] = (clicks[key] || 0) + 1;
      localStorage.setItem('nexora_link_clicks', JSON.stringify(clicks));

      // 2. Server API tracking
      fetch('/api/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName, linkTitle, linkUrl, timestamp: new Date().toISOString() })
      }).catch(() => {});
    } catch (e) {}
  }

  // DARK / LIGHT THEME TOGGLE
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeSunIcon = document.getElementById('themeSunIcon');
  const themeMoonIcon = document.getElementById('themeMoonIcon');

  function initTheme() {
    const savedTheme = localStorage.getItem('nexora_theme') || 'dark';
    setTheme(savedTheme);
  }

  function setTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (themeSunIcon) themeSunIcon.style.display = 'block';
      if (themeMoonIcon) themeMoonIcon.style.display = 'none';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (themeSunIcon) themeSunIcon.style.display = 'none';
      if (themeMoonIcon) themeMoonIcon.style.display = 'block';
    }
    localStorage.setItem('nexora_theme', theme);
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      setTheme(current === 'light' ? 'dark' : 'light');
    });
  }

  initTheme();

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Initial notification check
  loadNotifications();
  setInterval(loadNotifications, 30000);
});
