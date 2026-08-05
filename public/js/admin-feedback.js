// NEXORA Admin User Feedback & Replies Module
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

  async function renderAdminFeedbackList() {
    const adminFeedbackList = document.getElementById('adminFeedbackList');
    const feedbackCount = document.getElementById('feedbackCount');
    const metricPendingCount = document.getElementById('metricPendingCount');
    if (!adminFeedbackList) return;

    const list = await fetchFeedbackList();
    adminFeedbackList.innerHTML = '';

    if (feedbackCount) feedbackCount.textContent = `${list.length} submissions`;
    
    const pendingCount = list.filter(f => f.status === 'PENDING').length;
    if (metricPendingCount) metricPendingCount.textContent = pendingCount;

    if (list.length === 0) {
      adminFeedbackList.innerHTML = `
        <div style="text-align: center; color: var(--ink-mute); padding: 20px; font-size: 13px; background: var(--canvas-card); border-radius: 12px; border: 1px solid var(--hairline);">
          No user feedback or error reports submitted yet.
        </div>`;
      return;
    }

    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'admin-item-card';
      const isReplied = item.status === 'REPLIED' || Boolean(item.adminReply);

      card.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="notif-type-badge ${item.type === 'ERROR' ? 'error' : (item.type === 'IMPROVEMENT' ? 'improvement' : 'question')}">${item.type || 'QUESTION'}</span>
            <span style="font-size: 13px; font-weight: 600; color: var(--ink);">${escapeHtml(item.userName || 'Student')}</span>
            ${item.userEmail ? `<span style="font-size: 12px; color: var(--ink-mute);">(${escapeHtml(item.userEmail)})</span>` : ''}
          </div>
          <span style="font-size: 11px; color: var(--ink-mute);">${new Date(item.createdAt).toLocaleString()}</span>
        </div>
        
        <div style="font-size: 14px; color: var(--ink-body); line-height: 1.4; background: var(--canvas-soft); padding: 10px; border-radius: 8px;">
          ${escapeHtml(item.message)}
        </div>

        ${isReplied ? `
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 10px; margin-top: 4px;">
            <div style="font-size: 11px; font-weight: 700; color: #10b981;">CURRENT ADMIN REPLY:</div>
            <div style="font-size: 13px; color: var(--ink); margin-top: 2px;">${escapeHtml(item.adminReply)}</div>
          </div>
        ` : ''}

        <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 8px;">
          <textarea id="replyText_${item.id}" class="admin-input" placeholder="Type reply for user..." style="min-height: 60px; font-size: 13px;">${escapeHtml(item.adminReply || '')}</textarea>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <button type="button" class="btn-primary btn-sm" onclick="sendAdminReplyHandler('${item.id}')">
              ${isReplied ? 'Update Reply' : 'Send Reply'}
            </button>
            <button type="button" class="btn-danger btn-sm" onclick="deleteFeedbackItemHandler('${item.id}')">Delete</button>
          </div>
        </div>
      `;
      adminFeedbackList.appendChild(card);
    });
  }

  window.sendAdminReplyHandler = async function (id) {
    const textarea = document.getElementById(`replyText_${id}`);
    if (!textarea || !textarea.value.trim()) {
      alert('Please type a reply before sending.');
      return;
    }
    const adminReply = textarea.value.trim();

    // 1. Update Local Storage immediately
    const list = getLocalFeedback();
    const index = list.findIndex(f => f.id === id);
    if (index !== -1) {
      list[index].adminReply = adminReply;
      list[index].status = 'REPLIED';
      list[index].repliedAt = new Date().toISOString();
      saveLocalFeedback(list);
    }

    // 2. Update API
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', id, adminReply })
      });
    } catch (e) {}

    alert('Reply sent successfully! User will see notification.');
    renderAdminFeedbackList();
  };

  window.deleteFeedbackItemHandler = async function (id) {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    
    // 1. Delete from local storage
    const list = getLocalFeedback();
    const filtered = list.filter(f => f.id !== id);
    saveLocalFeedback(filtered);

    // 2. Delete from API
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
    } catch (e) {}

    renderAdminFeedbackList();
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {
    window.addEventListener('adminDashboardShown', renderAdminFeedbackList);
    window.addEventListener('adminTabChanged', (e) => {
      if (e.detail && e.detail.tab === 'tab-feedback') {
        renderAdminFeedbackList();
      }
    });

    renderAdminFeedbackList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
