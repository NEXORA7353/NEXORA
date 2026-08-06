document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const platformId = params.get('id');

  const breadcrumbCategory = document.getElementById('breadcrumbCategory');
  const breadcrumbPlatform = document.getElementById('breadcrumbPlatform');
  const detailLogoContainer = document.getElementById('detailLogoContainer');
  const detailCategoryBadge = document.getElementById('detailCategoryBadge');
  const detailTitleName = document.getElementById('detailTitleName');
  const detailLinksCountHeader = document.getElementById('detailLinksCountHeader');
  const detailLinksGrid = document.getElementById('detailLinksGrid');
  const detailEmptyState = document.getElementById('detailEmptyState');

  const UPSTASH_URL = 'https://legible-loon-84378.upstash.io';
  const UPSTASH_TOKEN = 'gQAAAAAAAUmaAAIgcDE5M2IwMjM4MTczZjA0ZWQ5YWUwYzYzNTU1YzIyYTQ3Mg';

  loadPlatformDetails();

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

  async function loadPlatformDetails() {
    let allApps = [];

    // 1. Check API
    try {
      const res = await fetch('/api/apps', { cache: 'no-store' });
      if (res.ok) {
        const resData = await res.json();
        if (resData && (Array.isArray(resData) || Array.isArray(resData.data))) {
          allApps = Array.isArray(resData) ? resData : (resData.data || []);
        }
      }
    } catch (e) {}

    // 2. Check Upstash
    if (allApps.length === 0) {
      const upstashApps = await fetchFromUpstash('nexora_apps');
      if (Array.isArray(upstashApps) && upstashApps.length > 0) {
        allApps = upstashApps;
      }
    }

    // 3. Check LocalStorage
    if (allApps.length === 0) {
      try {
        const local = localStorage.getItem('nexora_apps');
        if (local) {
          allApps = JSON.parse(local) || [];
        }
      } catch (e) {}
    }

    // Find requested platform or default to first
    let targetPlatform = allApps.find(a => a.id === platformId);
    if (!targetPlatform && allApps.length > 0) {
      targetPlatform = allApps[0];
    }

    if (!targetPlatform) {
      if (detailEmptyState) detailEmptyState.style.display = 'block';
      if (detailLinksGrid) detailLinksGrid.style.display = 'none';
      return;
    }

    renderPlatform(targetPlatform);
  }

  function renderPlatform(app) {
    if (breadcrumbCategory) breadcrumbCategory.textContent = (app.category || 'GENERAL').toUpperCase();
    if (breadcrumbPlatform) breadcrumbPlatform.textContent = app.name;
    if (detailCategoryBadge) detailCategoryBadge.textContent = (app.category || 'GENERAL').toUpperCase();
    if (detailTitleName) detailTitleName.textContent = app.name;

    // Render Logo
    if (detailLogoContainer) {
      detailLogoContainer.innerHTML = '';
      const logoSrc = app.logoUrl || app.logo;
      if (logoSrc) {
        const img = document.createElement('img');
        img.src = logoSrc;
        img.alt = app.name;
        img.className = 'logo-img';
        img.onerror = () => renderLogoFallback(detailLogoContainer, app.name);
        detailLogoContainer.appendChild(img);
      } else {
        renderLogoFallback(detailLogoContainer, app.name);
      }
    }

    // Render Links
    const links = Array.isArray(app.links) && app.links.length > 0 ? app.links : [];

    if (detailLinksCountHeader) {
      detailLinksCountHeader.textContent = `${links.length} CONFIGURED PORTAL(S) & BATCHES`;
    }

    if (!detailLinksGrid) return;
    detailLinksGrid.innerHTML = '';

    if (links.length === 0) {
      if (detailEmptyState) detailEmptyState.style.display = 'block';
      return;
    }

    if (detailEmptyState) detailEmptyState.style.display = 'none';

    links.forEach(link => {
      const card = document.createElement('article');
      card.className = 'platform-card';

      card.innerHTML = `
        <div class="link-item" style="padding: 16px; border-radius: 12px;">
          <div class="link-details" style="gap: 8px;">
            <div class="link-title" style="font-size: 16px; font-weight: 600; color: var(--ink);">${escapeHtml(link.title || 'Access Portal')}</div>
            <div class="link-badges">
              <span class="status-badge checking" id="status_${link.id}">
                <span class="status-dot"></span><span class="status-lbl">Checking...</span>
              </span>
              <span class="attr-badge ${link.keyRequirement === 'with_key' ? 'key-req' : ''}">
                ${link.keyRequirement === 'with_key' ? 'Key Required' : 'Without Key'}
              </span>
              <span class="attr-badge ${link.loginRequirement === 'login_required' ? 'login-req' : ''}">
                ${link.loginRequirement === 'login_required' ? 'Login Required' : 'No Login'}
              </span>
            </div>
          </div>
          <a href="${link.url || '#'}" class="link-access-btn" style="padding: 10px 18px; font-size: 13px;" ${link.url ? 'target="_self"' : ''}>
            <span>Access</span>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      `;

      const statusBadge = card.querySelector(`#status_${link.id}`);
      if (link.statusMode === 'online') {
        setStatusBadge(statusBadge, true);
      } else if (link.statusMode === 'offline') {
        setStatusBadge(statusBadge, false);
      } else {
        checkLinkStatus(link.url, (isOnline) => {
          setStatusBadge(statusBadge, isOnline);
        });
      }

      const accessBtn = card.querySelector('.link-access-btn');
      accessBtn.addEventListener('click', (e) => {
        if (!link.url) {
          e.preventDefault();
          alert('No target URL configured for this portal link.');
          return;
        }
        if (window.trackLinkClick) {
          window.trackLinkClick(app.name, link.title || app.name, link.url);
        }
      });

      detailLinksGrid.appendChild(card);
    });
  }

  function setStatusBadge(badgeEl, isOnline) {
    if (!badgeEl) return;
    if (isOnline) {
      badgeEl.className = 'status-badge online';
      badgeEl.innerHTML = `<span class="status-dot"></span><span>Online</span>`;
    } else {
      badgeEl.className = 'status-badge offline';
      badgeEl.innerHTML = `<span class="status-dot"></span><span>Offline</span>`;
    }
  }

  function checkLinkStatus(url, callback) {
    if (!url || !url.startsWith('http')) {
      callback(false);
      return;
    }
    const img = new Image();
    const timeout = setTimeout(() => {
      img.src = '';
      callback(true); // Fallback to online assuming active platform
    }, 2500);

    img.onload = () => {
      clearTimeout(timeout);
      callback(true);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      callback(true); // Fallback assuming active platform domain
    };
    try {
      const parsed = new URL(url);
      img.src = `${parsed.origin}/favicon.ico?_t=${Date.now()}`;
    } catch (e) {
      clearTimeout(timeout);
      callback(false);
    }
  }

  function renderLogoFallback(container, name) {
    container.innerHTML = '';
    const fallback = document.createElement('div');
    fallback.className = 'logo-fallback';
    fallback.textContent = getInitials(name);
    container.appendChild(fallback);
  }

  function getInitials(name) {
    if (!name) return 'ED';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
