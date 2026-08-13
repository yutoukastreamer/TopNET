/* =============================================================
   TopNET GSI — «Описание сети» (network.html):
   • липкие якоря: плавный скролл + подсветка активной секции
   • одометры «Сети в цифрах» — счёт при появлении в кадре
   • табы RTK / VRS с перезапуском анимации схемы
   • декодер имени точки доступа (hover / фокус / клик)
   ============================================================= */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Липкие якоря ---------- */
  const chips    = Array.from(document.querySelectorAll('.anchor-chip'));
  const sections = chips
    .map(c => document.querySelector(c.getAttribute('href')))
    .filter(Boolean);

  if (chips.length && sections.length) {
    // отступ = фиксированная шапка + сама панель якорей
    const offset = () => {
      const header  = document.getElementById('site-header');
      const anchors = document.querySelector('.np-anchors');
      return (header ? header.offsetHeight : 0) + (anchors ? anchors.offsetHeight : 0) + 8;
    };

    chips.forEach((chip) => {
      chip.addEventListener('click', (ev) => {
        const target = document.querySelector(chip.getAttribute('href'));
        if (!target) return;
        ev.preventDefault();
        const y = target.getBoundingClientRect().top + window.scrollY - offset();
        window.scrollTo({
          top: Math.max(0, y),
          behavior: reduceMotion.matches ? 'auto' : 'smooth'
        });
      });
    });

    // подсветка: активна последняя секция, чей верх прошёл линию отступа
    const setActive = (id) => {
      chips.forEach(c => c.classList.toggle('is-active', c.getAttribute('href') === '#' + id));
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const line = offset() + 24;
        let current = sections[0];
        sections.forEach((s) => {
          if (s.getBoundingClientRect().top <= line) current = s;
        });
        if (current) setActive(current.id);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Одометры ---------- */
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  const runOdometer = (el) => {
    const target = parseFloat(el.dataset.count);
    const prefix = el.dataset.prefix || '';
    const plain  = el.hasAttribute('data-plain');   // год — без разделителей разрядов
    const format = v => prefix + (plain ? String(Math.round(v)) : Math.round(v).toLocaleString('ru-RU'));

    if (reduceMotion.matches) {
      el.textContent = format(target);
      return;
    }

    const dur = 1500;
    const t0  = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      el.textContent = format(target * easeOut(p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const odoCards = document.querySelectorAll('.odo');
  if (odoCards.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const card  = entry.target;
        card.classList.add('is-in');
        const value = card.querySelector('.odo__value[data-count]');
        if (value && !value.dataset.done) {
          value.dataset.done = '1';
          runOdometer(value);
        }
        io.unobserve(card);
      });
    }, { threshold: 0.35 });
    odoCards.forEach(c => io.observe(c));
  }

  /* ---------- Табы RTK / VRS ---------- */
  const tabs = Array.from(document.querySelectorAll('.tab'));

  const replayScheme = (panel) => {
    const scheme = panel.querySelector('.scheme');
    if (!scheme) return;
    scheme.classList.remove('is-anim');
    void scheme.offsetWidth;          // сброс, чтобы анимация проигралась заново
    scheme.classList.add('is-anim');
  };

  const selectTab = (tab) => {
    tabs.forEach((t) => {
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      const on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (panel) {
        panel.hidden = !on;
        if (on) replayScheme(panel);
      }
    });
  };

  if (tabs.length) {
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => selectTab(tab));
      tab.addEventListener('keydown', (ev) => {
        if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
        ev.preventDefault();
        const next = tabs[(i + (ev.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        next.focus();
        selectTab(next);
      });
    });

    // первая схема оживает, когда секция доезжает до экрана
    const techSection = document.getElementById('tech');
    if (techSection) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const panel = techSection.querySelector('.tech__panel:not([hidden])');
          if (panel) replayScheme(panel);
          io.unobserve(entry.target);
        });
      }, { threshold: 0.25 });
      io.observe(techSection);
    }
  }

  /* ---------- Декодер имени точки доступа ---------- */
  const segs  = Array.from(document.querySelectorAll('.mount__seg'));
  const items = Array.from(document.querySelectorAll('.mount__item'));

  if (segs.length && items.length) {
    const showSeg = (key) => {
      segs.forEach(s => s.classList.toggle('is-active', s.dataset.seg === key));
      items.forEach(i => i.classList.toggle('is-active', i.dataset.for === key));
    };

    segs.forEach((seg) => {
      const key = seg.dataset.seg;
      seg.addEventListener('mouseenter', () => showSeg(key));
      seg.addEventListener('focus',      () => showSeg(key));
      seg.addEventListener('click',      () => showSeg(key));
    });
  }
})();
