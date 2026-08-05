// NEXORA User Notifications & Feedback Module
(function () {
  function getLocalFeedback() {
    try {
      return JSON.parse(localStorage.getItem('nexora_user_feedback') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveLocalFeedback(list) {
    try {
      localStorage.setItem('nexora_user_feedback', JSON.stringify(list));
    } catch (e) {}
  }

  async function fetchFeedbackList() {
    let apiList = [];
    try {
      const res = await fetch('/api/feedback', { cache: 'no-store' });
      if (res.ok) {
        apiList = await res.json();
      }
    } catch (e) {}

    const localList = getLocalFeedback();
    
    // Merge API and LocalStorage seamlessly
    const map = new Map();
    [...apiList, ...localList].forEach(item => {
      if (item && item.id) {
        if (!map.has(item.id) || item.status === 'REPLIED' || item.adminReply) {
          map.set(item.id, item);
        }
      }
    });

    const merged = Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    saveLocalFeedback(merged);
    return merged;
  }

  async function renderNotifications() {
    const notifBadge = document.getElementById('notifBadge');
    const notifList = document.getElementById('notifList');
    if (!notifList && !notifBadge) return;

    const list = await fetchFeedbackList();
    const repliedItems = list.filter(item => item.status === 'REPLIED' || item.adminReply);

    const readIds = JSON.parse(localStorage.getItem('nexora_read_notifs') || '[]');
    const unread = repliedItems.filter(n => !readIds.includes(n.id));

    if (notifBadge) {
      if (unread.length > 0) {
        notifBadge.textContent = unread.length;
        notifBadge.style.display = 'flex';
      } else {
        notifBadge.style.display = 'none';
      }
    }

    if (notifList) {
      notifList.innerHTML = '';
      if (repliedItems.length === 0) {
        notifList.innerHTML = `
          <div style="text-align: center; color: var(--ink-mute); padding: 24px; font-size: 13px;">
            No notifications yet. Submit a question or issue report to receive admin replies here!
          </div>`;
        return;
      }

      repliedItems.forEach(item => {
        const isUnread = !readIds.includes(item.id);
        const card = document.createElement('div');
        card.className = `notif-item-card ${isUnread ? 'unread' : ''}`;
        const typeClass = item.type === 'ERROR' ? 'error' : (item.type === 'IMPROVEMENT' ? 'improvement' : 'question');

        card.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span class="notif-type-badge ${typeClass}">${item.type || 'QUERY'}</span>
            <span style="font-size: 11px; color: var(--ink-mute);">${new Date(item.repliedAt || item.createdAt).toLocaleDateString()}</span>
          </div>
          <div style="font-size: 13px; color: var(--ink); font-weight: 500;">Q: ${escapeHtml(item.message)}</div>
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 10px; margin-top: 4px;">
            <div style="font-size: 11px; font-weight: 700; color: #10b981; margin-bottom: 2px;">ADMIN REPLY:</div>
            <div style="font-size: 13px; color: var(--ink-body); line-height: 1.4;">${escapeHtml(item.adminReply)}</div>
          </div>
        `;
        notifList.appendChild(card);
      });
    }
  }

  function markNotificationsRead() {
    const notifBadge = document.getElementById('notifBadge');
    const local = getLocalFeedback();
    const repliedIds = local.filter(item => item.status === 'REPLIED' || item.adminReply).map(n => n.id);
    localStorage.setItem('nexora_read_notifs', JSON.stringify(repliedIds));
    if (notifBadge) notifBadge.style.display = 'none';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {
    const openFeedbackModalBtn = document.getElementById('openFeedbackModalBtn');
    const feedbackModal = document.getElementById('feedbackModal');
    const feedbackModalClose = document.getElementById('feedbackModalClose');
    const feedbackForm = document.getElementById('feedbackForm');
    const fbStatusMsg = document.getElementById('fbStatusMsg');

    const notifBellBtn = document.getElementById('notifBellBtn');
    const notifModal = document.getElementById('notifModal');
    const notifModalClose = document.getElementById('notifModalClose');

    if (openFeedbackModalBtn && feedbackModal) {
      openFeedbackModalBtn.addEventListener('click', () => {
        feedbackModal.style.display = 'flex';
      });
    }

    if (feedbackModalClose && feedbackModal) {
      feedbackModalClose.addEventListener('click', () => {
        feedbackModal.style.display = 'none';
      });
    }

    if (notifBellBtn && notifModal) {
      notifBellBtn.addEventListener('click', () => {
        notifModal.style.display = 'flex';
        markNotificationsRead();
      });
    }

    if (notifModalClose && notifModal) {
      notifModalClose.addEventListener('click', () => {
        notifModal.style.display = 'none';
      });
    }

    if (feedbackForm) {
      feedbackForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const type = document.getElementById('fbType')?.value || 'QUESTION';
        const userName = document.getElementById('fbName')?.value || 'Student';
        const userEmail = document.getElementById('fbEmail')?.value || '';
        const message = document.getElementById('fbMessage')?.value || '';

        const newItem = {
          id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          type,
          userName,
          userEmail,
          message,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          adminReply: '',
          repliedAt: ''
        };

        // Save locally
        const list = getLocalFeedback();
        list.unshift(newItem);
        saveLocalFeedback(list);

        // Save to API
        try {
          fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItem)
          }).catch(() => {});
        } catch (err) {}

        if (fbStatusMsg) fbStatusMsg.style.display = 'block';
        feedbackForm.reset();
        setTimeout(() => {
          if (fbStatusMsg) fbStatusMsg.style.display = 'none';
          if (feedbackModal) feedbackModal.style.display = 'none';
        }, 1500);

        renderNotifications();
      });
    }

    renderNotifications();
    setInterval(renderNotifications, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
