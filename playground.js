(function () {
  /* Shared helpers */

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function setResult(node, text, tone) {
    node.textContent = text;
    node.dataset.tone = tone || '';
  }

  function randomHex(bytes) {
    const values = new Uint8Array(bytes);
    window.crypto.getRandomValues(values);
    return Array.from(values).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function achieve(id) {
    if (typeof window.achieve === 'function') window.achieve(id);
  }

  function money(value) {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* 1. Saudi e-invoice QR (TLV + base64) */

  (function qrDemo() {
    const form = document.querySelector('[data-qr="form"]');
    if (!form) return;
    const img = document.querySelector('[data-qr="img"]');
    const hint = document.querySelector('[data-qr="hint"]');
    const b64Out = document.querySelector('[data-qr="b64"]');
    const table = document.querySelector('[data-qr="decoded"] tbody');
    const FIELDS = ['', 'Seller name', 'VAT number', 'Timestamp', 'Invoice total', 'VAT total'];
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const now = new Date();
    now.setSeconds(0, 0);
    form.time.value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    function parseAmount(text) {
      const cleaned = String(text).replace(/[^\d.]/g, '');
      const value = parseFloat(cleaned);
      return isFinite(value) ? value : 0;
    }

    function tlv(tag, value) {
      const bytes = encoder.encode(value);
      if (bytes.length > 255) throw new Error('Field ' + tag + ' is too long');
      const out = new Uint8Array(bytes.length + 2);
      out[0] = tag;
      out[1] = bytes.length;
      out.set(bytes, 2);
      return out;
    }

    function toBase64(bytes) {
      let binary = '';
      bytes.forEach(function (b) { binary += String.fromCharCode(b); });
      return btoa(binary);
    }

    function decodeTlv(base64) {
      const binary = atob(base64);
      const bytes = Uint8Array.from(binary, function (c) { return c.charCodeAt(0); });
      const rows = [];
      let i = 0;
      while (i + 2 <= bytes.length) {
        const tag = bytes[i];
        const length = bytes[i + 1];
        const value = decoder.decode(bytes.slice(i + 2, i + 2 + length));
        rows.push({ tag: tag, length: length, value: value });
        i += 2 + length;
      }
      return rows;
    }

    function drawQr(text) {
      const qr = window.qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      const count = qr.getModuleCount();
      const margin = 4;
      const size = count + margin * 2;
      let path = '';
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) path += 'M' + (c + margin) + ' ' + (r + margin) + 'h1v1h-1z';
        }
      }
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
      svg.setAttribute('shape-rendering', 'crispEdges');
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('width', size);
      bg.setAttribute('height', size);
      bg.setAttribute('fill', '#ffffff');
      const dots = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      dots.setAttribute('d', path);
      dots.setAttribute('fill', '#0e1b2b');
      svg.appendChild(bg);
      svg.appendChild(dots);
      img.replaceChildren(svg);
    }

    function validate(vat) {
      if (!/^\d{15}$/.test(vat)) return 'A Saudi VAT number has 15 digits.';
      if (vat[0] !== '3' || vat[14] !== '3') return 'A Saudi VAT number starts and ends with 3.';
      return '';
    }

    function render() {
      const total = parseAmount(form.total.value);
      const vatAmount = Math.round((total * 15 / 115) * 100) / 100;
      form.vatAmount.value = money(vatAmount);

      const vat = form.vat.value.trim();
      const issue = validate(vat);
      const seller = form.seller.value.trim() || 'Seller';
      const local = form.time.value ? new Date(form.time.value) : new Date();
      const timestamp = local.toISOString().replace(/\.\d{3}Z$/, 'Z');

      const parts = [tlv(1, seller), tlv(2, vat), tlv(3, timestamp), tlv(4, total.toFixed(2)), tlv(5, vatAmount.toFixed(2))];
      const joined = new Uint8Array(parts.reduce(function (sum, p) { return sum + p.length; }, 0));
      let offset = 0;
      parts.forEach(function (p) { joined.set(p, offset); offset += p.length; });
      const base64 = toBase64(joined);

      drawQr(base64);
      b64Out.textContent = base64;
      table.replaceChildren();
      decodeTlv(base64).forEach(function (row) {
        const tr = el('tr');
        tr.appendChild(el('td', 'mono', String(row.tag)));
        tr.appendChild(el('td', '', FIELDS[row.tag] || 'Unknown'));
        tr.appendChild(el('td', 'mono', String(row.length)));
        tr.appendChild(el('td', 'mono', row.value));
        table.appendChild(tr);
      });

      if (issue) {
        setResult(hint, '⚠ ' + issue + ' The QR is still generated, but a real invoice would be rejected.', 'warn');
      } else {
        setResult(hint, '✓ ' + joined.length + ' bytes, 5 fields. Scan it: your camera will show the encoded text.', 'ok');
      }
    }

    // Live thousands separators with up to 2 decimals; the caret stays after the same digit.
    function formatMoneyLive(input) {
      const caret = input.selectionStart === null ? input.value.length : input.selectionStart;
      const significantBefore = input.value.slice(0, caret).replace(/[^\d.]/g, '').length;
      let cleaned = input.value.replace(/[^\d.]/g, '');
      const dot = cleaned.indexOf('.');
      if (dot !== -1) cleaned = cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 2);
      let [whole, fraction] = cleaned.split('.');
      whole = (whole || '').replace(/^0+(?=\d)/, '').slice(0, 9);
      const grouped = whole ? Number(whole).toLocaleString('en-US') : (fraction !== undefined ? '0' : '');
      input.value = grouped + (fraction !== undefined ? '.' + fraction : '');

      let seen = 0;
      let position = 0;
      while (position < input.value.length && seen < significantBefore) {
        if (/[\d.]/.test(input.value[position])) seen++;
        position++;
      }
      input.setSelectionRange(position, position);
    }

    form.total.addEventListener('input', function () { formatMoneyLive(form.total); });
    form.total.addEventListener('blur', function () {
      form.total.value = money(parseAmount(form.total.value));
      render();
    });
    form.vat.addEventListener('input', function () {
      form.vat.value = form.vat.value.replace(/\D/g, '').slice(0, 15);
    });
    form.addEventListener('input', render);
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    document.querySelector('[data-qr="download"]').addEventListener('click', function () {
      const svg = img.querySelector('svg');
      if (!svg) return;
      const data = new XMLSerializer().serializeToString(svg);
      const image = new Image();
      image.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 0, 0, 600, 600);
        canvas.toBlob(function (blob) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'e-invoice-qr.png';
          link.click();
          setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
          achieve('qr-use');
        });
      };
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
    });

    const pasteBox = document.querySelector('[data-qr="paste"]');
    const readResult = document.querySelector('[data-qr="read-result"]');
    const readTable = document.querySelector('[data-qr="read-table"]');
    document.querySelector('[data-qr="read"]').addEventListener('click', function () {
      const text = pasteBox.value.trim();
      readTable.hidden = true;
      if (!text) {
        setResult(readResult, 'Paste the text from a QR code first. Tip: copy the encoded text above to try it.', 'warn');
        return;
      }
      let rows;
      try {
        rows = decodeTlv(text);
      } catch (e) {
        rows = [];
      }
      const valid = rows.length >= 5 && rows.every(function (r) { return r.tag >= 1 && r.tag <= 9; });
      if (!valid) {
        setResult(readResult, "That doesn't look like a Saudi e-invoice QR text.", 'bad');
        return;
      }
      const tbody = readTable.querySelector('tbody');
      tbody.replaceChildren();
      rows.forEach(function (row) {
        const tr = el('tr');
        tr.appendChild(el('td', '', FIELDS[row.tag] || 'Signature data (tag ' + row.tag + ')'));
        tr.appendChild(el('td', 'mono', row.tag <= 5 ? row.value : row.length + ' bytes'));
        tbody.appendChild(tr);
      });
      readTable.hidden = false;
      setResult(readResult, '✓ Read ' + rows.length + ' fields from the QR text.', 'ok');
      achieve('qr-use');
    });

    // A fresh seller, VAT number and total on every visit.
    form.seller.value = Sample.seller();
    form.vat.value = Sample.vatNumber();
    form.total.value = money(Sample.amount(200, 25000));

    if (window.qrcode) {
      render();
    } else {
      setResult(hint, 'The QR library could not load. Check your connection and refresh.', 'bad');
    }
  })();

  /* 2. Webhook signature check (HMAC-SHA256) */

  (function webhookDemo() {
    const root = document.getElementById('webhook');
    if (!root) return;
    const payloadInput = root.querySelector('[data-hook="payload"]');
    const secretInput = root.querySelector('[data-hook="secret"]');
    const headerOut = root.querySelector('[data-hook="header"]');
    const result = root.querySelector('[data-hook="result"]');
    const summary = root.querySelector('[data-hook="summary"]');
    const amountInput = root.querySelector('[data-hook="amount"]');
    const plainView = root.querySelector('[data-hook="plain-view"]');
    const techView = root.querySelector('[data-hook="tech-view"]');
    const encoder = new TextEncoder();

    let senderSecret;
    let signature;
    let runId = 0;

    if (!(window.crypto && window.crypto.subtle)) {
      setResult(result, 'This demo needs a modern browser with Web Crypto.', 'warn');
      return;
    }

    async function hmacHex(secret, message) {
      const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
      return Array.from(new Uint8Array(sig)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }

    // Compare every character so timing doesn't reveal how much of the signature matched.
    function constantTimeEqual(a, b) {
      if (a.length !== b.length) return false;
      let diff = 0;
      for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
      return diff === 0;
    }

    async function sendFresh() {
      senderSecret = 'whsec_' + randomHex(8);
      const body = JSON.stringify({
        id: 'evt_' + randomHex(4),
        event: 'invoice.cleared',
        timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        data: { invoice: 'INV-' + Sample.invoiceNumber(), amount: Sample.amount(100, 20000, 25), currency: 'SAR' },
      }, null, 2);
      payloadInput.value = body;
      secretInput.value = senderSecret;
      signature = await hmacHex(senderSecret, body);
      headerOut.value = 'sha256=' + signature.slice(0, 16) + '…';
      renderPlain(true);
      verify();
    }

    // The raw message grows to fit its content, so it never scrolls inside the scrolling page.
    function fitPayload() {
      if (techView.hidden) return;
      payloadInput.style.height = 'auto';
      payloadInput.style.height = payloadInput.scrollHeight + 2 + 'px';
    }

    async function verify() {
      fitPayload();
      const id = ++runId;
      const expected = await hmacHex(secretInput.value, payloadInput.value);
      if (id !== runId) return;
      if (constantTimeEqual(expected, signature)) {
        setResult(result, '✓ Accepted: the signature matches, so the event is genuine and unchanged.', 'ok');
      } else {
        const reason = secretInput.value !== senderSecret ? 'the secret is wrong' : 'the event was changed after it was signed';
        setResult(result, '✕ Rejected: the signature does not match (' + reason + ').', 'bad');
        achieve('hook-reject');
      }
    }

    // Plain view: the same message, readable, with the amount editable.
    function parsed() {
      try { return JSON.parse(payloadInput.value); } catch (e) { return null; }
    }

    function renderPlain(syncAmount) {
      const msg = parsed();
      summary.replaceChildren();
      if (!msg || !msg.data) {
        summary.appendChild(el('p', 'hook-bad', '⚠ The message no longer reads as valid data. It was edited in the technical view.'));
        amountInput.disabled = true;
        return;
      }
      amountInput.disabled = false;
      const when = new Date(msg.timestamp);
      summary.appendChild(el('span', 'hook-icon', '🔔'));
      const text = el('div');
      text.appendChild(el('p', 'hook-title', 'Invoice ' + msg.data.invoice + ' for ' + msg.data.currency + ' ' + money(Number(msg.data.amount) || 0) + ' was cleared'));
      text.appendChild(el('p', 'hook-meta', isNaN(when) ? 'Time unknown' : when.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })));
      summary.appendChild(text);
      if (syncAmount) amountInput.value = money(Number(msg.data.amount) || 0);
    }

    amountInput.addEventListener('input', function () {
      const msg = parsed();
      if (!msg || !msg.data) return;
      const value = parseFloat(amountInput.value.replace(/,/g, ''));
      msg.data.amount = isFinite(value) ? value : 0;
      payloadInput.value = JSON.stringify(msg, null, 2);
      renderPlain(false);
      verify();
    });
    amountInput.addEventListener('blur', function () { renderPlain(true); });

    root.querySelectorAll('[data-hook="view"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        const tech = root.querySelector('[data-hook="view"]:checked').value === 'tech';
        techView.hidden = !tech;
        plainView.hidden = tech;
        if (tech) fitPayload();
        else renderPlain(true);
      });
    });

    root.querySelector('[data-hook-action="tamper"]').addEventListener('click', function () {
      payloadInput.value = payloadInput.value.replace(/"amount":\s*[\d.]+/, '"amount": 25000');
      renderPlain(true);
      verify();
    });
    root.querySelector('[data-hook-action="secret"]').addEventListener('click', function () {
      secretInput.value = 'whsec_' + randomHex(8);
      verify();
    });
    root.querySelector('[data-hook-action="reset"]').addEventListener('click', sendFresh);
    payloadInput.addEventListener('input', function () {
      renderPlain(true);
      verify();
    });
    secretInput.addEventListener('input', verify);

    sendFresh();
  })();

  /* 3. Schedule and time-zone preview */

  (function scheduleDemo() {
    const root = document.getElementById('schedule');
    if (!root) return;
    const daySelect = root.querySelector('[data-sched="day"]');
    const timeInput = root.querySelector('[data-sched="time"]');
    const tzSelect = root.querySelector('[data-sched="tz"]');
    const tbody = root.querySelector('[data-sched="table"] tbody');
    const naive = root.querySelector('[data-sched="naive"]');
    const RUNS = 6;

    for (let d = 1; d <= 31; d++) {
      const option = el('option', '', String(d));
      option.value = String(d);
      daySelect.appendChild(option);
    }
    daySelect.value = '31';

    function partsIn(timeZone, date) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).formatToParts(date);
      const out = {};
      parts.forEach(function (p) { if (p.type !== 'literal') out[p.type] = parseInt(p.value, 10); });
      return out;
    }

    function offsetMs(timeZone, date) {
      const p = partsIn(timeZone, date);
      const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
      return asUtc - Math.floor(date.getTime() / 60000) * 60000;
    }

    // Wall-clock time in a zone → the real instant (handles daylight-saving changes).
    function zonedToUtc(y, m, d, h, min, timeZone) {
      const guess = Date.UTC(y, m - 1, d, h, min);
      const first = offsetMs(timeZone, new Date(guess));
      let instant = guess - first;
      const second = offsetMs(timeZone, new Date(instant));
      if (second !== first) instant = guess - second;
      return new Date(instant);
    }

    function daysInMonth(y, m) {
      return new Date(Date.UTC(y, m, 0)).getUTCDate();
    }

    function fmt(date, timeZone) {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: timeZone, weekday: 'short', day: 'numeric', month: 'short',
        hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
      }).format(date);
    }

    function render() {
      const timeZone = tzSelect.value;
      const day = parseInt(daySelect.value, 10);
      const [hour, minute] = (timeInput.value || '00:00').split(':').map(Number);
      const now = new Date();
      const start = partsIn(timeZone, now);

      tbody.replaceChildren();
      let first = null;
      for (let i = 0, found = 0; found < RUNS && i < 24; i++) {
        const monthIndex = start.month - 1 + i;
        const y = start.year + Math.floor(monthIndex / 12);
        const m = (monthIndex % 12) + 1;
        const last = daysInMonth(y, m);
        const runDay = Math.min(day, last);
        const run = zonedToUtc(y, m, runDay, hour, minute, timeZone);
        if (run <= now) continue;
        found++;
        if (!first) first = { run: run, y: y, m: m, d: runDay };

        const notes = [];
        if (runDay !== day) notes.push('Only ' + last + ' days → runs on the ' + runDay + 'th');
        const local = partsIn(timeZone, run);
        const utc = partsIn('UTC', run);
        const localKey = local.year * 10000 + local.month * 100 + local.day;
        const utcKey = utc.year * 10000 + utc.month * 100 + utc.day;
        if (utcKey > localKey) notes.push('UTC is already the next day');
        if (utcKey < localKey) notes.push('UTC is still the previous day');

        const tr = el('tr');
        tr.appendChild(el('td', '', fmt(run, timeZone)));
        tr.appendChild(el('td', 'mono', fmt(run, 'UTC')));
        const note = el('td', notes.length ? 'pg-flag' : 'pg-muted', notes.join(' · ') || '—');
        tr.appendChild(note);
        tbody.appendChild(tr);
      }

      if (!first) return;
      const local = partsIn(timeZone, first.run);
      const utc = partsIn('UTC', first.run);
      const sameDay = local.year === utc.year && local.month === utc.month && local.day === utc.day;
      const city = tzSelect.options[tzSelect.selectedIndex].text;
      if (timeZone === 'UTC') {
        setResult(naive, 'In UTC the two dates always match, which is exactly why this kind of bug hides in testing. Try New York at 9:00 PM.', '');
      } else if (sameDay) {
        setResult(naive, '✓ At this time the ' + city + ' date and the UTC date are the same, so a date lookup is safe. Try an evening time in New York.', 'ok');
      } else {
        setResult(
          naive,
          '⚠ At this time it is already a different date in UTC. Code that looks up "today" in UTC instead of ' + city +
            ' time checks the wrong date, and the run is silently skipped. I fixed exactly this bug in scheduled bank files.',
          'warn'
        );
      }
    }

    [daySelect, timeInput, tzSelect].forEach(function (input) {
      function onChange() {
        render();
        if (naive.dataset.tone === 'warn') achieve('sched-skip');
      }
      input.addEventListener('input', onChange);
      input.addEventListener('change', onChange);
    });
    render();
  })();
})();
