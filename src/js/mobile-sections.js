(function () {
  const mobileQuery = window.matchMedia('(max-width: 780px)');
  const prevButton = document.querySelector('[data-mobile-prev]');
  const nextButton = document.querySelector('[data-mobile-next]');
  const nav = document.querySelector('.mobile-page-nav');
  const dots = Array.from(document.querySelectorAll('.mobile-page-indicator span'));

  if (!nextButton || !nav) return;

  const pages = [
    { id: 'home', element: document.querySelector('.hero-section') },
    { id: 'about', element: document.getElementById('about') },
    { id: 'jobs', element: document.getElementById('jobs') },
    { id: 'contact', element: document.getElementById('contact') },
  ].filter((page) => page.element);

  let activeIndex = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  function setActiveIndex(index) {
    const nextIndex = Math.max(0, Math.min(index, pages.length - 1));
    const previousIndex = activeIndex;
    activeIndex = nextIndex;

    const previous = pages[activeIndex - 1];
    const next = pages[activeIndex + 1];

    pages.forEach((page, pageIndex) => {
      page.element.classList.toggle('is-mobile-active', pageIndex === activeIndex);
      page.element.classList.toggle('is-mobile-before', pageIndex < activeIndex);
      page.element.classList.toggle('is-mobile-after', pageIndex > activeIndex);
      page.element.setAttribute('aria-hidden', mobileQuery.matches && pageIndex !== activeIndex ? 'true' : 'false');
    });

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === activeIndex);
    });

    if (mobileQuery.matches && previousIndex !== activeIndex) {
      nav.classList.remove('is-moving-next', 'is-moving-prev');
      nav.classList.add(activeIndex > previousIndex ? 'is-moving-next' : 'is-moving-prev');
      window.setTimeout(() => {
        nav.classList.remove('is-moving-next', 'is-moving-prev');
      }, 360);
    }

    prevButton?.classList.toggle('is-hidden', !previous);
    nextButton.classList.toggle('is-hidden', !next);

    if (previous && prevButton) prevButton.href = `#${previous.id}`;
    if (next) nextButton.href = `#${next.id}`;

    nav.classList.toggle('is-on-hero', activeIndex === 0);
    document.body.dataset.mobilePage = pages[activeIndex]?.id || 'home';
    history.replaceState(null, '', `#${pages[activeIndex].id}`);
  }

  function goToPage(index) {
    if (!mobileQuery.matches) return;
    setActiveIndex(index);
  }

  function enableMobileMode() {
    document.body.classList.toggle('mobile-page-mode', mobileQuery.matches);

    if (!mobileQuery.matches) {
      pages.forEach((page) => {
        page.element.classList.remove('is-mobile-active', 'is-mobile-before', 'is-mobile-after');
        page.element.removeAttribute('aria-hidden');
      });
      document.body.removeAttribute('data-mobile-page');
      return;
    }

    const hashIndex = pages.findIndex((page) => `#${page.id}` === window.location.hash);
    setActiveIndex(hashIndex >= 0 ? hashIndex : activeIndex);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!mobileQuery.matches) return;
      if (link.matches('[data-mobile-next], [data-mobile-prev]')) return;

      const targetIndex = pages.findIndex((page) => `#${page.id}` === link.getAttribute('href'));
      if (targetIndex >= 0) {
        event.preventDefault();
        goToPage(targetIndex);
      }
    });
  });

  prevButton?.addEventListener('click', (event) => {
    event.preventDefault();
    goToPage(activeIndex - 1);
  });

  nextButton.addEventListener('click', (event) => {
    event.preventDefault();
    goToPage(activeIndex + 1);
  });

  document.addEventListener('touchstart', (event) => {
    if (!mobileQuery.matches || event.touches.length !== 1) return;

    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchEndX = touchStartX;
    touchEndY = touchStartY;
  }, { passive: true });

  document.addEventListener('touchmove', (event) => {
    if (!mobileQuery.matches || event.touches.length !== 1) return;

    touchEndX = event.touches[0].clientX;
    touchEndY = event.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (!mobileQuery.matches) return;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const isHorizontalSwipe = Math.abs(deltaX) > 58 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35;

    if (!isHorizontalSwipe) return;

    if (deltaX < 0) {
      goToPage(activeIndex + 1);
    } else {
      goToPage(activeIndex - 1);
    }
  }, { passive: true });

  window.addEventListener('resize', enableMobileMode);
  mobileQuery.addEventListener?.('change', enableMobileMode);

  enableMobileMode();
})();
