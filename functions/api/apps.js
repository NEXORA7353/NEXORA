const CF_KV_URL = 'https://api.cloudflare.com/client/v4/accounts/ce3f6c1f773e98fb3d8039bfaf999b62/storage/kv/namespaces/791f4ba63d8b4e07baa2ca09986cd53d/values/nexora_apps';
const CF_KV_TOKEN = atob('Y2ZhdF83anlsVHRaSEYyNlZwRnNudW94QmdnMHdwSEVsdVJBVnRxZjI5VGY1MjA2YmU4MmE=');
const UPSTASH_URL = 'https://legible-loon-84378.upstash.io';
const UPSTASH_TOKEN = 'gQAAAAAAAUmaAAIgcDE5M2IwMjM4MTczZjA0ZWQ5YWUwYzYzNTU1YzIyYTQ3Mg';

function normalizeApps(apps) {
  if (!Array.isArray(apps)) return [];
  return apps.map(app => {
    let links = Array.isArray(app.links) && app.links.length > 0 ? app.links : [];
    if (links.length === 0 && app.url) {
      links = [{
        id: 'link_default_' + Math.random().toString(36).substr(2, 5),
        title: app.name ? `${app.name} Portal` : 'Main Access',
        url: app.url,
        statusMode: app.statusMode || 'auto',
        keyRequirement: app.keyRequirement || 'without_key',
        loginRequirement: app.loginRequirement || 'login_not_required'
      }];
    }
    return {
      id: app.id || ('id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
      name: app.name || 'Platform',
      logoUrl: app.logoUrl || app.logo || '',
      logo: app.logoUrl || app.logo || '',
      category: app.category || 'GENERAL',
      featured: Boolean(app.featured),
      order: typeof app.order === 'number' ? app.order : 1,
      addedAt: app.addedAt || new Date().toISOString(),
      links: links
    };
  });
}

async function readAppsFromKV() {
  let rawApps = null;
  try {
    const res = await fetch(CF_KV_URL, {
      headers: { Authorization: `Bearer ${CF_KV_TOKEN}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) rawApps = data;
    }
  } catch (e) {}

  if (!rawApps) {
    try {
      const res = await fetch(`${UPSTASH_URL}/get/nexora_apps`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      });
      const data = await res.json();
      if (data && data.result) {
        const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        if (Array.isArray(parsed)) rawApps = parsed;
      }
    } catch (e) {}
  }

  return normalizeApps(rawApps || []);
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

export async function onRequestGet() {
  const apps = await readAppsFromKV();
  return new Response(JSON.stringify({ success: true, data: apps, count: apps.length }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const apps = await readAppsFromKV();

    let links = Array.isArray(body.links) && body.links.length > 0 ? body.links : [];
    if (links.length === 0 && body.url) {
      links = [{
        id: 'link_' + Date.now() + '_0',
        title: body.name ? `${body.name} Portal` : 'Main Access',
        url: body.url,
        statusMode: body.statusMode || 'auto',
        keyRequirement: body.keyRequirement || 'without_key',
        loginRequirement: body.loginRequirement || 'login_not_required'
      }];
    }

    const newItem = {
      id: 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: body.name ? String(body.name).trim() : 'New Platform',
      logoUrl: body.logoUrl ? String(body.logoUrl).trim() : (body.logo ? String(body.logo).trim() : ''),
      logo: body.logoUrl ? String(body.logoUrl).trim() : (body.logo ? String(body.logo).trim() : ''),
      category: body.category ? String(body.category).trim() : 'GENERAL',
      order: parseInt(body.order, 10) || (apps.length + 1),
      featured: Boolean(body.featured),
      addedAt: new Date().toISOString(),
      links: links
    };

    apps.push(newItem);
    await saveAppsToKV(apps);

    return new Response(JSON.stringify({ success: true, data: newItem }), {
      status: 201,
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
