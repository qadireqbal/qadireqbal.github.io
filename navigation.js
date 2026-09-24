(() => {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  function updateScrollState() {
    nav.classList.toggle('is-scrolled', window.scrollY > 16);
  }

  window.addEventListener('scroll', updateScrollState, { passive: true });
  updateScrollState();
})();
