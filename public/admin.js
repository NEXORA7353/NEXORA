document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASSWORD = 'nexora2024';

  const gateScreen = document.getElementById('gateScreen');
  const dashboardScreen = document.getElementById('dashboardScreen');
  const gateForm = document.getElementById('gateForm');
  const gatePassword = document.getElementById('gatePassword');
  const gateError = document.getElementById('gateError');
  const logoutBtn = document.getElementById('logoutBtn');

  const addPlatformForm = document.getElementById('addPlatformForm');
  const adminList = document.getElementById('adminList');
  const platformCount = document.getElementById('platformCount');

  let platforms = [];

  // Check auth session
  if (sessionStorage.getItem('nexora_auth') === 'true') {
    showDashboard();
  } else {
    showGate();
  }

  // Gate login submit
  gateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const entered = gatePassword.value;
    if (entered === ADMIN_PASSWORD) {
      sessionStorage.setItem('nexora_auth', 'true');
      gateError.style.display = 'none';
      gatePassword.value = '';
      showDashboard();
    } else {
      gateError.style.display = 'block';
    }
  });

  // Logout
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
    loadPlatforms();
  }

  // Load platforms from backend
  function loadPlatforms() {
    fetch('/api/apps')
      .then(res => res.json())
      .then(resData => {
        platforms = Array.isArray(resData) ? resData : (resData.data || []);
        renderPlatformList();
      })
      .catch(err => {
        console.error('Failed to load platforms:', err);
        platforms = [];
        renderPlatformList();
      });
  }

  // Render platform list
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

    // Logo wrapper
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
      img.onerror = () => {
        renderAdminLogoFallback(logoWrapper, app.name);
      };
      logoWrapper.appendChild(img);
    } else {
      renderAdminLogoFallback(logoWrapper, app.name);
    }

    // Info details
    const details = document.createElement('div');
    details.className = 'admin-item-details';

    const nameEl = document.createElement('div');
    nameEl.className = 'admin-item-name';
    nameEl.textContent = app.name;

    const catEl = document.createElement('div');
    catEl.className = 'admin-item-cat';
    catEl.textContent = (app.category || 'GENERAL').toUpperCase();

    const urlEl = document.createElement('div');
    urlEl.className = 'admin-item-url';
    urlEl.textContent = app.url;

    details.appendChild(nameEl);
    details.appendChild(catEl);
    details.appendChild(urlEl);

    header.appendChild(logoWrapper);
    header.appendChild(details);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'admin-item-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-outline btn-sm';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      renderCardEditState(card, app);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-danger btn-sm';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      deletePlatform(app.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(actions);
  }

  function renderAdminLogoFallback(container, name) {
    container.innerHTML = '';
    const fallback = document.createElement('div');
    fallback.className = 'admin-logo-fallback';
    fallback.textContent = getInitials(name);
    container.appendChild(fallback);
  }

  function getInitials(name) {
    if (!name) return 'NX';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Inline Edit Mode
  function renderCardEditState(card, app) {
    card.innerHTML = `
      <form class="inline-edit-form" style="display: flex; flex-direction: column; gap: 10px;">
        <div class="form-group">
          <label class="form-label">App Name</label>
          <input type="text" class="admin-input edit-name" value="${escapeHtml(app.name)}" required>
        </div>
        <div class="form-group">
          <label class="form-label">App URL</label>
          <input type="url" class="admin-input edit-url" value="${escapeHtml(app.url)}" required>
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
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;">
          <button type="button" class="btn-outline btn-sm cancel-edit-btn">Cancel</button>
          <button type="submit" class="btn-primary btn-sm">Save</button>
        </div>
      </form>
    `;

    const form = card.querySelector('.inline-edit-form');
    const cancelBtn = card.querySelector('.cancel-edit-btn');

    cancelBtn.addEventListener('click', () => {
      renderCardNormalState(card, app);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const updatedPayload = {
        name: card.querySelector('.edit-name').value.trim(),
        url: card.querySelector('.edit-url').value.trim(),
        logoUrl: card.querySelector('.edit-logo').value.trim(),
        logo: card.querySelector('.edit-logo').value.trim(),
        category: card.querySelector('.edit-category').value.trim(),
        order: parseInt(card.querySelector('.edit-order').value, 10) || 1,
        featured: card.querySelector('.edit-featured').checked
      };

      fetch(`/api/apps/${app.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      })
        .then(res => res.json())
        .then(updated => {
          // Update local memory & re-render
          const idx = platforms.findIndex(p => p.id === app.id);
          if (idx !== -1) {
            platforms[idx] = updated;
          }
          loadPlatforms();
        })
        .catch(err => console.error('Error updating platform:', err));
    });
  }

  // Add platform form handler
  addPlatformForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('appName').value.trim(),
      url: document.getElementById('appUrl').value.trim(),
      logoUrl: document.getElementById('appLogo').value.trim(),
      logo: document.getElementById('appLogo').value.trim(),
      category: document.getElementById('appCategory').value.trim(),
      order: parseInt(document.getElementById('appOrder').value, 10) || 1,
      featured: document.getElementById('appFeatured').checked
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
        loadPlatforms();
      })
      .catch(err => console.error('Error adding platform:', err));
  });

  // Delete platform handler
  function deletePlatform(id) {
    fetch(`/api/apps/${id}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(() => {
        loadPlatforms();
      })
      .catch(err => console.error('Error deleting platform:', err));
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
