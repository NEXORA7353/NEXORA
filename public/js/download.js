(function () {
  const UPSTASH_URL = 'https://legible-loon-84378.upstash.io';
  const UPSTASH_TOKEN = 'gQAAAAAAAUmaAAIgcDE5M2IwMjM4MTczZjA0ZWQ5YWUwYzYzNTU1YzIyYTQ3Mg';

  const pageApkVersion = document.getElementById('pageApkVersion');
  const pageApkSize = document.getElementById('pageApkSize');
  const pageApkDownloadBtn = document.getElementById('pageApkDownloadBtn');

  const pageExeVersion = document.getElementById('pageExeVersion');
  const pageExeSize = document.getElementById('pageExeSize');
  const pageExeDownloadBtn = document.getElementById('pageExeDownloadBtn');

  async function fetchAppDownloadSettings() {
    let data = null;
    try {
      const res = await fetch(`${UPSTASH_URL}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['GET', 'nexora_download_apps'])
      });
      const resData = await res.json();
      if (resData && resData.result) {
        data = typeof resData.result === 'string' ? JSON.parse(resData.result) : resData.result;
      }
    } catch (e) {}

    if (!data) {
      try {
        const local = localStorage.getItem('nexora_download_apps');
        if (local) data = JSON.parse(local);
      } catch (e) {}
    }

    if (!data) {
      data = {
        apkEnabled: true,
        apkUrl: 'https://gofile.io/d/UNtAj9',
        apkVersion: 'v1.2.0',
        apkSize: '24.5 MB',
        exeEnabled: true,
        exeUrl: 'https://gofile.io/d/geE7fL',
        exeVersion: 'v1.0.0',
        exeSize: '98.2 MB'
      };
    }

    if (pageApkVersion) pageApkVersion.textContent = data.apkVersion || 'v1.2.0';
    if (pageApkSize) pageApkSize.textContent = data.apkSize || '24.5 MB';

    const apkUrl = data.apkUrl && data.apkUrl.trim() !== '#' ? data.apkUrl.trim() : '/downloads/nexora.apk';
    if (pageApkDownloadBtn) {
      pageApkDownloadBtn.href = apkUrl;
      if (apkUrl.startsWith('/') || apkUrl.endsWith('.apk') || apkUrl.includes('raw.githubusercontent.com') || apkUrl.includes('/releases/download/')) {
        pageApkDownloadBtn.setAttribute('download', `nexora_${data.apkVersion || 'v1.2.0'}.apk`);
        pageApkDownloadBtn.onclick = null;
      } else {
        pageApkDownloadBtn.target = '_blank';
        pageApkDownloadBtn.onclick = (e) => {
          if (apkUrl && apkUrl !== '#') {
            window.open(apkUrl, '_blank');
          } else {
            e.preventDefault();
            alert('Android APK download link has not been configured yet.');
          }
        };
      }
    }

    if (pageExeVersion) pageExeVersion.textContent = data.exeVersion || 'v1.0.0';
    if (pageExeSize) pageExeSize.textContent = data.exeSize || '98.2 MB';

    const exeUrl = data.exeUrl && data.exeUrl.trim() !== '#' ? data.exeUrl.trim() : '/downloads/nexora-setup.exe';
    if (pageExeDownloadBtn) {
      pageExeDownloadBtn.href = exeUrl;
      if (exeUrl.startsWith('/') || exeUrl.endsWith('.exe') || exeUrl.includes('raw.githubusercontent.com') || exeUrl.includes('/releases/download/')) {
        pageExeDownloadBtn.setAttribute('download', `nexora_setup_${data.exeVersion || 'v1.0.0'}.exe`);
        pageExeDownloadBtn.onclick = null;
      } else {
        pageExeDownloadBtn.target = '_blank';
        pageExeDownloadBtn.onclick = (e) => {
          if (exeUrl && exeUrl !== '#') {
            window.open(exeUrl, '_blank');
          } else {
            e.preventDefault();
            alert('Windows EXE download link has not been configured yet.');
          }
        };
      }
    }
  }

  fetchAppDownloadSettings();
})();
