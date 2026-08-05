const CF_KV_FEEDBACK_URL = 'https://api.cloudflare.com/client/v4/accounts/ce3f6c1f773e98fb3d8039bfaf999b62/storage/kv/namespaces/791f4ba63d8b4e07baa2ca09986cd53d/values/nexora_feedback';
const CF_KV_TOKEN = atob('Y2ZhdF83anlsVHRaSEYyNlZwRnNudW94QmdnMHdwSEVsdVJBVnRxZjI5VGY1MjA2YmU4MmE=');
const UPSTASH_URL = 'https://legible-loon-84378.upstash.io';
const UPSTASH_TOKEN = 'gQAAAAAAAUmaAAIgcDE5M2IwMjM4MTczZjA0ZWQ5YWUwYzYzNTU1YzIyYTQ3Mg';

const DEFAULT_FEEDBACK = [
  {
    id: "fb_sample_1",
    type: "SUGGESTION",
    userName: "Student User",
    userEmail: "student@example.com",
    message: "Please add Physics Wallah and Unacademy direct portal links.",
    status: "REPLIED",
    createdAt: "2026-08-05T12:00:00.000Z",
    adminReply: "Thank you! Physics Wallah and Unacademy platforms have been added to the main launcher.",
    repliedAt: "2026-08-05T14:30:00.000Z"
  }
];

async function readFeedbackFromKV() {
  try {
    const res = await fetch(CF_KV_FEEDBACK_URL, {
      headers: { Authorization: `Bearer ${CF_KV_TOKEN}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}

  try {
    const res = await fetch(`${UPSTASH_URL}/get/nexora_feedback`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const data = await res.json();
    if (data && data.result) {
      const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}

  return DEFAULT_FEEDBACK;
}

async function saveFeedbackToKV(data) {
  try {
    await fetch(CF_KV_FEEDBACK_URL, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${CF_KV_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  } catch (e) {}

  try {
    await fetch(`${UPSTASH_URL}/set/nexora_feedback`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      body: JSON.stringify(data)
    });
  } catch (e) {}
}

export async function onRequestGet() {
  const feedbackList = await readFeedbackFromKV();
  return new Response(JSON.stringify(feedbackList), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const current = await readFeedbackFromKV();

    if (body.action === 'reply') {
      const { id, adminReply } = body;
      const index = current.findIndex(f => f.id === id);
      if (index !== -1) {
        current[index].adminReply = adminReply;
        current[index].status = 'REPLIED';
        current[index].repliedAt = new Date().toISOString();
        await saveFeedbackToKV(current);
        return new Response(JSON.stringify({ success: true, item: current[index] }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404 });
    }

    if (body.action === 'delete') {
      const { id } = body;
      const filtered = current.filter(f => f.id !== id);
      await saveFeedbackToKV(filtered);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // New feedback submission
    const newItem = {
      id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: body.type || 'QUESTION',
      userName: body.userName || 'Student',
      userEmail: body.userEmail || '',
      message: body.message || '',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      adminReply: '',
      repliedAt: ''
    };

    const updated = [newItem, ...current];
    await saveFeedbackToKV(updated);

    return new Response(JSON.stringify({ success: true, item: newItem }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
