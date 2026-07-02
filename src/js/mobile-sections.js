(function () {
  const nav = document.querySelector('.mobile-page-nav');
  const prevButton = document.querySelector('[data-mobile-prev]');
  const nextButton = document.querySelector('[data-mobile-next]');
  const dots = Array.from(document.querySelectorAll('.mobile-page-indicator span'));

  const pages = [
    { id: 'home', element: document.getElementById('home') },
    { id: 'jobs', element: document.getElementById('jobs') },
    { id: 'about', element: document.getElementById('about') },
    { id: 'contact', element: document.getElementById('contact') },
    { id: 'apply', element: document.getElementById('apply') },
  ].filter((page) => page.element);

  if (!nav || !pages.length) return;

  let activeIndex = 0;

  function installGlobalFooters() {
    const template = document.getElementById('global-footer-template');
    if (!template) return;

    pages.forEach((page) => {
      if (page.id === 'apply') return;
      if (page.element.querySelector(':scope > .section-footer')) return;

      const footer = template.content.firstElementChild.cloneNode(true);
      footer.dataset.footerFor = page.id;
      page.element.appendChild(footer);
    });
  }

  installGlobalFooters();

  const sectionLinks = Array.from(document.querySelectorAll('a[href^="#"]'));

  document.documentElement.classList.add('section-navigation-lock');
  document.body.classList.add('section-page-mode');

  function isEditableTarget(target) {
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  }

  function isInteractiveTarget(target) {
    return Boolean(target.closest('button, input, textarea, select, a, [contenteditable="true"]'));
  }

  function getActiveSection() {
    return pages[activeIndex]?.element || null;
  }

  function updateIndicatorVisibility(section = getActiveSection()) {
    nav.classList.toggle('is-indicator-hidden', Boolean(section && section.scrollTop > 24));
  }

  function scrollActiveSection(key, shiftKey) {
    const section = getActiveSection();
    if (!section) return;

    const step = Math.max(48, Math.round(section.clientHeight * 0.12));
    const pageStep = Math.max(120, Math.round(section.clientHeight * 0.82));
    const scrollOptions = { behavior: 'smooth' };

    if (key === 'Home') {
      section.scrollTo({ top: 0, ...scrollOptions });
      return;
    }

    if (key === 'End') {
      section.scrollTo({ top: section.scrollHeight, ...scrollOptions });
      return;
    }

    const deltas = {
      ArrowUp: -step,
      ArrowDown: step,
      PageUp: -pageStep,
      PageDown: pageStep,
      ' ': shiftKey ? -pageStep : pageStep,
    };

    if (Object.prototype.hasOwnProperty.call(deltas, key)) {
      section.scrollBy({ top: deltas[key], ...scrollOptions });
    }
  }

  function setActiveIndex(index, options = {}) {
    const nextIndex = Math.max(0, Math.min(index, pages.length - 1));
    const previousIndex = activeIndex;
    activeIndex = nextIndex;

    pages.forEach((page, pageIndex) => {
      const isActive = pageIndex === activeIndex;

      page.element.classList.toggle('is-section-active', isActive);
      page.element.classList.toggle('is-section-before', pageIndex < activeIndex);
      page.element.classList.toggle('is-section-after', pageIndex > activeIndex);
      page.element.classList.toggle('is-mobile-active', isActive);
      page.element.classList.toggle('is-mobile-before', pageIndex < activeIndex);
      page.element.classList.toggle('is-mobile-after', pageIndex > activeIndex);
      page.element.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      page.element.inert = !isActive;
    });

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === activeIndex);
    });

    sectionLinks.forEach((link) => {
      const href = link.getAttribute('href');
      const isActiveLink = href === `#${pages[activeIndex].id}`;

      link.classList.toggle('is-active', isActiveLink);
      if (link.closest('.site-nav')) {
        if (isActiveLink) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      }
    });

    nav.classList.remove('is-moving-next', 'is-moving-prev');
    if (previousIndex !== activeIndex) {
      nav.classList.add(activeIndex > previousIndex ? 'is-moving-next' : 'is-moving-prev');
      window.setTimeout(() => nav.classList.remove('is-moving-next', 'is-moving-prev'), 360);
    }

    nav.classList.toggle('is-on-hero', pages[activeIndex].id === 'home');
    document.body.dataset.mobilePage = pages[activeIndex].id;
    updateIndicatorVisibility();
    window.scrollTo(0, 0);

    const previous = pages[activeIndex - 1];
    const next = pages[activeIndex + 1];

    if (prevButton) {
      prevButton.classList.toggle('is-hidden', !previous);
      if (previous) prevButton.href = `#${previous.id}`;
    }

    if (nextButton) {
      nextButton.classList.toggle('is-hidden', !next);
      if (next) nextButton.href = `#${next.id}`;
    }

    if (!options.skipHash) {
      const hash = `#${pages[activeIndex].id}`;
      if (window.location.hash !== hash) {
        history.pushState({ section: pages[activeIndex].id }, '', hash);
      }
    }
  }

  function goToHash(hash, options = {}) {
    const targetIndex = pages.findIndex((page) => `#${page.id}` === hash);
    if (targetIndex < 0) return false;

    setActiveIndex(targetIndex, options);
    return true;
  }

  pages.forEach((page) => {
    let scrollFrame = 0;

    page.element.addEventListener('scroll', () => {
      if (page.element !== getActiveSection() || scrollFrame) return;

      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        updateIndicatorVisibility(page.element);
      });
    }, { passive: true });
  });

  sectionLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      if (link.matches('[data-mobile-prev], [data-mobile-next]')) return;

      const href = link.getAttribute('href');

      if (!goToHash(href)) return;
      event.preventDefault();
    });
  });

  prevButton?.addEventListener('click', (event) => {
    event.preventDefault();
    setActiveIndex(activeIndex - 1);
  });

  nextButton?.addEventListener('click', (event) => {
    event.preventDefault();
    setActiveIndex(activeIndex + 1);
  });

  document.addEventListener('keydown', (event) => {
    if (isEditableTarget(event.target) || isInteractiveTarget(event.target)) return;

    const scrollKeys = new Set([
      ' ',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'PageUp',
      'PageDown',
      'Home',
      'End',
    ]);

    if (scrollKeys.has(event.key)) {
      event.preventDefault();
      scrollActiveSection(event.key, event.shiftKey);
    }
  }, true);

  window.addEventListener('popstate', () => {
    if (!goToHash(window.location.hash, { skipHash: true })) {
      setActiveIndex(0, { skipHash: true });
    }
  });

  if (!goToHash(window.location.hash, { skipHash: true })) {
    history.replaceState({ section: 'home' }, '', '#home');
    setActiveIndex(0, { skipHash: true });
  }
})();
