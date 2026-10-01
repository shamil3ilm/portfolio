(function () {
  /* Custom dropdowns. The native <select> stays in the page (hidden) and keeps the value, so every
     demo reads it as before; picking an option fires input + change on it. Short lists of small
     numbers (days, hours, minutes) open as a grid. */

  let openInstance = null;
  let uid = 0;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function gridColumns(options) {
    const short = options.every(function (o) { return o.textContent.trim().length <= 3; });
    if (!short || options.length < 10) return 0;
    return options.length > 20 ? 7 : 4;
  }

  function enhance(select) {
    if (select.dataset.enhanced) return;
    select.dataset.enhanced = 'true';
    const id = 'cs-' + (++uid);
    const wrap = el('div', 'cs');
    const button = el('button', 'cs-button');
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', id);
    const valueOut = el('span', 'cs-value');
    button.appendChild(valueOut);
    button.appendChild(el('span', 'cs-arrow'));
    const list = el('ul', 'cs-list');
    list.id = id;
    list.setAttribute('role', 'listbox');
    list.tabIndex = -1;
    list.hidden = true;

    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(button);
    wrap.appendChild(list);
    wrap.appendChild(select);

    if (select.getAttribute('aria-label')) button.setAttribute('aria-label', select.getAttribute('aria-label'));

    let options = [];
    let columns = 0;
    let active = 0;

    function build() {
      options = Array.from(select.options);
      columns = gridColumns(options);
      list.classList.toggle('cs-grid', columns > 0);
      list.style.setProperty('--cs-cols', columns || 1);
      list.replaceChildren();
      options.forEach(function (option, i) {
        const item = el('li', 'cs-option', option.textContent);
        item.id = id + '-' + i;
        item.setAttribute('role', 'option');
        item.dataset.index = String(i);
        list.appendChild(item);
      });
      sync();
    }

    function sync() {
      const index = Math.max(0, select.selectedIndex);
      valueOut.textContent = options[index] ? options[index].textContent : '';
      Array.from(list.children).forEach(function (item, i) {
        item.setAttribute('aria-selected', String(i === index));
      });
    }

    function highlight(index) {
      active = Math.max(0, Math.min(options.length - 1, index));
      Array.from(list.children).forEach(function (item, i) {
        item.classList.toggle('is-active', i === active);
      });
      const current = list.children[active];
      if (current) {
        list.setAttribute('aria-activedescendant', current.id);
        current.scrollIntoView({ block: 'nearest' });
      }
    }

    function open() {
      if (openInstance && openInstance !== api) openInstance.close();
      openInstance = api;
      list.hidden = false;
      wrap.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
      list.style.minWidth = button.offsetWidth + 'px';
      const room = window.innerHeight - button.getBoundingClientRect().bottom;
      wrap.classList.toggle('opens-up', room < Math.min(list.scrollHeight, 300) + 16 && button.getBoundingClientRect().top > room);
      highlight(Math.max(0, select.selectedIndex));
      list.focus({ preventScroll: true });
    }

    function close(returnFocus) {
      list.hidden = true;
      wrap.classList.remove('is-open', 'opens-up');
      button.setAttribute('aria-expanded', 'false');
      if (openInstance === api) openInstance = null;
      if (returnFocus) button.focus();
    }

    function choose(index) {
      if (index !== select.selectedIndex) {
        select.selectedIndex = index;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      sync();
      close(true);
    }

    button.addEventListener('click', function (event) {
      event.preventDefault();
      if (list.hidden) open(); else close(false);
    });
    button.addEventListener('keydown', function (event) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].indexOf(event.key) !== -1) {
        event.preventDefault();
        open();
      }
    });

    // preventDefault keeps a wrapping <label> from re-clicking the button.
    list.addEventListener('mousedown', function (event) { event.preventDefault(); });
    list.addEventListener('click', function (event) {
      event.preventDefault();
      const item = event.target.closest('.cs-option');
      if (item) choose(Number(item.dataset.index));
    });
    list.addEventListener('mousemove', function (event) {
      const item = event.target.closest('.cs-option');
      if (item && Number(item.dataset.index) !== active) highlight(Number(item.dataset.index));
    });
    list.addEventListener('keydown', function (event) {
      const step = columns || 1;
      const moves = {
        ArrowDown: step, ArrowUp: -step,
        ArrowRight: columns ? 1 : 0, ArrowLeft: columns ? -1 : 0,
      };
      if (event.key in moves && moves[event.key] !== 0) {
        event.preventDefault();
        highlight(active + moves[event.key]);
      } else if (event.key === 'Home') {
        event.preventDefault();
        highlight(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        highlight(options.length - 1);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        choose(active);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      } else if (event.key === 'Tab') {
        close(false);
      }
    });

    select.addEventListener('change', sync);
    new MutationObserver(build).observe(select, { childList: true });

    const api = { close: close, contains: function (node) { return wrap.contains(node); } };
    build();
    return api;
  }

  document.addEventListener('click', function (event) {
    if (openInstance && !openInstance.contains(event.target)) openInstance.close(false);
  });

  function enhanceAll(scope) {
    scope.querySelectorAll('.pg-card select').forEach(enhance);
  }

  enhanceAll(document);
  // Selects added later (for example the Wi-Fi security choice in the QR maker).
  new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        if (node.matches && node.matches('.pg-card select')) enhance(node);
        else if (node.querySelectorAll) enhanceAll(node);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();
