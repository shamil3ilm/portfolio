(function () {
  const root = document.documentElement;
  const EMAIL = 'mhmdshamil03@gmail.com';
  // Public Web3Forms access key (designed to be exposed client-side); delivers to EMAIL.
  const WEB3FORMS_KEY = 'b79fde32-8312-4134-9489-14b35bc152d8';

  function currentTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  document.querySelector('.theme-toggle').addEventListener('click', function () {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch (e) {}
  });

  const form = document.querySelector('.contact-form');
  if (!form) return;
  const status = form.querySelector('.form-status');
  const button = form.querySelector('button[type="submit"]');

  function showStatus(message, isError) {
    status.textContent = message;
    status.classList.toggle('error', Boolean(isError));
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const message = String(data.get('message') || '').trim();

    if (!name || !email || !message) {
      showStatus('Please fill in every field.', true);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showStatus('Please enter a valid email address.', true);
      return;
    }

    button.disabled = true;
    showStatus('Sending…');

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: 'Portfolio message from ' + name,
          name: name,
          email: email,
          message: message,
          botcheck: data.get('botcheck') ? true : false,
        }),
      });

      const result = await response.json().catch(function () { return {}; });
      if (!response.ok || result.success !== true) throw new Error(result.message || 'Request failed');

      form.reset();
      showStatus('Thanks, your message was sent. I will reply by email.');
    } catch (e) {
      showStatus("Couldn't send just now. Please email me at " + EMAIL + '.', true);
    } finally {
      button.disabled = false;
    }
  });
})();
