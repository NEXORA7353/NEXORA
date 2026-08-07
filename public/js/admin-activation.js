// NEXORA Admin Console - Activation & Device Access Control Module
(function () {
  const RAILWAY_URL = 'https://nexora-production-2e62.up.railway.app';

  async function apiCall(endpoint, method = 'GET', body = null) {
    try {
      const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(`${RAILWAY_URL}${endpoint}`, opts);
      return await res.json();
    } catch (e) {
      console.warn('Admin activation API error:', e.message);
    }
    return null;
  }

  async function loadActivationStatus() {
    const data = await apiCall('/api/admin/control/activation/status');
    const toggle = document.getElementById('masterActivationToggle');
    if (toggle && data && data.success) {
      toggle.checked = Boolean(data.enabled);
    }
  }

  async function loadActivationCodes() {
    const res = await apiCall('/api/admin/control/codes');
    const listBody = document.getElementById('activationCodesList');
    if (!listBody) return;
    listBody.innerHTML = '';

    const codes = (res && res.data) ? res.data : [];

    if (codes.length === 0) {
      listBody.innerHTML = `
        <tr>
          <td colspan="7" style="padding: 16px; text-align: center; color: var(--ink-mute);">
            No activation codes generated yet.
          </td>
        </tr>`;
      return;
    }

    codes.forEach(c => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--hairline)';

      const isRevoked = c.status === 'REVOKED';
      const statusBadge = isRevoked
        ? '<span class="status-pill offline">REVOKED</span>'
        : (c.deviceFingerprint ? '<span class="status-pill stable">ACTIVE</span>' : '<span class="status-pill warning">PENDING</span>');

      tr.innerHTML = `
        <td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--accent-orange);">
          ${c.code}
        </td>
        <td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace;">${c.studentId || '—'}</td>
        <td style="padding: 10px 14px;">${c.email || '—'}</td>
        <td style="padding: 10px 14px; text-transform: uppercase; font-weight: 600;">${c.platform || 'android'}</td>
        <td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--ink-mute);">
          ${c.deviceFingerprint ? c.deviceFingerprint.substring(0, 16) + '...' : 'Unbound'}
        </td>
        <td style="padding: 10px 14px;">${statusBadge}</td>
        <td style="padding: 10px 14px; display: flex; gap: 6px;">
          <button type="button" class="btn-outline btn-sm reset-dev-btn" data-code="${c.code}" style="font-size: 11px; padding: 4px 8px;">Reset Device</button>
          <button type="button" class="btn-outline btn-sm revoke-code-btn" data-code="${c.code}" style="font-size: 11px; padding: 4px 8px; color: var(--accent-red); border-color: rgba(239,68,68,0.3);">Revoke</button>
          <button type="button" class="btn-outline btn-sm ban-user-btn" data-email="${c.email}" style="font-size: 11px; padding: 4px 8px; background: rgba(239,68,68,0.1); color: var(--accent-red);">Ban User</button>
        </td>
      `;
      listBody.appendChild(tr);
    });

    bindActionButtons();
  }

  function bindActionButtons() {
    document.querySelectorAll('.reset-dev-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.getAttribute('data-code');
        if (confirm(`Reset device binding for code ${code}?`)) {
          await apiCall('/api/admin/control/device/reset', 'POST', { code });
          loadActivationCodes();
        }
      });
    });

    document.querySelectorAll('.revoke-code-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.getAttribute('data-code');
        if (confirm(`Revoke activation code ${code}? User will lose app access.`)) {
          await apiCall('/api/admin/control/code/revoke', 'POST', { code });
          loadActivationCodes();
        }
      });
    });

    document.querySelectorAll('.ban-user-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const email = btn.getAttribute('data-email');
        if (confirm(`Ban user ${email}? All their activation codes will be blocked.`)) {
          await apiCall('/api/admin/control/student/ban', 'POST', { email });
          loadActivationCodes();
        }
      });
    });
  }

  function initActivationTab() {
    const toggle = document.getElementById('masterActivationToggle');
    if (toggle) {
      toggle.addEventListener('change', async () => {
        await apiCall('/api/admin/control/activation/toggle', 'POST', { enabled: toggle.checked });
      });
    }

    window.addEventListener('adminTabChanged', (e) => {
      if (e.detail && e.detail.tab === 'tab-activation') {
        loadActivationStatus();
        loadActivationCodes();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initActivationTab);
  } else {
    initActivationTab();
  }
})();
