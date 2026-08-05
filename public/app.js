document.addEventListener('DOMContentLoaded', () => {
  // Prevent nested NEXORA instances inside iframes
  if (window.self !== window.top || window.frameElement) {
    document.body.innerHTML = `
      <div style="background:#0a0a0a; color:#ffffff; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; text-align:center; padding:24px;">
        <p style="font-family:monospace; font-size:11px; color:#7d8187; letter-spacing:1.4px; margin-bottom:16px;">NEXORA — NOTICE</p>
        <h2 style="font-weight:400; font-size:18px; margin-bottom:8px;">Target Platform Direct Launch</h2>
        <p style="font-size:14px; color:#7d8187; font-weight:400; max-width:400px; margin-bottom:24px;">This platform blocks iframe embedding. Please open directly.</p>
      </div>
    `;
    return;
  }

  let allApps = [];
  let activeCategory = 'ALL';
  let searchQuery = '';

  const searchInput = document.getElementById('searchInput');
  const categoryTabsContainer = document.getElementById('categoryTabs');
  const appsGrid = document.getElementById('appsGrid');
  const emptyState = document.getElementById('emptyState');
  const sectionEyebrow = document.getElementById('sectionEyebrow');

  // In-App Browser elements
  const browserPanel = document.getElementById('browserPanel');
  const browserBackBtn = document.getElementById('browserBackBtn');
  const browserDomain = document.getElementById('browserDomain');
  const browserReloadBtn = document.getElementById('browserReloadBtn');
  const browserIframe = document.getElementById('browserIframe');

  let currentTargetUrl = '';

  const UPSTASH_URL = 'https://legible-loon-84378.upstash.io';
  const UPSTASH_TOKEN = 'gQAAAAAAAUmaAAIgcDE5M2IwMjM4MTczZjA0ZWQ5YWUwYzYzNTU1YzIyYTQ3Mg';

  async function fetchFromUpstash() {
    try {
      const res = await fetch(`${UPSTASH_URL}/get/nexora_apps`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      });
      const data = await res.json();
      if (data && data.result) {
        const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Upstash direct fetch error:', e.message);
    }
    return null;
  }

  const splashScreen = document.getElementById('splashScreen');
  const splashProgress = document.getElementById('splashProgress');
  const splashStatus = document.getElementById('splashStatus');
  const statAppCount = document.getElementById('statAppCount');

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

  // Initial Fetch
  fetchApps();

  async function fetchApps() {
    // 1. Primary: Server API route (/api/apps) - handles Cloudflare KV & Upstash server-side
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
    } catch (e) {
      console.warn('/api/apps route fetch notice:', e.message);
    }

    // 2. Secondary: Upstash Redis Direct REST (Full Browser CORS support)
    const upstashApps = await fetchFromUpstash();
    allApps = upstashApps || [];
    renderCategoryTabs();
    renderGrid();
  }

  // Extract unique categories & render tabs
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

  // Real-time search listener
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderGrid();
  });

  // Render Apps Grid
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

    // Update section eyebrow
    sectionEyebrow.textContent = activeCategory === 'ALL' ? 'PLATFORMS' : activeCategory;

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
      card.className = `app-card ${app.featured ? 'featured' : ''}`;

      // Logo or Fallback Initials
      const logoWrapper = document.createElement('div');
      logoWrapper.className = 'logo-container';

      const logoSrc = app.logoUrl || app.logo;
      if (logoSrc) {
        const img = document.createElement('img');
        img.src = logoSrc;
        img.alt = app.name;
        img.className = 'logo-img';
        img.onerror = () => {
          renderLogoFallback(logoWrapper, app.name);
        };
        logoWrapper.appendChild(img);
      } else {
        renderLogoFallback(logoWrapper, app.name);
      }

      // App info
      const infoDiv = document.createElement('div');
      infoDiv.className = 'app-info';

      const titleEl = document.createElement('h2');
      titleEl.className = 'card-title';
      titleEl.textContent = app.name;

      const catEl = document.createElement('div');
      catEl.className = 'card-category';
      catEl.textContent = (app.category || 'GENERAL').toUpperCase();

      infoDiv.appendChild(titleEl);
      infoDiv.appendChild(catEl);

      // Open button
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'btn-outline card-open-btn';
      openBtn.textContent = 'Open';
      openBtn.addEventListener('click', () => {
        openInAppBrowser(app.url, app.name);
      });

      card.appendChild(logoWrapper);
      card.appendChild(infoDiv);
      card.appendChild(openBtn);

      appsGrid.appendChild(card);
    });
  }

  // Render initials fallback logo
  function renderLogoFallback(container, name) {
    container.innerHTML = '';
    const fallbackDiv = document.createElement('div');
    fallbackDiv.className = 'logo-fallback';
    const initials = getInitials(name);
    fallbackDiv.textContent = initials;
    container.appendChild(fallbackDiv);
  }

  function getInitials(name) {
    if (!name) return 'NX';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Native Standalone History Router & Edge Proxy Container Engine
  let isBrowserPanelActive = false;

  function openInAppBrowser(rawUrl, appName) {
    if (!rawUrl) return;
    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = 'https://' + rawUrl;
    }
    currentTargetUrl = rawUrl;

    // Display platform title instead of link URL
    browserDomain.textContent = appName || 'Platform';

    // Set direct browser tab link URL
    const browserDirectBtn = document.getElementById('browserDirectBtn');
    if (browserDirectBtn) {
      browserDirectBtn.href = rawUrl;
    }

    // Always route via Edge Proxy to strip X-Frame-Options: DENY headers
    const proxyUrl = `/proxy?url=${encodeURIComponent(rawUrl)}`;
    browserIframe.src = proxyUrl;

    browserPanel.classList.add('open');
    browserPanel.setAttribute('aria-hidden', 'false');

    // Push native Android history state for hardware back button navigation
    if (!isBrowserPanelActive) {
      isBrowserPanelActive = true;
      try {
        history.pushState({ modal: 'browser', url: rawUrl }, '', '#view=platform');
      } catch (e) {}
    }
  }

  function closeBrowserPanel(triggerHistoryBack = true) {
    if (!browserPanel) return;
    browserPanel.classList.remove('open');
    browserPanel.setAttribute('aria-hidden', 'true');
    browserIframe.src = 'about:blank';

    if (isBrowserPanelActive) {
      isBrowserPanelActive = false;
      if (triggerHistoryBack && window.location.hash === '#view=platform') {
        try {
          history.back();
        } catch(e) {}
      }
    }
  }

  // Native Android Hardware Back Button Listener (popstate)
  window.addEventListener('popstate', (e) => {
    if (isBrowserPanelActive || (browserPanel && browserPanel.classList.contains('open'))) {
      closeBrowserPanel(false);
    }
  });

  // Close button handler
  if (browserBackBtn) {
    browserBackBtn.addEventListener('click', () => {
      closeBrowserPanel(true);
    });
  }

  // Reload browser handler
  if (browserReloadBtn) {
    browserReloadBtn.addEventListener('click', () => {
      if (currentTargetUrl) {
        const proxyUrl = `/proxy?url=${encodeURIComponent(currentTargetUrl)}&t=${Date.now()}`;
        browserIframe.src = proxyUrl;
      }
    });
  }

  // Same Tab Direct Launcher handler (No proxy, zero error, same window)
  const browserDirectBtn = document.getElementById('browserDirectBtn');
  if (browserDirectBtn) {
    browserDirectBtn.addEventListener('click', () => {
      if (currentTargetUrl) {
        window.location.href = currentTargetUrl;
      }
    });
  }

  // Override window.open globally to keep popups inside NEXORA Standalone Container
  window.open = function(url, target, features) {
    if (url && typeof url === 'string' && url !== 'about:blank') {
      openInAppBrowser(url);
    }
    return window;
  };

  // Global Standalone Link & Form Interceptor — Prevent Chrome Custom Tabs or External Browser
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    // Direct platform open button inside browser panel can open in new tab if user explicitly chooses
    if (anchor.id === 'browserDirectBtn') return;

    e.preventDefault();

    // Check if link is internal route or external platform
    const isInternal = href.startsWith('/') || href.startsWith(window.location.origin) || href.includes('.html');

    if (isInternal) {
      window.location.href = href;
    } else {
      openInAppBrowser(href, anchor.textContent.trim() || 'Platform');
    }
  }, true);

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('ServiceWorker registered:', reg.scope))
        .catch(err => console.error('ServiceWorker registration failed:', err));
    });
  }

  // PWA Install Prompt Handler
  let deferredPrompt = null;
  const pwaInstallBtn = document.getElementById('pwaInstallBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    deferredPrompt = e;
    if (pwaInstallBtn) {
      pwaInstallBtn.style.display = 'inline-flex';
    }
  });

  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          pwaInstallBtn.style.display = 'none';
        }
        deferredPrompt = null;
      } else {
        alert('To Install NEXORA Android App / APK:\n\nOption A (Instant Direct Install):\n1. Open Chrome menu (⋮)\n2. Tap "Install app" or "Add to Home screen"\n\nOption B (Build Standalone APK):\n1. Visit PWABuilder.com\n2. Paste URL: https://nexora-6ag.pages.dev\n3. Click "Build Android Package" to download APK!');
      }
    });
  }
});
