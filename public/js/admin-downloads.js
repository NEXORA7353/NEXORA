// NEXORA Admin Console - Download Center Management Module
(function () {
  const UPSTASH_URL = 'https://legible-loon-84378.upstash.io';
  const UPSTASH_TOKEN = 'gQAAAAAAAUmaAAIgcDE5M2IwMjM4MTczZjA0ZWQ5YWUwYzYzNTU1YzIyYTQ3Mg';

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

  async function loadDownloadConfig() {
    const data = await fetchFromUpstash('nexora_download_config');
    if (data) {
      populateForm(data);
    }
  }

  async function loadDownloadAnalytics() {
    const data = await fetchFromUpstash('nexora_download_analytics');
    if (data) {
      renderAnalytics(data);
    }
  }

  async function loadRegisteredStudents() {
    const data = await fetchFromUpstash('nexora_download_students');
    if (data) {
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

    students.forEach(st => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--hairline)';
      tr.innerHTML = `
        <td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; color: var(--accent-orange);">${st.studentId || '—'}</td>
        <td style="padding: 10px 14px; font-weight: 600;">${st.name || 'Student'}</td>
        <td style="padding: 10px 14px; color: var(--ink-body);">${st.email || '—'}</td>
        <td style="padding: 10px 14px; font-weight: 700; color: var(--accent-green);">${st.downloadCount || 0}</td>
        <td style="padding: 10px 14px; color: var(--ink-mute); font-size: 12px;">${st.lastActive ? new Date(st.lastActive).toLocaleString() : '—'}</td>
      `;
      listBody.appendChild(tr);
    });
  }

  function populateForm(cfg) {
    if (!cfg) return;
    const isChecked = (val) => val === true || val === 'true';

    if (document.getElementById('dlPublished')) document.getElementById('dlPublished').checked = isChecked(cfg.published ?? true);
    if (document.getElementById('dlGlobalMaintenance')) document.getElementById('dlGlobalMaintenance').checked = isChecked(cfg.globalMaintenance);

    const a = cfg.android || {};
    if (document.getElementById('androidVersion')) document.getElementById('androidVersion').value = a.version || a.latestVersion || '2.5.0';
    if (document.getElementById('androidMinVersion')) document.getElementById('androidMinVersion').value = a.minVersion || a.minSupportedVersion || '2.0.0';
    if (document.getElementById('androidFileSize')) document.getElementById('androidFileSize').value = a.fileSize || '45.2 MB';
    if (document.getElementById('androidDownloadUrl')) document.getElementById('androidDownloadUrl').value = a.downloadUrl || a.apkUrl || '';
    if (document.getElementById('androidChecksum')) document.getElementById('androidChecksum').value = a.checksum || a.sha256 || '';
    if (document.getElementById('androidReleaseNotes')) document.getElementById('androidReleaseNotes').value = Array.isArray(a.releaseNotes) ? a.releaseNotes.join('\n') : (a.releaseNotes || '');
    if (document.getElementById('androidMaintenance')) document.getElementById('androidMaintenance').checked = isChecked(a.maintenance || a.maintenanceMode);
    if (document.getElementById('androidForceUpdate')) document.getElementById('androidForceUpdate').checked = isChecked(a.forceUpdate);

    const w = cfg.windows || {};
    if (document.getElementById('windowsVersion')) document.getElementById('windowsVersion').value = w.version || w.latestVersion || '1.8.0';
    if (document.getElementById('windowsMinVersion')) document.getElementById('windowsMinVersion').value = w.minVersion || w.minSupportedVersion || '1.0.0';
    if (document.getElementById('windowsFileSize')) document.getElementById('windowsFileSize').value = w.fileSize || '88.2 MB';
    if (document.getElementById('windowsDownloadUrl')) document.getElementById('windowsDownloadUrl').value = w.downloadUrl || w.exeUrl || '';
    if (document.getElementById('windowsChecksum')) document.getElementById('windowsChecksum').value = w.checksum || w.sha256 || '';
    if (document.getElementById('windowsReleaseNotes')) document.getElementById('windowsReleaseNotes').value = Array.isArray(w.releaseNotes) ? w.releaseNotes.join('\n') : (w.releaseNotes || '');
    if (document.getElementById('windowsMaintenance')) document.getElementById('windowsMaintenance').checked = isChecked(w.maintenance || w.maintenanceMode);
    if (document.getElementById('windowsForceUpdate')) document.getElementById('windowsForceUpdate').checked = isChecked(w.forceUpdate);
  }

  function renderAnalytics(analytics) {
    if (!analytics) return;
    const totalEl = document.getElementById('statTotalDownloads');
    const androidEl = document.getElementById('statAndroidDownloads');
    const windowsEl = document.getElementById('statWindowsDownloads');
    const logsBody = document.getElementById('downloadLogsBody');

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

        const parseNotes = (str) => (str || '')
          .split('\n')
          .map(s => s.trim().replace(/^[-•*]\s*/, ''))
          .filter(Boolean);

        const payload = {
          published: document.getElementById('dlPublished')?.checked ?? true,
          globalMaintenance: document.getElementById('dlGlobalMaintenance')?.checked ?? false,
          android: {
            version: document.getElementById('androidVersion')?.value || '2.5.0',
            latestVersion: document.getElementById('androidVersion')?.value || '2.5.0',
            minVersion: document.getElementById('androidMinVersion')?.value || '2.0.0',
            minSupportedVersion: document.getElementById('androidMinVersion')?.value || '2.0.0',
            fileSize: document.getElementById('androidFileSize')?.value || '45.2 MB',
            downloadUrl: document.getElementById('androidDownloadUrl')?.value || '',
            apkUrl: document.getElementById('androidDownloadUrl')?.value || '',
            checksum: document.getElementById('androidChecksum')?.value || '',
            sha256: document.getElementById('androidChecksum')?.value || '',
            releaseNotes: parseNotes(document.getElementById('androidReleaseNotes')?.value),
            maintenance: document.getElementById('androidMaintenance')?.checked ?? false,
            maintenanceMode: document.getElementById('androidMaintenance')?.checked ?? false,
            forceUpdate: document.getElementById('androidForceUpdate')?.checked ?? false
          },
          windows: {
            version: document.getElementById('windowsVersion')?.value || '1.8.0',
            latestVersion: document.getElementById('windowsVersion')?.value || '1.8.0',
            minVersion: document.getElementById('windowsMinVersion')?.value || '1.5.0',
            minSupportedVersion: document.getElementById('windowsMinVersion')?.value || '1.0.0',
            fileSize: document.getElementById('windowsFileSize')?.value || '88.2 MB',
            downloadUrl: document.getElementById('windowsDownloadUrl')?.value || '',
            exeUrl: document.getElementById('windowsDownloadUrl')?.value || '',
            checksum: document.getElementById('windowsChecksum')?.value || '',
            sha256: document.getElementById('windowsChecksum')?.value || '',
            releaseNotes: parseNotes(document.getElementById('windowsReleaseNotes')?.value),
            maintenance: document.getElementById('windowsMaintenance')?.checked ?? false,
            maintenanceMode: document.getElementById('windowsMaintenance')?.checked ?? false,
            forceUpdate: document.getElementById('windowsForceUpdate')?.checked ?? false
          }
        };

        const success = await saveToUpstash('nexora_download_config', payload);

        if (statusMsg) {
          if (success) {
            statusMsg.textContent = '✓ Download settings published & saved to Cloud Redis Database!';
            statusMsg.style.display = 'block';
            statusMsg.style.background = 'rgba(16,185,129,0.15)';
            statusMsg.style.color = '#10b981';
            setTimeout(() => { statusMsg.style.display = 'none'; }, 4000);
          } else {
            statusMsg.textContent = '❌ Failed to publish download settings to Cloud Database.';
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
