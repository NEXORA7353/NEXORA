// NEXORA Admin Console Navigation & Tabs Module
(function () {
  const ADMIN_PASSWORD = 'nexora2024';

  function initAdminTabs() {
    const gateScreen = document.getElementById('gateScreen');
    const dashboardScreen = document.getElementById('dashboardScreen');
    const gateForm = document.getElementById('gateForm');
    const gatePassword = document.getElementById('gatePassword');
    const gateError = document.getElementById('gateError');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!gateScreen || !dashboardScreen) return;

    if (sessionStorage.getItem('nexora_auth') === 'true') {
      showDashboard();
    } else {
      showGate();
    }

    if (gateForm) {
      gateForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const entered = gatePassword.value ? gatePassword.value.trim() : '';
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
      gateScreen.style.display = 'flex';
      dashboardScreen.style.display = 'none';
    }

    function showDashboard() {
      gateScreen.style.display = 'none';
      dashboardScreen.style.display = 'block';

      // Dispatch custom event to notify other admin modules to load their content
      window.dispatchEvent(new CustomEvent('adminDashboardShown'));
    }

    // Sidebar tab switching handlers
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

        window.dispatchEvent(new CustomEvent('adminTabChanged', { detail: { tab: targetTab } }));
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminTabs);
  } else {
    initAdminTabs();
  }
})();
