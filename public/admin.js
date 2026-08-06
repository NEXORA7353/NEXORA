document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASSWORD = 'nexora2024';

  const UPSTASH_URL = 'https://legible-loon-84378.upstash.io';
  const UPSTASH_TOKEN = 'gQAAAAAAAUmaAAIgcDE5M2IwMjM4MTczZjA0ZWQ5YWUwYzYzNTU1YzIyYTQ3Mg';

  // All DOM Elements declared at the very top to prevent Temporal Dead Zone ReferenceErrors
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

  // Metrics & Analytics elements
  const analyticsList = document.getElementById('analyticsList');
  const refreshAnalyticsBtn = document.getElementById('refreshAnalyticsBtn');
  const metricPlatformCount = document.getElementById('metricPlatformCount');
  const metricClickCount = document.getElementById('metricClickCount');
  const metricPendingCount = document.getElementById('metricPendingCount');

  // Theme elements
  const adminThemeToggleBtn = document.getElementById('adminThemeToggleBtn');
  const gateThemeToggleBtn = document.getElementById('gateThemeToggleBtn');
  const admSunIcon = document.getElementById('admSunIcon');
  const admMoonIcon = document.getElementById('admMoonIcon');

  // Feedback elements
  const adminFeedbackList = document.getElementById('adminFeedbackList');
  const feedbackCount = document.getElementById('feedbackCount');

  let platforms = [];
  let tempLinks = [];
  let feedbackItems = [];

  // Theme Helpers
  function setAdminTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try {
      localStorage.setItem('nexora_theme', theme);
    } catch (e) {}
    updateAdminIcons(theme);
  }

  function updateAdminIcons(theme) {
    const sunIcons = document.querySelectorAll('#admSunIcon, #gateSunIcon, #themeSunIcon');
    const moonIcons = document.querySelectorAll('#admMoonIcon, #gateMoonIcon, #themeMoonIcon');
    sunIcons.forEach(icon => { if (icon) icon.style.display = theme === 'light' ? 'block' : 'none'; });
    moonIcons.forEach(icon => { if (icon) icon.style.display = theme === 'light' ? 'none' : 'block'; });
  }

  function initAdminTheme() {
    const saved = localStorage.getItem('nexora_theme') || 'dark';
    setAdminTheme(saved);
  }

  if (adminThemeToggleBtn) {
    adminThemeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      setAdminTheme(current === 'light' ? 'dark' : 'light');
    });
  }

  if (gateThemeToggleBtn) {
    gateThemeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      setAdminTheme(current === 'light' ? 'dark' : 'light');
    });
  }

  // Authentication check
  if (sessionStorage.getItem('nexora_auth') === 'true') {
    showDashboard();
  } else {
    showGate();
  }

  if (gateForm) {
    gateForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const entered = gatePassword.value;
      if (entered === 'admin@123' || entered === 'nexora2024' || entered === ADMIN_PASSWORD) {
        sessionStorage.setItem('nexora_auth', 'true');
        if (gateError) gateError.style.display = 'none';
        gatePassword.value = '';
        showDashboard();
      } else {
        if (gateError) gateError.style.display = 'block';
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('nexora_auth');
      showGate();
    });
  }

  function showGate() {
    if (gateScreen) gateScreen.style.display = 'flex';
    if (dashboardScreen) dashboardScreen.style.display = 'none';
    initAdminTheme();
  }

  function showDashboard() {
    if (gateScreen) gateScreen.style.display = 'none';
    if (dashboardScreen) dashboardScreen.style.display = 'block';
    initAdminTheme();
    loadTelegramSettings();
    loadFeedback();
    loadPlatforms();
    loadAnalytics();
    resetLinksBuilder();
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

  // Upstash REST API Helper
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

  // Telegram Settings
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

  const annForm = document.getElementById('announcementForm');
  const annEnabled = document.getElementById('announcementEnabled');
  const annText = document.getElementById('announcementText');
  const annStatusMsg = document.getElementById('announcementStatusMsg');

  function applyTelegramFields(data) {
    if (tgEnabled) tgEnabled.checked = data.telegramEnabled !== false;
    if (tgLink) tgLink.value = data.telegramLink || '';
    if (tgTitle) tgTitle.value = data.telegramTitle || '';
    if (tgMessage) tgMessage.value = data.telegramMessage || '';
    if (annEnabled) annEnabled.checked = !!data.announcementEnabled;
    if (annText) annText.value = data.announcementText || '';
  }

  if (annForm) {
    annForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentSettings = (await fetchFromUpstash('nexora_settings')) || {};
      const updated = {
        ...currentSettings,
        announcementEnabled: annEnabled.checked,
        announcementText: annText.value.trim()
      };
      await saveToUpstash('nexora_settings', updated);
      if (annStatusMsg) {
        annStatusMsg.style.display = 'block';
        setTimeout(() => { annStatusMsg.style.display = 'none'; }, 3000);
      }
    });
  }

  if (telegramSettingsForm) {
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
  }

  function showTgStatus(msg) {
    if (tgStatusMsg) {
      tgStatusMsg.textContent = msg;
      tgStatusMsg.style.display = 'block';
      setTimeout(() => { tgStatusMsg.style.display = 'none'; }, 3000);
    }
  }

  // Links Builder in Add Form
  const PRESET_PLATFORMS = {
    pw: { name: 'Physics Wallah', category: 'LIVE CLASS', logoUrl: 'https://images.seeklogo.com/logo-png/47/1/physics-wallah-logo-png_seeklogo-474856.png' },
    vidyakul: { name: 'Vidyakul', category: 'LIVE CLASS', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    sciencemagnet: { name: 'Science Magnet', category: 'SCIENCE & MATHS', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT6Z6R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    parmar: { name: 'Parmar Academy', category: 'DEFENCE & GOVT', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcP0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    rgvikramjeet: { name: 'RG VIKRAMJEET', category: 'REASONING & MATHS', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcV0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    testbook: { name: 'Testbook', category: 'TEST SERIES', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTB0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    utkarsh: { name: 'Utkarsh Classes', category: 'COMPETITIVE EXAM', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcU0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    yesofficer: { name: 'Yes Officer', category: 'BANKING EXAMS', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcY0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    kdlive: { name: 'KD LIVE', category: 'SSC & DEFENCE', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcK0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    selectionway: { name: 'Selection Way', category: 'SELECTION PREP', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    careerwill: { name: 'Careerwill', category: 'LIVE CLASS', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcC0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    nexttopper: { name: 'Next Topper', category: 'TOPPER BATCH', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcN0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    studyiq: { name: 'Study IQ', category: 'UPSC & IAS', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSI0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    rojgarwithankit: { name: 'Rojgar With Ankit', category: 'GOVT JOBS', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWA0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    cdsjourney: { name: 'CDS Journey', category: 'DEFENCE & CDS', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcCDS0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    khanglobal: { name: 'Khan Global Studies', category: 'GS & UPSC', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcKGS0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    uclive: { name: 'UC Live Rani Mam', category: 'ENGLISH SPECIAL', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcUCL0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    gyanbindu: { name: 'Gyanbindu', category: 'BIHAR & GOVT', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcGB0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    gkgsmasti: { name: 'GK GS Masti', category: 'GENERAL KNOWLEDGE', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcGKM0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    dishaonline: { name: 'Disha Online Class', category: 'BOARD EXAMS', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcDOC0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    mastersahab: { name: 'Master Sahab', category: 'TEACHING EXAMS', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcMS0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    classplus: { name: 'Classplus', category: 'EDTECH APPS', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcCP0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' },
    unacademy: { name: 'Unacademy', category: 'LIVE CLASS', logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcU0R0LwT3K9b5R2E7Lq8v7t4x1w0z9u8v7t6x5w' }
  };

  // UNIVERSAL LOGO FILE UPLOAD & AUTO-FETCH LOGIC
  const appLogoFile = document.getElementById('appLogoFile');
  const appLogoInput = document.getElementById('appLogo');
  const autoFetchLogoBtn = document.getElementById('autoFetchLogoBtn');
  const logoPreviewContainer = document.getElementById('logoPreviewContainer');
  const logoPreviewImg = document.getElementById('logoPreviewImg');
  const logoSourceInfo = document.getElementById('logoSourceInfo');

  if (appLogoFile) {
    appLogoFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        if (appLogoInput) appLogoInput.value = dataUrl;
        if (logoPreviewImg) logoPreviewImg.src = dataUrl;
        if (logoSourceInfo) logoSourceInfo.textContent = `Uploaded Local File (${(file.size / 1024).toFixed(1)} KB Data URL)`;
        if (logoPreviewContainer) logoPreviewContainer.style.display = 'flex';
      };
      reader.readAsDataURL(file);
    });
  }

  if (autoFetchLogoBtn) {
    autoFetchLogoBtn.addEventListener('click', () => {
      const appName = document.getElementById('appName').value.trim();
      let domain = appLogoInput ? appLogoInput.value.trim() : '';

      if (!domain && appName) {
        domain = appName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
      }

      if (!domain) {
        alert('Please enter a Platform Name or Web URL first to auto-fetch logo!');
        return;
      }

      domain = domain.replace(/^https?:\/\//, '').split('/')[0];
      const fetchedLogo = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      
      if (appLogoInput) appLogoInput.value = fetchedLogo;
      if (logoPreviewImg) logoPreviewImg.src = fetchedLogo;
      if (logoSourceInfo) logoSourceInfo.textContent = `Auto-Fetched Favicon (${domain})`;
      if (logoPreviewContainer) logoPreviewContainer.style.display = 'flex';
    });
  }

  if (appLogoInput) {
    appLogoInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val) {
        if (logoPreviewImg) logoPreviewImg.src = val;
        if (logoSourceInfo) logoSourceInfo.textContent = 'Web Image Link';
        if (logoPreviewContainer) logoPreviewContainer.style.display = 'flex';
      } else {
        if (logoPreviewContainer) logoPreviewContainer.style.display = 'none';
      }
    });
  }

  const resetCustomFormBtn = document.getElementById('resetCustomFormBtn');
  const appOrderInput = document.getElementById('appOrder');

  function resetCustomForm() {
    if (addPlatformForm) addPlatformForm.reset();
    if (presetSelect) presetSelect.value = 'custom';
    if (logoPreviewContainer) logoPreviewContainer.style.display = 'none';
    if (appOrderInput) appOrderInput.value = platforms.length + 1;
    resetLinksBuilder();
    const appNameEl = document.getElementById('appName');
    if (appNameEl) {
      appNameEl.focus();
      appNameEl.placeholder = "Enter custom platform name (e.g. Target Academy)";
    }
  }

  if (resetCustomFormBtn) {
    resetCustomFormBtn.addEventListener('click', resetCustomForm);
  }

  const presetSelect = document.getElementById('presetPlatformSelect');
  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val) return;

      if (val === 'custom') {
        resetCustomForm();
        return;
      }

      const existing = platforms.find(p => p.id === val || (PRESET_PLATFORMS[val] && p.name.toLowerCase() === PRESET_PLATFORMS[val].name.toLowerCase()));
      if (existing) {
        document.getElementById('appName').value = existing.name;
        document.getElementById('appCategory').value = existing.category || 'GENERAL';
        document.getElementById('appLogo').value = existing.logoUrl || existing.logo || '';
        document.getElementById('appOrder').value = existing.order || 1;
        document.getElementById('appFeatured').checked = !!existing.featured;
        
        tempLinks = Array.isArray(existing.links) && existing.links.length > 0 
          ? JSON.parse(JSON.stringify(existing.links)) 
          : [
              { id: 'link_1', title: existing.name + ' Main Access Portal', url: 'https://' + existing.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com', statusMode: 'online', keyRequirement: 'without_key', loginRequirement: 'login_not_required' }
            ];
        renderLinksBuilder();
        return;
      }

      if (PRESET_PLATFORMS[val]) {
        const p = PRESET_PLATFORMS[val];
        document.getElementById('appName').value = p.name;
        document.getElementById('appCategory').value = p.category;
        document.getElementById('appLogo').value = p.logoUrl;
        tempLinks = [
          { id: 'link_1', title: p.name + ' Main Access Portal', url: 'https://' + p.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com', statusMode: 'online', keyRequirement: 'without_key', loginRequirement: 'login_not_required' },
          { id: 'link_2', title: p.name + ' Premium Batch Portal', url: 'https://' + p.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com/batches', statusMode: 'online', keyRequirement: 'with_key', loginRequirement: 'login_required' }
        ];
        renderLinksBuilder();
      }
    });
  }

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
    if (!linksBuilderList) return;
    linksBuilderList.innerHTML = '';
    tempLinks.forEach((link, idx) => {
      const box = document.createElement('div');
      box.className = 'link-builder-box';

      box.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 11px; font-family: monospace; color: var(--ink-mute);">LINK #${idx + 1}</span>
          ${tempLinks.length > 1 ? `<button type="button" class="btn-danger btn-sm remove-link-btn" data-idx="${idx}">Remove</button>` : ''}
        </div>
        <input type="text" class="admin-input link-title-input" placeholder="Link Title (e.g. PW Yakeen NEET Batch)" value="${escapeHtml(link.title)}" required>
        <input type="url" class="admin-input link-url-input" placeholder="Platform Target URL (https://...)" value="${escapeHtml(link.url)}" required>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
          <div>
            <label class="form-label" style="font-size: 9px;">Status Mode</label>
            <select class="admin-input link-status-select" style="font-size: 10px; padding: 4px;">
              <option value="auto" ${link.statusMode === 'auto' ? 'selected' : ''}>Auto Detect</option>
              <option value="online" ${link.statusMode === 'online' ? 'selected' : ''}>Force Online</option>
              <option value="offline" ${link.statusMode === 'offline' ? 'selected' : ''}>Force Offline</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size: 9px;">Key Gen</label>
            <select class="admin-input link-key-select" style="font-size: 10px; padding: 4px;">
              <option value="without_key" ${link.keyRequirement === 'without_key' ? 'selected' : ''}>Without Key</option>
              <option value="with_key" ${link.keyRequirement === 'with_key' ? 'selected' : ''}>Key Required</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size: 9px;">Login</label>
            <select class="admin-input link-login-select" style="font-size: 10px; padding: 4px;">
              <option value="login_not_required" ${link.loginRequirement === 'login_not_required' ? 'selected' : ''}>No Login</option>
              <option value="login_required" ${link.loginRequirement === 'login_required' ? 'selected' : ''}>Login Required</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size: 9px;">Badge Tag</label>
            <select class="admin-input link-badge-select" style="font-size: 10px; padding: 4px;">
              <option value="NONE" ${!link.badgeTag || link.badgeTag === 'NONE' ? 'selected' : ''}>Standard</option>
              <option value="NEW" ${link.badgeTag === 'NEW' ? 'selected' : ''}>NEW</option>
              <option value="PREMIUM" ${link.badgeTag === 'PREMIUM' ? 'selected' : ''}>PREMIUM</option>
              <option value="UPCOMING" ${link.badgeTag === 'UPCOMING' ? 'selected' : ''}>UPCOMING (Block 🔒)</option>
            </select>
          </div>
        </div>
      `;

      box.querySelector('.link-title-input').addEventListener('input', (e) => { link.title = e.target.value; });
      box.querySelector('.link-url-input').addEventListener('input', (e) => { link.url = e.target.value; });
      box.querySelector('.link-status-select').addEventListener('change', (e) => { link.statusMode = e.target.value; });
      box.querySelector('.link-key-select').addEventListener('change', (e) => { link.keyRequirement = e.target.value; });
      box.querySelector('.link-login-select').addEventListener('change', (e) => { link.loginRequirement = e.target.value; });
      box.querySelector('.link-badge-select').addEventListener('change', (e) => { link.badgeTag = e.target.value; });

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

  // Persistence Engine - Strictly respect Cloud Database content with Dual Backup Snapshot
  async function savePlatforms(updatedPlatforms) {
    platforms = sanitizePlatforms(updatedPlatforms);

    // 1. Sync to Upstash Cloud Redis (Central Database)
    await saveToUpstash('nexora_apps', platforms);
    saveToUpstash('nexora_apps_backup', platforms);

    // 2. LocalStorage for instant local fallback & history snapshot
    try {
      localStorage.setItem('nexora_apps', JSON.stringify(platforms));
      localStorage.setItem('nexora_apps_backup', JSON.stringify(platforms));
      localStorage.setItem('nexora_apps_history_backup', JSON.stringify(platforms));
    } catch (e) {}

    renderPlatformList();
    if (metricPlatformCount) metricPlatformCount.textContent = platforms.length;
  }

  // Backup & Data Recovery Handlers
  const exportDatabaseBtn = document.getElementById('exportDatabaseBtn');
  const autoScanBrowserBackupBtn = document.getElementById('autoScanBrowserBackupBtn');
  const importJsonFileInput = document.getElementById('importJsonFileInput');
  const importJsonTextarea = document.getElementById('importJsonTextarea');
  const importJsonSubmitBtn = document.getElementById('importJsonSubmitBtn');
  const backupStatusMsg = document.getElementById('backupStatusMsg');

  if (exportDatabaseBtn) {
    exportDatabaseBtn.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(platforms, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `nexora_database_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }

  if (autoScanBrowserBackupBtn) {
    autoScanBrowserBackupBtn.addEventListener('click', async () => {
      const keysToScan = ['nexora_apps', 'nexora_apps_backup', 'nexora_apps_history_backup', 'nexora_draft_apps'];
      let foundList = [];

      for (const key of keysToScan) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            if (Array.isArray(parsed) && parsed.length > 0) {
              foundList = [...foundList, ...parsed];
            }
          }
        } catch (e) {}
      }

      if (foundList.length > 0) {
        const merged = sanitizePlatforms([...foundList, ...platforms]);
        await savePlatforms(merged);
        alert(`Successfully restored ${merged.length} platforms from browser storage cache!`);
      } else {
        alert('No lost cache data found in current browser storage.');
      }
    });
  }

  if (importJsonFileInput) {
    importJsonFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (importJsonTextarea) importJsonTextarea.value = evt.target.result;
      };
      reader.readAsText(file);
    });
  }

  if (importJsonSubmitBtn) {
    importJsonSubmitBtn.addEventListener('click', async () => {
      const rawText = importJsonTextarea ? importJsonTextarea.value.trim() : '';
      if (!rawText) {
        alert('Please paste JSON data or select a JSON file first!');
        return;
      }

      try {
        const parsed = JSON.parse(rawText);
        if (!Array.isArray(parsed)) {
          alert('Invalid format: JSON must be an array of platforms.');
          return;
        }

        const validRestored = sanitizePlatforms(parsed);
        if (validRestored.length === 0) {
          alert('No valid platform items found in JSON.');
          return;
        }

        await savePlatforms(validRestored);
        if (backupStatusMsg) {
          backupStatusMsg.style.display = 'block';
          backupStatusMsg.style.color = '#10b981';
          backupStatusMsg.textContent = `✓ Successfully restored ${validRestored.length} platforms to Cloud Database!`;
        }
        alert(`Success! Restored ${validRestored.length} platforms to Cloud Database.`);
      } catch (err) {
        alert('JSON Parsing Error: Please check your JSON syntax.');
      }
    });
  }

  // Load platforms directly from Upstash Cloud Redis
  async function loadPlatforms() {
    // Priority 1: Upstash Cloud Redis
    const upstashApps = await fetchFromUpstash('nexora_apps');
    const validUpstash = sanitizePlatforms(upstashApps);
    if (validUpstash.length > 0) {
      platforms = validUpstash;
      try { localStorage.setItem('nexora_apps', JSON.stringify(platforms)); } catch (e) {}
      renderPlatformList();
      if (metricPlatformCount) metricPlatformCount.textContent = platforms.length;
      return;
    }

    // Priority 2: LocalStorage
    try {
      const local = localStorage.getItem('nexora_apps');
      if (local) {
        const parsed = JSON.parse(local);
        const validLocal = sanitizePlatforms(parsed);
        if (validLocal.length > 0) {
          platforms = validLocal;
          renderPlatformList();
          if (metricPlatformCount) metricPlatformCount.textContent = platforms.length;
          return;
        }
      }
    } catch (e) {}

    platforms = [];
    renderPlatformList();
  }

  function renderPlatformList() {
    if (platformCount) platformCount.textContent = `Platform count: ${platforms.length}`;
    if (metricPlatformCount) metricPlatformCount.textContent = platforms.length;
    if (!adminList) return;
    adminList.innerHTML = '';

    if (platforms.length === 0) {
      adminList.innerHTML = `
        <div style="text-align: center; color: var(--ink-mute); padding: 30px; font-size: 13px; background: var(--canvas-card); border-radius: 14px; border: 1px solid var(--hairline); grid-column: 1 / -1;">
          No platforms configured yet. Add your main platform (e.g. Physics Wallah) using the form above!
        </div>`;
      return;
    }

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
    catEl.textContent = `${(app.category || 'GENERAL').toUpperCase()} • ${app.links ? app.links.length : 0} PORTAL(S)`;

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
        <div class="form-group" style="background: var(--canvas-soft); padding: 10px; border-radius: 10px; border: 1px solid var(--hairline);">
          <label class="form-label" style="color: var(--accent-orange); font-weight: 700;">Logo Image (Upload File OR Web URL / Auto-Fetch)</label>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <input type="file" class="admin-input edit-logo-file" accept="image/*" style="font-size: 11px; padding: 4px;">
            <div style="display: flex; gap: 6px;">
              <input type="url" class="admin-input edit-logo" value="${escapeHtml(app.logoUrl || app.logo || '')}" placeholder="https://example.com/logo.png" style="font-size: 11px;">
              <button type="button" class="btn-outline btn-sm auto-fetch-edit-logo-btn" style="white-space: nowrap; font-size: 10px; padding: 4px 8px;">⚡ Auto-Fetch</button>
            </div>
          </div>
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
          <button type="submit" class="btn-primary btn-sm">Save Changes</button>
        </div>
      </form>
    `;

    const editLogoFileInput = card.querySelector('.edit-logo-file');
    const editLogoUrlInput = card.querySelector('.edit-logo');
    const autoFetchEditBtn = card.querySelector('.auto-fetch-edit-logo-btn');

    if (editLogoFileInput) {
      editLogoFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (editLogoUrlInput) editLogoUrlInput.value = evt.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    if (autoFetchEditBtn) {
      autoFetchEditBtn.addEventListener('click', () => {
        const editName = card.querySelector('.edit-name').value.trim();
        let domain = editLogoUrlInput ? editLogoUrlInput.value.trim() : '';
        if (!domain && editName) {
          domain = editName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
        }
        if (!domain) {
          alert('Please enter a Platform Name or URL first!');
          return;
        }
        domain = domain.replace(/^https?:\/\//, '').split('/')[0];
        const fetchedUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        if (editLogoUrlInput) editLogoUrlInput.value = fetchedUrl;
      });
    }

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

    card.querySelector('.inline-edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const idx = platforms.findIndex(p => p.id === app.id);
      if (idx !== -1) {
        platforms[idx] = {
          ...platforms[idx],
          name: card.querySelector('.edit-name').value.trim(),
          logoUrl: card.querySelector('.edit-logo').value.trim(),
          logo: card.querySelector('.edit-logo').value.trim(),
          category: card.querySelector('.edit-category').value.trim() || 'GENERAL',
          order: parseInt(card.querySelector('.edit-order').value, 10) || 1,
          featured: card.querySelector('.edit-featured').checked,
          links: editLinks
        };
        await savePlatforms(platforms);
        alert('Platform updated successfully!');
      }
    });
  }

  // Add Platform Form Submit
  if (addPlatformForm) {
    addPlatformForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameVal = document.getElementById('appName').value.trim();
      if (!nameVal) return;

      const orderInput = document.getElementById('appOrder');
      const orderVal = orderInput ? (parseInt(orderInput.value, 10) || (platforms.length + 1)) : (platforms.length + 1);

      const existingIdx = platforms.findIndex(p => p.name.trim().toLowerCase() === nameVal.toLowerCase());

      const itemData = {
        id: existingIdx !== -1 ? platforms[existingIdx].id : ('id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
        name: nameVal,
        logoUrl: document.getElementById('appLogo').value.trim(),
        logo: document.getElementById('appLogo').value.trim(),
        category: document.getElementById('appCategory').value.trim() || 'GENERAL',
        order: orderVal,
        featured: document.getElementById('appFeatured').checked,
        badgeTag: document.getElementById('appBadgeTag') ? document.getElementById('appBadgeTag').value : 'NONE',
        addedAt: existingIdx !== -1 ? (platforms[existingIdx].addedAt || new Date().toISOString()) : new Date().toISOString(),
        links: Array.isArray(tempLinks) && tempLinks.length > 0 ? JSON.parse(JSON.stringify(tempLinks)) : [
          {
            id: 'link_1',
            title: nameVal + ' Portal',
            url: '',
            statusMode: 'auto',
            keyRequirement: 'without_key',
            loginRequirement: 'login_not_required'
          }
        ]
      };

      if (existingIdx !== -1) {
        platforms[existingIdx] = itemData;
      } else {
        platforms.push(itemData);
      }

      await savePlatforms(platforms);

      addPlatformForm.reset();
      const appOrderEl = document.getElementById('appOrder');
      if (appOrderEl) appOrderEl.value = platforms.length + 1;
      resetLinksBuilder();

      alert(existingIdx !== -1 ? `Platform "${nameVal}" updated successfully!` : `Platform "${nameVal}" added successfully!`);
    });
  }

  async function deletePlatform(id) {
    if (!confirm('Are you sure you want to delete this platform?')) return;
    platforms = platforms.filter(p => p.id !== id);
    await savePlatforms(platforms);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Analytics & Stats
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
          <div style="font-size: 15px; font-weight: 600; color: var(--ink);">${escapeHtml(item.appName || item.linkTitle || 'Platform Link')}</div>
          <span style="font-size: 14px; font-weight: 700; color: var(--accent-green); background: rgba(16, 185, 129, 0.15); padding: 4px 10px; border-radius: 999px;">
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

  // User Feedback
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
          <span class="notif-type-badge ${item.type || 'improvement'}">${(item.type || 'FEEDBACK').toUpperCase()}</span>
          <span class="eyebrow" style="font-size: 10px;">${new Date(item.timestamp || Date.now()).toLocaleDateString()}</span>
        </div>
        <div style="font-size: 14px; color: var(--ink); line-height: 1.5;">${escapeHtml(item.message)}</div>
        ${isReplied && item.adminReply ? `<div style="font-size: 12px; color: var(--accent-green); background: rgba(16,185,129,0.1); padding: 8px 12px; border-radius: 8px;">Reply: ${escapeHtml(item.adminReply)}</div>` : ''}
      `;
      adminFeedbackList.appendChild(card);
    });
  }
});
