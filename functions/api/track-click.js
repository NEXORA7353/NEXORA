const CF_KV_CLICKS_URL = 'https://api.cloudflare.com/client/v4/accounts/ce3f6c1f773e98fb3d8039bfaf999b62/storage/kv/namespaces/791f4ba63d8b4e07baa2ca09986cd53d/values/nexora_clicks';
const CF_KV_TOKEN = atob('Y2ZhdF83anlsVHRaSEYyNlZwRnNudW94QmdnMHdwSEVsdVJBVnRxZjI5VGY1MjA2YmU4MmE=');
const UPSTASH_URL = 'https://legible-loon-84378.upstash.io';
const UPSTASH_TOKEN = 'gQAAAAAAAUmaAAIgcDE5M2IwMjM4MTczZjA0ZWQ5YWUwYzYzNTU1YzIyYTQ3Mg';

async function readClicksFromKV() {
  try {
    const res = await fetch(CF_KV_CLICKS_URL, {
      headers: { Authorization: `Bearer ${CF_KV_TOKEN}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') return data;
    }
  } catch (e) {}

  try {
    const res = await fetch(`${UPSTASH_URL}/get/nexora_clicks`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const data = await res.json();
    if (data && data.result) {
      const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {}

  return {};
}

async function saveClicksToKV(data) {
  try {
    await fetch(CF_KV_CLICKS_URL, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${CF_KV_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  } catch (e) {}

  try {
    await fetch(`${UPSTASH_URL}/set/nexora_clicks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      body: JSON.stringify(data)
    });
  } catch (e) {}
}

export async function onRequestGet() {
  const clicks = await readClicksFromKV();
  return new Response(JSON.stringify(clicks), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const { appName, linkTitle, linkUrl } = body;
    const key = linkUrl || appName || 'unknown';
    
    const clicks = await readClicksFromKV();
    if (!clicks[key]) {
      clicks[key] = {
        appName: appName || 'Platform',
        linkTitle: linkTitle || 'Access Link',
        url: linkUrl || '#',
        count: 0,
        lastClicked: new Date().toISOString()
      };
    }
    clicks[key].count = (clicks[key].count || 0) + 1;
    clicks[key].lastClicked = new Date().toISOString();

    await saveClicksToKV(clicks);

    return new Response(JSON.stringify({ success: true, count: clicks[key].count }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
