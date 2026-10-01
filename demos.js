(function () {
  // Short SHA-256 fingerprint via Web Crypto; falls back to FNV-1a where Web Crypto is unavailable.
  async function fingerprint(text) {
    if (window.crypto && window.crypto.subtle) {
      const bytes = new TextEncoder().encode(text);
      const digest = await window.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest))
        .map(function (b) { return b.toString(16).padStart(2, '0'); })
        .join('');
    }
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0').repeat(8);
  }

  function short(hash) {
    return hash.slice(0, 4) + '…' + hash.slice(-4);
  }

  function achieve(id) {
    if (typeof window.achieve === 'function') window.achieve(id);
  }

  function setResult(el, text, tone) {
    el.textContent = text;
    el.dataset.tone = tone || '';
  }

  /* Tabs */

  const tabs = Array.from(document.querySelectorAll('.demo-tabs [role="tab"]'));

  function selectTab(tab) {
    tabs.forEach(function (t) {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
    });
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(index + step + tabs.length) % tabs.length];
      selectTab(next);
      next.focus();
    });
  });

  const HASH_TABS = { '#demo-lock': 'tab-lock', '#demo-chain': 'tab-chain', '#demo-access': 'tab-access' };

  function openTabFromHash() {
    const tabId = HASH_TABS[location.hash];
    if (!tabId) return;
    selectTab(document.getElementById(tabId));
    document.querySelector('.demo').scrollIntoView({ block: 'center' });
  }

  window.addEventListener('hashchange', openTabFromHash);
  openTabFromHash();

  /* Demo 1: approval lock. The bank details are fingerprinted when the payment is submitted:
     normal edits are blocked while it waits, and any other change is caught when it is sent. */

  const EDIT_BLOCKED = "There is a payment currently being processed for this recipient's account. You can't modify these details at this time";
  const lockRoot = document.getElementById('panel-lock');
  const lockEl = {
    fields: {
      recipient: lockRoot.querySelector('[data-lock-field="recipient"]'),
      amount: lockRoot.querySelector('[data-lock-field="amount"]'),
      routing: lockRoot.querySelector('[data-lock-field="routing"]'),
      account: lockRoot.querySelector('[data-lock-field="account"]'),
    },
    types: Array.from(lockRoot.querySelectorAll('[data-lock-field="type"]')),
    fp: lockRoot.querySelector('[data-lock="fp"]'),
    now: lockRoot.querySelector('[data-lock="now"]'),
    status: lockRoot.querySelector('[data-lock="status"]'),
    steps: lockRoot.querySelector('[data-lock="steps"]'),
    lastStep: lockRoot.querySelector('[data-lock="last-step"]'),
    result: lockRoot.querySelector('[data-lock="result"]'),
    next: lockRoot.querySelector('[data-lock-action="next"]'),
    swapButton: lockRoot.querySelector('[data-lock-action="swap"]'),
    swapForm: lockRoot.querySelector('[data-lock="swap-form"]'),
    swapRouting: lockRoot.querySelector('[data-swap="routing"]'),
    swapAccount: lockRoot.querySelector('[data-swap="account"]'),
  };
  // stage: draft → submitted → approved → sent; held is set when a send is refused.
  const lock = { stage: 'draft', locked: null, held: false };

  function validRouting(value) {
    if (!/^\d{9}$/.test(value)) return false;
    const w = [3, 7, 1, 3, 7, 1, 3, 7, 1];
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(value[i]) * w[i];
    return sum % 10 === 0;
  }

  function currentType() {
    const checked = lockEl.types.find(function (r) { return r.checked; });
    return checked ? checked.value : 'checking';
  }

  function bankDetails() {
    return lockEl.fields.routing.value + '|' + lockEl.fields.account.value + '|' + currentType();
  }

  // What the check covers: the 3 fields that decide where the money lands.
  function detailsProblem() {
    if (!lockEl.fields.recipient.value.trim()) return ['recipient', 'Enter who the payment is for.'];
    if (!Number(onlyDigits(lockEl.fields.amount.value))) return ['amount', 'Enter an amount above $0.'];
    if (!validRouting(lockEl.fields.routing.value)) return ['routing', "That routing number isn't valid (9 digits with a matching check digit)."];
    if (!/^\d{4,17}$/.test(lockEl.fields.account.value)) return ['account', 'Account numbers are 4 to 17 digits.'];
    return null;
  }

  function setLocked(locked) {
    Object.keys(lockEl.fields).forEach(function (k) { lockEl.fields[k].readOnly = locked; });
    lockEl.types.forEach(function (r) { r.disabled = locked; });
    lockRoot.querySelector('[data-lock="form"]').classList.toggle('is-locked', locked);
  }

  async function renderLock() {
    const now = await fingerprint(bankDetails());
    lockEl.now.textContent = short(now);
    lockEl.now.dataset.match = lock.locked ? String(now === lock.locked) : '';
    lockEl.fp.textContent = lock.locked ? short(lock.locked) : 'not yet';
    lockEl.status.textContent = {
      draft: 'Draft',
      submitted: 'Waiting for approval',
      approved: lock.held ? 'Held: bank details changed' : 'Approved, not sent yet',
      sent: 'Sent',
    }[lock.stage];
    lockEl.steps.dataset.stage = lock.stage;
    lockEl.steps.dataset.held = String(lock.held);
    lockEl.lastStep.textContent = lock.held ? 'Held' : 'Sent';
    lockEl.next.textContent = { draft: 'Submit for approval', submitted: 'Approve', approved: 'Send', sent: 'Sent' }[lock.stage];
    lockEl.next.disabled = lock.stage === 'sent';
    lockEl.swapButton.disabled = lock.stage === 'draft' || lock.stage === 'sent';
    if (lockEl.swapButton.disabled) closeSwap();
  }

  function closeSwap() {
    lockEl.swapForm.hidden = true;
    lockEl.swapButton.setAttribute('aria-expanded', 'false');
  }

  function blockedEdit() {
    setResult(lockEl.result, '✕ ' + EDIT_BLOCKED + '.', 'bad');
    achieve('lock-edit');
  }

  const lockActions = {
    next: async function () {
      if (lock.stage === 'draft') {
        const problem = detailsProblem();
        if (problem) {
          setResult(lockEl.result, problem[1], 'warn');
          lockEl.fields[problem[0]].focus();
          return;
        }
        lock.locked = await fingerprint(bankDetails());
        lock.stage = 'submitted';
        setLocked(true);
        setResult(lockEl.result, 'Submitted. The bank details are now locked in: ' + short(lock.locked) + '. Try editing them, or approve.', 'ok');
      } else if (lock.stage === 'submitted') {
        lock.stage = 'approved';
        setResult(lockEl.result, 'Approved. Now try changing where it goes before you send it.', 'ok');
      } else if (lock.stage === 'approved') {
        const now = await fingerprint(bankDetails());
        if (now === lock.locked) {
          lock.stage = 'sent';
          lock.held = false;
          setResult(lockEl.result, '✓ Sent. The bank details match what was locked in when it was submitted.', 'ok');
        } else {
          lock.held = true;
          setResult(lockEl.result, '✕ Held. The bank details (' + short(now) + ') no longer match what was locked in (' + short(lock.locked) + '), so the money is not sent.', 'bad');
          achieve('lock-held');
        }
      }
      renderLock();
    },
    edit: function () {
      if (lock.stage === 'draft') {
        lockEl.fields.account.focus();
        setResult(lockEl.result, 'It is still a draft, so you can edit anything. Submit it when ready.', '');
      } else if (lock.stage === 'sent') {
        setLocked(false);
        setResult(lockEl.result, 'The payment has already been sent, so the details can be edited again. The sent payment is not affected.', '');
      } else {
        blockedEdit();
      }
    },
    swap: function () {
      const open = lockEl.swapForm.hidden;
      lockEl.swapForm.hidden = !open;
      lockEl.swapButton.setAttribute('aria-expanded', String(open));
      if (open) {
        lockEl.swapRouting.value = Sample.routing();
        lockEl.swapAccount.value = Sample.account();
        lockEl.swapAccount.focus();
      }
    },
    apply: async function () {
      if (!validRouting(lockEl.swapRouting.value)) {
        setResult(lockEl.result, "That routing number isn't valid (9 digits with a matching check digit).", 'warn');
        return;
      }
      if (!/^\d{4,17}$/.test(lockEl.swapAccount.value)) {
        setResult(lockEl.result, 'Account numbers are 4 to 17 digits.', 'warn');
        return;
      }
      lockEl.fields.routing.value = lockEl.swapRouting.value;
      lockEl.fields.account.value = lockEl.swapAccount.value;
      closeSwap();
      await renderLock();
      const same = lockEl.now.dataset.match === 'true';
      setResult(lockEl.result, same
        ? 'Changed another way, but to the same details that were locked in, so nothing really changed.'
        : 'The bank details were changed another way, to account ending ' + lockEl.fields.account.value.slice(-4) + '. ' + (lock.stage === 'approved' ? 'Now try sending.' : 'Approve it, then try sending.'), same ? '' : 'warn');
    },
    reset: function () {
      lock.stage = 'draft';
      lock.locked = null;
      lock.held = false;
      setLocked(false);
      closeSwap();
      lockEl.fields.recipient.value = Sample.business();
      lockEl.fields.amount.value = formatAmount(String(Sample.amount(300, 9500)));
      lockEl.fields.routing.value = Sample.routing();
      lockEl.fields.account.value = Sample.account();
      lockEl.types[Sample.int(0, 1)].checked = true;
      setResult(lockEl.result, 'A draft payment. Edit anything you like, then submit it for approval.', '');
      renderLock();
    },
  };

  lockRoot.querySelectorAll('[data-lock-action]').forEach(function (button) {
    button.addEventListener('click', function () { lockActions[button.dataset.lockAction](); });
  });

  // Typing into a locked field is the "normal edit" path, so it is refused the same way.
  Object.keys(lockEl.fields).forEach(function (key) {
    const input = lockEl.fields[key];
    input.addEventListener('keydown', function (event) {
      if (input.readOnly && event.key.length === 1 && !event.ctrlKey && !event.metaKey) blockedEdit();
    });
    input.addEventListener('input', function () {
      if (key === 'amount') formatMoneyInput(input);
      if (key === 'routing' || key === 'account') input.value = onlyDigits(input.value);
      renderLock();
    });
  });
  lockEl.types.forEach(function (r) { r.addEventListener('change', renderLock); });
  lockRoot.querySelector('[data-lock="form"]').addEventListener('click', function (event) {
    if (lock.stage !== 'draft' && lock.stage !== 'sent' && event.target.closest('.lock-type')) blockedEdit();
  });
  [lockEl.swapRouting, lockEl.swapAccount].forEach(function (input) {
    input.addEventListener('input', function () { input.value = onlyDigits(input.value); });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') lockActions.apply();
    });
  });
  lockActions.reset();

  /* Demo 2: tamper-evident chain (live) */

  function makeRecords() {
    const first = Sample.invoiceNumber();
    const names = Sample.business(3);
    return [
      { text: 'Invoice #' + first + ' issued to ' + names[0], amount: Sample.amount(400, 4800) },
      { text: 'Invoice #' + (first + 1) + ' issued to ' + names[1], amount: Sample.amount(200, 2500) },
      { text: 'Invoice #' + first + ' paid in full', amount: null },
      { text: 'Invoice #' + (first + 2) + ' issued to ' + names[2], amount: Sample.amount(300, 3600) },
    ];
  }
  let nextInvoice = 0;

  const MAX_DIGITS = 9;
  const chainList = document.querySelector('[data-chain="list"]');
  const chainResult = document.querySelector('[data-chain="result"]');
  const INTRO = "Each record's seal depends on the one before it. Change any line or amount.";
  let sealed = [];
  let touched = false;
  let runId = 0;

  function onlyDigits(value) {
    return value.replace(/\D/g, '');
  }

  function formatAmount(digits) {
    return digits ? Number(digits).toLocaleString('en-US') : '';
  }

  // Reformat with thousands separators while keeping the caret after the same digit.
  function formatMoneyInput(input) {
    const caret = input.selectionStart === null ? input.value.length : input.selectionStart;
    const digitsBeforeCaret = onlyDigits(input.value.slice(0, caret)).length;
    const digits = onlyDigits(input.value).replace(/^0+(?=\d)/, '').slice(0, MAX_DIGITS);
    input.value = formatAmount(digits);

    let seen = 0;
    let position = 0;
    while (position < input.value.length && seen < digitsBeforeCaret) {
      if (/\d/.test(input.value[position])) seen++;
      position++;
    }
    input.setSelectionRange(position, position);
  }

  function recordValue(item) {
    const text = item.querySelector('.rec-text').value.trim();
    const amount = item.querySelector('.rec-amount');
    return amount ? text + '|' + (onlyDigits(amount.value) || '0') : text;
  }

  async function sealAll(values) {
    const seals = [];
    let previous = 'genesis';
    for (let i = 0; i < values.length; i++) {
      previous = await fingerprint(previous + '|' + values[i]);
      seals.push(previous);
    }
    return seals;
  }

  async function refreshChain() {
    const id = ++runId;
    const items = Array.from(chainList.children);
    const now = await sealAll(items.map(recordValue));
    if (id !== runId) return;

    let firstBroken = -1;
    items.forEach(function (item, i) {
      const broken = now[i] !== sealed[i];
      if (broken && firstBroken === -1) firstBroken = i;
      item.querySelector('.seal').textContent = short(now[i]);
      item.dataset.state = !touched ? '' : broken ? (i === firstBroken ? 'edited' : 'broken') : 'ok';
    });

    if (!touched) {
      setResult(chainResult, INTRO, '');
    } else if (firstBroken === -1) {
      setResult(chainResult, '✓ All ' + items.length + ' records match their original seals.', 'ok');
    } else {
      achieve('chain-break');
      const after = items.length - firstBroken - 1;
      setResult(
        chainResult,
        '✕ Record ' + (firstBroken + 1) + ' was changed, so its seal no longer matches' +
          (after ? ', and the ' + after + ' record' + (after > 1 ? 's' : '') + ' after it break too.' : '.'),
        'bad'
      );
    }
  }

  function createRow(record, index) {
    const item = document.createElement('li');

    const text = document.createElement('input');
    text.type = 'text';
    text.className = 'rec-text';
    text.value = record.text;
    text.setAttribute('aria-label', 'Record ' + (index + 1) + ' description');
    item.appendChild(text);

    const money = document.createElement('span');
    money.className = 'money';
    if (record.amount !== null) {
      const amount = document.createElement('input');
      amount.type = 'text';
      amount.className = 'rec-amount';
      amount.inputMode = 'numeric';
      amount.autocomplete = 'off';
      amount.value = formatAmount(String(record.amount));
      amount.setAttribute('aria-label', 'Record ' + (index + 1) + ' amount in dollars');
      money.appendChild(amount);
    }
    item.appendChild(money);

    const seal = document.createElement('span');
    seal.className = 'seal mono';
    item.appendChild(seal);
    return item;
  }

  async function buildChain() {
    touched = false;
    chainList.innerHTML = '';
    const records = makeRecords();
    nextInvoice = Number(records[3].text.match(/#(\d+)/)[1]) + 1;
    records.forEach(function (record, i) { chainList.appendChild(createRow(record, i)); });
    sealed = await sealAll(Array.from(chainList.children).map(recordValue));
    refreshChain();
  }

  chainList.addEventListener('input', function (event) {
    if (event.target.classList.contains('rec-amount')) formatMoneyInput(event.target);
    touched = true;
    refreshChain();
  });

  async function addRecord() {
    const record = { text: 'Invoice #' + nextInvoice + ' issued to ' + Sample.business(), amount: Sample.amount(150, 5000) };
    nextInvoice++;
    const row = createRow(record, chainList.children.length);
    chainList.appendChild(row);
    const previous = sealed.length ? sealed[sealed.length - 1] : 'genesis';
    sealed.push(await fingerprint(previous + '|' + recordValue(row)));
    await refreshChain();
    achieve('chain-add');
    if (chainResult.dataset.tone !== 'bad') {
      setResult(chainResult, '✓ Record ' + chainList.children.length + ' added. Its seal builds on the one before it.', 'ok');
    }
  }

  document.querySelector('[data-chain-action="add"]').addEventListener('click', addRecord);
  document.querySelector('[data-chain-action="reset"]').addEventListener('click', buildChain);
  buildChain();

  /* Demo 3: who sees what */

  const ITEMS = [
    { label: 'Grades and feedback', roles: ['student', 'mentor', 'tutor', 'subadmin', 'admin'],
      why: { student: 'only their own', mentor: "only their mentees' classes", tutor: 'only classes they teach', subadmin: 'all classes' } },
    { label: 'Messages', roles: ['student', 'mentor', 'tutor', 'subadmin', 'admin'],
      why: { student: 'only their own conversations', mentor: 'only their own conversations', tutor: 'only their own conversations', subadmin: 'only their own conversations', admin: 'can review all' } },
    { label: 'Receipts', roles: ['student', 'admin'], why: { student: 'only their own' } },
    { label: 'Payslips', roles: ['tutor', 'admin'], why: { tutor: 'only their own' } },
    { label: 'Billing rates', roles: ['admin'], why: {} },
    { label: 'Audit history of changes', roles: ['admin'], why: {} },
  ];
  const accessList = document.querySelector('[data-access="list"]');
  const roleButtons = Array.from(document.querySelectorAll('[data-role]'));

  function renderAccess(role) {
    roleButtons.forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.role === role)); });
    accessList.innerHTML = '';
    ITEMS.forEach(function (entry) {
      const allowed = entry.roles.indexOf(role) !== -1;
      const li = document.createElement('li');
      li.dataset.allowed = String(allowed);
      const note = allowed && entry.why[role] ? ' <em>(' + entry.why[role] + ')</em>' : '';
      li.innerHTML = '<span class="access-icon" aria-hidden="true">' + (allowed ? '✓' : '🔒') + '</span>' +
        '<span>' + entry.label + note + '</span>' +
        '<span class="sr-only">' + (allowed ? 'allowed' : 'blocked') + '</span>';
      accessList.appendChild(li);
    });
  }

  const rolesSeen = new Set(['student']);
  roleButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      renderAccess(button.dataset.role);
      rolesSeen.add(button.dataset.role);
      if (rolesSeen.size === roleButtons.length) achieve('access-roles');
    });
  });
  renderAccess('student');
})();
