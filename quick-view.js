(function () {
  /* The 60-second view: a one-screen summary for busy readers. Also opens from ?view=quick. */

  const dialog = document.getElementById('quick-view');
  if (!dialog) return;

  function open() {
    if (dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function close() {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-quick-open]')) {
      event.preventDefault();
      open();
    } else if (event.target.closest('[data-quick-close]')) {
      close();
    }
  });

  // A click on the dimmed backdrop (outside the panel) closes it.
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) close();
  });

  window.openQuickView = open;

  const params = new URLSearchParams(location.search);
  if (params.get('view') === 'quick' || location.hash === '#quick') open();
})();
