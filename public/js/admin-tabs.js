// js/admin-tabs.js
document.addEventListener('DOMContentLoaded', () => {
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

      // ✅ Event dispatch karo taaki admin-downloads.js sun sake
      window.dispatchEvent(new CustomEvent('adminTabChanged', {
        detail: { tab: targetTab }
      }));
    });
  });
});
