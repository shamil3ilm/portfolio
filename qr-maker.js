(function () {
  const root = document.getElementById('qr-maker');
  if (!root) return;
  const typeButtons = Array.from(root.querySelectorAll('[data-qrm-type]'));
  const fieldsBox = root.querySelector('[data-qrm="fields"]');
  const img = root.querySelector('[data-qrm="img"]');
  const hint = root.querySelector('[data-qrm="hint"]');
  const colorInput = root.querySelector('[data-qrm="color"]');
  const logoInput = root.querySelector('[data-qrm="logo"]');
  const logoClear = root.querySelector('[data-qrm="logo-clear"]');
  const pngButton = root.querySelector('[data-qrm="png"]');
  const svgButton = root.querySelector('[data-qrm="svg"]');
  const PNG_SIZE = 1024;
  const MARGIN = 4;
  const LOGO_SHARE = 0.22;

  const TYPES = {
    link: {
      fields: [{ name: 'url', label: 'Website link', placeholder: 'example.com/menu', value: 'mohamed3shamil.vercel.app' }],
      encode: function (v) {
        const url = v.url.trim();
        if (!url) return '';
        return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : 'https://' + url;
      },
      scan: 'Opens the website.',
    },
    text: {
      fields: [{ name: 'text', label: 'Message', type: 'textarea', placeholder: 'Any text, like a note or a code' }],
      encode: function (v) { return v.text.trim(); },
      scan: 'Shows the message.',
    },
    wifi: {
      fields: [
        { name: 'ssid', label: 'Network name', placeholder: 'Home Wi-Fi' },
        { name: 'password', label: 'Password', placeholder: 'Wi-Fi password' },
        { name: 'security', label: 'Security', type: 'select', options: [['WPA', 'WPA / WPA2 / WPA3'], ['WEP', 'WEP (old)'], ['nopass', 'No password']] },
      ],
      encode: function (v) {
        if (!v.ssid.trim()) return '';
        const esc = function (s) { return s.replace(/([\\;,:"])/g, '\\$1'); };
        const password = v.security === 'nopass' ? '' : 'P:' + esc(v.password) + ';';
        return 'WIFI:T:' + v.security + ';S:' + esc(v.ssid.trim()) + ';' + password + ';';
      },
      scan: 'Joins the Wi-Fi network without typing the password.',
    },
    email: {
      fields: [
        { name: 'to', label: 'Email address', placeholder: 'name@example.com', inputmode: 'email' },
        { name: 'subject', label: 'Subject', placeholder: 'Optional' },
        { name: 'body', label: 'Message', type: 'textarea', placeholder: 'Optional' },
      ],
      encode: function (v) {
        const to = v.to.trim();
        if (!to) return '';
        const params = [];
        if (v.subject.trim()) params.push('subject=' + encodeURIComponent(v.subject.trim()));
        if (v.body.trim()) params.push('body=' + encodeURIComponent(v.body.trim()));
        return 'mailto:' + to + (params.length ? '?' + params.join('&') : '');
      },
      check: function (v) { return v.to.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.to.trim()) ? 'That email address looks incomplete.' : ''; },
      scan: 'Opens a new email, ready to send.',
    },
    phone: {
      fields: [{ name: 'number', label: 'Phone number', placeholder: '+971 50 123 4567', inputmode: 'tel' }],
      encode: function (v) { const n = v.number.replace(/[^\d+]/g, ''); return n ? 'tel:' + n : ''; },
      scan: 'Calls the number.',
    },
    sms: {
      fields: [
        { name: 'number', label: 'Phone number', placeholder: '+971 50 123 4567', inputmode: 'tel' },
        { name: 'message', label: 'Message', type: 'textarea', placeholder: 'Optional' },
      ],
      encode: function (v) {
        const n = v.number.replace(/[^\d+]/g, '');
        return n ? 'SMSTO:' + n + ':' + v.message.trim() : '';
      },
      scan: 'Starts a text message.',
    },
    whatsapp: {
      fields: [
        { name: 'number', label: 'WhatsApp number (with country code)', placeholder: '971501234567', inputmode: 'tel' },
        { name: 'message', label: 'Message', type: 'textarea', placeholder: 'Optional' },
      ],
      encode: function (v) {
        const n = v.number.replace(/\D/g, '');
        if (!n) return '';
        return 'https://wa.me/' + n + (v.message.trim() ? '?text=' + encodeURIComponent(v.message.trim()) : '');
      },
      scan: 'Opens a WhatsApp chat.',
    },
    contact: {
      fields: [
        { name: 'first', label: 'First name', placeholder: 'Sara' },
        { name: 'last', label: 'Last name', placeholder: 'Khan' },
        { name: 'phone', label: 'Phone', placeholder: '+971 50 123 4567', inputmode: 'tel' },
        { name: 'email', label: 'Email', placeholder: 'sara@example.com', inputmode: 'email' },
        { name: 'org', label: 'Company', placeholder: 'Optional' },
        { name: 'url', label: 'Website', placeholder: 'Optional' },
      ],
      encode: function (v) {
        const esc = function (s) { return s.trim().replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n'); };
        if (!v.first.trim() && !v.last.trim()) return '';
        const lines = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + esc(v.last) + ';' + esc(v.first) + ';;;', 'FN:' + esc((v.first + ' ' + v.last).trim())];
        if (v.org.trim()) lines.push('ORG:' + esc(v.org));
        if (v.phone.trim()) lines.push('TEL;TYPE=CELL:' + v.phone.replace(/[^\d+]/g, ''));
        if (v.email.trim()) lines.push('EMAIL:' + v.email.trim());
        if (v.url.trim()) lines.push('URL:' + v.url.trim());
        lines.push('END:VCARD');
        return lines.join('\n');
      },
      scan: 'Offers to save the contact.',
    },
  };

  const values = {};
  Object.keys(TYPES).forEach(function (type) {
    values[type] = {};
    TYPES[type].fields.forEach(function (f) {
      values[type][f.name] = f.value || (f.options ? f.options[0][0] : '');
    });
  });

  let type = 'link';
  let logo = null;
  let current = null;

  function setHint(text, tone) {
    hint.textContent = text;
    hint.dataset.tone = tone || '';
  }

  function buildFields() {
    fieldsBox.replaceChildren();
    TYPES[type].fields.forEach(function (f) {
      const label = document.createElement('label');
      label.textContent = f.label;
      let input;
      if (f.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 3;
      } else if (f.type === 'select') {
        input = document.createElement('select');
        f.options.forEach(function (o) {
          const option = document.createElement('option');
          option.value = o[0];
          option.textContent = o[1];
          input.appendChild(option);
        });
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.autocomplete = 'off';
        if (f.inputmode) input.inputMode = f.inputmode;
      }
      input.name = f.name;
      if (f.placeholder) input.placeholder = f.placeholder;
      input.value = values[type][f.name];
      input.addEventListener('input', function () {
        values[type][f.name] = input.value;
        render();
      });
      input.addEventListener('change', function () {
        values[type][f.name] = input.value;
        render();
      });
      label.appendChild(input);
      fieldsBox.appendChild(label);
    });
  }

  function utf8Binary(text) {
    return Array.from(new TextEncoder().encode(text), function (b) { return String.fromCharCode(b); }).join('');
  }

  function luminance(hex) {
    const n = parseInt(hex.slice(1), 16);
    const channel = function (c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  }

  function makeQr(text) {
    const qr = window.qrcode(0, logo ? 'H' : 'M');
    qr.addData(utf8Binary(text));
    qr.make();
    return qr;
  }

  function buildSvg(qr) {
    const count = qr.getModuleCount();
    const size = count + MARGIN * 2;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('xmlns', ns);
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('shape-rendering', 'crispEdges');
    const bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('width', size);
    bg.setAttribute('height', size);
    bg.setAttribute('fill', '#ffffff');
    svg.appendChild(bg);
    let d = '';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) d += 'M' + (c + MARGIN) + ' ' + (r + MARGIN) + 'h1v1h-1z';
      }
    }
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', colorInput.value);
    svg.appendChild(path);
    if (logo) {
      const box = count * LOGO_SHARE;
      const pad = box * 0.12;
      const start = (size - box) / 2;
      const plate = document.createElementNS(ns, 'rect');
      plate.setAttribute('x', start - pad);
      plate.setAttribute('y', start - pad);
      plate.setAttribute('width', box + pad * 2);
      plate.setAttribute('height', box + pad * 2);
      plate.setAttribute('rx', pad);
      plate.setAttribute('fill', '#ffffff');
      svg.appendChild(plate);
      const image = document.createElementNS(ns, 'image');
      image.setAttribute('href', logo.src);
      image.setAttribute('x', start);
      image.setAttribute('y', start);
      image.setAttribute('width', box);
      image.setAttribute('height', box);
      image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.appendChild(image);
    }
    return svg;
  }

  function render() {
    const def = TYPES[type];
    const text = def.encode(values[type]);
    const problem = def.check ? def.check(values[type]) : '';
    current = null;
    pngButton.disabled = true;
    svgButton.disabled = true;

    if (!text) {
      img.replaceChildren();
      img.dataset.empty = 'true';
      setHint('Fill in the fields to make your QR code.', '');
      return;
    }
    let qr;
    try {
      qr = makeQr(text);
    } catch (e) {
      img.replaceChildren();
      img.dataset.empty = 'true';
      setHint('✕ That is too much content for one QR code. Please shorten it' + (logo ? ' or remove the logo.' : '.'), 'bad');
      return;
    }
    delete img.dataset.empty;
    img.replaceChildren(buildSvg(qr));
    current = qr;
    pngButton.disabled = false;
    svgButton.disabled = false;

    if (problem) {
      setHint('⚠ ' + problem, 'warn');
    } else if (luminance(colorInput.value) > 0.4) {
      setHint('⚠ Light colours can be hard to scan. A darker colour works best.', 'warn');
    } else {
      setHint('✓ Ready. Scanning it: ' + def.scan + (logo ? ' Test it with your phone, since logos cover part of the code.' : ''), 'ok');
    }
  }

  function download(href, name) {
    const link = document.createElement('a');
    link.href = href;
    link.download = name;
    link.click();
  }

  pngButton.addEventListener('click', function () {
    if (!current) return;
    const count = current.getModuleCount();
    const size = count + MARGIN * 2;
    const scale = Math.floor(PNG_SIZE / size);
    const canvas = document.createElement('canvas');
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = colorInput.value;
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (current.isDark(r, c)) ctx.fillRect((c + MARGIN) * scale, (r + MARGIN) * scale, scale, scale);
      }
    }
    if (logo) {
      const box = count * LOGO_SHARE * scale;
      const pad = box * 0.12;
      const start = (canvas.width - box) / 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(start - pad, start - pad, box + pad * 2, box + pad * 2);
      const ratio = Math.min(box / logo.naturalWidth, box / logo.naturalHeight);
      const w = logo.naturalWidth * ratio;
      const h = logo.naturalHeight * ratio;
      ctx.drawImage(logo, start + (box - w) / 2, start + (box - h) / 2, w, h);
    }
    canvas.toBlob(function (blob) {
      const url = URL.createObjectURL(blob);
      download(url, 'qr-code-' + type + '.png');
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  });

  svgButton.addEventListener('click', function () {
    const svg = img.querySelector('svg');
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    download(url, 'qr-code-' + type + '.svg');
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  logoInput.addEventListener('change', function () {
    const file = logoInput.files && logoInput.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setHint('✕ Please choose an image file (PNG, JPG or SVG).', 'bad');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setHint('✕ That image is over 2 MB. Please choose a smaller logo.', 'bad');
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      const image = new Image();
      image.onload = function () {
        logo = image;
        logoClear.hidden = false;
        render();
      };
      image.onerror = function () { setHint('✕ That image could not be read.', 'bad'); };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  logoClear.addEventListener('click', function () {
    logo = null;
    logoInput.value = '';
    logoClear.hidden = true;
    render();
  });

  colorInput.addEventListener('input', render);

  typeButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      type = button.dataset.qrmType;
      typeButtons.forEach(function (b) { b.setAttribute('aria-checked', String(b === button)); });
      buildFields();
      render();
    });
  });

  if (!window.qrcode) {
    setHint('The QR library could not load. Check your connection and refresh.', 'bad');
    return;
  }
  buildFields();
  render();
})();
