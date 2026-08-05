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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
        'Sec-Ch-Ua': '"Not-A.Brand";v="99", "Chromium";v="124", "Google Chrome";v="124"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: 'follow'
    });

    const contentType = response.headers.get('content-type') || '';

    // If HTTP status is forbidden (403), unauthorized (401), or server error, return friendly NEXORA Edge container
    if (response.status === 403 || response.status === 401 || response.status >= 500) {
      return getFallbackResponse(targetUrl, `Platform returned HTTP ${response.status} (Target site has Cloudflare / Bot Protection enabled)`);
    }

    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Check if target page returned Cloudflare Bot Challenge or block page text
      if (
        html.includes('you have been blocked') ||
        html.includes('Cloudflare Ray ID') ||
        html.includes('Attention Required!') ||
        html.includes('Just a moment...') ||
        html.includes('Enable JavaScript and cookies to continue')
      ) {
        return getFallbackResponse(targetUrl, 'Cloudflare Bot Protection / Security Check detected on target site');
      }

      // Anti-Framebuster & Cross-Origin Polyfill script
      const proxyScript = `
        <script>
          (function() {
            var PROXY_PREFIX = '/proxy?url=';
            try {
              Object.defineProperty(window, 'top', { get: function() { return window.self; }, set: function() {} });
              Object.defineProperty(window, 'parent', { get: function() { return window.self; }, set: function() {} });
            } catch(e) {}

            try {
              var origWindowOpen = window.open;
              window.open = function(url, target, features) {
                if (url && typeof url === 'string') {
                  var fullUrl = new URL(url, window.location.href).href;
                  if (!fullUrl.includes(PROXY_PREFIX)) {
                    window.location.href = PROXY_PREFIX + encodeURIComponent(fullUrl);
                    return window;
                  }
                }
                return origWindowOpen ? origWindowOpen.apply(window, arguments) : null;
              };
            } catch(e) {}
          })();
        </script>
      `;

      html = html
        .replace(/top\.location\s*=/gi, 'window.self.location =')
        .replace(/parent\.location\s*=/gi, 'window.self.location =')
        .replace(/window\.top\s*!==\s*window\.self/gi, 'false')
        .replace(/self\s*!==\s*top/gi, 'false')
        .replace(/top\s*!==\s*self/gi, 'false')
        .replace(/target=["']?(_top|_parent|_blank)["']?/gi, 'target="_self"')
        .replace(/<base[^>]*target=["']?[^"'>]+["']?[^>]*>/gi, '');

      const baseTag = `<base href="${targetOrigin}/">`;
      const injection = baseTag + proxyScript;

      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, match => match + injection);
      } else {
        html = injection + html;
      }

      html = html
        .replace(/src="\//g, `src="${targetOrigin}/`)
        .replace(/href="\//g, `href="${targetOrigin}/`);

      const headers = new Headers();
      headers.set('Content-Type', 'text/html; charset=utf-8');
      headers.set('Access-Control-Allow-Origin', '*');

      return new Response(html, {
        status: 200,
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
    return getFallbackResponse(targetUrl, err.message);
  }
}

function getFallbackResponse(targetUrl, reason) {
  const escapedUrl = targetUrl.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5451638891460185" crossorigin="anonymous"></script>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NEXORA — Educational Portal</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #0a0a0c;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 24px;
          text-align: center;
        }
        .card {
          background: #141518;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          padding: 32px 24px;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        .badge {
          display: inline-block;
          background: rgba(255, 122, 23, 0.15);
          color: #ff7a17;
          border: 1px solid rgba(255, 122, 23, 0.3);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          padding: 4px 12px;
          border-radius: 999px;
          margin-bottom: 20px;
          text-transform: uppercase;
        }
        .title {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 10px;
          word-break: break-all;
        }
        .desc {
          font-size: 13px;
          color: #9ca3af;
          line-height: 1.5;
          margin-bottom: 20px;
        }
        .reason-box {
          background: #1c1d22;
          border-radius: 10px;
          padding: 10px 14px;
          font-family: monospace;
          font-size: 11px;
          color: #f43f5e;
          margin-bottom: 24px;
          word-break: break-word;
        }
        .btn-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .btn-primary {
          background: linear-gradient(135deg, #ff7a17 0%, #a855f7 100%);
          color: #ffffff;
          text-decoration: none;
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          cursor: pointer;
          transition: transform 0.2s, opacity 0.2s;
        }
        .btn-primary:active { transform: scale(0.98); }
        .btn-secondary {
          background: rgba(255, 255, 255, 0.08);
          color: #d1d5db;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">Security Protection Active</div>
        <div class="title">${escapedUrl}</div>
        <p class="desc">Target platform has Cloudflare security or bot protection active which prevents frame embedding.</p>
        ${reason ? `<div class="reason-box">${reason}</div>` : ''}
        <div class="btn-group">
          <a href="${escapedUrl}" target="_self" class="btn-primary">
            🚀 Launch Platform (Same Tab)
          </a>
          <button onclick="window.location.reload()" class="btn-secondary">
            🔄 Retry Proxy Connection
          </button>
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

