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
