/* Visit counts through Vercel Web Analytics: no cookies, nothing that identifies a visitor.
   - A link with ?ref=<tag> (one tag per application, e.g. ?ref=acme) is reported as
     /ref/<tag>/<page>, so the dashboard's Pages panel shows which link a visit came through.
     The tag is kept for the rest of the visit in this tab and removed from the address bar.
   - Opening the site once with ?owner=1 stops counting this browser (your own visits);
     ?owner=0 starts counting it again. It also stops this browser's WhatsApp alerts. */
(function () {
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };

  const TAG = /^[a-z0-9][a-z0-9-]{0,39}$/;
  const params = new URLSearchParams(location.search);

  function read(store, key) {
    try { return window[store].getItem(key); } catch (e) { return null; }
  }
  function write(store, key, value) {
    try {
      if (value === null) window[store].removeItem(key);
      else window[store].setItem(key, value);
    } catch (e) { /* storage blocked: tags and owner opt-out just don't persist */ }
  }

  const owner = params.get('owner');
  if (owner === '1') write('localStorage', 'va-disable', '1');
  if (owner === '0') write('localStorage', 'va-disable', null);

  const fresh = (params.get('ref') || '').toLowerCase();
  if (TAG.test(fresh)) write('sessionStorage', 'visit-ref', fresh);
  const ref = TAG.test(fresh) ? fresh : read('sessionStorage', 'visit-ref');

  // Where this visit came from (the first outside site in this tab), kept across pages.
  let from = read('sessionStorage', 'entry-from');
  if (from === null) {
    from = '';
    try {
      const host = new URL(document.referrer).hostname;
      if (host !== location.hostname) from = host.replace(/^www\./, '');
    } catch (e) { /* no referrer: a direct visit */ }
    write('sessionStorage', 'entry-from', from);
  }

  function alertOwner(payload) {
    try {
      navigator.sendBeacon('/api/alert', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    } catch (e) { /* alerts are best effort */ }
  }

  // WhatsApp alerts (api/alert.js), never for the owner:
  // - the first time a tagged link is opened in this tab;
  // - once per tab when an untagged visitor opens a case study or résumé page.
  const isOwner = Boolean(read('localStorage', 'va-disable'));
  if (TAG.test(fresh) && !isOwner && read('sessionStorage', 'visit-alerted') !== fresh) {
    write('sessionStorage', 'visit-alerted', fresh);
    alertOwner({ type: 'visit', ref: fresh, page: location.pathname });
  }
  const KEY_PAGE = /^\/(case-[a-z0-9-]+|resume|resume\/[a-z0-9-]+)\.html$/;
  if (!ref && !isOwner && KEY_PAGE.test(location.pathname) && !read('sessionStorage', 'interest-alerted')) {
    write('sessionStorage', 'interest-alerted', '1');
    alertOwner({ type: 'interest', page: location.pathname, from: from });
  }

  if (params.has('ref') || params.has('owner')) {
    params.delete('ref');
    params.delete('owner');
    const query = params.toString();
    history.replaceState(history.state, '', location.pathname + (query ? '?' + query : '') + location.hash);
  }

  window.va('beforeSend', function (event) {
    if (read('localStorage', 'va-disable')) return null;
    const url = new URL(event.url);
    url.searchParams.delete('ref');
    url.searchParams.delete('owner');
    if (ref && TAG.test(ref)) url.pathname = '/ref/' + ref + url.pathname;
    return Object.assign({}, event, { url: url.toString() });
  });
})();
