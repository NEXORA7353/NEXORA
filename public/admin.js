document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASSWORD = 'nexora2024';

  const UPSTASH_URL = 'https://legible-loon-84378.upstash.io';
  const UPSTASH_TOKEN = 'gQAAAAAAAUmaAAIgcDE5M2IwMjM4MTczZjA0ZWQ5YWUwYzYzNTU1YzIyYTQ3Mg';

  const gateScreen = document.getElementById('gateScreen');
  const dashboardScreen = document.getElementById('dashboardScreen');
  const gateForm = document.getElementById('gateForm');
  const gatePassword = document.getElementById('gatePassword');
  const gateError = document.getElementById('gateError');
  const logoutBtn = document.getElementById('logoutBtn');

  // Telegram settings form elements
  const telegramSettingsForm = document.getElementById('telegramSettingsForm');
  const tgEnabled = document.getElementById('tgEnabled');
  const tgLink = document.getElementById('tgLink');
  const tgTitle = document.getElementById('tgTitle');
  const tgMessage = document.getElementById('tgMessage');
  const tgStatusMsg = document.getElementById('tgStatusMsg');

  // Platform form elements
  const addPlatformForm = document.getElementById('addPlatformForm');
  const linksBuilderList = document.getElementById('linksBuilderList');
  const addLinkBtn = document.getElementById('addLinkBtn');
  const adminList = document.getElementById('adminList');
  const platformCount = document.getElementById('platformCount');

  let platforms = [];
  let tempLinks = [];

  // Authentication check
  if (sessionStorage.getItem('nexora_auth') === 'true') {
    showDashboard();
  } else {
    showGate();
  }

  gateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const entered = gatePassword.value;
    if (entered === 'admin@123' || entered === 'nexora2024' || entered === ADMIN_PASSWORD) {
      sessionStorage.setItem('nexora_auth', 'true');
      gateError.style.display = 'none';
      gatePassword.value = '';
      showDashboard();
    } else {
      gateError.style.display = 'block';
    }
  });

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('nexora_auth');
    showGate();
  });

  function showGate() {
    gateScreen.style.display = 'flex';
    dashboardScreen.style.display = 'none';
  }

  function showDashboard() {
    gateScreen.style.display = 'none';
    dashboardScreen.style.display = 'block';
    loadTelegramSettings();
    loadFeedback();
    loadPlatforms();
    loadAnalytics();
    resetLinksBuilder();
    initAdminTheme();
  }

  // ADMIN TAB NAVIGATION
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      const targetEl = document.getElementById(targetTab);
      if (targetEl) targetEl.style.display = 'block';
      if (targetTab === 'tab-analytics') loadAnalytics();
      if (targetTab === 'tab-feedback') loadFeedback();
    });
  });

  // Upstash Direct Fallbacks
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

  async function saveToUpstash(key, payload) {
    try {
      await fetch(`${UPSTASH_URL}/set/${key}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        body: JSON.stringify(payload)
      });
      return true;
    } catch (e) {}
    return false;
  }

  // Telegram Settings Handler
  async function loadTelegramSettings() {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      if (res.ok) {
        const resData = await res.json();
        if (resData && resData.data) {
          applyTelegramFields(resData.data);
          return;
        }
      }
    } catch (e) {}

    const upstashSettings = await fetchFromUpstash('nexora_settings');
    if (upstashSettings) {
      applyTelegramFields(upstashSettings);
    }
  }

  function applyTelegramFields(data) {
    if (tgEnabled) tgEnabled.checked = data.telegramEnabled !== false;
    if (tgLink) tgLink.value = data.telegramLink || '';
    if (tgTitle) tgTitle.value = data.telegramTitle || '';
    if (tgMessage) tgMessage.value = data.telegramMessage || '';
  }

  telegramSettingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {
      telegramEnabled: tgEnabled.checked,
      telegramLink: tgLink.value.trim(),
      telegramTitle: tgTitle.value.trim(),
      telegramMessage: tgMessage.value.trim()
    };

    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(() => showTgStatus('Saved successfully!'))
      .catch(async () => {
        await saveToUpstash('nexora_settings', payload);
        showTgStatus('Saved successfully!');
      });
  });

  function showTgStatus(msg) {
    if (tgStatusMsg) {
      tgStatusMsg.textContent = msg;
      tgStatusMsg.style.display = 'block';
      setTimeout(() => { tgStatusMsg.style.display = 'none'; }, 3000);
    }
  }

  // Links Builder in Add Form
  function resetLinksBuilder() {
    tempLinks = [
      { id: 'link_1', title: 'Main Portal Link', url: '', statusMode: 'auto', keyRequirement: 'without_key', loginRequirement: 'login_not_required' }
    ];
    renderLinksBuilder();
  }

  if (addLinkBtn) {
    addLinkBtn.addEventListener('click', () => {
      tempLinks.push({
        id: 'link_' + Date.now() + '_' + tempLinks.length,
        title: `Link #${tempLinks.length + 1}`,
        url: '',
        statusMode: 'auto',
        keyRequirement: 'without_key',
        loginRequirement: 'login_not_required'
      });
      renderLinksBuilder();
    });
  }

  function renderLinksBuilder() {
    linksBuilderList.innerHTML = '';
    tempLinks.forEach((link, idx) => {
      const box = document.createElement('div');
      box.className = 'link-builder-box';

      box.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 11px; font-family: monospace; color: var(--ink-mute);">LINK #${idx + 1}</span>
          ${tempLinks.length > 1 ? `<button type="button" class="btn-danger btn-sm remove-link-btn" data-idx="${idx}">Remove</button>` : ''}
        </div>
        <input type="text" class="admin-input link-title-input" placeholder="Link Title (e.g. PW Thor Batch)" value="${escapeHtml(link.title)}" required>
        <input type="url" class="admin-input link-url-input" placeholder="Platform Target URL (https://...)" value="${escapeHtml(link.url)}" required>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
          <div>
            <label class="form-label" style="font-size: 9px;">Status</label>
            <select class="admin-input link-status-select" style="font-size: 11px; padding: 6px 8px;">
              <option value="auto" ${link.statusMode === 'auto' ? 'selected' : ''}>Auto Detect</option>
              <option value="online" ${link.statusMode === 'online' ? 'selected' : ''}>Force Online</option>
              <option value="offline" ${link.statusMode === 'offline' ? 'selected' : ''}>Force Offline</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size: 9px;">Key Gen</label>
            <select class="admin-input link-key-select" style="font-size: 11px; padding: 6px 8px;">
              <option value="without_key" ${link.keyRequirement === 'without_key' ? 'selected' : ''}>Without Key</option>
              <option value="with_key" ${link.keyRequirement === 'with_key' ? 'selected' : ''}>Key Required</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size: 9px;">Login</label>
            <select class="admin-input link-login-select" style="font-size: 11px; padding: 6px 8px;">
              <option value="login_not_required" ${link.loginRequirement === 'login_not_required' ? 'selected' : ''}>No Login</option>
              <option value="login_required" ${link.loginRequirement === 'login_required' ? 'selected' : ''}>Login Required</option>
            </select>
          </div>
        </div>
      `;

      box.querySelector('.link-title-input').addEventListener('input', (e) => { link.title = e.target.value; });
      box.querySelector('.link-url-input').addEventListener('input', (e) => { link.url = e.target.value; });
      box.querySelector('.link-status-select').addEventListener('change', (e) => { link.statusMode = e.target.value; });
      box.querySelector('.link-key-select').addEventListener('change', (e) => { link.keyRequirement = e.target.value; });
      box.querySelector('.link-login-select').addEventListener('change', (e) => { link.loginRequirement = e.target.value; });

      const removeBtn = box.querySelector('.remove-link-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          tempLinks.splice(idx, 1);
          renderLinksBuilder();
        });
      }

      linksBuilderList.appendChild(box);
    });
  }

  // Load platforms
  async function loadPlatforms() {
    try {
      const res = await fetch('/api/apps', { cache: 'no-store' });
      if (res.ok) {
        const resData = await res.json();
        if (resData && (Array.isArray(resData) || Array.isArray(resData.data))) {
          platforms = Array.isArray(resData) ? resData : (resData.data || []);
          renderPlatformList();
          return;
        }
      }
    } catch (e) {}

    const upstashApps = await fetchFromUpstash('nexora_apps');
    platforms = upstashApps || [];
    renderPlatformList();
  }

  function renderPlatformList() {
    platformCount.textContent = `Platform count: ${platforms.length}`;
    adminList.innerHTML = '';

    platforms.forEach(app => {
      const card = document.createElement('article');
      card.className = 'admin-item-card';
      card.id = `card_${app.id}`;
      renderCardNormalState(card, app);
      adminList.appendChild(card);
    });
  }

  function renderCardNormalState(card, app) {
    card.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'admin-item-header';

    const logoWrapper = document.createElement('div');
    logoWrapper.className = 'admin-logo-container';

    const logoSrc = app.logoUrl || app.logo;
    if (logoSrc) {
      const img = document.createElement('img');
      img.src = logoSrc;
      img.alt = app.name;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.onerror = () => renderAdminLogoFallback(logoWrapper, app.name);
      logoWrapper.appendChild(img);
    } else {
      renderAdminLogoFallback(logoWrapper, app.name);
    }

    const details = document.createElement('div');
    details.className = 'admin-item-details';

    const nameEl = document.createElement('div');
    nameEl.className = 'admin-item-name';
    nameEl.textContent = app.name;

    const catEl = document.createElement('div');
    catEl.className = 'admin-item-cat';
    catEl.textContent = `${(app.category || 'GENERAL').toUpperCase()} • ${app.links ? app.links.length : 0} LINK(S)`;

    details.appendChild(nameEl);
    details.appendChild(catEl);

    header.appendChild(logoWrapper);
    header.appendChild(details);

    const actions = document.createElement('div');
    actions.className = 'admin-item-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-outline btn-sm';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => renderCardEditState(card, app));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-danger btn-sm';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deletePlatform(app.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(actions);
  }

  function renderAdminLogoFallback(container, name) {
    container.innerHTML = '';
    const fallback = document.createElement('div');
    fallback.style.fontFamily = 'monospace';
    fallback.style.color = 'var(--ink-mute)';
    fallback.textContent = getInitials(name);
    container.appendChild(fallback);
  }

  function getInitials(name) {
    if (!name) return 'ED';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  // Inline Platform Edit Mode
  function renderCardEditState(card, app) {
    let editLinks = Array.isArray(app.links) && app.links.length > 0 ? JSON.parse(JSON.stringify(app.links)) : [
      { id: 'link_1', title: app.name + ' Portal', url: app.url || '', statusMode: 'auto', keyRequirement: 'without_key', loginRequirement: 'login_not_required' }
    ];

    card.innerHTML = `
      <form class="inline-edit-form" style="display: flex; flex-direction: column; gap: 10px;">
        <div class="form-group">
          <label class="form-label">Platform Name</label>
          <input type="text" class="admin-input edit-name" value="${escapeHtml(app.name)}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Logo URL</label>
          <input type="url" class="admin-input edit-logo" value="${escapeHtml(app.logoUrl || app.logo || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <input type="text" class="admin-input edit-category" value="${escapeHtml(app.category || '')}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Order</label>
          <input type="number" class="admin-input edit-order" value="${app.order || 1}" min="1" required>
        </div>
        <div class="form-group">
          <div class="toggle-wrapper">
            <span class="form-label">Featured</span>
            <label class="toggle-switch">
              <input type="checkbox" class="edit-featured" ${app.featured ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label">Platform Links</label>
            <button type="button" class="btn-outline btn-sm add-edit-link-btn">+ Add Link</button>
          </div>
          <div class="edit-links-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
        </div>

        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;">
          <button type="button" class="btn-outline btn-sm cancel-edit-btn">Cancel</button>
          <button type="submit" class="btn-primary btn-sm">Save Platform</button>
        </div>
      </form>
    `;

    const editLinksContainer = card.querySelector('.edit-links-container');

    function renderEditLinks() {
      editLinksContainer.innerHTML = '';
      editLinks.forEach((l, i) => {
        const itemBox = document.createElement('div');
        itemBox.className = 'link-builder-box';
        itemBox.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; font-family: monospace; color: var(--ink-mute);">LINK #${i + 1}</span>
            ${editLinks.length > 1 ? `<button type="button" class="btn-danger btn-sm remove-edit-link-btn">Remove</button>` : ''}
          </div>
          <input type="text" class="admin-input edit-link-title" value="${escapeHtml(l.title)}" placeholder="Title" required>
          <input type="url" class="admin-input edit-link-url" value="${escapeHtml(l.url)}" placeholder="Target URL" required>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
            <select class="admin-input edit-link-status" style="font-size: 10px; padding: 4px;">
              <option value="auto" ${l.statusMode === 'auto' ? 'selected' : ''}>Auto Detect</option>
              <option value="online" ${l.statusMode === 'online' ? 'selected' : ''}>Force Online</option>
              <option value="offline" ${l.statusMode === 'offline' ? 'selected' : ''}>Force Offline</option>
            </select>
            <select class="admin-input edit-link-key" style="font-size: 10px; padding: 4px;">
              <option value="without_key" ${l.keyRequirement === 'without_key' ? 'selected' : ''}>Without Key</option>
              <option value="with_key" ${l.keyRequirement === 'with_key' ? 'selected' : ''}>Key Required</option>
            </select>
            <select class="admin-input edit-link-login" style="font-size: 10px; padding: 4px;">
              <option value="login_not_required" ${l.loginRequirement === 'login_not_required' ? 'selected' : ''}>No Login</option>
              <option value="login_required" ${l.loginRequirement === 'login_required' ? 'selected' : ''}>Login Required</option>
            </select>
          </div>
        `;

        itemBox.querySelector('.edit-link-title').addEventListener('input', e => l.title = e.target.value);
        itemBox.querySelector('.edit-link-url').addEventListener('input', e => l.url = e.target.value);
        itemBox.querySelector('.edit-link-status').addEventListener('change', e => l.statusMode = e.target.value);
        itemBox.querySelector('.edit-link-key').addEventListener('change', e => l.keyRequirement = e.target.value);
        itemBox.querySelector('.edit-link-login').addEventListener('change', e => l.loginRequirement = e.target.value);

        const rmBtn = itemBox.querySelector('.remove-edit-link-btn');
        if (rmBtn) {
          rmBtn.addEventListener('click', () => {
            editLinks.splice(i, 1);
            renderEditLinks();
          });
        }

        editLinksContainer.appendChild(itemBox);
      });
    }

    renderEditLinks();

    card.querySelector('.add-edit-link-btn').addEventListener('click', () => {
      editLinks.push({ id: 'link_' + Date.now(), title: `Link #${editLinks.length + 1}`, url: '', statusMode: 'auto', keyRequirement: 'without_key', loginRequirement: 'login_not_required' });
      renderEditLinks();
    });

    card.querySelector('.cancel-edit-btn').addEventListener('click', () => renderCardNormalState(card, app));

    card.querySelector('.inline-edit-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const updatedPayload = {
        name: card.querySelector('.edit-name').value.trim(),
        logoUrl: card.querySelector('.edit-logo').value.trim(),
        logo: card.querySelector('.edit-logo').value.trim(),
        category: card.querySelector('.edit-category').value.trim(),
        order: parseInt(card.querySelector('.edit-order').value, 10) || 1,
        featured: card.querySelector('.edit-featured').checked,
        links: editLinks
      };

      fetch(`/api/apps/${app.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      })
        .then(res => res.json())
        .then(() => loadPlatforms())
        .catch(async () => {
          let currentApps = (await fetchFromUpstash('nexora_apps')) || platforms || [];
          const idx = currentApps.findIndex(p => p.id === app.id);
          if (idx !== -1) {
            currentApps[idx] = { ...currentApps[idx], ...updatedPayload };
          }
          await saveToUpstash('nexora_apps', currentApps);
          loadPlatforms();
        });
    });
  }

  // Add platform form submit
  addPlatformForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('appName').value.trim(),
      logoUrl: document.getElementById('appLogo').value.trim(),
      logo: document.getElementById('appLogo').value.trim(),
      category: document.getElementById('appCategory').value.trim(),
      order: parseInt(document.getElementById('appOrder').value, 10) || 1,
      featured: document.getElementById('appFeatured').checked,
      links: tempLinks
    };

    fetch('/api/apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(() => {
        addPlatformForm.reset();
        document.getElementById('appOrder').value = 1;
        resetLinksBuilder();
        loadPlatforms();
      })
      .catch(async () => {
        let currentApps = (await fetchFromUpstash('nexora_apps')) || platforms || [];
        const newItem = {
          id: 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          name: payload.name,
          logoUrl: payload.logoUrl,
          category: payload.category || 'GENERAL',
          order: payload.order || (currentApps.length + 1),
          featured: payload.featured,
          addedAt: new Date().toISOString(),
          links: payload.links
        };
        currentApps.push(newItem);
        await saveToUpstash('nexora_apps', currentApps);
        addPlatformForm.reset();
        document.getElementById('appOrder').value = 1;
        resetLinksBuilder();
        loadPlatforms();
      });
  });

  function deletePlatform(id) {
    fetch(`/api/apps/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => loadPlatforms())
      .catch(async () => {
        let currentApps = (await fetchFromUpstash('nexora_apps')) || platforms || [];
        currentApps = currentApps.filter(p => p.id !== id);
        await saveToUpstash('nexora_apps', currentApps);
        loadPlatforms();
      });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // USER FEEDBACK & REPORTS MANAGEMENT
  let feedbackItems = [];
  const adminFeedbackList = document.getElementById('adminFeedbackList');
  const feedbackCount = document.getElementById('feedbackCount');

  async function loadFeedback() {
    try {
      const res = await fetch('/api/feedback', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          feedbackItems = data;
          renderFeedbackList();
        }
      }
    } catch (e) {}
  }

  function renderFeedbackList() {
    if (!adminFeedbackList) return;
    adminFeedbackList.innerHTML = '';
    if (feedbackCount) feedbackCount.textContent = `${feedbackItems.length} submissions`;

    if (feedbackItems.length === 0) {
      adminFeedbackList.innerHTML = `
        <div style="text-align: center; color: var(--ink-mute); padding: 20px; font-size: 13px; background: var(--canvas-card); border-radius: 12px; border: 1px solid var(--hairline);">
          No user feedback or error reports submitted yet.
        </div>`;
      return;
    }

    feedbackItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'admin-item-card';
      const isReplied = item.status === 'REPLIED';

      card.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="notif-type-badge ${item.type === 'ERROR' ? 'error' : (item.type === 'IMPROVEMENT' ? 'improvement' : 'question')}">${item.type || 'QUESTION'}</span>
            <span style="font-size: 13px; font-weight: 600; color: #fff;">${escapeHtml(item.userName || 'Student')}</span>
            ${item.userEmail ? `<span style="font-size: 12px; color: var(--ink-mute);">(${escapeHtml(item.userEmail)})</span>` : ''}
          </div>
          <span style="font-size: 11px; color: var(--ink-mute);">${new Date(item.createdAt).toLocaleString()}</span>
        </div>
        
        <div style="font-size: 14px; color: var(--ink-body); line-height: 1.4; background: var(--canvas-soft); padding: 10px; border-radius: 8px;">
          ${escapeHtml(item.message)}
        </div>

        ${isReplied ? `
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 10px; margin-top: 4px;">
            <div style="font-size: 11px; font-weight: 700; color: #10b981;">CURRENT ADMIN REPLY:</div>
            <div style="font-size: 13px; color: #fff; margin-top: 2px;">${escapeHtml(item.adminReply)}</div>
          </div>
        ` : ''}

        <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 8px;">
          <textarea id="replyText_${item.id}" class="admin-input" placeholder="Type reply for user..." style="min-height: 60px; font-size: 13px;">${escapeHtml(item.adminReply || '')}</textarea>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <button type="button" class="btn-primary btn-sm" onclick="sendAdminReply('${item.id}')">
              ${isReplied ? 'Update Reply' : 'Send Reply'}
            </button>
            <button type="button" class="btn-danger btn-sm" onclick="deleteFeedbackItem('${item.id}')">Delete</button>
          </div>
        </div>
      `;
      adminFeedbackList.appendChild(card);
    });
  }

  window.sendAdminReply = async function(id) {
    const textarea = document.getElementById(`replyText_${id}`);
    if (!textarea || !textarea.value.trim()) {
      alert('Please type a reply before sending.');
      return;
    }
    const adminReply = textarea.value.trim();
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', id, adminReply })
      });
      if (res.ok) {
        alert('Reply sent successfully! User will receive a notification.');
        loadFeedback();
      }
    } catch (e) {
      alert('Failed to send reply.');
    }
  };

  window.deleteFeedbackItem = async function(id) {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      if (res.ok) {
        loadFeedback();
      }
    } catch (e) {}
  };

  // LINK CLICK ANALYTICS & STATS METRICS
  const analyticsList = document.getElementById('analyticsList');
  const refreshAnalyticsBtn = document.getElementById('refreshAnalyticsBtn');
  const metricPlatformCount = document.getElementById('metricPlatformCount');
  const metricClickCount = document.getElementById('metricClickCount');
  const metricPendingCount = document.getElementById('metricPendingCount');

  if (refreshAnalyticsBtn) {
    refreshAnalyticsBtn.addEventListener('click', () => loadAnalytics());
  }

  async function loadAnalytics() {
    let clickData = {};
    try {
      const res = await fetch('/api/track-click', { cache: 'no-store' });
      if (res.ok) {
        clickData = await res.json();
      }
    } catch (e) {}

    // Combine with local storage clicks
    const localClicks = JSON.parse(localStorage.getItem('nexora_link_clicks') || '{}');
    Object.keys(localClicks).forEach(k => {
      if (!clickData[k]) {
        clickData[k] = { appName: k, linkTitle: 'Access Link', url: k, count: localClicks[k], lastClicked: new Date().toISOString() };
      }
    });

    renderAnalytics(clickData);
    updateMetrics(clickData);
  }

  function renderAnalytics(clickData) {
    if (!analyticsList) return;
    analyticsList.innerHTML = '';

    const items = Object.values(clickData).sort((a, b) => (b.count || 0) - (a.count || 0));

    if (items.length === 0) {
      analyticsList.innerHTML = `
        <div style="text-align: center; color: var(--ink-mute); padding: 20px; font-size: 13px; background: var(--canvas-card); border-radius: 12px; border: 1px solid var(--hairline);">
          No link clicks tracked yet. Clicks will appear here in real-time as users open platforms.
        </div>`;
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'admin-item-card';
      card.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="font-size: 15px; font-weight: 600; color: #fff;">${escapeHtml(item.appName || item.linkTitle || 'Platform Link')}</div>
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

  function updateMetrics(clickData) {
    if (metricPlatformCount) metricPlatformCount.textContent = platforms ? platforms.length : 0;
    
    let totalClicks = 0;
    if (clickData) {
      Object.values(clickData).forEach(v => {
        totalClicks += (v.count || 0);
      });
    }
    if (metricClickCount) metricClickCount.textContent = totalClicks;

    const pending = (feedbackItems || []).filter(f => f.status === 'PENDING').length;
    if (metricPendingCount) metricPendingCount.textContent = pending;
  }

  // ADMIN THEME TOGGLE
  const adminThemeToggleBtn = document.getElementById('adminThemeToggleBtn');
  const admSunIcon = document.getElementById('admSunIcon');
  const admMoonIcon = document.getElementById('admMoonIcon');

  function initAdminTheme() {
    const saved = localStorage.getItem('nexora_theme') || 'dark';
    setAdminTheme(saved);
  }

  function setAdminTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (admSunIcon) admSunIcon.style.display = 'block';
      if (admMoonIcon) admMoonIcon.style.display = 'none';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (admSunIcon) admSunIcon.style.display = 'none';
      if (admMoonIcon) admMoonIcon.style.display = 'block';
    }
    localStorage.setItem('nexora_theme', theme);
  }

  if (adminThemeToggleBtn) {
    adminThemeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      setAdminTheme(current === 'light' ? 'dark' : 'light');
    });
  }
});
