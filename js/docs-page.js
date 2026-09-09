/* =============================================================
   TopNET GSI — страница «Документация» (docs.html).
   Фильтр картотеки по типу документа + счётчик показанных.
   ============================================================= */

(function () {
  'use strict';

  const grid = document.querySelector('[data-docs-grid]');
  if (!grid) return;

  const filters = Array.from(document.querySelectorAll('[data-filter]'));
  const items   = Array.from(grid.children);
  const shown   = document.querySelector('[data-docs-shown]');

  const apply = (cat) => {
    let visible = 0;
    items.forEach((li) => {
      const match = cat === 'all' || li.dataset.cat === cat;
      li.hidden = !match;
      if (match) visible += 1;
    });
    if (shown) shown.textContent = String(visible);

    filters.forEach((btn) => {
      const active = btn.dataset.filter === cat;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  };

  filters.forEach((btn) => {
    btn.addEventListener('click', () => apply(btn.dataset.filter));
  });
})();
