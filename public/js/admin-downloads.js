// NEXORA Admin Console - Download Center Management Module
(function () {
  let downloadConfig = null;
  let isStaticMode = false;

  // Helper: Try API first, then fallback to static JSON
  async function fetchWithFallback(apiUrl, staticUrl) {
    try {
      const res = await fetch(apiUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error('API returned ' + res.status);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) throw new Error('Not JSON response');
      return await res.json();
    } catch (apiErr) {
      console.warn('API unavailable (' + apiUrl + '), trying static fallback...');
      try {
        const staticRes = await fetch(staticUrl, { cache: 'no-store' });
        if (staticRes.ok) {
          const contentType = staticRes.headers.get('content-type') || '';
          if (contentType.includes('json') || staticUrl.endsWith('.json')) {
            isStaticMode = true;
            return await staticRes.json();
          }
        }
      } catch (e) {}
      return null;
    }
  }

  async function loadDownloadConfig() {
    const json = await fetchWithFallback('/api/downloads/config', '/data/downloads.json');
    if (json) {
      const data = json.data || json;
      downloadConfig = data;
      populateForm(data);
    }
  }

  async function loadDownloadAnalytics() {
    const json = await fetchWithFallback('/api/downloads/analytics', '/data/download_analytics.json');
    if (json) {
      const data = json.data || json;
      renderAnalytics(data);
    }
  }

  async function loadRegisteredStudents() {
    const json = await fetchWithFallback('/api/downloads/students', '/data/students.json');
    if (json) {
      const data = json.data || json;
      renderStudentsList(Array.isArray(data) ? data : []);
    }
  }

  function renderStudentsList(students) {
    const listBody = document.getElementById('registeredStudentsList');
    if (!listBody) return;
    listBody.innerHTML = '';

    if (!students || students.length === 0) {
      listBody.innerHTML = '<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--ink-mute);">No registered students found.</td></tr>';
      return;
    }

    students.forEach(s => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--hairline)';
      tr.innerHTML = `
        <td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--accent-orange);">${s.studentId}</td>
        <td style="padding: 10px 14px; font-weight: 600;">${s.name}</td>
        <td style="padding: 10px 14px; color: var(--ink-body);">${s.email}</td>
        <td style="padding: 10px 14px;"><span class="status-pill stable">${s.downloadCount || 0} downloads</span></td>
        <td style="padding: 10px 14px; color: var(--ink-mute); font-size: 12px;">${new Date(s.lastActive || s.registeredAt).toLocaleString()}</td>
      `;
      listBody.appendChild(tr);
    });
  }

  function populateForm(config) {
    if (!config) return;

    // System controls
    const dlPublished = document.getElementById('dlPublished');
    const dlGlobalMaintenance = document.getElementById('dlGlobalMaintenance');
    if (dlPublished) dlPublished.checked = Boolean(config.published);
    if (dlGlobalMaintenance) dlGlobalMaintenance.checked = Boolean(config.globalMaintenance);

    // Android fields
    const android = config.android || {};
    setInputValue('androidVersion', android.version || '');
    setInputValue('androidMinVersion', android.minVersion || '');
    setInputValue('androidFileSize', android.fileSize || '');
    setInputValue('androidDownloadUrl', android.downloadUrl || '');
    setInputValue('androidChecksum', android.checksum || '');
    setInputValue('androidReleaseNotes', Array.isArray(android.releaseNotes) ? android.releaseNotes.join('\n') : '');
    setCheckboxValue('androidMaintenance', Boolean(android.maintenance));
    setCheckboxValue('androidForceUpdate', Boolean(android.forceUpdate));

    // Windows fields
    const windows = config.windows || {};
    setInputValue('windowsVersion', windows.version || '');
    setInputValue('windowsMinVersion', windows.minVersion || '');
    setInputValue('windowsFileSize', windows.fileSize || '');
    setInputValue('windowsDownloadUrl', windows.downloadUrl || '');
    setInputValue('windowsChecksum', windows.checksum || '');
    setInputValue('windowsReleaseNotes', Array.isArray(windows.releaseNotes) ? windows.releaseNotes.join('\n') : '');
    setCheckboxValue('windowsMaintenance', Boolean(windows.maintenance));
    setCheckboxValue('windowsForceUpdate', Boolean(windows.forceUpdate));

    // Show read-only notice if static mode
    if (isStaticMode) {
      const statusMsg = document.getElementById('dlStatusMsg');
      if (statusMsg) {
        statusMsg.textContent = '⚠ Read-only mode — No backend server connected. Changes cannot be saved on static hosting.';
        statusMsg.style.display = 'block';
        statusMsg.style.background = 'rgba(245,158,11,0.15)';
        statusMsg.style.color = '#f59e0b';
        statusMsg.style.border = '1px solid rgba(245,158,11,0.3)';
      }
    }
  }

  function setInputValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function setCheckboxValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(val);
  }

  function renderAnalytics(analytics) {
    const totalEl = document.getElementById('dlTotalCount');
    const androidEl = document.getElementById('dlAndroidCount');
    const windowsEl = document.getElementById('dlWindowsCount');
    const logsBody = document.getElementById('dlRecentLogs');

    if (totalEl) totalEl.textContent = analytics.totalDownloads || 0;
    if (androidEl) androidEl.textContent = analytics.androidDownloads || 0;
    if (windowsEl) windowsEl.textContent = analytics.windowsDownloads || 0;

    if (logsBody) {
      logsBody.innerHTML = '';
      const logs = analytics.history || [];
      if (logs.length === 0) {
        logsBody.innerHTML = '<tr><td colspan="6" style="padding: 16px; text-align: center; color: var(--ink-mute);">No download activity logged yet.</td></tr>';
        return;
      }

      logs.slice(0, 10).forEach(log => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--hairline)';
        const isAndroid = (log.platform || '').toLowerCase() === 'android';
        const color = isAndroid ? 'var(--accent-green)' : 'var(--accent-blue)';
        
        tr.innerHTML = `
          <td style="padding: 10px 14px; font-weight: 600; color: ${color}; text-transform: uppercase;">${log.platform}</td>
          <td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace;">v${log.version}</td>
          <td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; color: var(--accent-orange);">${log.studentId || 'Anonymous'}</td>
          <td style="padding: 10px 14px; font-weight: 600;">${log.studentName || 'Student'}</td>
          <td style="padding: 10px 14px; color: var(--ink-body);">${log.studentEmail || '—'}</td>
          <td style="padding: 10px 14px; color: var(--ink-mute); font-size: 12px;">${new Date(log.timestamp).toLocaleString()}</td>
        `;
        logsBody.appendChild(tr);
      });
    }
  }

  function initDownloadManagement() {
    const downloadSettingsForm = document.getElementById('downloadSettingsForm');
    const statusMsg = document.getElementById('dlStatusMsg');

    if (downloadSettingsForm) {
      downloadSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Block save in static mode
        if (isStaticMode) {
          if (statusMsg) {
            statusMsg.textContent = '⚠ Cannot save — No backend server connected. Deploy with a Node.js server to enable saving.';
            statusMsg.style.display = 'block';
            statusMsg.style.background = 'rgba(239,68,68,0.15)';
            statusMsg.style.color = '#ef4444';
          }
          return;
        }

        const parseNotes = (str) => (str || '')
          .split('\n')
          .map(s => s.trim().replace(/^[-•*]\s*/, ''))
          .filter(Boolean);

        const payload = {
          published: document.getElementById('dlPublished')?.checked ?? true,
          globalMaintenance: document.getElementById('dlGlobalMaintenance')?.checked ?? false,
          android: {
            version: document.getElementById('androidVersion')?.value || '2.4.1',
            minVersion: document.getElementById('androidMinVersion')?.value || '2.0.0',
            fileSize: document.getElementById('androidFileSize')?.value || '42.5 MB',
            downloadUrl: document.getElementById('androidDownloadUrl')?.value || '',
            checksum: document.getElementById('androidChecksum')?.value || '',
            releaseNotes: parseNotes(document.getElementById('androidReleaseNotes')?.value),
            maintenance: document.getElementById('androidMaintenance')?.checked ?? false,
            forceUpdate: document.getElementById('androidForceUpdate')?.checked ?? false
          },
          windows: {
            version: document.getElementById('windowsVersion')?.value || '1.8.0',
            minVersion: document.getElementById('windowsMinVersion')?.value || '1.5.0',
            fileSize: document.getElementById('windowsFileSize')?.value || '88.2 MB',
            downloadUrl: document.getElementById('windowsDownloadUrl')?.value || '',
            checksum: document.getElementById('windowsChecksum')?.value || '',
            releaseNotes: parseNotes(document.getElementById('windowsReleaseNotes')?.value),
            maintenance: document.getElementById('windowsMaintenance')?.checked ?? false,
            forceUpdate: document.getElementById('windowsForceUpdate')?.checked ?? false
          }
        };

        try {
          const res = await fetch('/api/downloads/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success) {
              downloadConfig = json.data;
              if (statusMsg) {
                statusMsg.textContent = '✓ Download settings published successfully!';
                statusMsg.style.display = 'block';
                statusMsg.style.background = '';
                statusMsg.style.color = '';
                statusMsg.style.border = '';
                setTimeout(() => { statusMsg.style.display = 'none'; }, 3000);
              }
            }
          }
        } catch (err) {
          console.error('Error saving download settings:', err);
          if (statusMsg) {
            statusMsg.textContent = '⚠ Save failed — Backend server not reachable.';
            statusMsg.style.display = 'block';
            statusMsg.style.background = 'rgba(239,68,68,0.15)';
            statusMsg.style.color = '#ef4444';
          }
        }
      });
    }

    window.addEventListener('adminDashboardShown', () => {
      loadDownloadConfig();
      loadDownloadAnalytics();
      loadRegisteredStudents();
    });

    window.addEventListener('adminTabChanged', (e) => {
      if (e.detail && e.detail.tab === 'tab-downloads') {
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
