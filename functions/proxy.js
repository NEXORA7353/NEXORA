export async function onRequest(context) {
  const urlParam = new URL(context.request.url).searchParams.get('url');

  if (!urlParam) {
    return new Response('Missing target URL', { status: 400 });
  }

  let targetUrl = decodeURIComponent(urlParam);
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const targetOrigin = new URL(targetUrl).origin;

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      redirect: 'follow'
    });

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      let html = await response.text();

      const proxyScript = `
        <script>
          (function() {
            try {
              Object.defineProperty(window, 'top', { get: function() { return window.self; } });
              Object.defineProperty(window, 'parent', { get: function() { return window.self; } });
            } catch(e) {}
          })();
        </script>
      `;

      const baseTag = `<base href="${targetOrigin}/">`;
      const injection = baseTag + proxyScript;

      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, match => match + injection);
      } else {
        html = injection + html;
      }

      html = html.replace(/target=["']_blank["']/gi, 'target="_self"');

      const headers = new Headers();
      headers.set('Content-Type', 'text/html; charset=utf-8');
      headers.set('Access-Control-Allow-Origin', '*');

      return new Response(html, {
        status: response.status,
        headers
      });
    }

    const headers = new Headers(response.headers);
    headers.delete('x-frame-options');
    headers.delete('content-security-policy');
    headers.delete('content-security-policy-report-only');
    headers.delete('frame-options');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      headers
    });
  } catch (err) {
    const escapedUrl = targetUrl.replace(/"/g, '&quot;');
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NEXORA — Educational Portal</title>
        <style>
          body { background: #0a0a0a; color: #ffffff; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 24px; box-sizing: border-box; }
          p.label { font-family: monospace; font-size: 11px; color: #7d8187; letter-spacing: 1.4px; margin-bottom: 12px; }
          h1 { font-size: 20px; font-weight: 500; margin-bottom: 8px; word-break: break-word; }
          p.sub { font-size: 14px; color: #7d8187; margin-bottom: 24px; max-width: 400px; }
          .btn { background: #ffffff; color: #0a0a0a; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; border: none; cursor: pointer; }
        </style>
      </head>
      <body>
        <p class="label">NEXORA — PLATFORM CONTAINER</p>
        <h1>${escapedUrl}</h1>
        <p class="sub">Launching inside NEXORA container...</p>
        <button onclick="window.location.reload()" class="btn">Reload Portal</button>
      </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}
