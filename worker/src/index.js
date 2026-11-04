// PIN이 맞으면 KV에 저장된 여행 일정 HTML을 돌려줍니다. 일정 내용은 저장소에 없습니다.
export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (url.pathname !== "/api/trip" || request.method !== "POST")
      return new Response("Not found", { status: 404, headers: cors });
    if (!env.PIN) return new Response("PIN not set", { status: 500, headers: cors });

    let pin = "";
    try { pin = String((await request.json()).pin || ""); } catch (_) {}
    if (!safeEqual(pin, env.PIN)) return new Response("Unauthorized", { status: 401, headers: cors });

    const html = await env.TRIP.get("trip");
    if (!html) return new Response("No content", { status: 404, headers: cors });
    return new Response(html, { headers: { ...cors, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }
};
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
