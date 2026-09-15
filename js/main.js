/* =============================================================
   TopNET GSI — main.js
   ============================================================= */

   (function () {
    'use strict';
  
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const ease  = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  
    /* ---------- Header: фон при скролле + скрытие у подвала ----------
       Шапка уезжает вверх, когда пользователь докрутил до подвала и
       продолжает листать вниз; при скролле вверх — возвращается. */
    const header = document.getElementById('site-header');
    const siteFooter = document.querySelector('.footer');
    let headerLastY = window.scrollY;

    const onScrollHeader = () => {
      const y = window.scrollY;
      if (y > 40) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');

      // подвал во вьюпорте — значит докрутили до низа страницы
      const atFooter = siteFooter
        ? siteFooter.getBoundingClientRect().top <= window.innerHeight
        : y + window.innerHeight >= document.documentElement.scrollHeight - 4;

      if (atFooter && y > headerLastY + 2) header.classList.add('is-hidden');
      else if (y < headerLastY - 2 || !atFooter) header.classList.remove('is-hidden');

      headerLastY = y;
    };
    onScrollHeader();

    /* ---------- Burger menu (ширины, где .nav скрыта) ---------- */
    const burger = header ? header.querySelector('.burger') : null;
    const nav    = header ? header.querySelector('.nav') : null;

    if (burger && nav) {
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-controls', 'site-nav');
      if (!nav.id) nav.id = 'site-nav';

      const setMenu = (open) => {
        header.classList.toggle('is-menu-open', open);
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Меню');
      };
      const isOpen = () => header.classList.contains('is-menu-open');

      // тот же круг закрывает меню — отдельной кнопки не нужно
      burger.addEventListener('click', (ev) => {
        ev.stopPropagation();
        setMenu(!isOpen());
      });

      // клик по ссылке — обычный переход и закрытие меню
      nav.addEventListener('click', (ev) => {
        if (ev.target.closest('.nav__link')) setMenu(false);
      });

      // клик вне меню
      document.addEventListener('click', (ev) => {
        if (!isOpen()) return;
        if (!ev.target.closest('.header')) setMenu(false);
      });

      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && isOpen()) setMenu(false);
      });

      // вернулись на широкий экран — состояние сбрасываем
      const wide = window.matchMedia('(min-width: 961px)');
      const onWide = (e) => { if (e.matches) setMenu(false); };
      if (wide.addEventListener) wide.addEventListener('change', onWide);
      else wide.addListener(onWide);
    }

    /* ---------- Nav dropdown «Описание» (hover-intent + accordion на мобильных) ---------- */
    const dropdowns = header ? Array.from(header.querySelectorAll('.nav__item--dropdown')) : [];
    if (dropdowns.length) {
      const desktopMQ = window.matchMedia('(min-width: 961px)');
      const OPEN_DELAY  = 150;
      const CLOSE_DELAY = 120;

      const closeAllDropdowns = () => {
        dropdowns.forEach((item) => {
          item.classList.remove('is-open');
          const t = item.querySelector('.nav__trigger');
          if (t) t.setAttribute('aria-expanded', 'false');
        });
      };

      dropdowns.forEach((item) => {
        const trigger = item.querySelector('.nav__trigger');
        const panel   = item.querySelector('.nav__dropdown');
        if (!trigger || !panel) return;

        let openTimer  = null;
        let closeTimer = null;
        trigger.setAttribute('aria-expanded', 'false');

        const openDD  = () => { item.classList.add('is-open'); trigger.setAttribute('aria-expanded', 'true'); };
        const closeDD = () => { item.classList.remove('is-open'); trigger.setAttribute('aria-expanded', 'false'); };

        // десктоп: открытие/закрытие по hover-intent (~150мс)
        item.addEventListener('mouseenter', () => {
          if (!desktopMQ.matches) return;
          clearTimeout(closeTimer);
          openTimer = setTimeout(openDD, OPEN_DELAY);
        });
        item.addEventListener('mouseleave', () => {
          if (!desktopMQ.matches) return;
          clearTimeout(openTimer);
          closeTimer = setTimeout(closeDD, CLOSE_DELAY);
        });

        // клавиатура: фокус внутри пункта открывает, выход — закрывает
        item.addEventListener('focusin', () => { if (desktopMQ.matches) openDD(); });
        item.addEventListener('focusout', (ev) => {
          if (!desktopMQ.matches) return;
          if (!item.contains(ev.relatedTarget)) closeDD();
        });

        // клик по триггеру — переключение (аккордеон на мобильных, страховка на десктопе);
        // stopPropagation не даёт общему обработчику .nav__link закрыть всё бургер-меню
        trigger.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (item.classList.contains('is-open')) closeDD(); else openDD();
        });

        // выбор пункта — закрыть дропдаун (переход по ссылке произойдёт как обычно)
        panel.addEventListener('click', (ev) => {
          if (ev.target.closest('.nav__dd-link')) closeDD();
        });
      });

      // клик вне открытого дропдауна
      document.addEventListener('click', (ev) => {
        dropdowns.forEach((item) => {
          if (item.classList.contains('is-open') && !item.contains(ev.target)) {
            item.classList.remove('is-open');
            const t = item.querySelector('.nav__trigger');
            if (t) t.setAttribute('aria-expanded', 'false');
          }
        });
      });

      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') closeAllDropdowns();
      });

      const onDesktopChange = () => closeAllDropdowns();
      if (desktopMQ.addEventListener) desktopMQ.addEventListener('change', onDesktopChange);
      else desktopMQ.addListener(onDesktopChange);
    }

    /* ---------- Hero parallax (CRH-style: About slides UP over pinned hero) ---------- */
    const heroSection = document.getElementById('hero');
    const heroBg      = document.getElementById('heroBg');
    const heroContent = heroSection ? heroSection.querySelector('.hero__content') : null;
    const heroHint    = heroSection ? heroSection.querySelector('.hero__scroll') : null;
  
    /* Auto-snap: whenever About's top edge crosses the middle of the pinned hero
       (p === 0.5), finish the movement in the direction the user is going —
       down completes the lift (p → 1), up puts the hero back (p → 0).
       Disabled for reduced motion. */
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Asymmetric hysteresis: the two trigger points differ, so hovering around
    // one threshold can never re-fire the snap.
    const SNAP_DOWN    = 0.50;  // scrolling down: About's edge at 50% of hero
    const SNAP_UP      = 0.40;  // scrolling up: fires lower, at 40%
    const SNAP_DUR     = 600;

    const SNAP_GRACE   = 150;   // ignore the tail of the gesture that triggered us

    let snapDownArmed = true;
    let snapUpArmed   = true;
    let snapping   = false;
    let snapRAF    = 0;
    let snapStart  = 0;
    let snapDir    = 1;         // +1 snapping down, -1 snapping up
    let prevWheel  = Infinity;  // for telling real input from decaying momentum
    let lastScrollY = window.scrollY;

    const cancelSnap = () => {
      if (!snapping) return;
      cancelAnimationFrame(snapRAF);
      snapping = false;
    };

    const snapTo = (target) => {
      if (Math.abs(target - window.scrollY) < 2) return;
      snapping  = true;
      snapDir   = Math.sign(target - window.scrollY);
      snapStart = performance.now();
      prevWheel = Infinity;

      let from = 0;
      let t0   = 0;

      const step = (now) => {
        if (!snapping) return;               // user took over
        if (!t0) {
          // First frame reads the *live* start state. Capturing it back in the
          // scroll handler meant frame one scrolled back to a position one
          // frame stale — that snap-back was the visible jerk.
          t0 = snapStart = now;
          from = window.scrollY;
          if (Math.abs(target - from) < 2) { snapping = false; return; }
          snapDir = Math.sign(target - from);
        }

        const live = window.scrollY;
        if ((live - target) * snapDir >= 0) { snapping = false; return; } // momentum got us there

        const t = clamp((now - t0) / SNAP_DUR, 0, 1);
        const u = easeInOutCubic(t);
        let y = from + (target - from) * u;

        // Momentum can run ahead of the curve; follow it instead of pulling
        // back (moving against snapDir is what reads as a jerk). Re-anchor so
        // the curve still lands exactly on target at t === 1.
        if ((live - y) * snapDir > 0) {
          y = live;
          if (u < 0.999) from = target - (target - live) / (1 - u);
        }

        window.scrollTo(0, y);
        if (t < 1) snapRAF = requestAnimationFrame(step);
        else snapping = false;
      };

      snapRAF = requestAnimationFrame(step);
    };

    const updateHero = () => {
      if (!heroSection) return;
      const rect  = heroSection.getBoundingClientRect();
      // hero-section is 200vh; scroll progress 0..1 across the 100vh sticky window
      const total = heroSection.offsetHeight - window.innerHeight;
      const p = clamp(-rect.top / total, 0, 1);

      // Auto-snap in whichever direction the user is scrolling.
      if (!reduceMotion.matches) {
        // each direction re-arms only once p is past the *other* threshold
        if (p < SNAP_UP)   snapDownArmed = true;
        if (p > SNAP_DOWN) snapUpArmed   = true;

        const top = window.scrollY + rect.top;   // scroll position where p === 0
        if (!snapping) {
          if (snapDownArmed && p >= SNAP_DOWN && p < 1 && window.scrollY > lastScrollY) {
            snapDownArmed = false;
            snapTo(top + total);                 // finish the lift
          } else if (snapUpArmed && p <= SNAP_UP && p > 0 && window.scrollY < lastScrollY) {
            snapUpArmed = false;
            snapTo(top);                         // put the hero back
          }
        }
      }

      // Parallax is scroll-linked, so it maps linearly off p — easing a scroll
      // position makes the velocity uneven and reads as stutter.
      // Background: slow downward drift only; the zoom is a fixed scale in CSS.
      if (heroBg) {
        heroBg.style.transform = `translate3d(0, ${p * 60}px, 0) scale(1.08)`;
      }
      // Content: gentle upward parallax + fade so it looks like About slides on top.
      if (heroContent) {
        heroContent.style.transform = `translate3d(0, ${-p * 70}px, 0)`;
        heroContent.style.opacity   = String(1 - clamp(p * 1.2, 0, 1));
      }
      // Scroll hint disappears quickly once user starts scrolling.
      if (heroHint) {
        heroHint.style.opacity = String(1 - clamp(p * 3, 0, 1));
      }
    };
  
    /* ---------- Stats counters ---------- */
    const statNodes = document.querySelectorAll('.stat');
    const animateCount = (el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const isFloat = String(target).includes('.');
      const isK = suffix === 'K';
      const dur = 1600;
      const t0 = performance.now();
      const step = (now) => {
        const p = clamp((now - t0) / dur, 0, 1);
        const eased = ease(p);
        const val = target * eased;
        let out;
        if (isK) out = Math.round(val).toLocaleString('ru-RU') + 'K';
        else if (isFloat) out = val.toFixed(1);
        else out = Math.round(val).toLocaleString('ru-RU');
        el.textContent = out + (suffix && !isK ? suffix : '');
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
  
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add('is-in');
          const value = el.querySelector('.stat__value');
          if (value && !value.dataset.done) {
            value.dataset.done = '1';
            animateCount(value);
          }
          statsObserver.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    statNodes.forEach(n => statsObserver.observe(n));
  
    /* ---------- Master scroll handler ---------- */
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          onScrollHeader();
          updateHero();
          lastScrollY = window.scrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    /* Auto-snap yields to the user — but macOS momentum keeps firing `wheel`
       for a while after the flick that triggered the snap, so only a *fresh*
       gesture counts: an upward flick, or a delta bigger than the last one
       (momentum only ever decays). */
    const SNAP_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
    window.addEventListener('wheel', (ev) => {
      if (!snapping) return;
      if (performance.now() - snapStart < SNAP_GRACE) return;
      const d = Math.abs(ev.deltaY);
      // opposite to where we're snapping, or a delta bigger than the last one
      if (Math.sign(ev.deltaY) === -snapDir || d > prevWheel + 0.5) cancelSnap();
      prevWheel = d;
    }, { passive: true });
    window.addEventListener('touchstart', cancelSnap, { passive: true });
    window.addEventListener('keydown', (ev) => {
      if (SNAP_KEYS.includes(ev.key)) cancelSnap();
    }, { passive: true });
    window.addEventListener('resize', () => {
      updateHero();
    });
  
    /* ---------- Init ---------- */
    document.addEventListener('DOMContentLoaded', () => {
      updateHero();
    });
  
    // if DOM is already parsed
    if (document.readyState !== 'loading') {
      updateHero();
    }
  })();
  