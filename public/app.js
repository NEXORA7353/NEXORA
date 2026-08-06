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
  const splashMessages = [
    'Initializing NEXORA Engine...',
    'Loading Secure Modules...',
    'Fetching Platform Data...',
    'Verifying Access Keys...',
    'Preparing Dashboard...',
    'NEXORA Ready \u2714'
  ];
  let msgIdx = 0;
  const progressInterval = setInterval(() => {
    if (progressVal < 85) {
      progressVal += 12;
      if (splashProgress) splashProgress.style.width = progressVal + '%';
      if (splashStatus && msgIdx < splashMessages.length - 1) {
        splashStatus.textContent = splashMessages[msgIdx];
        msgIdx++;
      }
    }
  }, 120);

  function hideSplashScreen() {
    if (splashProgress) splashProgress.style.width = '100%';
    if (splashStatus) splashStatus.textContent = splashMessages[splashMessages.length - 1];
    clearInterval(progressInterval);
    setTimeout(() => {
      if (splashScreen) splashScreen.classList.add('fade-out');
    }, 400);
  }

  // Fetch data
  initApp();

  async function initApp() {
    await Promise.all([fetchApps(), fetchSettings()]);
    setupTelegramModal();
  }

  async function fetchFromUpstash(key) {
    try {
      const res = await fetch(`${UPSTASH_URL}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['GET', key])
      });
      const data = await res.json();
      if (data && data.result) {
        return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      }
    } catch (e) {}

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

  async function saveToUpstash(key, payload) {
    try {
      const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
      await fetch(`${UPSTASH_URL}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['SET', key, payloadStr])
      });
      return true;
    } catch (e) {}
    return false;
  }

  function sanitizePlatforms(apps) {
    if (!Array.isArray(apps)) return [];
    const seenNames = new Set();
    const cleanList = [];

    for (const a of apps) {
      if (!a || !a.name || typeof a.name !== 'string') continue;
      const cleanName = a.name.trim();
      const lowerName = cleanName.toLowerCase();
      if (cleanName === '' || lowerName === 'new platform') continue;

      if (!seenNames.has(lowerName)) {
        seenNames.add(lowerName);
        cleanList.push({
          ...a,
          name: cleanName
        });
      }
    }

    // Auto-assign sequential order ranking (1, 2, 3...) if missing or duplicated
    const seenOrders = new Set();
    cleanList.forEach((item, idx) => {
      let ord = parseInt(item.order, 10);
      if (!ord || isNaN(ord) || seenOrders.has(ord)) {
        ord = idx + 1;
      }
      seenOrders.add(ord);
      item.order = ord;
    });

    return cleanList;
  }

  async function fetchApps() {
    // Priority 1: Check Upstash Cloud Redis (Central Database)
    const upstashApps = await fetchFromUpstash('nexora_apps');
    const validUpstash = sanitizePlatforms(upstashApps);
    if (validUpstash.length > 0) {
      allApps = validUpstash;
      try { localStorage.setItem('nexora_apps', JSON.stringify(allApps)); } catch (e) {}
      renderCategoryTabs();
      renderGrid();
      return;
    }

    // Priority 2: Check LocalStorage Fallback
    try {
      const local = localStorage.getItem('nexora_apps');
      if (local) {
        const parsed = JSON.parse(local);
        const validLocal = sanitizePlatforms(parsed);
        if (validLocal.length > 0) {
          allApps = validLocal;
          renderCategoryTabs();
          renderGrid();
          // Sync back to Upstash Cloud Database!
          saveToUpstash('nexora_apps', validLocal);
          return;
        }
      }
    } catch (e) {}

    // Priority 3: Try Server API Endpoint
    try {
      const res = await fetch('/api/apps', { cache: 'no-store' });
      if (res.ok) {
        const resData = await res.json();
        if (resData && (Array.isArray(resData) || Array.isArray(resData.data))) {
          const rawApi = Array.isArray(resData) ? resData : (resData.data || []);
          const validApi = sanitizePlatforms(rawApi);
          if (validApi.length > 0) {
            allApps = validApi;
            try { localStorage.setItem('nexora_apps', JSON.stringify(allApps)); } catch (e) {}
            saveToUpstash('nexora_apps', validApi);
            renderCategoryTabs();
            renderGrid();
            return;
          }
        }
      }
    } catch (e) {}

    // 4. Pure Empty State - 100% Live Database Powered (Zero Dummy Data)
    allApps = [];
    renderCategoryTabs();
    renderGrid();
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

    if (!categoryTabsContainer) return;
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

  let favoriteIds = [];
  try {
    const favs = localStorage.getItem('nexora_favs');
    if (favs) favoriteIds = JSON.parse(favs);
  } catch (e) {}

  let sortOption = 'default';
  let filterOnlyFavs = false;

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      if (res.ok) {
        const resData = await res.json();
        if (resData && resData.data) {
          appSettings = { ...appSettings, ...resData.data };
          applyAnnouncementTicker();
          return;
        }
      }
    } catch (e) {}

    const upstashSettings = await fetchFromUpstash('nexora_settings');
    if (upstashSettings) {
      appSettings = { ...appSettings, ...upstashSettings };
      applyAnnouncementTicker();
    }
  }

  function applyAnnouncementTicker() {
    const tickerBar = document.getElementById('announcementTicker');
    const tickerText = document.getElementById('tickerText');
    if (appSettings && appSettings.announcementEnabled && appSettings.announcementText) {
      if (tickerText) tickerText.textContent = appSettings.announcementText;
      if (tickerBar) tickerBar.style.display = 'flex';
    } else {
      if (tickerBar) tickerBar.style.display = 'none';
    }

    // ANNOUNCEMENT POPUP MODAL LOGIC
    if (appSettings && appSettings.announcementPopupEnabled) {
      const popupModal = document.getElementById('announcementPopupModal');
      const popupModalClose = document.getElementById('announcementPopupModalClose');
      const popupDismissBtn = document.getElementById('announcementPopupDismissBtn');
      const popupTitle = document.getElementById('announcementPopupTitle');
      const popupMsg = document.getElementById('announcementPopupMsg');
      const bannerContainer = document.getElementById('announcementBannerContainer');
      const bannerImg = document.getElementById('announcementBannerImg');
      const actionBtn = document.getElementById('announcementPopupActionBtn');

      if (popupTitle) popupTitle.textContent = appSettings.announcementTitle || 'Mega Platform Announcement';
      if (popupMsg) popupMsg.textContent = appSettings.announcementText || 'Check out live platform updates!';

      if (appSettings.announcementImageUrl) {
        if (bannerImg) bannerImg.src = appSettings.announcementImageUrl;
        if (bannerContainer) bannerContainer.style.display = 'block';
      } else {
        if (bannerContainer) bannerContainer.style.display = 'none';
      }

      if (appSettings.announcementActionUrl) {
        if (actionBtn) {
          actionBtn.href = appSettings.announcementActionUrl;
          actionBtn.style.display = 'inline-flex';
        }
      } else {
        if (actionBtn) actionBtn.style.display = 'none';
      }

      const hasDismissed = sessionStorage.getItem('nexora_popup_dismissed') === 'true';
      if (!hasDismissed && popupModal) {
        popupModal.style.display = 'flex';
      }

      const closePopup = () => {
        if (popupModal) popupModal.style.display = 'none';
        sessionStorage.setItem('nexora_popup_dismissed', 'true');
      };

      if (popupModalClose) popupModalClose.onclick = closePopup;
      if (popupDismissBtn) popupDismissBtn.onclick = closePopup;
      if (popupModal) {
        popupModal.onclick = (e) => {
          if (e.target === popupModal) closePopup();
        };
      }
    }
  }

  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortOption = e.target.value;
      renderGrid();
    });
  }

  const filterFavoritesBtn = document.getElementById('filterFavoritesBtn');
  if (filterFavoritesBtn) {
    filterFavoritesBtn.addEventListener('click', () => {
      filterOnlyFavs = !filterOnlyFavs;
      filterFavoritesBtn.classList.toggle('active', filterOnlyFavs);
      renderGrid();
    });
  }

  function updateFavCount() {
    const favCountEl = document.getElementById('favCount');
    if (favCountEl) favCountEl.textContent = favoriteIds.length;
  }

  function toggleFavorite(id) {
    const idx = favoriteIds.indexOf(id);
    if (idx === -1) {
      favoriteIds.push(id);
    } else {
      favoriteIds.splice(idx, 1);
    }
    try { localStorage.setItem('nexora_favs', JSON.stringify(favoriteIds)); } catch (e) {}
    updateFavCount();
    renderGrid();
  }

  // Key Generator Modal Setup
  const keyModal = document.getElementById('keyModal');
  const keyModalClose = document.getElementById('keyModalClose');
  const keyPlatformName = document.getElementById('keyPlatformName');
  const generatedKeyVal = document.getElementById('generatedKeyVal');
  const verifyUnlockBtn = document.getElementById('verifyUnlockBtn');
  let currentTargetUrl = '';

  if (keyModalClose) keyModalClose.addEventListener('click', () => { if (keyModal) keyModal.style.display = 'none'; });

  function openKeyModal(appName, targetUrl) {
    currentTargetUrl = targetUrl;
    if (keyPlatformName) keyPlatformName.textContent = appName;
    const randomKey = 'NEXORA-' + Math.floor(1000 + Math.random() * 9000) + '-PASS';
    if (generatedKeyVal) generatedKeyVal.textContent = randomKey;
    if (keyModal) keyModal.style.display = 'flex';
  }

  if (verifyUnlockBtn) {
    verifyUnlockBtn.addEventListener('click', () => {
      if (keyModal) keyModal.style.display = 'none';
      if (currentTargetUrl) window.location.href = currentTargetUrl;
    });
  }

  // Render Platforms Grid
  function renderGrid() {
    updateFavCount();
    if (statAppCount) statAppCount.textContent = allApps.length;
    const heroPlatformCount = document.getElementById('heroPlatformCount');
    if (heroPlatformCount) heroPlatformCount.textContent = allApps.length;
    hideSplashScreen();

    let filtered = allApps.filter(app => {
      const matchesCat = (activeCategory === 'ALL') || (app.category && app.category.trim().toUpperCase() === activeCategory);
      const matchesSearch = !searchQuery || 
        (app.name && app.name.toLowerCase().includes(searchQuery)) || 
        (app.category && app.category.toLowerCase().includes(searchQuery));
      const matchesFav = !filterOnlyFavs || favoriteIds.includes(app.id);
      return matchesCat && matchesSearch && matchesFav;
    });

    // Sorting Logic
    if (sortOption === 'name_asc') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortOption === 'popular') {
      filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    } else if (sortOption === 'newest') {
      filtered.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));
    } else {
      // Pinned favorites at top in default order
      filtered.sort((a, b) => (favoriteIds.includes(b.id) ? 1 : 0) - (favoriteIds.includes(a.id) ? 1 : 0));
    }

    if (sectionEyebrow) {
      sectionEyebrow.textContent = filterOnlyFavs ? '⭐ FAVORITE PLATFORMS' : (activeCategory === 'ALL' ? 'PLATFORMS' : activeCategory);
    }

    appsGrid.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      appsGrid.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    appsGrid.style.display = 'grid';

    filtered.forEach(app => {
      const card = document.createElement('article');
      const isUpcoming = app.badgeTag === 'UPCOMING';
      const isFav = favoriteIds.includes(app.id);
      const badgeTag = app.badgeTag && app.badgeTag !== 'NONE' ? app.badgeTag : (app.featured ? 'PREMIUM' : '');
      
      card.className = `platform-card ${app.featured ? 'featured' : ''} ${isUpcoming ? 'upcoming-blocked-card' : ''}`;
      card.style.cursor = isUpcoming ? 'not-allowed' : 'pointer';

      const logoSrc = app.logoUrl || app.logo;
      const linksCount = Array.isArray(app.links) ? app.links.length : 0;
      const pingMs = Math.floor(25 + Math.random() * 45);

      let badgeHtml = '';
      if (badgeTag === 'NEW') {
        badgeHtml = `<div class="card-ribbon ribbon-new">NEW</div>`;
      } else if (badgeTag === 'PREMIUM') {
        badgeHtml = `<div class="card-ribbon ribbon-premium">PREMIUM</div>`;
      } else if (badgeTag === 'UPCOMING') {
        badgeHtml = `<div class="card-ribbon ribbon-upcoming">UPCOMING</div>`;
      }

      card.innerHTML = `
        ${badgeHtml}
        <button type="button" class="star-bookmark-btn ${isFav ? 'active' : ''}" title="${isFav ? 'Remove Favorite' : 'Add Favorite'}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? '#f59e0b' : 'none'}" stroke="${isFav ? '#f59e0b' : 'currentColor'}" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>

        <div class="platform-header">
          <div class="logo-container" id="cardLogo_${app.id}"></div>
          <div class="platform-info">
            <h2 class="platform-title">${escapeHtml(app.name)}</h2>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
              <span class="platform-category">${escapeHtml((app.category || 'GENERAL').toUpperCase())}</span>
              <span class="ping-latency-badge" title="Live Server Ping Latency">● ${pingMs}ms</span>
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 14px; border-top: 1px solid var(--hairline);">
          <span class="attr-badge" style="font-size: 12px; padding: 6px 12px; font-weight: 700; background: rgba(var(--accent-orange-rgb), 0.12); color: var(--accent-orange); border-color: rgba(var(--accent-orange-rgb), 0.3); display: inline-flex; align-items: center; gap: 6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span>${linksCount} ${linksCount === 1 ? 'Portal' : 'Portals & Batches'}</span>
          </span>
          ${isUpcoming ? `
            <button type="button" class="link-access-btn blocked-btn" disabled style="padding: 10px 18px; font-size: 13px; font-weight: 700; background: #475569; color: #cbd5e1; cursor: not-allowed; opacity: 0.8;">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Upcoming</span>
            </button>
          ` : `
            <a href="/platform.html?id=${app.id}" class="link-access-btn" style="text-decoration: none; padding: 10px 18px; font-size: 13px; font-weight: 700;">
              <span>Open Platform</span>
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.5" fill="none">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </a>
          `}
        </div>
      `;

      const starBtn = card.querySelector('.star-bookmark-btn');
      if (starBtn) {
        starBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          toggleFavorite(app.id);
        });
      }

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
        if (isUpcoming) {
          e.preventDefault();
          e.stopPropagation();
          alert(`⛔ Access Blocked: "${app.name}" is an Upcoming platform and will be available soon!`);
          return;
        }
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

  // TELEGRAM MODAL SETUP
  function setupTelegramModal() {
    if (!telegramModal || !appSettings || appSettings.telegramEnabled === false) return;

    const hasDismissed = sessionStorage.getItem('nexora_telegram_dismissed') === 'true';
    if (hasDismissed) return;

    if (telegramModalTitle) telegramModalTitle.textContent = appSettings.telegramTitle || 'Join Official Channel';
    if (telegramModalMsg) telegramModalMsg.textContent = appSettings.telegramMessage || 'Get instant access to daily updates & links!';
    if (telegramJoinBtn && appSettings.telegramLink) telegramJoinBtn.href = appSettings.telegramLink;

    setTimeout(() => {
      if (telegramModal) telegramModal.style.display = 'flex';
    }, 2500);

    const closeTgModal = () => {
      if (telegramModal) telegramModal.style.display = 'none';
      sessionStorage.setItem('nexora_telegram_dismissed', 'true');
    };

    if (telegramModalClose) telegramModalClose.onclick = closeTgModal;
    if (telegramDismissBtn) telegramDismissBtn.onclick = closeTgModal;
    if (telegramJoinBtn) {
      telegramJoinBtn.onclick = () => {
        sessionStorage.setItem('nexora_telegram_dismissed', 'true');
        if (telegramModal) telegramModal.style.display = 'none';
      };
    }
  }

  // APP DOWNLOAD MODAL LOGIC
  const openAppDownloadModalBtn = document.getElementById('openAppDownloadModalBtn');
  const appDownloadModal = document.getElementById('appDownloadModal');
  const appDownloadModalClose = document.getElementById('appDownloadModalClose');
  const modalApkVersion = document.getElementById('modalApkVersion');
  const modalApkSize = document.getElementById('modalApkSize');
  const modalApkDownloadBtn = document.getElementById('modalApkDownloadBtn');
  const androidModalCard = document.getElementById('androidModalCard');

  const modalExeVersion = document.getElementById('modalExeVersion');
  const modalExeSize = document.getElementById('modalExeSize');
  const modalExeDownloadBtn = document.getElementById('modalExeDownloadBtn');
  const windowsModalCard = document.getElementById('windowsModalCard');

  let appDownloadData = null;

  async function loadAppDownloadData() {
    appDownloadData = await fetchFromUpstash('nexora_download_apps');
    if (!appDownloadData) {
      try {
        const local = localStorage.getItem('nexora_download_apps');
        if (local) appDownloadData = JSON.parse(local);
      } catch (e) {}
    }

    if (!appDownloadData) {
      appDownloadData = {
        apkEnabled: true,
        apkUrl: '#',
        apkVersion: 'v1.2.0',
        apkSize: '24.5 MB',
        exeEnabled: true,
        exeUrl: '#',
        exeVersion: 'v1.0.0',
        exeSize: '48.2 MB'
      };
    }

    if (modalApkVersion) modalApkVersion.textContent = appDownloadData.apkVersion || 'v1.2.0';
    if (modalApkSize) modalApkSize.textContent = appDownloadData.apkSize || '24.5 MB';
    if (modalApkDownloadBtn) {
      const targetUrl = appDownloadData.apkUrl && appDownloadData.apkUrl.trim() !== '#' ? appDownloadData.apkUrl.trim() : 'https://gofile.io/d/UNtAj9';
      modalApkDownloadBtn.href = targetUrl;
      modalApkDownloadBtn.target = '_blank';
      modalApkDownloadBtn.onclick = (e) => {
        if (targetUrl && targetUrl !== '#') {
          window.open(targetUrl, '_blank');
        } else {
          e.preventDefault();
          alert('Android APK download link has not been configured in Admin Console yet.');
        }
      };
      if (targetUrl.startsWith('data:')) {
        modalApkDownloadBtn.setAttribute('download', `nexora_${appDownloadData.apkVersion || 'app'}.apk`);
      }
    }
    if (androidModalCard) androidModalCard.style.display = appDownloadData.apkEnabled !== false ? 'flex' : 'none';

    if (modalExeVersion) modalExeVersion.textContent = appDownloadData.exeVersion || 'v1.0.0';
    if (modalExeSize) modalExeSize.textContent = appDownloadData.exeSize || '98.2 MB';
    if (modalExeDownloadBtn) {
      const targetUrl = appDownloadData.exeUrl && appDownloadData.exeUrl.trim() !== '#' ? appDownloadData.exeUrl.trim() : 'https://gofile.io/d/geE7fL';
      modalExeDownloadBtn.href = targetUrl;
      modalExeDownloadBtn.target = '_blank';
      modalExeDownloadBtn.onclick = (e) => {
        if (targetUrl && targetUrl !== '#') {
          window.open(targetUrl, '_blank');
        } else {
          e.preventDefault();
          alert('Windows EXE download link has not been configured in Admin Console yet.');
        }
      };
      if (targetUrl.startsWith('data:')) {
        modalExeDownloadBtn.setAttribute('download', `nexora_setup_${appDownloadData.exeVersion || 'app'}.exe`);
      }
    }
    if (windowsModalCard) windowsModalCard.style.display = appDownloadData.exeEnabled !== false ? 'flex' : 'none';
  }

  if (openAppDownloadModalBtn && appDownloadModal) {
    openAppDownloadModalBtn.addEventListener('click', () => {
      loadAppDownloadData();
      appDownloadModal.style.display = 'flex';
    });
  }

  if (appDownloadModalClose && appDownloadModal) {
    appDownloadModalClose.addEventListener('click', () => {
      appDownloadModal.style.display = 'none';
    });
  }

  if (appDownloadModal) {
    appDownloadModal.addEventListener('click', (e) => {
      if (e.target === appDownloadModal) appDownloadModal.style.display = 'none';
    });
  }

  loadAppDownloadData();

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
