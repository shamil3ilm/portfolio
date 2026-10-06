(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header: soft shadow once the page scrolls */

  const header = document.querySelector('.site-header');
  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Reveal: cards and headings fade up as they enter the screen */

  const REVEAL = '.section-head, .card, .project, .more, .offer, .process, .principle, .contact, .pg-card, .pg-tools > h2, .pg-back';
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    document.querySelectorAll(REVEAL).forEach(function (node) {
      const siblings = Array.from(node.parentElement.children).filter(function (n) { return n.matches(REVEAL); });
      node.style.setProperty('--reveal-delay', Math.min(siblings.indexOf(node), 3) * 70 + 'ms');
      node.classList.add('reveal');
      revealer.observe(node);
    });
  }

  /* Scrollspy: highlight the menu link / quick link for the section in view */

  const links = Array.from(document.querySelectorAll('.nav a, .pg-jump a')).filter(function (a) {
    const url = new URL(a.getAttribute('href'), location.href);
    return url.pathname === location.pathname && url.hash.length > 1;
  });
  const targets = links.map(function (a) { return document.querySelector(new URL(a.getAttribute('href'), location.href).hash); }).filter(Boolean);

  if ('IntersectionObserver' in window && targets.length) {
    const visible = new Map();
    const spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0); });
      let best = null;
      let bestRatio = 0;
      visible.forEach(function (ratio, id) {
        if (ratio > bestRatio) { best = id; bestRatio = ratio; }
      });
      links.forEach(function (a) {
        const active = best !== null && a.getAttribute('href').endsWith('#' + best);
        a.classList.toggle('is-active', active);
      });
    }, { rootMargin: '-80px 0px -45% 0px', threshold: [0, 0.15, 0.4, 0.7] });
    Array.from(new Set(targets)).forEach(function (t) { spy.observe(t); });
  }

  /* Feedback: result boxes pulse when their message changes */

  if (!reduceMotion && 'MutationObserver' in window) {
    const pulse = new MutationObserver(function (mutations) {
      const seen = new Set();
      mutations.forEach(function (m) {
        const box = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        if (!box || seen.has(box)) return;
        seen.add(box);
        box.classList.remove('is-changed');
        void box.offsetWidth;
        box.classList.add('is-changed');
      });
    });
    document.querySelectorAll('.demo-result, .pg-response, .pg-hint, .pg-stats, .pg-words').forEach(function (box) {
      pulse.observe(box, { childList: true, characterData: true, subtree: true });
    });
  }

  /* Menu: on narrow screens the section links fold into a menu button */

  const menuButton = document.querySelector('.menu-toggle');
  if (menuButton) {
    const setMenu = function (open) {
      header.classList.toggle('menu-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    menuButton.addEventListener('click', function () {
      setMenu(!header.classList.contains('menu-open'));
    });
    document.querySelectorAll('#site-nav a').forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('click', function (event) {
      if (header.classList.contains('menu-open') && !header.contains(event.target)) setMenu(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && header.classList.contains('menu-open')) {
        setMenu(false);
        menuButton.focus();
      }
    });
    window.matchMedia('(min-width: 861px)').addEventListener('change', function (mq) {
      if (mq.matches) setMenu(false);
    });
  }

  /* Local time next to "Open to work", so visitors know when I'll reply */

  const clocks = document.querySelectorAll('[data-local-time]');
  if (clocks.length) {
    const format = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
    const tick = function () {
      const text = format.format(new Date()) + ' IST';
      clocks.forEach(function (c) { c.textContent = text; });
    };
    tick();
    setInterval(tick, 30000);
  }
})();

(function () {
  /* Phones: a Contact button appears after the hero and hides once Contact is on screen */
  const button = document.querySelector('[data-mobile-contact]');
  const hero = document.querySelector('.hero');
  const contact = document.getElementById('contact');
  if (!button || !hero || !contact || !('IntersectionObserver' in window)) return;
  let pastHero = false;
  let atContact = false;
  function update() { button.hidden = !pastHero || atContact; }
  new IntersectionObserver(function (e) { pastHero = !e[0].isIntersecting; update(); }).observe(hero);
  new IntersectionObserver(function (e) { atContact = e[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(contact);
})();
