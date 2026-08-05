const CF_KV_URL = 'https://api.cloudflare.com/client/v4/accounts/ce3f6c1f773e98fb3d8039bfaf999b62/storage/kv/namespaces/791f4ba63d8b4e07baa2ca09986cd53d/values/nexora_apps';
const CF_KV_TOKEN = atob('Y2ZhdF83anlsVHRaSEYyNlZwRnNudW94QmdnMHdwSEVsdVJBVnRxZjI5VGY1MjA2YmU4MmE=');
const UPSTASH_URL = 'https://legible-loon-84378.upstash.io';
const UPSTASH_TOKEN = 'gQAAAAAAAUmaAAIgcDE5M2IwMjM4MTczZjA0ZWQ5YWUwYzYzNTU1YzIyYTQ3Mg';

async function readAppsFromKV() {
  try {
    const res = await fetch(CF_KV_URL, {
      headers: { Authorization: `Bearer ${CF_KV_TOKEN}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}

  try {
    const res = await fetch(`${UPSTASH_URL}/get/nexora_apps`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const data = await res.json();
    if (data && data.result) {
      const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}

  return [];
}

async function saveAppsToKV(data) {
  try {
    await fetch(CF_KV_URL, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${CF_KV_TOKEN}`,
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(data)
    });
  } catch (e) {}

  try {
    await fetch(`${UPSTASH_URL}/set/nexora_apps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      body: JSON.stringify(data)
    });
  } catch (e) {}
}

export async function onRequestPut({ params, request }) {
  try {
    const id = params.id;
    const body = await request.json();
    let apps = await readAppsFromKV();

    const idx = apps.findIndex(p => p.id === id);
    if (idx === -1) {
      return new Response(JSON.stringify({ success: false, error: 'Platform not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const existing = apps[idx];
    const updatedItem = {
      ...existing,
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      url: body.url !== undefined ? String(body.url).trim() : existing.url,
      logoUrl: body.logoUrl !== undefined ? String(body.logoUrl).trim() : (body.logo !== undefined ? String(body.logo).trim() : existing.logoUrl),
      category: body.category !== undefined ? String(body.category).trim() : existing.category,
      featured: body.featured !== undefined ? Boolean(body.featured) : existing.featured,
      order: body.order !== undefined ? (parseInt(body.order, 10) || existing.order) : existing.order
    };

    apps[idx] = updatedItem;
    await saveAppsToKV(apps);

    return new Response(JSON.stringify({ success: true, data: updatedItem }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

export async function onRequestDelete({ params }) {
  try {
    const id = params.id;
    let apps = await readAppsFromKV();

    apps = apps.filter(p => p.id !== id);
    await saveAppsToKV(apps);

    return new Response(JSON.stringify({ success: true, message: 'Deleted' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
