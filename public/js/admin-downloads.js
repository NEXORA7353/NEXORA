// NEXORA Admin Console - Download Center Management Module
(function () {
  const RAILWAY_URL = 'https://nexora7.up.railway.app';

  // ============================================================
  // API Helper - Railway ke through data fetch karo
  // ============================================================
  async function fetchFromRailway(endpoint) {
    try {
      const res = await fetch(`${RAILWAY_URL}${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        return data.success ? data.data : data;
      }
    } catch (e) {
      console.warn('Railway fetch failed:', e.message);
    }
    return null;
  }

  async function saveToRailway(endpoint, payload) {
    try {
      const res = await fetch(`${RAILWAY_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        return data.success !== false;
      }
    } catch (e) {
      console.warn('Railway save failed:', e.message);
    }
    return false;
  }

  // ============================================================
  // LOAD FUNCTIONS
  // ============================================================
  async function loadDownloadConfig() {
    const data = await fetchFromRailway('/api/downloads/config');
    if (data) populateForm(data);
  }

  async function loadDownloadAnalytics() {
    const data = await fetchFromRailway('/api/downloads/analytics');
    if (data) renderAnalytics(data);
  }

  async function loadRegisteredStudents() {
    const data = await fetchFromRailway('/api/downloads/students');
    const students = Array.isArray(data) ? data : (data || []);
    renderStudentsList(students);
  }

  // ============================================================
  // FORM POPULATION
  // ============================================================
  function populateForm(cfg) {
    if (!cfg) return;
    const bool = (val, def = false) =>
      val !== undefined ? (val === true || val === 'true') : def;
    const val = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v || '';
    };
    const chk = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.checked = bool(v);
    };

    chk('dlPublished', cfg.published ?? true);
    chk('dlGlobalMaintenance', cfg.globalMaintenance);

    const a = cfg.android || {};
    val('androidVersion',     a.version || a.latestVersion || '1.0.0');
    val('androidMinVersion',  a.minVersion || a.minSupportedVersion || '1.0.0');
    val('androidFileSize',    a.fileSize || '');
    val('androidDownloadUrl', a.downloadUrl || a.apkUrl || '');
    val('androidChecksum',    a.checksum || a.sha256 || '');
    val('androidReleaseNotes',
      Array.isArray(a.releaseNotes) ? a.releaseNotes.join('\n') : (a.releaseNotes || ''));
    chk('androidMaintenance', a.maintenance || a.maintenanceMode);
    chk('androidForceUpdate', a.forceUpdate);

    const w = cfg.windows || {};
    val('windowsVersion',     w.version || w.latestVersion || '1.0.0');
    val('windowsMinVersion',  w.minVersion || w.minSupportedVersion || '1.0.0');
    val('windowsFileSize',    w.fileSize || '');
    val('windowsDownloadUrl', w.downloadUrl || w.exeUrl || '');
    val('windowsChecksum',    w.checksum || w.sha256 || '');
    val('windowsReleaseNotes',
      Array.isArray(w.releaseNotes) ? w.releaseNotes.join('\n') : (w.releaseNotes || ''));
    chk('windowsMaintenance', w.maintenance || w.maintenanceMode);
    chk('windowsForceUpdate', w.forceUpdate);
  }

  // ============================================================
  // ✅ ANALYTICS RENDER - HTML IDs ke saath match
  // ============================================================
  function renderAnalytics(analytics) {
    if (!analytics) return;

    // ✅ FIX: HTML ke actual IDs use kar rahe hain
    const totalEl   = document.getElementById('dlTotalCount');
    const androidEl = document.getElementById('dlAndroidCount');
    const windowsEl = document.getElementById('dlWindowsCount');
    const logsBody  = document.getElementById('dlRecentLogs');

    if (totalEl)   totalEl.textContent   = analytics.totalDownloads   || 0;
    if (androidEl) androidEl.textContent = analytics.androidDownloads || 0;
    if (windowsEl) windowsEl.textContent = analytics.windowsDownloads || 0;

    if (logsBody) {
      logsBody.innerHTML = '';
      const logs = analytics.history || [];

      if (logs.length === 0) {
        logsBody.innerHTML = `
          <tr>
            <td colspan="6" style="padding: 16px; text-align: center; color: var(--ink-mute);">
              No download activity logged yet.
            </td>
          </tr>`;
        return;
      }

      logs.slice(0, 50).forEach(log => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--hairline)';
        const isAndroid = (log.platform || '').toLowerCase() === 'android';
        const color = isAndroid ? 'var(--accent-green)' : 'var(--accent-blue)';

        tr.innerHTML = `
          <td style="padding: 10px 14px; font-weight: 600; color: ${color}; text-transform: uppercase;">
            ${log.platform || '—'}
          </td>
          <td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace;">
            v${log.version || '—'}
          </td>
          <td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; color: var(--accent-orange);">
            ${log.studentId || 'Anonymous'}
          </td>
          <td style="padding: 10px 14px; font-weight: 600;">
            ${log.studentName || 'Student'}
          </td>
          <td style="padding: 10px 14px; color: var(--ink-body);">
            ${log.studentEmail || '—'}
          </td>
          <td style="padding: 10px 14px; color: var(--ink-mute); font-size: 12px;">
            ${log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
          </td>
        `;
        logsBody.appendChild(tr);
      });
    }
  }

  // ============================================================
  // STUDENTS LIST RENDER
  // ============================================================
  function renderStudentsList(students) {
    const listBody = document.getElementById('registeredStudentsList');
    if (!listBody) return;
    listBody.innerHTML = '';

    if (!students || students.length === 0) {
      listBody.innerHTML = `
        <tr>
          <td colspan="5" style="padding: 16px; text-align: center; color: var(--ink-mute);">
            No registered students found.
          </td>
        </tr>`;
      return;
    }

    students.forEach(st => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--hairline)';
      tr.innerHTML = `
        <td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; color: var(--accent-orange);">
          ${st.studentId || '—'}
        </td>
        <td style="padding: 10px 14px; font-weight: 600;">${st.name || 'Student'}</td>
        <td style="padding: 10px 14px; color: var(--ink-body);">${st.email || '—'}</td>
        <td style="padding: 10px 14px; font-weight: 700; color: var(--accent-green);">
          ${st.downloadCount || 0}
        </td>
        <td style="padding: 10px 14px; color: var(--ink-mute); font-size: 12px;">
          ${st.lastActive ? new Date(st.lastActive).toLocaleString() : '—'}
        </td>
      `;
      listBody.appendChild(tr);
    });
  }

  // ============================================================
  // FORM SUBMIT - Save to Railway
  // ============================================================
  function initDownloadManagement() {
    const downloadSettingsForm = document.getElementById('downloadSettingsForm');
    const statusMsg = document.getElementById('dlStatusMsg');

    if (downloadSettingsForm) {
      downloadSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const parseNotes = (id) => {
          const el = document.getElementById(id);
          if (!el) return [];
          return el.value
            .split('\n')
            .map(s => s.trim().replace(/^[-•*]\s*/, ''))
            .filter(Boolean);
        };

        const getVal = (id) => document.getElementById(id)?.value || '';
        const getChk = (id) => document.getElementById(id)?.checked ?? false;

        const payload = {
          published:         getChk('dlPublished'),
          globalMaintenance: getChk('dlGlobalMaintenance'),
          android: {
            version:       getVal('androidVersion'),
            latestVersion: getVal('androidVersion'),
            minVersion:    getVal('androidMinVersion'),
            minSupportedVersion: getVal('androidMinVersion'),
            fileSize:      getVal('androidFileSize'),
            downloadUrl:   getVal('androidDownloadUrl'),
            apkUrl:        getVal('androidDownloadUrl'),
            checksum:      getVal('androidChecksum'),
            sha256:        getVal('androidChecksum'),
            releaseNotes:  parseNotes('androidReleaseNotes'),
            maintenance:   getChk('androidMaintenance'),
            maintenanceMode: getChk('androidMaintenance'),
            forceUpdate:   getChk('androidForceUpdate')
          },
          windows: {
            version:       getVal('windowsVersion'),
            latestVersion: getVal('windowsVersion'),
            minVersion:    getVal('windowsMinVersion'),
            minSupportedVersion: getVal('windowsMinVersion'),
            fileSize:      getVal('windowsFileSize'),
            downloadUrl:   getVal('windowsDownloadUrl'),
            exeUrl:        getVal('windowsDownloadUrl'),
            checksum:      getVal('windowsChecksum'),
            sha256:        getVal('windowsChecksum'),
            releaseNotes:  parseNotes('windowsReleaseNotes'),
            maintenance:   getChk('windowsMaintenance'),
            maintenanceMode: getChk('windowsMaintenance'),
            forceUpdate:   getChk('windowsForceUpdate')
          }
        };

        const success = await saveToRailway('/api/downloads/config', payload);

        if (statusMsg) {
          statusMsg.style.display = 'block';
          if (success) {
            statusMsg.textContent = '✓ Download settings saved & published!';
            statusMsg.style.color = '#10b981';
            statusMsg.style.background = 'rgba(16,185,129,0.1)';
          } else {
            statusMsg.textContent = '❌ Failed to save. Check Railway connection.';
            statusMsg.style.color = '#ef4444';
            statusMsg.style.background = 'rgba(239,68,68,0.1)';
          }
          setTimeout(() => { statusMsg.style.display = 'none'; }, 4000);
        }
      });
    }

    // Load data when tab opens
    window.addEventListener('adminTabChanged', (e) => {
      if (e.detail && e.detail.tab === 'tab-downloads') {
        loadDownloadConfig();
        loadDownloadAnalytics();
        loadRegisteredStudents();
      }
    });

    // Also load on dashboard shown
    window.addEventListener('adminDashboardShown', () => {
      if (document.getElementById('tab-downloads')?.style.display !== 'none') {
        loadDownloadConfig();
        loadDownloadAnalytics();
        loadRegisteredStudents();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDownloadManagement);
  } else {
    initDownloadManagement();
  }
})();
