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

  function sanitizePlatforms(apps) {
    if (!Array.isArray(apps)) return [];
    return apps.filter(a => a && a.name && a.name.trim() !== '' && a.name.trim().toLowerCase() !== 'new platform');
  }

  async function loadPlatformDetails() {
    let allApps = [];

    // Priority 1: Check Upstash Cloud Redis (Central Live Database)
    const upstashApps = await fetchFromUpstash('nexora_apps');
    const validUpstash = sanitizePlatforms(upstashApps);
    if (validUpstash.length > 0) {
      allApps = validUpstash;
      try { localStorage.setItem('nexora_apps', JSON.stringify(allApps)); } catch (e) {}
    }

    // Priority 2: Check API Route
    if (allApps.length === 0) {
      try {
        const res = await fetch('/api/apps', { cache: 'no-store' });
        if (res.ok) {
          const resData = await res.json();
          if (resData && (Array.isArray(resData) || Array.isArray(resData.data))) {
            const rawApi = Array.isArray(resData) ? resData : (resData.data || []);
            allApps = sanitizePlatforms(rawApi);
          }
        }
      } catch (e) {}
    }

    // Priority 3: Check LocalStorage
    if (allApps.length === 0) {
      try {
        const local = localStorage.getItem('nexora_apps');
        if (local) {
          allApps = sanitizePlatforms(JSON.parse(local));
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
      const isUpcoming = link.badgeTag === 'UPCOMING' || app.badgeTag === 'UPCOMING';
      const badgeTag = link.badgeTag && link.badgeTag !== 'NONE' ? link.badgeTag : '';

      card.className = `platform-card ${isUpcoming ? 'upcoming-blocked-card' : ''}`;

      let tagBadgeHtml = '';
      if (badgeTag === 'NEW') {
        tagBadgeHtml = `<span class="attr-badge ribbon-new-badge" style="background: rgba(16, 185, 129, 0.18); color: #34d399; border-color: rgba(16, 185, 129, 0.45); font-weight: 800;">NEW</span>`;
      } else if (badgeTag === 'PREMIUM') {
        tagBadgeHtml = `<span class="attr-badge ribbon-premium-badge" style="background: rgba(245, 158, 11, 0.18); color: #fbbf24; border-color: rgba(245, 158, 11, 0.45); font-weight: 800;">PREMIUM</span>`;
      } else if (isUpcoming) {
        tagBadgeHtml = `<span class="attr-badge ribbon-upcoming-badge" style="background: rgba(168, 85, 247, 0.18); color: #c084fc; border-color: rgba(168, 85, 247, 0.45); font-weight: 800;">UPCOMING</span>`;
      }

      card.innerHTML = `
        <div class="link-item" style="padding: 24px 28px; border-radius: 16px; min-height: 100px;">
          <div class="link-details" style="gap: 12px;">
            <div class="link-title" style="font-size: 20px; font-weight: 800; color: var(--ink); letter-spacing: -0.3px;">
              ${escapeHtml(link.title || 'Access Portal')}
            </div>
            <div class="link-badges" style="gap: 10px;">
              ${tagBadgeHtml}
              <span class="status-badge checking" id="status_${link.id}" style="font-size: 13px; padding: 6px 14px; font-weight: 700;">
                <span class="status-dot"></span><span class="status-lbl">Checking...</span>
              </span>
              <span class="attr-badge ${link.keyRequirement === 'with_key' ? 'key-req' : ''}" style="font-size: 13px; padding: 6px 14px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                ${link.keyRequirement === 'with_key' 
                  ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>Key Required</span>' 
                  : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg><span>Without Key</span>'}
              </span>
              <span class="attr-badge ${link.loginRequirement === 'login_required' ? 'login-req' : ''}" style="font-size: 13px; padding: 6px 14px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                ${link.loginRequirement === 'login_required' 
                  ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>Login Required</span>' 
                  : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg><span>No Login</span>'}
              </span>
            </div>
          </div>
          ${isUpcoming ? `
            <button type="button" class="link-access-btn blocked-btn" style="padding: 14px 28px; font-size: 15px; font-weight: 700; height: 50px; border-radius: 12px; background: #475569; color: #cbd5e1; cursor: not-allowed; opacity: 0.85;">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Upcoming</span>
            </button>
          ` : `
            <a href="${link.url || '#'}" class="link-access-btn" style="padding: 14px 28px; font-size: 15px; font-weight: 700; height: 50px; border-radius: 12px;" ${link.url ? 'target="_self"' : ''}>
              <span>Access</span>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          `}
        </div>
      `;

      if (isUpcoming) {
        const blockedBtn = card.querySelector('.blocked-btn');
        if (blockedBtn) {
          blockedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            alert(`⛔ Access Blocked: "${link.title || 'This Portal'}" is Upcoming and will be available soon!`);
          });
        }
      }

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
