(function () {
  /* Risk Review Desk: inspect each item, release it or hold it with the right reason.
     Every risky case is one my real systems stop; the safe ones look suspicious but are fine. */

  const root = document.querySelector('[data-desk="root"]');
  if (!root) return;
  const stage = root.querySelector('[data-desk="stage"]');
  const progressOut = root.querySelector('[data-desk="progress"]');
  const clockOut = root.querySelector('[data-desk="clock"]');
  const scoreOut = root.querySelector('[data-desk="score"]');
  const bestOut = root.querySelector('[data-desk="best"]');

  const SHIFT_SECONDS = 150;
  const BEST_KEY = 'desk-best';
  const POINTS = { release: 60, holdRight: 100, holdWrongReason: 50, falseHold: -40, missed: -80 };

  const REASONS = {
    changed: 'Details changed after submission',
    removed: 'Recipient was deleted',
    altered: 'Record was altered',
    signature: "Signature doesn't match",
    access: 'Access not allowed',
  };
  const REASON_KEYS = Object.keys(REASONS);

  const RULES = {
    changed: { name: 'approval lock', href: 'index.html#demo-lock' },
    removed: { name: 'recurring payment safeguards', href: 'playground.html#recurring' },
    altered: { name: 'tamper check', href: 'index.html#demo-chain' },
    signature: { name: 'signed updates', href: 'playground.html#webhook' },
    access: { name: 'delegated access rules', href: 'playground.html#delegated-access' },
  };

  const S = window.Sample;
  const HEX = '0123456789abcdef';

  function amount() { return S.amount(1000, 9900); }
  function usd(n) { return '$' + n.toLocaleString('en-US'); }
  function sar(n) { return 'SAR ' + n.toLocaleString('en-US'); }
  function hex(n) { let s = ''; for (let i = 0; i < n; i++) s += HEX[Math.floor(Math.random() * 16)]; return s; }
  function ref(prefix) { return prefix + '-' + S.int(20000, 98999); }

  // Clock times for one item's timeline, counted in minutes from midnight.
  function at(minutes) { return S.clockTime(Math.floor(minutes / 60) % 24, minutes % 60); }
  function workdayStart() { return S.int(9 * 60, 16 * 60); }
  function past(days) { return S.shortDate(S.daysAgo(days)); }
  function poss(name) { return /s$/i.test(name) ? name + "'" : name + "'s"; }
  function ago(days) { return days === 1 ? 'yesterday' : days + ' days ago'; }

  function differentLast4(than) {
    let v = S.last4();
    while (v === than) v = S.last4();
    return v;
  }

  // A look-alike name: same first word, different ending.
  function similarName(name) {
    const first = name.split(' ')[0];
    const endings = ['Movers', 'Supply Co.', 'Services', 'Group', 'Traders', 'Studio', 'Rentals'].filter(function (e) { return first + ' ' + e !== name; });
    return first + ' ' + S.pick(endings);
  }

  // Same start and end, one character changed in the middle: easy to miss at a glance.
  function nearMiss(value) {
    const i = 4 + Math.floor(Math.random() * (value.length - 8));
    let c = value[i];
    while (c === value[i]) c = HEX[Math.floor(Math.random() * 16)];
    return value.slice(0, i) + c + value.slice(i + 1);
  }

  /* Each maker returns the risky version or a safe look-alike, with fresh names, numbers and times */

  const MAKERS = {
    changed: function (risky) {
      const recipient = S.business();
      const amt = amount();
      const oldAcct = S.last4();
      const newAcct = differentLast4(oldAcct);
      const t = workdayStart();
      const submitted = t;
      const approved = t + S.int(3, 25);
      const base = { type: 'Payment release', id: ref('PAY'), title: 'Release ' + usd(amt) + ' to ' + recipient, amount: amt };
      if (risky) {
        const changedAt = approved + S.int(1, 15);
        return Object.assign(base, {
          fields: [['Recipient', recipient], ['Amount', usd(amt)], ['Method', 'Bank transfer'], ['Bank account', 'ending ' + newAcct], ['Approvals', '2 of 2']],
          timeline: [[at(submitted), 'Submitted for approval (bank account ending ' + oldAcct + ')'], [at(approved), 'Approved by the finance lead'], [at(changedAt), 'Recipient bank account changed to ending ' + newAcct]],
          explain: 'The bank account changed at ' + at(changedAt) + ', after the payment was submitted at ' + at(submitted) + '. The approvers never saw account ' + newAcct + ', so it must be held.',
        });
      }
      if (Math.random() < 0.5) {
        const changedAt = submitted - S.int(5, 50);
        return Object.assign(base, {
          fields: [['Recipient', recipient], ['Amount', usd(amt)], ['Method', 'Bank transfer'], ['Bank account', 'ending ' + newAcct], ['Approvals', '2 of 2']],
          timeline: [[at(changedAt), 'Recipient bank account changed to ending ' + newAcct], [at(submitted), 'Submitted for approval'], [at(approved), 'Approved by the finance lead']],
          explain: 'The account changed at ' + at(changedAt) + ', before submission, so the approvers approved these exact details. Safe to release.',
        });
      }
      return Object.assign(base, {
        fields: [['Recipient', recipient], ['Amount', usd(amt)], ['Method', 'Bank transfer'], ['Bank account', 'ending ' + oldAcct], ['Approvals', '2 of 2']],
        timeline: [[at(submitted), 'Submitted for approval (bank account ending ' + oldAcct + ')'], [at(approved), 'Approved by the finance lead'], [at(approved + S.int(1, 10)), 'Finance lead added an internal note']],
        explain: 'Only an internal note was added. The bank details that decide where the money goes are exactly what was approved.',
      });
    },

    removed: function (risky) {
      const amt = amount();
      const recipient = S.business();
      const what = S.scheduleName().toLowerCase();
      const run = S.int(2, 11);
      const day = S.int(1, 28);
      const created = past(S.int(60, 200));
      const deletedDays = S.int(1, 6);
      const deletedAt = past(deletedDays) + ', ' + at(workdayStart());
      const base = { type: 'Scheduled payment', id: ref('RUN'), title: 'Monthly ' + what + ' to ' + recipient + ' · run ' + run + ' of 12', amount: amt };
      const schedule = ['Schedule', 'Monthly, on day ' + day];
      if (risky) {
        return Object.assign(base, {
          fields: [['Recipient', recipient], ['Recipient status', 'Deleted'], ['Amount', usd(amt)], schedule, ['Due', 'Today, 00:05']],
          timeline: [[created, 'Schedule created'], [deletedAt, 'Recipient ' + recipient + ' deleted'], ['Today, 00:05', 'Run ' + run + ' is due']],
          explain: 'The recipient was deleted ' + ago(deletedDays) + '. A schedule must never keep paying someone who was removed; my system cancels it when the recipient is deleted.',
        });
      }
      const lookAlike = similarName(recipient);
      return Object.assign(base, {
        fields: [['Recipient', recipient], ['Recipient status', 'Active'], ['Amount', usd(amt)], schedule, ['Due', 'Today, 00:05']],
        timeline: [[created, 'Schedule created'], [deletedAt, 'A different recipient, ' + lookAlike + ', was deleted'], ['Today, 00:05', 'Run ' + run + ' is due']],
        explain: 'A recipient with a similar name was deleted, not ' + recipient + ', which is still active. The run goes ahead.',
      });
    },

    altered: function (risky) {
      const amt = amount();
      const seal = hex(16);
      const seller = S.seller();
      return {
        type: 'Invoice record', id: 'INV-' + S.invoiceNumber(), title: 'Invoice from ' + seller, amount: 0,
        fields: [['Seller', seller], ['Amount', sar(amt)], ['Seal stored when issued', seal], ['Seal worked out now', risky ? nearMiss(seal) : seal]],
        timeline: [[past(S.int(5, 40)), 'Invoice issued and sealed'], ['Today', 'Integrity check ran']],
        explain: risky
          ? 'Look closely: the seal worked out now differs by one character from the stored one. The record was changed after it was sealed.'
          : 'Both seals are identical, so the record is exactly as it was issued.',
      };
    },

    signature: function (risky) {
      const amt = amount();
      const sig = hex(20);
      const seller = S.seller();
      const received = at(workdayStart()) + ':' + String(S.int(0, 59)).padStart(2, '0');
      return {
        type: 'Incoming update', id: ref('EVT'), title: '"Invoice paid" update from ' + poss(seller) + ' billing system', amount: 0,
        fields: [['Event', 'Invoice paid'], ['Amount', sar(amt)], ['Signature received', 'sha256=' + sig], ['Signature worked out', 'sha256=' + (risky ? nearMiss(sig) : sig)]],
        timeline: [[received, 'Update received'], [received, 'Signature worked out from the message and the shared secret']],
        explain: risky
          ? 'The two signatures differ by one character, so the message was forged or changed on the way. It must not be trusted.'
          : 'The signatures match exactly, so the update is genuine and unchanged.',
      };
    },

    access: function (risky) {
      const provider = S.provider();
      const customer = S.business();
      const since = past(S.int(20, 150));
      const t = workdayStart();
      const base = { type: 'Provider request', id: ref('REQ'), amount: 0 };
      if (!risky) {
        return Object.assign(base, {
          title: provider + ' asks to see ' + poss(customer) + ' payments',
          fields: [['Provider', provider], ['Customer', customer], ['Connection', 'Active since ' + since], ['Customer status', 'Active'], ['Request', 'View payments']],
          timeline: [[since, customer + ' connected ' + provider + ' with a one-time key'], [at(t), 'Request received']],
          explain: 'An active connection, an active customer and a request to view: exactly what the connection allows.',
        });
      }
      const variant = S.int(0, 2);
      if (variant === 0) {
        const stranger = S.provider();
        return Object.assign(base, {
          title: stranger + ' asks to see ' + poss(customer) + ' payments',
          fields: [['Provider', stranger], ['Customer', customer], ['Connection', 'None'], ['Customer status', 'Active'], ['Request', 'View payments']],
          timeline: [[at(t), 'Request received']],
          explain: stranger + ' was never connected to ' + customer + ', so it has no access at all.',
        });
      }
      if (variant === 1) {
        const amt = amount();
        return Object.assign(base, {
          title: provider + ' asks to approve a ' + usd(amt) + ' payment',
          amount: amt,
          fields: [['Provider', provider], ['Customer', customer], ['Connection', 'Active since ' + since], ['Payment approvers', poss(customer) + ' own finance team'], ['Request', 'Approve ' + usd(amt) + ' payment']],
          timeline: [[at(t), provider + ' created the payment'], [at(t + S.int(2, 20)), provider + ' asks to approve it']],
          explain: 'The payment is waiting for ' + poss(customer) + " own approvers. A provider can never sign off a payment like that, even with an active connection.",
        });
      }
      const suspendedDays = S.int(1, 5);
      return Object.assign(base, {
        title: provider + ' asks to see ' + poss(customer) + ' payments',
        fields: [['Provider', provider], ['Customer', customer], ['Connection', 'Active since ' + since], ['Customer status', 'Suspended (' + past(suspendedDays) + ')'], ['Request', 'View payments']],
        timeline: [[since, 'Connected with a one-time key'], [past(suspendedDays), customer + ' was suspended'], [at(t), 'Request received']],
        explain: 'The connection exists, but the customer is suspended, so every request is refused until it is active again.',
      });
    },
  };

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = copy[i];
      copy[i] = copy[j];
      copy[j] = t;
    }
    return copy;
  }

  function buildQueue() {
    const items = [];
    REASON_KEYS.forEach(function (key) {
      items.push(Object.assign({ risky: true, reason: key }, MAKERS[key](true)));
      items.push(Object.assign({ risky: false, reason: key }, MAKERS[key](false)));
    });
    return shuffle(items);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(className, label, key) {
    const b = el('button', className, label);
    b.type = 'button';
    if (key) b.appendChild(el('kbd', '', key));
    return b;
  }

  function loadBest() {
    try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch (e) { return 0; }
  }

  function saveBest(value) {
    try { localStorage.setItem(BEST_KEY, String(value)); } catch (e) {}
  }

  let state = null;
  let best = loadBest();
  let ticker = null;

  function clockText(seconds) {
    const s = Math.max(0, seconds);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function renderBar() {
    const total = state ? state.queue.length : 10;
    const shown = state ? Math.min(state.index + 1, total) : 0;
    progressOut.textContent = 'Item ' + shown + ' of ' + total;
    clockOut.textContent = clockText(state ? state.left : SHIFT_SECONDS);
    clockOut.dataset.low = String(Boolean(state && state.phase !== 'report' && state.left <= 20));
    scoreOut.textContent = state ? state.score.toLocaleString('en-US') : '0';
    bestOut.textContent = best.toLocaleString('en-US');
  }

  function startClock() {
    clearInterval(ticker);
    ticker = setInterval(function () {
      if (!state || state.phase === 'report') return;
      state.left--;
      renderBar();
      if (state.left <= 0) finish(true);
    }, 1000);
  }

  function showIntro() {
    const intro = el('div', 'desk-intro');
    intro.appendChild(el('p', 'desk-lead', "You're the reviewer on shift."));
    intro.appendChild(el('p', 'desk-text', 'Ten items are waiting. Inspect each one, then release it or hold it with the right reason. Half of them look suspicious but are fine, so read the details and the timeline before you decide.'));
    intro.appendChild(el('p', 'desk-label', 'Reasons to hold'));
    const list = el('ol', 'desk-rules');
    REASON_KEYS.forEach(function (key) { list.appendChild(el('li', '', REASONS[key])); });
    intro.appendChild(list);
    const start = button('btn btn-primary', 'Start shift');
    start.addEventListener('click', startShift);
    intro.appendChild(start);
    intro.appendChild(el('p', 'desk-keys', 'Keyboard: R release · H hold · 1–5 reason · Enter next'));
    stage.replaceChildren(intro);
    renderBar();
  }

  function startShift() {
    state = {
      queue: buildQueue(), index: 0, left: SHIFT_SECONDS, score: 0, phase: 'decide',
      correct: 0, holdsRight: 0, reasonRight: 0, falseHolds: 0, missed: [], protectedAmount: 0, times: [], shownAt: 0,
    };
    showItem();
    startClock();
  }

  function showItem() {
    const item = state.queue[state.index];
    state.phase = 'decide';
    state.shownAt = Date.now();

    const card = el('article', 'desk-item');
    const head = el('div', 'desk-item-head');
    head.appendChild(el('span', 'desk-type', item.type));
    head.appendChild(el('span', 'desk-id', item.id));
    card.appendChild(head);
    card.appendChild(el('h3', 'desk-title', item.title));

    const fields = el('dl', 'desk-fields');
    item.fields.forEach(function (f) {
      const row = el('div');
      row.appendChild(el('dt', '', f[0]));
      row.appendChild(el('dd', /seal|signature/i.test(f[0]) ? 'mono' : '', f[1]));
      fields.appendChild(row);
    });
    card.appendChild(fields);

    card.appendChild(el('p', 'desk-label', 'Timeline'));
    const timeline = el('ol', 'desk-timeline');
    item.timeline.forEach(function (t) {
      const li = el('li');
      li.appendChild(el('span', 'desk-time', t[0]));
      li.appendChild(el('span', '', t[1]));
      timeline.appendChild(li);
    });
    card.appendChild(timeline);

    const actions = el('div', 'desk-actions');
    const release = button('desk-btn desk-release', 'Release', 'R');
    const hold = button('desk-btn desk-hold', 'Hold', 'H');
    release.addEventListener('click', function () { decide(null); });
    hold.addEventListener('click', showReasons);
    actions.appendChild(release);
    actions.appendChild(hold);
    card.appendChild(actions);

    const reasons = el('div', 'desk-reasons');
    reasons.hidden = true;
    reasons.appendChild(el('p', 'desk-label', 'Why are you holding it?'));
    const grid = el('div', 'desk-reason-grid');
    REASON_KEYS.forEach(function (key, i) {
      const b = button('desk-reason', '');
      b.appendChild(el('kbd', '', String(i + 1)));
      b.appendChild(document.createTextNode(REASONS[key]));
      b.addEventListener('click', function () { decide(key); });
      grid.appendChild(b);
    });
    reasons.appendChild(grid);
    card.appendChild(reasons);

    stage.replaceChildren(card);
    renderBar();
  }

  function showReasons(fromKeyboard) {
    if (!state || state.phase !== 'decide') return;
    const reasons = stage.querySelector('.desk-reasons');
    reasons.hidden = false;
    stage.querySelector('.desk-hold').setAttribute('aria-pressed', 'true');
    if (fromKeyboard === true) reasons.querySelector('button').focus({ preventScroll: true });
  }

  function judge(item, reason) {
    const held = reason !== null;
    if (item.risky && held && reason === item.reason) return { points: POINTS.holdRight, tone: 'ok', text: 'Correct hold, right reason.' };
    if (item.risky && held) return { points: POINTS.holdWrongReason, tone: 'warn', text: 'Right to hold it, but the reason is "' + REASONS[item.reason] + '".' };
    if (!item.risky && !held) return { points: POINTS.release, tone: 'ok', text: 'Correct: this one was fine.' };
    if (!item.risky) return { points: POINTS.falseHold, tone: 'bad', text: 'False alarm: this one was fine, and holding it delays a genuine payment.' };
    return { points: POINTS.missed, tone: 'bad', text: 'Missed: this one should have been held.' };
  }

  function record(item, reason) {
    const held = reason !== null;
    if (item.risky === held) state.correct++;
    if (item.risky && held) {
      state.holdsRight++;
      state.protectedAmount += item.amount;
      if (reason === item.reason) state.reasonRight++;
    }
    if (!item.risky && held) state.falseHolds++;
    if (item.risky && !held) state.missed.push(item);
  }

  function decide(reason) {
    if (!state || state.phase !== 'decide') return;
    const item = state.queue[state.index];
    state.times.push(Date.now() - state.shownAt);
    const verdict = judge(item, reason);
    record(item, reason);
    state.score = Math.max(0, state.score + verdict.points);
    state.phase = 'verdict';

    const card = stage.querySelector('.desk-item');
    card.querySelector('.desk-actions').remove();
    card.querySelector('.desk-reasons').remove();
    const box = el('div', 'desk-verdict');
    box.dataset.tone = verdict.tone;
    box.setAttribute('role', 'status');
    box.appendChild(el('p', 'desk-verdict-title', verdict.text + ' ' + (verdict.points > 0 ? '+' : '') + verdict.points));
    box.appendChild(el('p', 'desk-text', item.explain));
    if (item.risky) {
      const link = el('a', 'desk-rule', 'My ' + RULES[item.reason].name + ' stops this automatically →');
      link.href = RULES[item.reason].href;
      box.appendChild(link);
    }
    const last = state.index + 1 >= state.queue.length;
    const next = button('btn btn-primary desk-next', last ? 'See shift report' : 'Next item');
    next.addEventListener('click', advance);
    box.appendChild(next);
    card.appendChild(box);
    next.focus({ preventScroll: true });
    renderBar();
  }

  function advance() {
    if (!state || state.phase !== 'verdict') return;
    state.index++;
    if (state.index >= state.queue.length) finish(false);
    else showItem();
  }

  function rank(accuracy, reasonAccuracy) {
    if (accuracy >= 90 && reasonAccuracy >= 80) return 'Risk lead';
    if (accuracy >= 80) return 'Senior analyst';
    if (accuracy >= 60) return 'Analyst';
    return 'Trainee';
  }

  function stat(label, value) {
    const box = el('div');
    box.appendChild(el('dt', '', label));
    box.appendChild(el('dd', '', value));
    return box;
  }

  function finish(timedOut) {
    clearInterval(ticker);
    // The time bonus only rewards speed on correct calls.
    if (!timedOut) state.score += Math.round(state.left * state.correct / state.queue.length);
    state.phase = 'report';
    const total = state.queue.length;
    const reviewed = state.times.length;
    const accuracy = Math.round((state.correct / total) * 100);
    const reasonAccuracy = state.holdsRight ? Math.round((state.reasonRight / state.holdsRight) * 100) : 0;
    const title = rank(accuracy, reasonAccuracy);
    const newBest = state.score > best;
    if (newBest) {
      best = state.score;
      saveBest(best);
    }
    if (accuracy >= 80 && typeof window.achieve === 'function') window.achieve('patrol-score');

    const report = el('div', 'desk-report');
    report.appendChild(el('p', 'desk-type', timedOut ? 'Shift over: time ran out' : 'Shift report'));
    report.appendChild(el('p', 'desk-rank', title));
    report.appendChild(el('p', 'desk-text', state.score.toLocaleString('en-US') + ' points' + (newBest ? ', a new personal best' : '') + (timedOut ? '' : ', including a bonus for time left') + '.'));

    const avg = reviewed ? state.times.reduce(function (a, b) { return a + b; }, 0) / reviewed / 1000 : 0;
    const stats = el('dl', 'desk-stats');
    stats.appendChild(stat('Correct calls', state.correct + ' of ' + total));
    stats.appendChild(stat('Risky items held', state.holdsRight + ' of 5'));
    stats.appendChild(stat('Right reason given', state.holdsRight ? reasonAccuracy + '%' : '–'));
    stats.appendChild(stat('False alarms', String(state.falseHolds)));
    stats.appendChild(stat('Money protected', usd(state.protectedAmount)));
    stats.appendChild(stat('Time per item', reviewed ? avg.toFixed(1) + ' s' : '–'));
    report.appendChild(stats);
    if (reviewed < total) report.appendChild(el('p', 'desk-text', (total - reviewed) + ' item(s) were still waiting when the shift ended.'));

    if (state.missed.length) {
      report.appendChild(el('p', 'desk-label', 'What got past you, and what stops it for real'));
      const list = el('ul', 'desk-missed');
      state.missed.forEach(function (item) {
        const li = el('li');
        li.appendChild(el('span', '', item.title + ' (' + REASONS[item.reason].toLowerCase() + '). '));
        const link = el('a', '', 'See my ' + RULES[item.reason].name + ' →');
        link.href = RULES[item.reason].href;
        li.appendChild(link);
        list.appendChild(li);
      });
      report.appendChild(list);
    } else if (reviewed === total && state.falseHolds) {
      report.appendChild(el('p', 'desk-text', 'Nothing risky got past you, but ' + state.falseHolds + ' safe item(s) were held and delayed for no reason. Good review stops the risky ones and lets the rest through.'));
    } else if (reviewed === total) {
      report.appendChild(el('p', 'desk-text', 'A clean shift: nothing risky got past you and nothing safe was delayed. My systems run these same checks on every item, automatically.'));
    }
    const again = button('btn btn-primary', 'Start a new shift');
    again.addEventListener('click', startShift);
    report.appendChild(again);
    stage.replaceChildren(report);
    renderBar();
  }

  document.addEventListener('keydown', function (event) {
    if (!state || state.phase === 'report' || event.ctrlKey || event.metaKey || event.altKey) return;
    const active = document.activeElement;
    if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return;
    const box = root.getBoundingClientRect();
    if (box.bottom < 0 || box.top > window.innerHeight) return;
    const key = event.key.toLowerCase();
    if (state.phase === 'decide') {
      const reasonsOpen = !stage.querySelector('.desk-reasons').hidden;
      if (key === 'r') decide(null);
      else if (key === 'h') showReasons(true);
      else if (reasonsOpen && /^[1-5]$/.test(key)) decide(REASON_KEYS[Number(key) - 1]);
      else return;
      event.preventDefault();
    } else if (state.phase === 'verdict' && key === 'enter' && !(active && active.classList.contains('desk-next'))) {
      event.preventDefault();
      advance();
    }
  });

  showIntro();
})();
