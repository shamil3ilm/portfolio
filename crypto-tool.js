(function () {
  const root = document.getElementById('crypto');
  if (!root) return;
  const typeButtons = Array.from(root.querySelectorAll('[data-cr-type]'));
  const directionBox = root.querySelector('[data-cr="direction"]');
  const directionLabels = Array.from(root.querySelectorAll('[data-cr="direction"] span'));
  const input = root.querySelector('[data-cr="input"]');
  const inputLabel = root.querySelector('[data-cr="input-label"]');
  const passwordField = root.querySelector('[data-cr="password-field"]');
  const password = root.querySelector('[data-cr="password"]');
  const shiftField = root.querySelector('[data-cr="shift-field"]');
  const shift = root.querySelector('[data-cr="shift"]');
  const output = root.querySelector('[data-cr="output"]');
  const outputLabel = root.querySelector('[data-cr="output-label"]');
  const info = root.querySelector('[data-cr="info"]');
  const result = root.querySelector('[data-cr="result"]');
  const copyButton = root.querySelector('[data-cr="copy"]');
  const swapButton = root.querySelector('[data-cr="swap"]');

  const encoder = new TextEncoder();
  const strictDecoder = new TextDecoder('utf-8', { fatal: true });
  const PBKDF2_ROUNDS = 600000;
  const PREFIX = 'LOCKED1:';

  const TYPES = {
    lock: {
      verbs: ['Lock', 'Unlock'], kind: 'Real encryption',
      info: 'AES-256. Only someone with the password can read it, and any change to the locked text is detected.',
    },
    base64: {
      verbs: ['Encode', 'Decode'], kind: 'Encoding, not encryption',
      info: 'Anyone can decode it. Used to carry data safely through email, links and QR codes.',
    },
    hex: {
      verbs: ['Encode', 'Decode'], kind: 'Encoding, not encryption',
      info: 'Shows each byte as two characters (0-9, a-f), the way developers inspect raw data.',
    },
    url: {
      verbs: ['Encode', 'Decode'], kind: 'Encoding, not encryption',
      info: 'Makes text safe to put inside a web link, turning spaces and symbols into %20-style codes.',
    },
    sha256: {
      verbs: ['Fingerprint'], kind: 'One-way',
      info: 'A SHA-256 fingerprint: the same text always gives the same result, but it can never be turned back. Any tiny change gives a completely different fingerprint.',
    },
    caesar: {
      verbs: ['Scramble', 'Unscramble'], kind: 'For fun, not secure',
      info: 'The classic Caesar cipher: shifts each letter along the alphabet. Fun, but anyone can crack it. Shift 13 is the famous "ROT13".',
    },
  };

  let type = 'lock';
  let runId = 0;
  let timer = null;

  function setResult(text, tone) {
    result.textContent = text;
    result.dataset.tone = tone || '';
  }

  function direction() {
    const checked = root.querySelector('[data-cr="direction"] input:checked');
    return TYPES[type].verbs.length === 1 ? 0 : Number(checked ? checked.value : 0);
  }

  function toBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function fromBase64(text) {
    const binary = atob(text.replace(/\s+/g, ''));
    return Uint8Array.from(binary, function (c) { return c.charCodeAt(0); });
  }

  async function deriveKey(pass, salt) {
    const base = await crypto.subtle.importKey('raw', encoder.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: PBKDF2_ROUNDS, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  }

  async function lock(text, pass) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(pass, salt);
    const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, encoder.encode(text)));
    const packed = new Uint8Array(salt.length + iv.length + sealed.length);
    packed.set(salt, 0);
    packed.set(iv, salt.length);
    packed.set(sealed, salt.length + iv.length);
    return PREFIX + toBase64(packed);
  }

  async function unlock(text, pass) {
    const body = text.trim();
    if (body.indexOf(PREFIX) !== 0) throw new Error('This is not text locked with this tool.');
    let packed;
    try {
      packed = fromBase64(body.slice(PREFIX.length));
    } catch (e) {
      throw new Error('The locked text is damaged.');
    }
    if (packed.length < 29) throw new Error('The locked text is damaged.');
    const key = await deriveKey(pass, packed.slice(0, 16));
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: packed.slice(16, 28) }, key, packed.slice(28));
      return new TextDecoder().decode(plain);
    } catch (e) {
      throw new Error("Couldn't unlock: wrong password, or the locked text was changed.");
    }
  }

  function caesar(text, n) {
    const k = ((n % 26) + 26) % 26;
    return text.replace(/[a-z]/gi, function (ch) {
      const base = ch <= 'Z' ? 65 : 97;
      return String.fromCharCode(((ch.charCodeAt(0) - base + k) % 26) + base);
    });
  }

  async function transform(text) {
    const dir = direction();
    switch (type) {
      case 'lock':
        if (!password.value) throw new Error('Enter a password first.');
        return dir === 0 ? lock(text, password.value) : unlock(text, password.value);
      case 'base64':
        if (dir === 0) return toBase64(encoder.encode(text));
        try { return strictDecoder.decode(fromBase64(text)); } catch (e) { throw new Error("That isn't valid Base64 text."); }
      case 'hex':
        if (dir === 0) return Array.from(encoder.encode(text), function (b) { return b.toString(16).padStart(2, '0'); }).join(' ');
        {
          const clean = text.replace(/\s+/g, '');
          if (!/^([0-9a-f]{2})*$/i.test(clean)) throw new Error("That isn't valid hex (pairs of 0-9 and a-f).");
          try {
            return strictDecoder.decode(Uint8Array.from(clean.match(/../g) || [], function (h) { return parseInt(h, 16); }));
          } catch (e) {
            throw new Error("Those bytes don't form readable text.");
          }
        }
      case 'url':
        if (dir === 0) return encodeURIComponent(text);
        try { return decodeURIComponent(text); } catch (e) { throw new Error("That isn't valid URL-encoded text."); }
      case 'sha256': {
        const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
        return Array.from(new Uint8Array(digest), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      }
      case 'caesar':
        return caesar(text, (dir === 0 ? 1 : -1) * (parseInt(shift.value, 10) || 0));
    }
    return '';
  }

  function renderType() {
    const def = TYPES[type];
    typeButtons.forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.crType === type)); });
    directionBox.hidden = def.verbs.length === 1;
    directionLabels.forEach(function (span, i) { span.textContent = def.verbs[i] || ''; });
    passwordField.hidden = type !== 'lock';
    shiftField.hidden = type !== 'caesar';
    info.replaceChildren();
    const badge = document.createElement('strong');
    badge.textContent = def.kind + '. ';
    info.appendChild(badge);
    info.appendChild(document.createTextNode(def.info));
    info.dataset.kind = type === 'lock' ? 'strong' : type === 'caesar' ? 'fun' : 'plain';
    swapButton.hidden = def.verbs.length === 1;
    renderLabels();
  }

  function renderLabels() {
    const def = TYPES[type];
    const verb = def.verbs[direction()];
    inputLabel.textContent = direction() === 0 ? 'Your text' : 'Text to ' + verb.toLowerCase();
    outputLabel.textContent = 'Result (' + verb.toLowerCase() + (def.verbs.length > 1 ? 'ed' : '') + ')';
    if (type === 'sha256') outputLabel.textContent = 'Fingerprint';
  }

  async function run() {
    const id = ++runId;
    const text = input.value;
    copyButton.disabled = true;
    if (!text) {
      output.value = '';
      setResult('Type or paste some text to start.', '');
      return;
    }
    if (type === 'lock') setResult('Working…', '');
    try {
      const value = await transform(text);
      if (id !== runId) return;
      output.value = value;
      copyButton.disabled = false;
      const verb = TYPES[type].verbs[direction()].toLowerCase();
      setResult('✓ Done: ' + (type === 'sha256' ? 'fingerprint created.' : verb + (TYPES[type].verbs.length > 1 ? 'ed.' : '.')), 'ok');
      if (type === 'lock' && direction() === 1 && typeof window.achieve === 'function') window.achieve('crypto-unlock');
    } catch (e) {
      if (id !== runId) return;
      output.value = '';
      setResult('✕ ' + e.message, 'bad');
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(run, type === 'lock' ? 350 : 60);
  }

  typeButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      type = button.dataset.crType;
      const first = root.querySelector('[data-cr="direction"] input[value="0"]');
      first.checked = true;
      renderType();
      schedule();
    });
  });
  root.querySelectorAll('[data-cr="direction"] input').forEach(function (radio) {
    radio.addEventListener('change', function () {
      renderLabels();
      schedule();
    });
  });
  [input, password, shift].forEach(function (field) { field.addEventListener('input', schedule); });

  swapButton.addEventListener('click', function () {
    if (!output.value) return;
    input.value = output.value;
    const next = root.querySelector('[data-cr="direction"] input[value="' + (direction() === 0 ? 1 : 0) + '"]');
    next.checked = true;
    renderLabels();
    schedule();
  });

  copyButton.addEventListener('click', function () {
    const done = function () {
      copyButton.textContent = 'Copied ✓';
      setTimeout(function () { copyButton.textContent = 'Copy result'; }, 1500);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(output.value).then(done, function () {});
    } else {
      output.select();
      if (document.execCommand('copy')) done();
    }
  });

  if (!(window.crypto && window.crypto.subtle)) {
    setResult('This tool needs a modern browser with built-in cryptography.', 'warn');
    return;
  }
  // A different sample message each visit.
  if (window.Sample) {
    const place = Sample.business();
    const hour = Sample.int(9, 17);
    input.value = Sample.pick([
      'Meet at ' + place + ' at ' + (hour > 12 ? hour - 12 : hour) + (hour >= 12 ? ' PM' : ' AM') + '.',
      'The spare key for ' + place + ' is in the blue box.',
      'Invoice ' + Sample.invoiceNumber() + ' for ' + place + ' is approved.',
      'Wi-Fi password for ' + place + ': ' + Sample.last4() + '-' + Sample.last4(),
    ]);
  }
  renderType();
  run();
})();
