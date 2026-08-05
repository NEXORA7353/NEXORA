document.addEventListener('DOMContentLoaded', () => {
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

  // Initial Fetch
  fetchApps();

  function fetchApps() {
    fetch('/api/apps')
      .then(res => res.json())
      .then(resData => {
        allApps = Array.isArray(resData) ? resData : (resData.data || []);
        renderCategoryTabs();
        renderGrid();
      })
      .catch(err => {
        console.error('Failed to fetch platforms:', err);
        allApps = [];
        renderGrid();
      });
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
        openInAppBrowser(app.url);
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

  // In-App Browser Logic
  function openInAppBrowser(rawUrl) {
    currentTargetUrl = rawUrl;

    // Format domain for display
    let domainStr = rawUrl;
    try {
      let fullUrl = rawUrl;
      if (!/^https?:\/\//i.test(fullUrl)) {
        fullUrl = 'https://' + fullUrl;
      }
      const urlObj = new URL(fullUrl);
      domainStr = urlObj.hostname.replace(/^www\./i, '');
    } catch (e) {
      domainStr = rawUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
    }

    browserDomain.textContent = domainStr;
    const proxyUrl = `/proxy?url=${encodeURIComponent(rawUrl)}`;
    browserIframe.src = proxyUrl;

    browserPanel.classList.add('open');
    browserPanel.setAttribute('aria-hidden', 'false');
  }

  // Close browser
  browserBackBtn.addEventListener('click', () => {
    browserPanel.classList.remove('open');
    browserPanel.setAttribute('aria-hidden', 'true');
    browserIframe.src = 'about:blank';
  });

  // Reload browser
  browserReloadBtn.addEventListener('click', () => {
    if (currentTargetUrl) {
      const proxyUrl = `/proxy?url=${encodeURIComponent(currentTargetUrl)}&t=${Date.now()}`;
      browserIframe.src = proxyUrl;
    }
  });

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('ServiceWorker registered:', reg.scope))
        .catch(err => console.error('ServiceWorker registration failed:', err));
    });
  }
});
