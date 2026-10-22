(function () {
  /* A small surprise: the coral full stop in the footer, or typing "letmeknow" or "jlmk", opens a note about the name. */
  const dialog = document.getElementById('egg');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  let fontLoaded = false;
  function loadBrandFont() {
    if (fontLoaded) return;
    fontLoaded = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;800&display=swap';
    document.head.appendChild(link);
  }

  function open() {
    if (dialog.open) return;
    loadBrandFont();
    dialog.showModal();
  }

  document.querySelectorAll('[data-egg-open]').forEach(function (button) {
    button.addEventListener('click', open);
  });

  let typed = '';
  document.addEventListener('keydown', function (event) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
    if (event.target.closest && event.target.closest('input, textarea, select, [contenteditable]')) return;
    typed = (typed + event.key.toLowerCase()).slice(-9);
    if (typed.endsWith('letmeknow') || typed.endsWith('jlmk')) {
      typed = '';
      open();
    }
  });

  dialog.addEventListener('click', function (event) {
    if (event.target === dialog || event.target.closest('[data-egg-close]')) dialog.close();
  });

  const contact = dialog.querySelector('[data-egg-contact]');
  if (contact) {
    contact.addEventListener('click', function () {
      dialog.close();
      const target = document.getElementById('contact');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
})();
