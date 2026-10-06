(function () {
  /* Work section: topic filters, "show all", and the collapsible list of smaller fixes */

  const grid = document.querySelector('[data-work="grid"]');
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.card'));
  const chips = Array.from(document.querySelectorAll('[data-filter]'));
  const countOut = document.querySelector('[data-work="count"]');
  const moreButton = document.querySelector('[data-work="more"]');
  const fixes = document.getElementById('work-also');

  let filter = 'all';
  let expanded = false;

  // Two-column grid: a regular card left alone in its row (next to nothing, or before a
  // full-width featured card) stretches to full width, so no filter leaves a gap.
  function fillRows() {
    const visible = cards.filter(function (c) { return getComputedStyle(c).display !== 'none'; });
    let column = 0;
    visible.forEach(function (card, i) {
      card.classList.remove('is-alone');
      if (card.classList.contains('card-featured')) { column = 0; return; }
      const next = visible[i + 1];
      if (column === 0 && (!next || next.classList.contains('card-featured'))) {
        card.classList.add('is-alone');
        return;
      }
      column = column === 0 ? 1 : 0;
    });
  }

  function render() {
    const showAll = expanded || filter !== 'all';
    grid.classList.toggle('show-all', showAll);
    let shown = 0;
    cards.forEach(function (card) {
      const match = filter === 'all' || card.dataset.topics.split(' ').indexOf(filter) !== -1;
      card.classList.toggle('is-filtered-out', !match);
      const visible = match && (showAll || !card.classList.contains('is-extra'));
      if (visible) {
        shown++;
        card.classList.add('is-visible');
      }
    });
    fillRows();
    countOut.textContent = 'Showing ' + shown + ' of ' + cards.length;
    moreButton.hidden = filter !== 'all';
    moreButton.textContent = expanded ? 'Show fewer' : 'Show all ' + cards.length;
    moreButton.setAttribute('aria-expanded', String(expanded));
  }

  function setFilter(value) {
    filter = value;
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.filter === value)); });
    render();
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () { setFilter(chip.dataset.filter); });
  });

  // Links elsewhere on the page (e.g. the hero numbers) can open Work pre-filtered.
  document.querySelectorAll('[data-work-filter]').forEach(function (link) {
    link.addEventListener('click', function () { setFilter(link.dataset.workFilter); });
  });

  moreButton.addEventListener('click', function () {
    expanded = !expanded;
    render();
    if (!expanded) grid.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  // Links to #work-also (the proof strip, the palette) open the fixes panel.
  function openFixesFromHash() {
    if (fixes && location.hash === '#work-also') fixes.open = true;
  }
  window.addEventListener('hashchange', openFixesFromHash);
  document.addEventListener('click', function (event) {
    const link = event.target.closest('a[href$="#work-also"]');
    if (link && fixes) fixes.open = true;
  });
  openFixesFromHash();

  render();
})();

(function () {
  /* "How I did it": reveal a card's problem and approach on demand */
  document.querySelectorAll('.card-more-toggle').forEach(function (button) {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) return;
    button.addEventListener('click', function () {
      const open = panel.hidden;
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? 'Hide details' : 'How I did it';
    });
  });
})();

/* Experience tabs (Zil Money / Netplex). #netplex links open the Netplex tab. */
(function () {
  const tabs = Array.from(document.querySelectorAll('.exp-tabs [role="tab"]'));
  if (!tabs.length) return;

  function select(tab, focus) {
    tabs.forEach(function (t) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }

  function byPanel(id) {
    return tabs.find(function (t) { return t.getAttribute('aria-controls') === id; });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(tab, false); });
    tab.addEventListener('keydown', function (event) {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      select(tabs[(i + step + tabs.length) % tabs.length], true);
    });
  });

  function fromHash() {
    if (location.hash === '#netplex') select(byPanel('netplex'), false);
  }
  fromHash();
  window.addEventListener('hashchange', fromHash);

  // Same-page links: #netplex opens Netplex; work filters (hero numbers) open Zil Money.
  document.addEventListener('click', function (event) {
    const link = event.target.closest('a[href]');
    if (!link) return;
    if (link.getAttribute('href').endsWith('#netplex')) select(byPanel('netplex'), false);
    else if (link.hasAttribute('data-work-filter')) select(tabs[0], false);
  });
})();

/* Phones and tablets: fold "How a project runs" and trim project facts behind "More details". */
(function () {
  const phone = window.matchMedia('(max-width: 860px)');

  document.querySelectorAll('[data-fold-on-phone]').forEach(function (details) {
    details.open = !phone.matches;
  });

  document.querySelectorAll('.project-more').forEach(function (button) {
    const project = button.closest('.project');
    if (project.querySelectorAll('.facts li').length <= 2) {
      button.remove();
      return;
    }
    button.addEventListener('click', function () {
      const open = project.classList.toggle('is-expanded');
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? 'Fewer details' : 'More details';
    });
  });
})();
