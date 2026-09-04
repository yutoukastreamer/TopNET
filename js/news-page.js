/* =============================================================
   TopNET GSI — «Новости» (news.html):
   • scroll-reveal карточек таймлайна (с уважением к prefers-reduced-motion)
   • раскрытие полного текста по кнопке «Читать подробнее»
   ============================================================= */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const timeline = document.querySelector('.timeline');
  if (!timeline) return;

  /* ---------- Переход по прямой ссылке на конкретную новость ----------
     Напр. с карусели на главной: news.html#post-slug. Браузер уже сделал
     свой нативный прыжок к элементу — здесь только поправляем позицию,
     чтобы карточка не пряталась под фиксированной шапкой (для последней
     карточки ленты native-прыжок вместе с scroll-margin-top уводил
     скролл в самый низ страницы, поэтому оффсет считаем в JS). */
  if (location.hash) {
    let target;
    try { target = document.querySelector(location.hash); } catch (e) { target = null; }
    if (target && target.classList.contains('tl-item')) {
      const header = document.getElementById('site-header');
      const offset = (header ? header.offsetHeight : 0) + 20;
      requestAnimationFrame(() => {
        const y = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo(0, Math.max(0, y));
      });
    }
  }

  /* ---------- Scroll-reveal ---------- */
  const items = Array.from(timeline.querySelectorAll('.tl-item, .tl-year'));

  if (items.length && !reduceMotion.matches && 'IntersectionObserver' in window) {
    // класс ставим из JS: без JS контент виден сразу
    timeline.classList.add('is-reveal');

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // лёгкая лесенка внутри одного «экрана»
        const delay = Number(el.dataset.revealDelay || 0);
        el.style.transitionDelay = delay + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach((el, i) => {
      el.dataset.revealDelay = String(Math.min(i, 3) * 70);
      io.observe(el);
    });
  }

  /* ---------- «Читать подробнее» ---------- */
  timeline.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.tl-more');
    if (!btn || !timeline.contains(btn)) return;

    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;

    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    panel.hidden = expanded;

    const label = btn.querySelector('.tl-more__label');
    if (label) label.textContent = expanded ? 'Читать подробнее' : 'Свернуть';

    // краткий текст показываем только в свёрнутом виде
    const content = panel.closest('.tl-card__content');
    const excerpt = content && content.querySelector('.tl-card__excerpt');
    if (excerpt) excerpt.hidden = !expanded;

    // при сворачивании возвращаем карточку в поле зрения
    const card = btn.closest('.tl-item');
    if (expanded && card) {
      const header = document.getElementById('site-header');
      const offset = (header ? header.offsetHeight : 0) + 20;
      const top = card.getBoundingClientRect().top + window.scrollY - offset;
      if (window.scrollY > top) {
        window.scrollTo({
          top,
          behavior: reduceMotion.matches ? 'auto' : 'smooth'
        });
      }
    }
  });
})();
