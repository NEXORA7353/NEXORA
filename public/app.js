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

  async function fetchApps() {
    try {
      const res = await fetch('/api/apps', { cache: 'no-store' });
      if (res.ok) {
        const resData = await res.json();
        if (resData && (Array.isArray(resData) || Array.isArray(resData.data))) {
          allApps = Array.isArray(resData) ? resData : (resData.data || []);
          renderCategoryTabs();
          renderGrid();
          return;
        }
      }
    } catch (e) {}

    const upstashApps = await fetchFromUpstash('nexora_apps');
    allApps = upstashApps || [];
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

      // Header
      const header = document.createElement('div');
      header.className = 'platform-header';

      const logoWrapper = document.createElement('div');
      logoWrapper.className = 'logo-container';

      const logoSrc = app.logoUrl || app.logo;
      if (logoSrc) {
        const img = document.createElement('img');
        img.src = logoSrc;
        img.alt = app.name;
        img.className = 'logo-img';
        img.onerror = () => renderLogoFallback(logoWrapper, app.name);
        logoWrapper.appendChild(img);
      } else {
        renderLogoFallback(logoWrapper, app.name);
      }

      const infoDiv = document.createElement('div');
      infoDiv.className = 'platform-info';

      const titleEl = document.createElement('h2');
      titleEl.className = 'platform-title';
      titleEl.textContent = app.name;

      const catEl = document.createElement('div');
      catEl.className = 'platform-category';
      catEl.textContent = (app.category || 'GENERAL').toUpperCase();

      infoDiv.appendChild(titleEl);
      infoDiv.appendChild(catEl);

      header.appendChild(logoWrapper);
      header.appendChild(infoDiv);
      card.appendChild(header);

      // Links Section
      const linksContainer = document.createElement('div');
      linksContainer.className = 'platform-links-list';

      let links = Array.isArray(app.links) && app.links.length > 0 ? app.links : [];
      if (links.length === 0 && app.url) {
        links = [{
          id: 'link_1',
          title: 'Main Access Portal',
          url: app.url,
          statusMode: 'auto',
          keyRequirement: 'without_key',
          loginRequirement: 'login_not_required'
        }];
      }

      links.forEach(link => {
        const linkItem = document.createElement('div');
        linkItem.className = 'link-item';

        const linkDetails = document.createElement('div');
        linkDetails.className = 'link-details';

        const linkTitle = document.createElement('div');
        linkTitle.className = 'link-title';
        linkTitle.textContent = link.title || 'Access Portal';

        const badgesRow = document.createElement('div');
        badgesRow.className = 'link-badges';

        // Status Badge
        const statusBadge = document.createElement('span');
        statusBadge.className = 'status-badge checking';
        statusBadge.innerHTML = `<span class="status-dot"></span><span class="status-lbl">Checking...</span>`;
        badgesRow.appendChild(statusBadge);

        // Auto or Manual Status Check
        if (link.statusMode === 'online') {
          setStatusBadge(statusBadge, true);
        } else if (link.statusMode === 'offline') {
          setStatusBadge(statusBadge, false);
        } else {
          // Auto Detect
          checkLinkStatus(link.url, (isOnline) => {
            setStatusBadge(statusBadge, isOnline);
          });
        }

        // Key Gen Requirement Badge
        const keyBadge = document.createElement('span');
        keyBadge.className = `attr-badge ${link.keyRequirement === 'with_key' ? 'key-req' : ''}`;
        keyBadge.textContent = link.keyRequirement === 'with_key' ? 'Key Required' : 'Without Key';
        badgesRow.appendChild(keyBadge);

        // Login Requirement Badge
        const loginBadge = document.createElement('span');
        loginBadge.className = `attr-badge ${link.loginRequirement === 'login_required' ? 'login-req' : ''}`;
        loginBadge.textContent = link.loginRequirement === 'login_required' ? 'Login Required' : 'No Login';
        badgesRow.appendChild(loginBadge);

        linkDetails.appendChild(linkTitle);
        linkDetails.appendChild(badgesRow);

        // Access Button with SVG Open Icon (Same Tab Launcher)
        const openBtn = document.createElement('a');
        openBtn.href = link.url || '#';
        openBtn.target = '_self';
        openBtn.className = 'link-access-btn';
        openBtn.innerHTML = `
          <span>Access</span>
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        `;
        openBtn.addEventListener('click', (e) => {
          if (!link.url) {
            e.preventDefault();
            return;
          }
          window.location.href = link.url;
        });

        linkItem.appendChild(linkDetails);
        linkItem.appendChild(openBtn);
        linksContainer.appendChild(linkItem);
      });

      card.appendChild(linksContainer);
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

  // Initial notification check
  loadNotifications();
  setInterval(loadNotifications, 30000);
});
