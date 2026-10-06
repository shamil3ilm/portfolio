(function () {
  /* Command palette: Ctrl+K (or /) to jump to any section, demo, tool or action on the site. */

  const EMAIL = 'mhmdshamil03@gmail.com';

  function clickFirst(selector) {
    const node = document.querySelector(selector);
    if (node) node.click();
    return Boolean(node);
  }

  const ITEMS = [
    { group: 'Home', title: 'Top of the page', url: 'index.html#top', keys: 'start hero intro' },
    { group: 'Home', title: 'Work with me (services)', url: 'index.html#help', keys: 'services hire freelance offers process skills help' },
    { group: 'Home', title: 'Work at Zil Money', url: 'index.html#work', keys: 'experience job role payments' },
    { group: 'Home', title: 'Netplex: business platform & ZATCA e-invoicing', url: 'index.html#netplex', keys: 'netplex zatca e-invoicing taxfly laravel vue inertia gcc' },
    { group: 'Home', title: 'Smaller fixes, before and after', url: 'index.html#work-also', keys: 'fixes bugs positive pay statements accounting payroll imports' },
    { group: 'Home', title: 'Projects', url: 'index.html#projects', keys: 'cert-ed masaar time athar built' },
    { group: 'Home', title: 'How I work', url: 'index.html#about', keys: 'about education timeline principles' },
    { group: 'Home', title: 'Contact', url: 'index.html#contact', keys: 'hire message form talk' },

    { group: 'Case studies', title: 'Delegated account access', url: 'case-delegated-access.html', keys: 'provider payroll api act as customer' },
    { group: 'Case studies', title: 'AI observability: what every call costs', url: 'case-llm-observability.html', keys: 'llm ai dashboard cost tokens latency monitoring' },
    { group: 'Case studies', title: 'ZATCA e-invoicing at Netplex', url: 'case-zatca-einvoicing.html', keys: 'zatca saudi e-invoicing netplex xml qr signing' },
    { group: 'Case studies', title: 'Recurring payment safeguards', url: 'case-recurring-safeguards.html', keys: 'schedule cancel delete recipient' },

    { group: 'Demos', title: 'Risk Review Desk (game)', url: 'playground.html#play', keys: 'play game shift review patrol' },
    { group: 'Demos', title: 'Approval lock', url: 'index.html#demo-lock', keys: 'approve bank details payment' },
    { group: 'Demos', title: 'Tamper check', url: 'index.html#demo-chain', keys: 'invoice seal chain records' },
    { group: 'Demos', title: 'Who sees what', url: 'index.html#demo-access', keys: 'roles access permissions cert-ed' },
    { group: 'Demos', title: 'Delegated account access', url: 'playground.html#delegated-access', keys: 'provider connect key' },
    { group: 'Demos', title: 'Recurring payment safeguards', url: 'playground.html#recurring', keys: 'schedule cancel' },
    { group: 'Demos', title: 'AI usage and cost tracking', url: 'playground.html#ai-usage', keys: 'llm tokens cost dashboard' },
    { group: 'Demos', title: 'E-invoice QR code', url: 'playground.html#qr', keys: 'vat saudi zatca tax' },
    { group: 'Demos', title: 'Webhook signature check', url: 'playground.html#webhook', keys: 'hmac signed update' },
    { group: 'Demos', title: 'Schedule and time-zone preview', url: 'playground.html#schedule', keys: 'timezone utc month' },

    { group: 'Tools', title: 'QR code maker', url: 'playground.html#qr-maker', keys: 'wifi link contact whatsapp logo' },
    { group: 'Tools', title: 'Lock & unlock text', url: 'playground.html#crypto', keys: 'encrypt decrypt password base64 hex sha256' },
    { group: 'Tools', title: 'Routing number checker', url: 'playground.html#routing', keys: 'aba bank' },
    { group: 'Tools', title: 'Check amount in words', url: 'playground.html#words', keys: 'cheque dollars' },

    { group: 'Actions', title: '60-second view', keys: 'summary recruiter quick', run: function () {
      if (typeof window.openQuickView === 'function') window.openQuickView();
      else location.href = 'index.html?view=quick';
    } },
    { group: 'Actions', title: 'Résumé', url: 'resume.html', keys: 'resume cv pdf download' },
    { group: 'Actions', title: 'Switch light / dark theme', keys: 'theme dark light mode', run: function () { clickFirst('.theme-toggle'); } },
    { group: 'Actions', title: 'Copy my email address', keys: 'email copy', stay: true, run: function () { return copyEmail(); } },
    { group: 'Actions', title: 'Email me', url: 'mailto:' + EMAIL, keys: 'mail contact' },
    { group: 'Actions', title: 'Challenges and progress', keys: 'achievements trophy', run: function () { clickFirst('.ach-fab'); } },
    { group: 'Actions', title: 'LinkedIn', url: 'https://linkedin.com/in/mohamed3shamil', external: true, keys: 'profile' },
    { group: 'Actions', title: 'GitHub', url: 'https://github.com/shamil3ilm', external: true, keys: 'code repositories' },
  ];

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const dialog = el('dialog', 'palette');
  dialog.setAttribute('aria-label', 'Search the site');
  const box = el('div', 'palette-box');
  const input = el('input', 'palette-input');
  input.type = 'text';
  input.placeholder = 'Search sections, demos, tools…';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('aria-controls', 'palette-list');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-label', 'Search the site');
  input.autocomplete = 'off';
  input.spellcheck = false;
  const list = el('ul', 'palette-list');
  list.id = 'palette-list';
  list.setAttribute('role', 'listbox');
  const foot = el('p', 'palette-foot', '↑ ↓ to move · Enter to open · Esc to close');
  foot.setAttribute('aria-live', 'polite');
  box.appendChild(input);
  box.appendChild(list);
  box.appendChild(foot);
  dialog.appendChild(box);
  document.body.appendChild(dialog);

  let results = [];
  let active = 0;

  function copyEmail() {
    const done = function () { foot.textContent = 'Copied ' + EMAIL; };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(EMAIL).then(done, function () { foot.textContent = EMAIL; });
    } else {
      foot.textContent = EMAIL;
    }
  }

  function score(item, words) {
    const title = item.title.toLowerCase();
    const hay = (item.title + ' ' + item.group + ' ' + (item.keys || '')).toLowerCase();
    if (!words.every(function (w) { return hay.indexOf(w) !== -1; })) return -1;
    if (!words.length) return 0;
    if (title.indexOf(words[0]) === 0) return 3;
    if (title.indexOf(words[0]) !== -1) return 2;
    return 1;
  }

  function render() {
    const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    results = ITEMS.map(function (item, i) { return { item: item, s: score(item, words), i: i }; })
      .filter(function (r) { return r.s >= 0; })
      .sort(function (a, b) { return words.length ? b.s - a.s || a.i - b.i : a.i - b.i; })
      .map(function (r) { return r.item; });
    active = 0;
    list.replaceChildren();
    if (!results.length) {
      list.appendChild(el('li', 'palette-empty', 'Nothing matches "' + input.value + '".'));
      input.removeAttribute('aria-activedescendant');
      return;
    }
    let lastGroup = '';
    results.forEach(function (item, i) {
      if (!words.length && item.group !== lastGroup) {
        const head = el('li', 'palette-group', item.group);
        head.setAttribute('role', 'presentation');
        list.appendChild(head);
        lastGroup = item.group;
      }
      const li = el('li', 'palette-item');
      li.id = 'palette-opt-' + i;
      li.setAttribute('role', 'option');
      li.dataset.index = String(i);
      li.appendChild(el('span', 'palette-title', item.title));
      li.appendChild(el('span', 'palette-kind', item.external ? item.group + ' ↗' : item.group));
      list.appendChild(li);
    });
    highlight(0);
  }

  function highlight(index) {
    if (!results.length) return;
    active = (index + results.length) % results.length;
    list.querySelectorAll('.palette-item').forEach(function (li) {
      const on = Number(li.dataset.index) === active;
      li.classList.toggle('is-active', on);
      li.setAttribute('aria-selected', String(on));
      if (on) {
        input.setAttribute('aria-activedescendant', li.id);
        li.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function go(item) {
    if (!item) return;
    if (item.run) {
      if (!item.stay) close();
      item.run();
      return;
    }
    close();
    if (item.external) window.open(item.url, '_blank', 'noopener');
    else location.href = item.url;
  }

  function open() {
    if (dialog.open) return;
    input.value = '';
    foot.textContent = '↑ ↓ to move · Enter to open · Esc to close';
    render();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    input.focus();
  }

  function close() {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  input.addEventListener('input', render);
  input.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowDown') { event.preventDefault(); highlight(active + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); highlight(active - 1); }
    else if (event.key === 'Enter') { event.preventDefault(); go(results[active]); }
  });
  list.addEventListener('mousemove', function (event) {
    const li = event.target.closest('.palette-item');
    if (li && Number(li.dataset.index) !== active) highlight(Number(li.dataset.index));
  });
  list.addEventListener('click', function (event) {
    const li = event.target.closest('.palette-item');
    if (li) go(results[Number(li.dataset.index)]);
  });
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) close();
  });

  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-palette-open]')) open();
  });
  document.addEventListener('keydown', function (event) {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName) || (document.activeElement && document.activeElement.isContentEditable);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.open) close(); else open();
    } else if (event.key === '/' && !typing && !dialog.open && !document.querySelector('dialog[open]')) {
      event.preventDefault();
      open();
    }
  });

  // Show the right shortcut on Macs.
  if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
    document.querySelectorAll('.palette-kbd').forEach(function (k) { k.textContent = '⌘ K'; });
  }
})();
