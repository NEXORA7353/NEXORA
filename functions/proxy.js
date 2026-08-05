export async function onRequest(context) {
  const urlParam = new URL(context.request.url).searchParams.get('url');

  if (urlParam) {
    let targetUrl = decodeURIComponent(urlParam);
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }
    return Response.redirect(targetUrl, 302);
  }

  return new Response('Proxy route disabled', { status: 200 });
}
