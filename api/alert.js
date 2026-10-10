/* WhatsApp alert for portfolio activity (Vercel serverless function, POST /api/alert).
   Sends one approved template message to the owner's own WhatsApp through Meta's Cloud API.

   Triggers (from the site's own pages):
     { type: 'message', name, email, message, botcheck }  after a contact-form message is sent
     { type: 'visit', ref, page }                          when a ?ref=<tag> link is opened

   Configuration (Vercel project > Settings > Environment Variables). Until WA_TOKEN,
   WA_PHONE_NUMBER_ID and WA_TO are all set, the function accepts requests and sends nothing.
     WA_TOKEN            permanent System User access token (never commit it)
     WA_PHONE_NUMBER_ID  the sender's phone-number ID from WhatsApp > API Setup
     WA_TO               your WhatsApp number in international form, digits only (e.g. 971568900796)
     WA_TEMPLATE         approved template name (default: portfolio_alert)
     WA_TEMPLATE_LANG    template language code (default: en)
     WA_API_VERSION      Graph API version (default: v25.0)
   The template body must take exactly two variables: {{1}} = what happened, {{2}} = details. */

const SITE_ORIGINS = ['https://mohamed3shamil.vercel.app'];
const TAG = /^[a-z0-9][a-z0-9-]{0,39}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map(); // best effort per warm instance: ip -> [timestamps]

function clean(value, max) {
  // Template variables may not contain newlines, tabs or long runs of spaces.
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function allowed(ip) {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return false;
  hits.push(now);
  recent.set(ip, hits);
  return true;
}

function describe(body) {
  if (body.type === 'message') {
    if (body.botcheck) return null;
    const name = clean(body.name, 80);
    const email = clean(body.email, 120);
    const message = clean(body.message, 300);
    if (!name || !EMAIL.test(email) || !message) return null;
    return ['New contact-form message', `${name} (${email}): ${message}`];
  }
  if (body.type === 'visit') {
    const ref = clean(body.ref, 40).toLowerCase();
    const page = clean(body.page, 80);
    if (!TAG.test(ref) || !page.startsWith('/')) return null;
    return [`Tagged link opened: ${ref}`, `Page ${page}`];
  }
  return null;
}

async function send(params) {
  const version = process.env.WA_API_VERSION || 'v25.0';
  const url = `https://graph.facebook.com/${version}/${process.env.WA_PHONE_NUMBER_ID}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: process.env.WA_TO,
      type: 'template',
      template: {
        name: process.env.WA_TEMPLATE || 'portfolio_alert',
        language: { code: process.env.WA_TEMPLATE_LANG || 'en' },
        components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
      },
    }),
  });
  if (!response.ok) {
    // Server-side log only; the visitor's response never reveals delivery details.
    console.error('whatsapp_alert_failed', response.status, (await response.text()).slice(0, 500));
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  const origin = req.headers.origin || '';
  if (!SITE_ORIGINS.includes(origin)) return res.status(403).end();

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { return res.status(400).end(); }
  }
  const params = body && typeof body === 'object' ? describe(body) : null;
  if (!params) return res.status(400).end();

  const configured = process.env.WA_TOKEN && process.env.WA_PHONE_NUMBER_ID && process.env.WA_TO;
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (configured && allowed(ip)) {
    try { await send(params); } catch (e) { console.error('whatsapp_alert_error', e && e.message); }
  }
  return res.status(204).end();
};
