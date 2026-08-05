export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const pathname = requestUrl.pathname;

  let targetUrl = '';
  const match = pathname.match(/^\/r\/(https?)\/(.+)$/i);
  
  if (match) {
    const protocol = match[1];
    const rest = match[2];
    targetUrl = `${protocol}://${rest}${requestUrl.search}`;
  } else {
    const urlParam = requestUrl.searchParams.get('url');
    if (urlParam) {
      targetUrl = decodeURIComponent(urlParam);
    }
  }

  if (!targetUrl) {
    return new Response('Missing target reverse proxy URL', { status: 400 });
  }

  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const parsedTarget = new URL(targetUrl);
    const targetOrigin = parsedTarget.origin;

    const proxyHeaders = new Headers();
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    proxyHeaders.set('Accept', context.request.headers.get('accept') || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8');
    proxyHeaders.set('Accept-Language', 'en-US,en;q=0.9,hi;q=0.8');
    proxyHeaders.set('Host', parsedTarget.host);
    proxyHeaders.set('Referer', targetOrigin + '/');

    const response = await fetch(targetUrl, {
      method: context.request.method,
      headers: proxyHeaders,
      redirect: 'follow'
    });

    const contentType = response.headers.get('content-type') || '';

    if (response.status === 403 || response.status === 401 || response.status >= 500) {
      return getFallbackResponse(targetUrl, `Reverse Proxy HTTP ${response.status}`);
    }

    if (contentType.includes('text/html')) {
      let html = await response.text();

      if (
        html.includes('you have been blocked') ||
        html.includes('Cloudflare Ray ID') ||
        html.includes('Attention Required!') ||
        html.includes('Just a moment...')
      ) {
        return getFallbackResponse(targetUrl, 'Cloudflare Security Check on Target Site');
      }

      const proxyScript = `
        <script>
          (function() {
            try {
              Object.defineProperty(window, 'top', { get: function() { return window.self; }, set: function() {} });
              Object.defineProperty(window, 'parent', { get: function() { return window.self; }, set: function() {} });
            } catch(e) {}
          })();
        </script>
      `;

      html = html
        .replace(/top\.location\s*=/gi, 'window.self.location =')
        .replace(/parent\.location\s*=/gi, 'window.self.location =')
        .replace(/window\.top\s*!==\s*window\.self/gi, 'false')
        .replace(/self\s*!==\s*top/gi, 'false')
        .replace(/target=["']?(_top|_parent|_blank)["']?/gi, 'target="_self"')
        .replace(/<base[^>]*target=["']?[^"'>]+["']?[^>]*>/gi, '');

      const baseTag = `<base href="${targetOrigin}/">`;
      const injection = baseTag + proxyScript;

      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, match => match + injection);
      } else {
        html = injection + html;
      }

      const resHeaders = new Headers();
      resHeaders.set('Content-Type', 'text/html; charset=utf-8');
      resHeaders.set('Access-Control-Allow-Origin', '*');

      return new Response(html, {
        status: 200,
        headers: resHeaders
      });
    }

    const resHeaders = new Headers(response.headers);
    resHeaders.delete('x-frame-options');
    resHeaders.delete('content-security-policy');
    resHeaders.delete('content-security-policy-report-only');
    resHeaders.delete('frame-options');
    resHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      headers: resHeaders
    });
  } catch (err) {
    return getFallbackResponse(targetUrl, err.message);
  }
}

function getFallbackResponse(targetUrl, reason) {
  const escapedUrl = targetUrl.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NEXORA — Educational Portal</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0c; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; text-align: center; }
        .card { background: #141518; border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 32px 24px; max-width: 440px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .badge { display: inline-block; background: rgba(255,122,23,0.15); color: #ff7a17; border: 1px solid rgba(255,122,23,0.3); font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 4px 12px; border-radius: 999px; margin-bottom: 20px; text-transform: uppercase; }
        .title { font-size: 18px; font-weight: 600; color: #ffffff; margin-bottom: 10px; word-break: break-all; }
        .desc { font-size: 13px; color: #9ca3af; line-height: 1.5; margin-bottom: 20px; }
        .reason-box { background: #1c1d22; border-radius: 10px; padding: 10px 14px; font-family: monospace; font-size: 11px; color: #f43f5e; margin-bottom: 24px; word-break: break-word; }
        .btn-group { display: flex; flex-direction: column; gap: 10px; }
        .btn-primary { background: linear-gradient(135deg, #ff7a17 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">Reverse Proxy Notice</div>
        <div class="title">${escapedUrl}</div>
        <p class="desc">Target platform requires direct container session.</p>
        ${reason ? `<div class="reason-box">${reason}</div>` : ''}
        <div class="btn-group">
          <a href="${escapedUrl}" target="_self" class="btn-primary">🚀 Launch Platform (Same Tab)</a>
        </div>
      </div>
    </body>
    </html>
  `;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
