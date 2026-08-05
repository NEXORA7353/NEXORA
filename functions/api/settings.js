const CF_KV_SETTINGS_URL = 'https://api.cloudflare.com/client/v4/accounts/ce3f6c1f773e98fb3d8039bfaf999b62/storage/kv/namespaces/791f4ba63d8b4e07baa2ca09986cd53d/values/nexora_settings';
const CF_KV_TOKEN = atob('Y2ZhdF83anlsVHRaSEYyNlZwRnNudW94QmdnMHdwSEVsdVJBVnRxZjI5VGY1MjA2YmU4MmE=');
const UPSTASH_URL = 'https://legible-loon-84378.upstash.io';
const UPSTASH_TOKEN = 'gQAAAAAAAUmaAAIgcDE5M2IwMjM4MTczZjA0ZWQ5YWUwYzYzNTU1YzIyYTQ3Mg';

const DEFAULT_SETTINGS = {
  telegramEnabled: true,
  telegramLink: 'https://t.me/telegram',
  telegramTitle: 'Join Official Channel',
  telegramMessage: 'Get instant access to daily updates, live class links, and announcements!'
};

async function readSettingsFromKV() {
  try {
    const res = await fetch(CF_KV_SETTINGS_URL, {
      headers: { Authorization: `Bearer ${CF_KV_TOKEN}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') return { ...DEFAULT_SETTINGS, ...data };
    }
  } catch (e) {}

  try {
    const res = await fetch(`${UPSTASH_URL}/get/nexora_settings`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const data = await res.json();
    if (data && data.result) {
      const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      if (parsed && typeof parsed === 'object') return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {}

  return DEFAULT_SETTINGS;
}

async function saveSettingsToKV(data) {
  try {
    await fetch(CF_KV_SETTINGS_URL, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${CF_KV_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  } catch (e) {}

  try {
    await fetch(`${UPSTASH_URL}/set/nexora_settings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      body: JSON.stringify(data)
    });
  } catch (e) {}
}

export async function onRequestGet() {
  const settings = await readSettingsFromKV();
  return new Response(JSON.stringify({ success: true, data: settings }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const current = await readSettingsFromKV();
    const updated = {
      ...current,
      telegramEnabled: body.telegramEnabled !== undefined ? Boolean(body.telegramEnabled) : current.telegramEnabled,
      telegramLink: body.telegramLink ? String(body.telegramLink).trim() : current.telegramLink,
      telegramTitle: body.telegramTitle ? String(body.telegramTitle).trim() : current.telegramTitle,
      telegramMessage: body.telegramMessage ? String(body.telegramMessage).trim() : current.telegramMessage
    };

    await saveSettingsToKV(updated);

    return new Response(JSON.stringify({ success: true, data: updated }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
