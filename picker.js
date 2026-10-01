(function () {
  /* Custom time and date pickers. The original input becomes hidden and keeps the value,
     so the demos read it exactly as before; every change fires input + change events. */

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const SHORT_MONTHS = MONTHS.map(function (m) { return m.slice(0, 3); });
  const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  let uid = 0;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function emit(input) {
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function select(label, options, value) {
    const s = el('select', 'tp-select');
    s.setAttribute('aria-label', label);
    options.forEach(function (o) {
      const option = el('option', '', o[1]);
      option.value = o[0];
      s.appendChild(option);
    });
    s.value = value;
    return s;
  }

  /* Time: hour, minute, AM/PM */

  function timeControls(initial, onChange) {
    const parts = (initial || '09:00').split(':').map(Number);
    let hour24 = parts[0] || 0;
    let minute = Math.round((parts[1] || 0) / 5) * 5 % 60;

    const wrap = el('div', 'tp');
    const hours = [];
    for (let h = 1; h <= 12; h++) hours.push([String(h), String(h)]);
    const minutes = [];
    for (let m = 0; m < 60; m += 5) minutes.push([String(m), pad(m)]);

    const hourSel = select('Hour', hours, String(hour24 % 12 || 12));
    const minuteSel = select('Minutes', minutes, String(minute));
    const group = el('div', 'pg-segment tp-ampm');
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', 'AM or PM');
    const name = 'ampm-' + (++uid);
    ['AM', 'PM'].forEach(function (label) {
      const option = el('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = name;
      radio.value = label;
      radio.checked = (hour24 >= 12) === (label === 'PM');
      option.appendChild(radio);
      option.appendChild(el('span', '', label));
      group.appendChild(option);
    });

    function update() {
      const h12 = Number(hourSel.value);
      const pm = group.querySelector('input:checked').value === 'PM';
      hour24 = (h12 % 12) + (pm ? 12 : 0);
      minute = Number(minuteSel.value);
      onChange(pad(hour24) + ':' + pad(minute));
    }

    hourSel.addEventListener('change', update);
    minuteSel.addEventListener('change', update);
    group.addEventListener('change', update);
    wrap.appendChild(hourSel);
    wrap.appendChild(el('span', 'tp-colon', ':'));
    wrap.appendChild(minuteSel);
    wrap.appendChild(group);
    return wrap;
  }

  function enhanceTime(input) {
    input.type = 'hidden';
    const controls = timeControls(input.value, function (value) {
      input.value = value;
      emit(input);
    });
    input.insertAdjacentElement('afterend', controls);
  }

  /* Date: a button that opens a small calendar */

  function calendar(initial, onPick) {
    let selected = new Date(initial.getFullYear(), initial.getMonth(), initial.getDate());
    let view = new Date(selected.getFullYear(), selected.getMonth(), 1);
    const today = new Date();

    const wrap = el('div', 'dp');
    const button = el('button', 'dp-button');
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');

    const pop = el('div', 'dp-pop');
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Choose a date');
    pop.hidden = true;

    const head = el('div', 'dp-head');
    const prev = el('button', 'dp-nav', '‹');
    prev.type = 'button';
    prev.setAttribute('aria-label', 'Previous month');
    const title = el('span', 'dp-title');
    title.setAttribute('aria-live', 'polite');
    const next = el('button', 'dp-nav', '›');
    next.type = 'button';
    next.setAttribute('aria-label', 'Next month');
    head.appendChild(prev);
    head.appendChild(title);
    head.appendChild(next);

    const grid = el('div', 'dp-grid');
    grid.setAttribute('role', 'grid');
    const footer = el('div', 'dp-foot');
    const todayBtn = el('button', 'chip-btn', 'Today');
    todayBtn.type = 'button';
    footer.appendChild(todayBtn);

    pop.appendChild(head);
    pop.appendChild(grid);
    pop.appendChild(footer);
    wrap.appendChild(button);
    wrap.appendChild(pop);

    function label(d) {
      return d.getDate() + ' ' + SHORT_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    }

    function same(a, b) {
      return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    function renderButton() {
      button.replaceChildren(el('span', 'dp-icon', '📅'), el('span', '', label(selected)));
      button.setAttribute('aria-label', 'Date: ' + label(selected) + '. Change date');
    }

    function renderGrid(focusDay) {
      title.textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear();
      grid.replaceChildren();
      WEEKDAYS.forEach(function (w) { grid.appendChild(el('span', 'dp-weekday', w)); });
      const offset = (view.getDay() + 6) % 7;
      for (let i = 0; i < offset; i++) grid.appendChild(el('span', 'dp-blank'));
      const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= days; d++) {
        const date = new Date(view.getFullYear(), view.getMonth(), d);
        const cell = el('button', 'dp-day', String(d));
        cell.type = 'button';
        cell.dataset.day = String(d);
        cell.setAttribute('aria-label', label(date));
        if (same(date, selected)) cell.setAttribute('aria-selected', 'true');
        if (same(date, today)) cell.dataset.today = 'true';
        cell.tabIndex = d === (focusDay || (same(view, new Date(selected.getFullYear(), selected.getMonth(), 1)) ? selected.getDate() : 1)) ? 0 : -1;
        cell.addEventListener('click', function () { pick(date); });
        grid.appendChild(cell);
      }
    }

    function open(state) {
      pop.hidden = !state;
      button.setAttribute('aria-expanded', String(state));
      if (state) {
        view = new Date(selected.getFullYear(), selected.getMonth(), 1);
        renderGrid();
        const focus = grid.querySelector('.dp-day[tabindex="0"]');
        if (focus) focus.focus();
      }
    }

    function pick(date) {
      selected = date;
      renderButton();
      open(false);
      button.focus();
      onPick(selected);
    }

    function moveFocus(delta) {
      const current = document.activeElement;
      if (!current || !current.classList.contains('dp-day')) return;
      const target = new Date(view.getFullYear(), view.getMonth(), Number(current.dataset.day) + delta);
      if (target.getMonth() !== view.getMonth() || target.getFullYear() !== view.getFullYear()) {
        view = new Date(target.getFullYear(), target.getMonth(), 1);
      }
      renderGrid(target.getDate());
      const cell = grid.querySelector('[data-day="' + target.getDate() + '"]');
      if (cell) cell.focus();
    }

    button.addEventListener('click', function () { open(pop.hidden); });
    prev.addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderGrid(); });
    next.addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderGrid(); });
    todayBtn.addEventListener('click', function () { pick(new Date(today.getFullYear(), today.getMonth(), today.getDate())); });
    pop.addEventListener('keydown', function (event) {
      const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      if (moves[event.key]) {
        event.preventDefault();
        moveFocus(moves[event.key]);
      } else if (event.key === 'Escape') {
        open(false);
        button.focus();
      }
    });
    document.addEventListener('click', function (event) {
      if (!pop.hidden && !wrap.contains(event.target)) open(false);
    });

    renderButton();
    return wrap;
  }

  function enhanceDateTime(input) {
    const now = new Date();
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(input.value);
    let date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : now;
    let time = match ? match[4] + ':' + match[5] : pad(now.getHours()) + ':' + pad(now.getMinutes());

    input.type = 'hidden';
    function write() {
      input.value = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' + time;
      emit(input);
    }

    const row = el('div', 'dtp');
    row.appendChild(calendar(date, function (picked) { date = picked; write(); }));
    row.appendChild(timeControls(time, function (value) { time = value; write(); }));
    input.insertAdjacentElement('afterend', row);
  }

  // A wrapping <label> would re-trigger the first control on any click inside the pop-up,
  // so turn it into a plain named group first.
  function unwrapLabel(input) {
    const label = input.closest('label');
    if (!label) return;
    const group = el('div', (label.className ? label.className + ' ' : '') + 'pg-field');
    group.setAttribute('role', 'group');
    const text = Array.from(label.childNodes)
      .filter(function (n) { return n.nodeType === 3; })
      .map(function (n) { return n.textContent.trim(); })
      .join(' ').trim();
    const caption = el('span', 'pg-field-label', text);
    caption.id = 'field-' + (++uid);
    group.setAttribute('aria-labelledby', caption.id);
    group.appendChild(caption);
    Array.from(label.childNodes).forEach(function (n) {
      if (n.nodeType !== 3) group.appendChild(n);
    });
    label.replaceWith(group);
  }

  document.querySelectorAll('input[type="time"]').forEach(function (input) {
    unwrapLabel(input);
    enhanceTime(input);
  });
  document.querySelectorAll('input[type="datetime-local"]').forEach(function (input) {
    unwrapLabel(input);
    enhanceDateTime(input);
  });
})();
