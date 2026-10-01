(function () {
  /* Shared helpers */

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function randomHex(bytes) {
    const values = new Uint8Array(bytes);
    window.crypto.getRandomValues(values);
    return Array.from(values).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function addLog(list, text, tone, limit) {
    const item = el('li', '', text);
    item.dataset.tone = tone || '';
    list.prepend(item);
    while (list.children.length > (limit || 8)) list.lastChild.remove();
  }

  function clock() {
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function achieve(id) {
    if (typeof window.achieve === 'function') window.achieve(id);
  }

  /* Delegated account access */

  (function providerDemo() {
    const root = document.getElementById('delegated-access');
    if (!root) return;
    const S = window.Sample;
    const q = function (name) { return root.querySelector('[data-provider="' + name + '"]'); };
    const ownerSelect = q('owner');
    const keyList = q('keys');
    const whoSelect = q('who');
    const keyInput = q('key-input');
    const callerSelect = q('caller');
    const asSelect = q('as');
    const callSelect = q('call');
    const amountField = q('amount-field');
    const amountInput = q('amount');
    const suspend = q('suspend');
    const providerSuspend = q('provider-suspend');
    const subscribed = q('subscribed');
    const response = q('response');
    const log = q('log');
    const tryText = q('try');
    const label = function (name) { return root.querySelector('[data-provider-label="' + name + '"]'); };

    let providers;
    let customers;
    let keys;            // [{ value, owner, used }]
    let links;           // Map customer -> { provider, suspended }
    let suspendedProviders;
    let unsubscribed;
    let payments;        // Map customer -> [{ id, amount, status }]
    let paymentSeq;

    function poss(name) { return /s$/i.test(name) ? name + "'" : name + "'s"; }

    function audit(text, tone) {
      addLog(log, clock() + '  ' + text, tone, 10);
    }

    function show(text, tone) {
      response.textContent = text;
      response.dataset.tone = tone || '';
    }

    // Every refused customer call gets the same answer; only the log says why.
    function deny(customerName, reason) {
      show('✕ Access denied (403)\n\nThe same answer for every refusal,\nso it reveals nothing.', 'bad');
      audit('Refused · ' + customerName + ' · ' + reason, 'bad');
      achieve('provider-denied');
    }

    function options(select, list) {
      select.replaceChildren();
      list.forEach(function (item) {
        const o = document.createElement('option');
        o.value = item.value;
        o.textContent = item.label;
        select.appendChild(o);
      });
    }

    function renderKeys() {
      keyList.replaceChildren();
      if (!keys.length) {
        keyList.appendChild(el('li', 'pg-keys-empty', 'No connect keys yet'));
        return;
      }
      keys.slice(-4).reverse().forEach(function (k) {
        const li = el('li');
        li.dataset.used = String(k.used);
        li.appendChild(el('span', 'mono', k.value));
        li.appendChild(el('span', '', (providers.indexOf(k.owner) !== -1 ? poss(k.owner) + ' own account' : k.owner) + ' · ' + (k.used ? 'used' : 'single use · valid for 1 year')));
        keyList.appendChild(li);
      });
    }

    // The switches always describe whoever is selected in step 3.
    function renderSwitches() {
      const caller = callerSelect.value;
      const customer = asSelect.value;
      const link = links.get(customer);
      providerSuspend.checked = suspendedProviders.has(caller);
      label('provider-suspend').textContent = caller + ' is suspended';
      subscribed.checked = !unsubscribed.has(caller);
      label('subscribed').textContent = caller + ' gets payment updates';
      suspend.disabled = !link;
      suspend.checked = Boolean(link && link.suspended);
      label('suspend').textContent = poss(customer) + ' connection is suspended' + (link ? '' : ' (not connected yet)');
      amountField.hidden = callSelect.value !== 'create';
    }

    function reset() {
      providers = S.provider(2);
      customers = S.business(2);
      keys = [];
      links = new Map();
      suspendedProviders = new Set();
      unsubscribed = new Set();
      payments = new Map();
      paymentSeq = 0;
      const owners = customers.map(function (c) { return { value: c, label: c }; })
        .concat(providers.map(function (p) { return { value: p, label: poss(p) + ' own account' }; }));
      options(ownerSelect, owners);
      const provs = providers.map(function (p) { return { value: p, label: p }; });
      options(whoSelect, provs);
      options(callerSelect, provs);
      options(asSelect, customers.map(function (c) { return { value: c, label: c }; }));
      keyInput.value = '';
      amountInput.value = S.amount(200, 5000).toLocaleString('en-US');
      tryText.innerHTML = '<strong>Try this:</strong> create a key for ' + customers[0] + ', connect ' + providers[0] +
        ' with it, then create a payment and try to approve it. Then try connecting ' + providers[1] + ' to the same customer, or reuse a key.';
      log.replaceChildren();
      show('—', '');
      audit('Start: a customer creates a connect key, then a provider connects with it.', 'info');
      renderKeys();
      renderSwitches();
    }

    function mint() {
      const owner = ownerSelect.value;
      const existing = keys.find(function (k) { return k.owner === owner && !k.used; });
      if (existing) {
        keyInput.value = existing.value;
        show(owner + ' already has an unused key,\nso the same key is shown again.', '');
        return;
      }
      const key = { value: 'ck_' + randomHex(6), owner: owner, used: false };
      keys.push(key);
      keyInput.value = key.value;
      renderKeys();
      show(owner + ' shares the key with\ntheir provider privately.', '');
    }

    // Mirrors the real rules: a refused connect is rolled back, so the key is not used up.
    function connect() {
      const provider = whoSelect.value;
      const key = keys.find(function (k) { return k.value === keyInput.value.trim() && !k.used; });
      if (!key) {
        show('✕ Not connected (422)\n\nConnection key is invalid, expired,\nor already used.', 'bad');
        return;
      }
      if (key.owner === provider) {
        show('✕ Not connected (422)\n\nA provider cannot connect\nto its own account.', 'bad');
        return;
      }
      const link = links.get(key.owner);
      if (link && !link.suspended) {
        if (link.provider === provider) {
          show('✕ Not connected (422)\n\nThis customer is already connected\nto this provider.', 'bad');
        } else {
          show('✕ Not connected (422)\n\nThis customer is already connected\nto another provider.', 'bad');
          achieve('provider-second');
        }
        return;
      }
      key.used = true;
      links.set(key.owner, { provider: provider, suspended: false });
      renderKeys();
      renderSwitches();
      const switched = link && link.provider !== provider;
      show('✓ Connected\n\n' + provider + ' can now work on\n' + poss(key.owner) + ' account.', 'ok');
      audit((link ? (switched ? 'Reconnected · ' + provider + ' replaces ' + link.provider + ' for ' : 'Reconnected · ' + provider + ' manages ') : 'Connected · ' + provider + ' now manages ') + key.owner, 'ok');
      achieve('provider-connect');
    }

    function send() {
      const caller = callerSelect.value;
      const customer = asSelect.value;
      const call = callSelect.value;
      const link = links.get(customer);

      if (suspendedProviders.has(caller)) {
        deny(customer, caller + ' is suspended');
        return;
      }
      if (!link || link.provider !== caller) {
        deny(customer, 'not ' + poss(caller) + ' customer');
        return;
      }
      if (link.suspended) {
        deny(customer, 'connection suspended');
        return;
      }

      const who = 'Acting as: ' + customer + '\nProvider:  ' + caller;
      const list = payments.get(customer) || [];
      payments.set(customer, list);

      if (call === 'list') {
        const lines = list.length
          ? list.map(function (p) { return '  ' + p.id + '  $' + p.amount.toLocaleString('en-US') + '  ' + p.status; }).join('\n')
          : '  (no payments yet)';
        show('✓ Allowed (200)\n' + who + '\n\nPayments:\n' + lines, 'ok');
        audit('Allowed · ' + caller + ' viewed ' + poss(customer) + ' payments', 'ok');
      } else if (call === 'create') {
        const amount = Number(amountInput.value.replace(/\D/g, ''));
        if (!amount) {
          show('Enter an amount above $0 first.', 'warn');
          amountInput.focus();
          return;
        }
        paymentSeq++;
        const payment = { id: 'pay_' + paymentSeq, amount: amount, status: 'waiting for approval' };
        list.push(payment);
        show('✓ Created (201)\n' + who + '\n\n' + payment.id + '  $' + amount.toLocaleString('en-US') + '  waiting for\n' + poss(customer) + ' approvers', 'ok');
        audit('Allowed · ' + caller + ' created ' + payment.id + ' ($' + amount.toLocaleString('en-US') + ') for ' + customer, 'ok');
        if (unsubscribed.has(caller)) {
          audit('Update · "payment created" sent to ' + customer + ' only (' + caller + ' is not subscribed)', 'info');
          achieve('provider-unsubscribed');
        } else {
          audit('Update · "payment created" sent to ' + customer + ' and copied to ' + caller, 'info');
        }
        amountInput.value = S.amount(200, 5000).toLocaleString('en-US');
      } else {
        const pending = list.filter(function (p) { return p.status === 'waiting for approval'; }).pop();
        if (!pending) {
          show('Nothing to approve yet.\nCreate a payment first.', 'warn');
          return;
        }
        show('✕ Refused (422)\n' + who + '\n\nPayments under an approval policy cannot\nbe approved from this action.', 'bad');
        audit('Logged · ' + caller + ' tried to approve ' + pending.id + ' → refused, it waits for ' + poss(customer) + ' approvers', 'warn');
        achieve('provider-approve');
      }
    }

    root.querySelector('[data-provider-action="mint"]').addEventListener('click', mint);
    root.querySelector('[data-provider-action="connect"]').addEventListener('click', connect);
    root.querySelector('[data-provider-action="send"]').addEventListener('click', send);
    root.querySelector('[data-provider-action="reset"]').addEventListener('click', reset);
    keyInput.addEventListener('keydown', function (event) { if (event.key === 'Enter') connect(); });
    [callerSelect, asSelect, callSelect].forEach(function (s) { s.addEventListener('change', renderSwitches); });
    amountInput.addEventListener('input', function () {
      const digits = amountInput.value.replace(/\D/g, '').slice(0, 7);
      amountInput.value = digits ? Number(digits).toLocaleString('en-US') : '';
    });
    suspend.addEventListener('change', function () {
      const link = links.get(asSelect.value);
      if (!link) return;
      link.suspended = suspend.checked;
      audit((suspend.checked ? 'Admin suspended ' : 'Admin reactivated ') + poss(asSelect.value) + ' connection', 'warn');
    });
    providerSuspend.addEventListener('change', function () {
      const caller = callerSelect.value;
      if (providerSuspend.checked) suspendedProviders.add(caller); else suspendedProviders.delete(caller);
      audit((providerSuspend.checked ? 'Admin suspended ' : 'Admin reactivated ') + caller, 'warn');
    });
    subscribed.addEventListener('change', function () {
      const caller = callerSelect.value;
      if (subscribed.checked) unsubscribed.delete(caller); else unsubscribed.add(caller);
      audit(caller + (subscribed.checked ? ' subscribed to' : ' unsubscribed from') + ' payment updates', 'info');
    });

    reset();
  })();

  /* Recurring payment safeguards */

  (function recurringDemo() {
    const root = document.getElementById('recurring');
    if (!root) return;
    const S = window.Sample;
    const rows = root.querySelector('[data-rec="rows"]');
    const payeesBox = root.querySelector('[data-rec="payees"]');
    const accountsBox = root.querySelector('[data-rec="accounts"]');
    const confirmBox = root.querySelector('[data-rec="confirm"]');
    const bug = root.querySelector('[data-rec="bug"]');
    const log = root.querySelector('[data-rec="log"]');
    const tryText = root.querySelector('[data-rec="try"]');
    const add = {
      name: root.querySelector('[data-rec-add="name"]'),
      type: root.querySelector('[data-rec-add="type"]'),
      payee: root.querySelector('[data-rec-add="payee"]'),
      payeeField: root.querySelector('[data-rec-add="payee-field"]'),
      account: root.querySelector('[data-rec-add="account"]'),
      list: root.querySelector('#rec-payee-list'),
    };

    const UPCOMING = 3;
    const MESSAGES = {
      payee: 'This recipient has active recurring or scheduled payments. Proceeding will cancel them. Do you want to continue?',
      account: 'This bank account has active recurring or scheduled payments. Proceeding will cancel them. Do you want to continue?',
    };

    let schedules;
    let payees;
    let accounts;
    let nextId;

    // Fresh names every time, arranged so each safeguard has something to show: one recipient with
    // two schedules (one a mailed check), and one account shared by several, including a get-paid form.
    function makeSchedules() {
      const r = S.business(3);
      const a = ['Operating ••' + S.last4(), 'Payroll ••' + S.last4()];
      const n = S.scheduleName(4);
      return [
        { name: n[0], type: 'ACH', payee: r[0], account: a[0] },
        { name: n[1], type: 'Mailed check', payee: r[0], account: a[1] },
        { name: n[2], type: 'Email check', payee: r[1], account: a[0] },
        { name: n[3], type: 'Direct deposit', payee: r[2], account: a[1] },
        { name: 'Client retainer', type: 'Get-paid form', payee: null, account: a[0] },
      ];
    }

    function chips(box, items, onDelete, label) {
      box.replaceChildren();
      if (!items.length) box.appendChild(el('span', 'rec-none', 'None left'));
      items.forEach(function (item) {
        const chip = el('span', 'rec-payee');
        chip.appendChild(el('span', '', item));
        const del = el('button', 'rec-del', 'Delete');
        del.type = 'button';
        del.setAttribute('aria-label', 'Delete ' + label + ' ' + item);
        del.addEventListener('click', function () { onDelete(item); });
        chip.appendChild(del);
        box.appendChild(chip);
      });
    }

    function render() {
      rows.replaceChildren();
      schedules.forEach(function (s) {
        const tr = el('tr');
        tr.dataset.status = s.status;
        if (s.status === 'cancelled' && s.upcoming > 0) tr.dataset.stale = 'true';
        const pick = el('td');
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.value = String(s.id);
        box.disabled = s.status !== 'active';
        box.setAttribute('aria-label', 'Select ' + s.name);
        pick.appendChild(box);
        tr.appendChild(pick);
        const name = el('td');
        name.appendChild(el('span', 'rec-name', s.name));
        name.appendChild(el('span', 'rec-type', s.type + ' · ' + (s.payee || 'incoming') + ' · ' + s.account));
        tr.appendChild(name);
        tr.appendChild(el('td', 'rec-status', s.status === 'active' ? 'Active' : 'Cancelled'));
        tr.appendChild(el('td', 'rec-upcoming mono', String(s.upcoming)));
        rows.appendChild(tr);
      });
      chips(payeesBox, payees, function (p) { askDelete('payee', p); }, 'recipient');
      chips(accountsBox, accounts, function (a) { askDelete('account', a); }, 'bank account');

      add.list.replaceChildren();
      payees.forEach(function (p) { const o = document.createElement('option'); o.value = p; add.list.appendChild(o); });
      const current = add.account.value;
      add.account.replaceChildren();
      accounts.forEach(function (a) { const o = document.createElement('option'); o.value = a; o.textContent = a; add.account.appendChild(o); });
      if (accounts.indexOf(current) !== -1) add.account.value = current;
    }

    function cancel(schedule, note, clearUpcoming) {
      schedule.status = 'cancelled';
      if (clearUpcoming) schedule.upcoming = 0;
      addLog(log, 'Cancelled · ' + schedule.name + ' (' + schedule.type + ') · ' + note, 'ok');
      if (schedule.type === 'Mailed check') {
        addLog(log, 'Released · the check held for "' + schedule.name + '" can be used again', 'info');
      }
    }

    function affectedBy(kind, target) {
      return schedules.filter(function (s) {
        return s.status === 'active' && (kind === 'payee' ? s.payee === target : s.account === target);
      });
    }

    function askDelete(kind, target) {
      const count = affectedBy(kind, target).length;
      confirmBox.replaceChildren();
      confirmBox.hidden = false;
      confirmBox.appendChild(el('p', '', count ? MESSAGES[kind] : 'Delete ' + target + '? No active schedules use it.'));
      const actions = el('div', 'demo-actions');
      const yes = el('button', 'chip-btn chip-strong', 'Yes, delete');
      yes.type = 'button';
      const no = el('button', 'chip-btn', 'Keep it');
      no.type = 'button';
      yes.addEventListener('click', function () {
        const label = kind === 'payee' ? 'recipient' : 'bank account';
        const list = kind === 'payee' ? payees : accounts;
        confirmBox.hidden = true;
        if (list.indexOf(target) === -1) return;
        // Work out what is affected now, not when the question was asked: things may have changed since.
        const affected = affectedBy(kind, target);
        if (kind === 'payee') payees = payees.filter(function (p) { return p !== target; });
        else accounts = accounts.filter(function (a) { return a !== target; });
        affected.forEach(function (s) {
          cancel(s, 'Auto-canceled: associated ' + label + " '" + target + "' was deleted", true);
        });
        addLog(log, 'Deleted · ' + label + ' ' + target, 'warn');
        if (affected.length) achieve('rec-delete');
        render();
      });
      no.addEventListener('click', function () {
        confirmBox.hidden = true;
        addLog(log, 'Kept ' + target + '. Nothing changed.', '');
      });
      actions.appendChild(yes);
      actions.appendChild(no);
      confirmBox.appendChild(actions);
    }

    function cancelSelected() {
      const ids = Array.from(rows.querySelectorAll('input:checked')).map(function (b) { return Number(b.value); });
      if (!ids.length) {
        addLog(log, 'Tick one or more active schedules first.', 'warn');
        return;
      }
      // The old code cleared upcoming payments only for the last schedule in the loop.
      const lastId = ids[ids.length - 1];
      ids.forEach(function (id) {
        const schedule = schedules.find(function (s) { return s.id === id; });
        cancel(schedule, 'cancelled by user', !bug.checked || id === lastId);
      });
      if (bug.checked && ids.length > 1) {
        const stale = ids.slice(0, -1).map(function (id) { return schedules.find(function (s) { return s.id === id; }).name; });
        addLog(log, 'Old bug · ' + stale.join(', ') + (stale.length > 1 ? ' show' : ' shows') + ' cancelled, but ' + (stale.length > 1 ? 'their' : 'its') + ' upcoming payments are still queued', 'bad');
        achieve('rec-bug');
      }
      render();
    }

    function addSchedule() {
      const name = add.name.value.trim();
      const type = add.type.value;
      const incoming = type === 'Get-paid form';
      const payee = incoming ? null : add.payee.value.trim();
      if (!name) { addLog(log, 'Give the schedule a name first.', 'warn'); add.name.focus(); return; }
      if (!incoming && !payee) { addLog(log, 'Choose or type a recipient.', 'warn'); add.payee.focus(); return; }
      if (!accounts.length) { addLog(log, 'There are no bank accounts left. Start a new example.', 'warn'); return; }
      schedules.push({ id: nextId++, name: name, type: type, payee: payee, account: add.account.value, status: 'active', upcoming: UPCOMING });
      if (payee && payees.indexOf(payee) === -1) payees.push(payee);
      addLog(log, 'Added · ' + name + ' (' + type + ') · ' + (payee || 'incoming') + ' · ' + add.account.value, 'ok');
      add.name.value = '';
      add.payee.value = '';
      render();
    }

    function reset() {
      const initial = makeSchedules();
      schedules = initial.map(function (s, i) { return Object.assign({ id: i + 1, status: 'active', upcoming: UPCOMING }, s); });
      nextId = schedules.length + 1;
      payees = Array.from(new Set(initial.filter(function (s) { return s.payee; }).map(function (s) { return s.payee; })));
      accounts = Array.from(new Set(initial.map(function (s) { return s.account; })));
      bug.checked = false;
      confirmBox.hidden = true;
      log.replaceChildren();
      tryText.innerHTML = '<strong>Try this:</strong> delete ' + payees[0] + ' or the ' + accounts[0] +
        ' account. Or tick two schedules and cancel them with the old bug switched on.';
      addLog(log, 'Try: delete ' + payees[0] + ' or the ' + accounts[0] + ' account, or add your own schedule.', 'info');
      render();
    }

    add.type.addEventListener('change', function () {
      add.payeeField.hidden = add.type.value === 'Get-paid form';
    });
    root.querySelector('[data-rec-action="cancel"]').addEventListener('click', cancelSelected);
    root.querySelector('[data-rec-action="add"]').addEventListener('click', addSchedule);
    root.querySelector('[data-rec-action="reset"]').addEventListener('click', reset);
    reset();
  })();

  /* AI usage and cost tracking */

  (function aiUsageDemo() {
    const root = document.getElementById('ai-usage');
    if (!root) return;
    const summary = root.querySelector('[data-ai="summary"]');
    const bars = root.querySelector('[data-ai="bars"]');
    const tiles = root.querySelector('[data-ai="tiles"]');
    const groupLabel = root.querySelector('[data-ai="group-label"]');
    const failNext = root.querySelector('[data-ai="fail"]');
    const log = root.querySelector('[data-ai="log"]');

    // Example rates per 1,000 tokens (illustrative, not real prices).
    const FEATURES = {
      receipt: { label: 'Receipts', model: 'vision-model', input: [1100, 1600], output: [120, 260], rateIn: 0.003, rateOut: 0.015, ms: [1200, 2400] },
      reply: { label: 'Replies', model: 'text-model', input: [300, 700], output: [200, 450], rateIn: 0.001, rateOut: 0.004, ms: [600, 1300] },
      classify: { label: 'Classification', model: 'text-model', input: [200, 400], output: [10, 40], rateIn: 0.001, rateOut: 0.004, ms: [250, 600] },
    };
    // Same limits as the real dashboard: error rate warns at 2% and turns red at 5%;
    // average time is green under 3 s, amber up to 10 s, red above.
    const ERROR_WARN = 2;
    const ERROR_BAD = 5;
    const SLOW_WARN_MS = 3000;
    const SLOW_BAD_MS = 10000;

    let calls;

    function between(range) {
      return Math.round(range[0] + Math.random() * (range[1] - range[0]));
    }

    function usd(value) {
      if (value === 0) return '$0';
      return '$' + value.toFixed(value < 0.01 ? 4 : 3);
    }

    function groupBy() {
      const checked = root.querySelector('[data-ai="group"]:checked');
      return checked ? checked.value : 'feature';
    }

    function tile(label, value, tone) {
      const box = el('div', 'ai-tile');
      box.dataset.tone = tone || '';
      box.appendChild(el('span', 'ai-tile-label', label));
      box.appendChild(el('span', 'ai-tile-value', value));
      return box;
    }

    function render() {
      const key = groupBy();
      groupLabel.textContent = key === 'model' ? 'Model' : 'Feature';

      const groups = new Map();
      calls.forEach(function (c) {
        const name = key === 'model' ? c.model : c.label;
        if (!groups.has(name)) groups.set(name, { calls: 0, tokens: 0, cost: 0, ms: 0, errors: 0 });
        const g = groups.get(name);
        g.calls++;
        g.tokens += c.tokens;
        g.cost += c.cost;
        g.ms += c.ms;
        if (c.failed) g.errors++;
      });

      const total = { calls: calls.length, tokens: 0, cost: 0, ms: 0, errors: 0 };
      calls.forEach(function (c) {
        total.tokens += c.tokens;
        total.cost += c.cost;
        total.ms += c.ms;
        if (c.failed) total.errors++;
      });

      const errorRate = total.calls ? (total.errors / total.calls) * 100 : 0;
      const avgMs = total.calls ? total.ms / total.calls : 0;
      tiles.replaceChildren(
        tile('Calls', String(total.calls)),
        tile('Cost', usd(total.cost)),
        tile('Errors', errorRate.toFixed(0) + '%', !total.calls ? '' : errorRate >= ERROR_BAD ? 'bad' : errorRate >= ERROR_WARN ? 'warn' : 'ok'),
        tile('Avg time', total.calls ? (avgMs / 1000).toFixed(1) + ' s' : '—', !total.calls ? '' : avgMs > SLOW_BAD_MS ? 'bad' : avgMs >= SLOW_WARN_MS ? 'warn' : 'ok')
      );

      summary.replaceChildren();
      if (!groups.size) {
        const empty = el('tr');
        const cell = el('td', 'pg-muted', 'No calls yet. Run a feature above.');
        cell.colSpan = 5;
        empty.appendChild(cell);
        summary.appendChild(empty);
      }
      groups.forEach(function (g, name) {
        const tr = el('tr');
        tr.appendChild(el('td', '', name + (g.errors ? ' · ' + g.errors + ' failed' : '')));
        tr.appendChild(el('td', 'mono', String(g.calls)));
        tr.appendChild(el('td', 'mono', g.tokens.toLocaleString('en-US')));
        tr.appendChild(el('td', 'mono', usd(g.cost)));
        tr.appendChild(el('td', 'mono', (g.ms / g.calls / 1000).toFixed(1) + ' s'));
        summary.appendChild(tr);
      });

      bars.replaceChildren();
      groups.forEach(function (g, name) {
        const share = total.cost ? g.cost / total.cost : 0;
        const row = el('div', 'ai-bar');
        row.appendChild(el('span', 'ai-bar-label', name));
        const track = el('span', 'ai-bar-track');
        const fill = el('span', 'ai-bar-fill');
        fill.style.width = (share * 100).toFixed(1) + '%';
        track.appendChild(fill);
        row.appendChild(track);
        row.appendChild(el('span', 'ai-bar-pct mono', Math.round(share * 100) + '%'));
        bars.appendChild(row);
      });
    }

    function run(featureKey, button) {
      const f = FEATURES[featureKey];
      const shouldFail = failNext.checked;
      failNext.checked = false;
      const ms = between(f.ms);
      button.disabled = true;
      button.dataset.busy = 'true';
      setTimeout(function () {
        button.disabled = false;
        delete button.dataset.busy;
        if (shouldFail) {
          calls.push({ label: f.label, model: f.model, tokens: 0, cost: 0, ms: ms, failed: true });
          addLog(log, f.label + ' · ' + f.model + ' · failed after ' + (ms / 1000).toFixed(1) + ' s · logged with the error, no cost', 'bad');
          achieve('ai-fail');
        } else {
          const tokensIn = between(f.input);
          const tokensOut = between(f.output);
          const cost = (tokensIn / 1000) * f.rateIn + (tokensOut / 1000) * f.rateOut;
          calls.push({ label: f.label, model: f.model, tokens: tokensIn + tokensOut, cost: cost, ms: ms, failed: false });
          addLog(log, f.label + ' · ' + f.model + ' · ' + tokensIn + ' in / ' + tokensOut + ' out · ' + usd(cost) + ' · ' + (ms / 1000).toFixed(1) + ' s', 'ok');
        }
        if (new Set(calls.map(function (c) { return c.label; })).size === Object.keys(FEATURES).length) achieve('ai-all');
        render();
      }, Math.min(ms, 1200));
    }

    function reset() {
      calls = [];
      failNext.checked = false;
      log.replaceChildren();
      render();
    }

    root.querySelectorAll('[data-ai-feature]').forEach(function (button) {
      button.addEventListener('click', function () { run(button.dataset.aiFeature, button); });
    });
    root.querySelectorAll('[data-ai="group"]').forEach(function (radio) {
      radio.addEventListener('change', render);
    });
    root.querySelector('[data-ai-action="reset"]').addEventListener('click', reset);
    reset();
  })();
})();
