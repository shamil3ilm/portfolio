(function () {
  /* Challenges: small goals, each one something my real systems handle. Progress stays in this browser. */

  const STORAGE_KEY = 'portfolio-challenges-v1';
  const CHALLENGES = [
    { id: 'lock-edit', group: 'Home page', text: 'Edit the bank details of a payment waiting for approval', href: 'index.html#demo-lock' },
    { id: 'lock-held', group: 'Home page', text: 'Try to redirect an approved payment', href: 'index.html#demo-lock' },
    { id: 'chain-break', group: 'Home page', text: 'Secretly change a past invoice', href: 'index.html#demo-chain' },
    { id: 'chain-add', group: 'Home page', text: 'Add a new record to the invoice chain', href: 'index.html#demo-chain' },
    { id: 'access-roles', group: 'Home page', text: 'See the app as all 5 roles', href: 'index.html#demo-access' },
    { id: 'patrol-score', group: 'Playground', text: 'Finish a Risk Review Desk shift with 8+ correct calls', href: 'playground.html#play' },
    { id: 'provider-connect', group: 'Playground', text: 'Connect a provider with a one-time key', href: 'playground.html#delegated-access' },
    { id: 'provider-denied', group: 'Playground', text: 'Get refused without learning why', href: 'playground.html#delegated-access' },
    { id: 'provider-approve', group: 'Playground', text: 'Try to approve a payment as the provider', href: 'playground.html#delegated-access' },
    { id: 'provider-second', group: 'Playground', text: 'Connect a second provider to the same customer', href: 'playground.html#delegated-access' },
    { id: 'rec-delete', group: 'Playground', text: 'Delete a recipient or bank account with live payments', href: 'playground.html#recurring' },
    { id: 'rec-bug', group: 'Playground', text: 'Bring back the old bulk-cancel bug', href: 'playground.html#recurring' },
    { id: 'ai-fail', group: 'Playground', text: 'Log a failed AI call', href: 'playground.html#ai-usage' },
    { id: 'qr-use', group: 'Playground', text: 'Download or read an e-invoice QR code', href: 'playground.html#qr' },
    { id: 'hook-reject', group: 'Playground', text: 'Get a forged update rejected', href: 'playground.html#webhook' },
    { id: 'sched-skip', group: 'Playground', text: 'Find a time that would skip a run', href: 'playground.html#schedule' },
    { id: 'crypto-unlock', group: 'Playground', text: 'Lock a secret with a password, then unlock it', href: 'playground.html#crypto' },
  ];
  const KNOWN = new Set(CHALLENGES.map(function (c) { return c.id; }));

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return new Set(Array.isArray(saved) ? saved.filter(function (id) { return KNOWN.has(id); }) : []);
    } catch (e) {
      return new Set();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(done)));
    } catch (e) {}
  }

  const done = load();

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* UI: floating counter, panel, toast */

  const fab = el('button', 'ach-fab');
  fab.type = 'button';
  fab.setAttribute('aria-haspopup', 'dialog');
  fab.setAttribute('aria-expanded', 'false');

  const panel = el('div', 'ach-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Challenges');
  panel.hidden = true;

  const toast = el('div', 'ach-toast');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  document.body.appendChild(fab);
  document.body.appendChild(panel);
  document.body.appendChild(toast);

  function renderFab() {
    fab.textContent = '🏆 ' + done.size + ' / ' + CHALLENGES.length;
    fab.setAttribute('aria-label', done.size + ' / ' + CHALLENGES.length + ' challenges done. Open the list.');
    fab.dataset.complete = String(done.size === CHALLENGES.length);
  }

  function renderPanel() {
    panel.replaceChildren();
    const head = el('div', 'ach-head');
    head.appendChild(el('h2', '', 'Challenges'));
    const close = el('button', 'ach-close', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close challenges');
    close.addEventListener('click', togglePanel);
    head.appendChild(close);
    panel.appendChild(head);

    if (done.size === CHALLENGES.length) {
      const win = el('p', 'ach-win');
      win.appendChild(document.createTextNode('🎉 All done! You have tried every safeguard. '));
      const link = el('a', '', 'Let\'s talk →');
      link.href = 'index.html#contact';
      win.appendChild(link);
      panel.appendChild(win);
    } else {
      panel.appendChild(el('p', 'ach-intro', 'Try to get past the safeguards I have built. Each challenge is something my real systems handle.'));
    }

    const bar = el('div', 'ach-bar');
    const fill = el('span', 'ach-bar-fill');
    fill.style.width = Math.round((done.size / CHALLENGES.length) * 100) + '%';
    bar.appendChild(fill);
    panel.appendChild(bar);

    ['Home page', 'Playground'].forEach(function (group) {
      panel.appendChild(el('p', 'ach-group', group));
      const list = el('ul', 'ach-list');
      CHALLENGES.filter(function (c) { return c.group === group; }).forEach(function (c) {
        const item = el('li');
        item.dataset.done = String(done.has(c.id));
        item.appendChild(el('span', 'ach-mark', done.has(c.id) ? '✓' : '○'));
        const link = el('a', '', c.text);
        link.href = c.href;
        link.addEventListener('click', function () { togglePanel(false); });
        item.appendChild(link);
        list.appendChild(item);
      });
      panel.appendChild(list);
    });

    const reset = el('button', 'ach-reset', 'Start over');
    reset.type = 'button';
    reset.addEventListener('click', function () {
      done.clear();
      save();
      renderFab();
      renderPanel();
    });
    panel.appendChild(reset);
  }

  function togglePanel(force) {
    const open = typeof force === 'boolean' ? force : panel.hidden;
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', String(open));
    if (open) renderPanel();
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CONFETTI_COLORS = ['#2a5fd9', '#4c8dff', '#0f766e', '#f59e0b', '#e11d48', '#8b5cf6'];

  function celebrate() {
    fab.classList.remove('pop');
    void fab.offsetWidth;
    fab.classList.add('pop');
    if (reduceMotion) return;
    const rect = fab.getBoundingClientRect();
    for (let i = 0; i < 18; i++) {
      const bit = el('span', 'confetti');
      const angle = (-150 + Math.random() * 120) * (Math.PI / 180);
      const distance = 60 + Math.random() * 90;
      bit.style.left = rect.left + rect.width / 2 + 'px';
      bit.style.top = rect.top + 'px';
      bit.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      bit.style.setProperty('--dx', Math.cos(angle) * distance + 'px');
      bit.style.setProperty('--dy', Math.sin(angle) * distance + 'px');
      bit.style.setProperty('--spin', Math.round(Math.random() * 540 - 270) + 'deg');
      document.body.appendChild(bit);
      setTimeout(function () { bit.remove(); }, 1000);
    }
  }

  let toastTimer;
  function showToast(text) {
    toast.textContent = text;
    toast.dataset.show = 'true';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.dataset.show = 'false'; }, 2800);
  }

  fab.addEventListener('click', function () { togglePanel(); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !panel.hidden) togglePanel(false);
  });

  window.achieve = function (id) {
    if (!KNOWN.has(id) || done.has(id)) return;
    done.add(id);
    save();
    renderFab();
    if (!panel.hidden) renderPanel();
    celebrate();
    const challenge = CHALLENGES.find(function (c) { return c.id === id; });
    showToast(done.size === CHALLENGES.length
      ? '🎉 All ' + CHALLENGES.length + ' challenges done!'
      : '🏆 Challenge done: ' + challenge.text + ' (' + done.size + '/' + CHALLENGES.length + ')');
  };

  renderFab();
})();
