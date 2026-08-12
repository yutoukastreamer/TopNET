/* =============================================================
   TopNET GSI — горизонтальный свайп-переход между страницами.
   • уход:  body уезжает влево/вправо, затем переход по ссылке
   • въезд: body приезжает с противоположной стороны
   • позиция скролла главной хранится в sessionStorage и при
     возврате восстанавливается мгновенно, без анимации
   Трансформируется <body> — новых обёрток в разметке не требуется.
   ============================================================= */

(function () {
  'use strict';

  const DURATION   = 450;   // синхронно с transition в style.css
  const SAFETY     = 250;   // страховка поверх transitionend
  const SCROLL_KEY = 'topnet:indexScroll';
  const BACK_KEY   = 'topnet:returning';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const html = document.documentElement;
  const body = document.body;

  const isIndex = !!document.getElementById('hero');

  let navigating = false;   // повторные клики во время перехода игнорируются

  /* ---------- уход со страницы ---------- */
  const leave = (url, dir) => {
    if (navigating) return;
    navigating = true;

    // позицию главной сохраняем перед уходом
    if (isIndex) {
      try { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); } catch (e) {}
    }

    if (reduceMotion.matches) {
      window.location.href = url;
      return;
    }

    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      window.location.href = url;
    };

    html.classList.add('is-swiping');
    body.addEventListener('transitionend', (ev) => {
      if (ev.target === body && ev.propertyName === 'transform') go();
    });
    // страховка, если transitionend не придёт
    setTimeout(go, DURATION + SAFETY);

    // запускаем в следующем кадре, чтобы transition точно применился
    requestAnimationFrame(() => {
      body.classList.add(dir === 'left' ? 'page-exit-left' : 'page-exit-right');
    });
  };

  /* ---------- въезд на страницу ---------- */
  const enter = (fromClass) => {
    if (reduceMotion.matches) return;

    html.classList.add('is-swiping');
    body.classList.add(fromClass);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        body.classList.remove(fromClass);
        setTimeout(() => html.classList.remove('is-swiping'), DURATION + SAFETY);
      });
    });
  };

  /* =============================================================
     Главная страница
     ============================================================= */
  if (isIndex) {
    // возврат с contacts.html — восстанавливаем позицию мгновенно.
    // Скрипт подключён ДО main.js, поэтому main.js прочитает уже
    // восстановленный scrollY и не примет его за скролл вниз.
    let returning = false;
    try { returning = sessionStorage.getItem(BACK_KEY) === '1'; } catch (e) {}

    if (returning) {
      try {
        const y = parseInt(sessionStorage.getItem(SCROLL_KEY) || '0', 10);
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        if (y > 0) window.scrollTo(0, y);
      } catch (e) {}
      try { sessionStorage.removeItem(BACK_KEY); } catch (e) {}
      // без анимации въезда — по условию позиция восстанавливается мгновенно
    }

    // клик по «Контакты» — уход влево
    document.querySelectorAll('a[href="contacts.html"]').forEach(link => {
      link.addEventListener('click', (ev) => {
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
        ev.preventDefault();
        leave('contacts.html', 'left');
      });
    });
  }

  /* =============================================================
     Страница контактов
     ============================================================= */
  const contacts = document.querySelector('.contacts');
  if (contacts) {
    enter('page-enter-from-right');

    const back = () => {
      try { sessionStorage.setItem(BACK_KEY, '1'); } catch (e) {}
      leave('index.html', 'right');
    };

    const backBtn = document.getElementById('contactsBack');
    if (backBtn) backBtn.addEventListener('click', back);

    // логотип и пункты меню, ведущие на главную, — тем же свайпом вправо
    document.querySelectorAll('a[href="index.html"]').forEach(link => {
      link.addEventListener('click', (ev) => {
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
        ev.preventDefault();
        back();
      });
    });
  }
})();
