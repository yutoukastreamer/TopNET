/* =============================================================
   TopNET GSI — кнопка «Наверх».
   Автономный скрипт: подключается на всех страницах, включая ЛК,
   регистрацию и оплату (там нет js/main.js). Стили — css/to-top.css.
   ============================================================= */
(function () {
  'use strict';

  var SHOW_AFTER = 600;                       // порог прокрутки, px
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('.to-top')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'to-top';
    btn.setAttribute('aria-label', 'Наверх');
    btn.innerHTML =
      '<svg class="to-top__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M6 14l6-6 6 6" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>';
    document.body.appendChild(btn);

    var ticking = false;
    var sync = function () {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      btn.classList.toggle('is-shown', y > SHOW_AFTER);
    };
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(sync);
    }, { passive: true });
    sync();

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' });
    });

    // плашка cookie на узких экранах занимает низ экрана — отдаём её высоту в CSS
    var cookie = document.querySelector('[data-cookie]');
    if (cookie && window.ResizeObserver) {
      var setCookieH = function () {
        document.documentElement.style.setProperty('--cookie-h', cookie.offsetHeight + 'px');
      };
      new ResizeObserver(setCookieH).observe(cookie);
      setCookieH();
    }
  });
})();
