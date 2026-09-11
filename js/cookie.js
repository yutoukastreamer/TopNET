/* =============================================================
   TopNET GSI — согласие на обработку cookie.
   Плашка показывается один раз: ответ храним в localStorage.
   ============================================================= */

(function () {
  'use strict';

  var KEY = 'topnet-cookie-consent';
  var banner = document.querySelector('[data-cookie]');
  if (!banner) return;

  var accepted;
  try {
    accepted = window.localStorage.getItem(KEY) === '1';
  } catch (e) {
    // приватный режим/запрет хранилища — покажем плашку, но запомнить не сможем
    accepted = false;
  }
  if (accepted) return;

  // высота плашки нужна вёрстке: на узком экране над ней поднимается
  // плавающая кнопка «Назад» в личном кабинете
  var syncHeight = function () {
    document.body.style.setProperty('--cookie-h', banner.offsetHeight + 'px');
  };

  var show = function () {
    banner.hidden = false;
    document.body.classList.add('has-cookie');
    syncHeight();
    window.addEventListener('resize', syncHeight);
    // класс в следующем кадре — иначе появление произойдёт без анимации
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { banner.classList.add('is-shown'); });
    });
  };

  var hide = function () {
    banner.classList.remove('is-shown');
    document.body.classList.remove('has-cookie');
    window.removeEventListener('resize', syncHeight);
    document.body.style.removeProperty('--cookie-h');
    try { window.localStorage.setItem(KEY, '1'); } catch (e) {}
    window.setTimeout(function () { banner.hidden = true; }, 400);
  };

  var btn = banner.querySelector('[data-cookie-accept]');
  if (btn) btn.addEventListener('click', hide);

  show();
})();
