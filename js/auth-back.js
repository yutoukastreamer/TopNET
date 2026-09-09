/* =============================================================
   TopNET GSI — плавающая кнопка «Назад» на страницах ЛК.
   Если пользователь пришёл с сайта — возвращаем его на предыдущий
   экран; иначе (прямой заход, новая вкладка) срабатывает href="index.html".
   ============================================================= */

(function () {
  'use strict';

  const btn = document.querySelector('[data-back]');
  if (!btn) return;

  btn.addEventListener('click', (ev) => {
    const fromSite = document.referrer && document.referrer.indexOf(location.origin) === 0;
    if (fromSite && window.history.length > 1) {
      ev.preventDefault();
      window.history.back();
    }
  });
})();
