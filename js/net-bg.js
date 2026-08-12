/* =============================================================
   TopNET GSI — фоновая «сеть» поверх всего изображения HERO.
   Только hero: слой плавно гаснет, пока белая плашка наезжает
   на hero, поэтому на остальных секциях точек нет вообще.
   Каждая точка живёт своим циклом (появление → пауза → угасание →
   новое место), фазы независимы — порядок хаотичный.
   Ничего не трогает в layout — только отрисовка на canvas.
   ============================================================= */

(function () {
  'use strict';

  const canvas = document.getElementById('netBg');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const MOBILE = window.matchMedia('(max-width: 767px)');
  if (reduceMotion.matches || MOBILE.matches) return;

  const heroSection = document.getElementById('hero');
  if (!heroSection) return;

  const ctx = canvas.getContext('2d');

  // покрытие — вся площадь hero, поэтому точек больше, но каждая приглушена
  const POINTS     = 30;
  const LINK_DIST  = 165;   // порог связи (короткий — меньше «паутины»)
  const DOT_ALPHA  = 0.55;  // потолок яркости точки
  const LINE_ALPHA = 0.30;  // потолок яркости дуги
  const HERO_FADE  = 0.70;  // к этому прогрессу hero слой уже полностью погас

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand  = (a, b) => a + Math.random() * (b - a);

  /* ---------- геометрия ---------- */
  let vw = 0, vh = 0, dpr = 1;

  const measure = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width  = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  /* ---------- точки: экранные координаты (hero приколот sticky) ---------- */
  const points = [];

  // случайная позиция по всей площади изображения hero
  const place = (p) => {
    p.x = rand(8, vw - 8);
    p.y = rand(40, vh - 40);
    p.r = rand(1.4, 3.0);
  };

  // каждая точка стартует со случайной фазы — появления не синхронны
  const reset = (p, firstRun) => {
    place(p);
    p.fadeIn  = rand(900, 1800);
    p.hold    = rand(1800, 5200);
    p.fadeOut = rand(900, 1800);
    p.life    = firstRun ? Math.random() * (p.fadeIn + p.hold) : 0;
    p.alpha   = 0;
    p.drift   = Math.random() * Math.PI * 2;
    p.speed   = rand(0.10, 0.30);
  };

  for (let i = 0; i < POINTS; i++) {
    const p = {};
    reset(p, true);
    points.push(p);
  }

  /* ---------- дуга между точками ---------- */
  const arc = (a, b, alpha) => {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const bend = len * 0.18;
    const cx = mx + (-dy / len) * bend;
    const cy = my + (dx / len) * bend;

    ctx.strokeStyle = `rgba(247, 249, 251, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(cx, cy, b.x, b.y);
    ctx.stroke();
  };

  /* ---------- кадр ---------- */
  let prev = performance.now();

  const frame = (now) => {
    const dt = Math.min(now - prev, 50);   // защита от скачка после вкладки в фоне
    prev = now;

    // прогресс hero: 0 — hero целиком виден, 1 — плашка полностью его закрыла
    const rect  = heroSection.getBoundingClientRect();
    const total = heroSection.offsetHeight - vh;
    const p = total > 0 ? clamp(-rect.top / total, 0, 1) : 1;
    const layer = clamp(1 - p / HERO_FADE, 0, 1);   // общая видимость слоя

    ctx.clearRect(0, 0, vw, vh);

    // hero ушёл — не рисуем вообще, значит на других секциях точек нет
    if (layer <= 0.001) {
      requestAnimationFrame(frame);
      return;
    }

    // жизненный цикл каждой точки — независимый
    for (const pt of points) {
      pt.life += dt;
      const { fadeIn, hold, fadeOut } = pt;

      if (pt.life < fadeIn) {
        pt.alpha = pt.life / fadeIn;
      } else if (pt.life < fadeIn + hold) {
        pt.alpha = 1;
      } else if (pt.life < fadeIn + hold + fadeOut) {
        pt.alpha = 1 - (pt.life - fadeIn - hold) / fadeOut;
      } else {
        reset(pt, false);           // погасла — возрождается в новом месте
      }

      pt.drift += 0.006 * pt.speed;
      pt.x += Math.cos(pt.drift) * 0.10;
      pt.y += Math.sin(pt.drift) * 0.06;
    }

    // связи — под точками, по всей площади
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      for (let j = i + 1; j < points.length; j++) {
        const b = points[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist >= LINK_DIST) continue;
        const alpha = (1 - dist / LINK_DIST) * LINE_ALPHA * a.alpha * b.alpha * layer;
        if (alpha < 0.01) continue;
        arc(a, b, alpha);
      }
    }

    // точки + мягкое свечение
    for (const pt of points) {
      const a = pt.alpha * layer;
      if (a < 0.01) continue;

      const halo = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.r * 5);
      halo.addColorStop(0, `rgba(247, 249, 251, ${0.22 * a})`);
      halo.addColorStop(1, 'rgba(247, 249, 251, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(247, 249, 251, ${DOT_ALPHA * a})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(frame);
  };

  /* ---------- запуск ---------- */
  const init = () => {
    measure();
    points.forEach(p => place(p));   // разложить по актуальным размерам
    prev = performance.now();
    requestAnimationFrame(frame);
  };

  // scrollY/позиция hero читаются прямо в кадре rAF — scroll-обработчик не нужен
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
