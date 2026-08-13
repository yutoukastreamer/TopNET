/* =============================================================
   TopNET GSI — боковая «сеть»: точки/дуги в боковых полях страницы.
   Рисует на фиксированном #netBg по всей длине страницы (в отличие
   от net-bg.js, который отвечает только за hero и живёт внутри него).
   Точки живут строго ЗА пределами колонки контента (--container),
   поэтому слой никогда не перекрывает текст и кнопки.
   Цвет подстраивается под секцию: на тёмных — светлые точки,
   на светлых — фирменный синий.
   Ничего не трогает в layout — только отрисовка на canvas.
   ============================================================= */

(function () {
  'use strict';

  const canvas = document.getElementById('netBg');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const MOBILE = window.matchMedia('(max-width: 767px)');
  if (reduceMotion.matches || MOBILE.matches) return;

  const ctx = canvas.getContext('2d');

  const POINTS     = 22;
  const LINK_DIST  = 150;
  const DOT_ALPHA  = 0.55;
  const LINE_ALPHA = 0.28;
  const MIN_BAND   = 44;    // уже этого поля рисовать нечего

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand  = (a, b) => a + Math.random() * (b - a);

  // тёмные секции: над ними точки светлые, над остальными — синие
  const DARK_SELECTORS = ['.hero', '.feature', '.network', '.footer'];

  /* ---------- геометрия боковых полей ---------- */
  let vw = 0, vh = 0, dpr = 1, band = 0;

  const measure = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width  = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // поле = всё до левого края текста: поля страницы + padding контейнера
    const box = document.querySelector('.container');
    if (box) {
      const r = box.getBoundingClientRect();
      const pad = parseFloat(getComputedStyle(box).paddingLeft) || 0;
      band = Math.max(0, r.left + pad);
    } else {
      band = Math.max(0, (vw - Math.min(1200, vw)) / 2);
    }
  };

  /* ---------- точки ---------- */
  const points = [];

  const place = (p) => {
    p.side = Math.random() < 0.5 ? -1 : 1;                 // -1 слева, +1 справа
    const x = rand(6, Math.max(7, band - 6));
    p.x = p.side < 0 ? x : vw - x;
    p.y = rand(30, vh - 30);
    p.r = rand(1.4, 2.8);
  };

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

  /* ---------- цвет под текущей секцией ---------- */
  let darkness = 1;   // 1 — тёмный фон (светлые точки), 0 — светлый (синие)

  const darkTargets = () => {
    const mid = vh / 2;
    for (const sel of DARK_SELECTORS) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) return 1;
    }
    return 0;
  };

  const rgb = () => (darkness > 0.5 ? '247, 249, 251' : '14, 90, 167');

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

    ctx.strokeStyle = `rgba(${rgb()}, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(cx, cy, b.x, b.y);
    ctx.stroke();
  };

  /* ---------- кадр ---------- */
  let prev = performance.now();

  const frame = (now) => {
    const dt = Math.min(now - prev, 50);
    prev = now;

    ctx.clearRect(0, 0, vw, vh);

    // поля слишком узкие — слой просто молчит, контент не задевается
    if (band < MIN_BAND) {
      requestAnimationFrame(frame);
      return;
    }

    darkness += (darkTargets() - darkness) * 0.06;

    // жёсткая отсечка по боковым полям: ни свечение, ни дрейф точки
    // не могут выйти на колонку с текстом
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, band, vh);
    ctx.rect(vw - band, 0, band, vh);
    ctx.clip();

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
        reset(pt, false);
      }

      pt.drift += 0.006 * pt.speed;
      pt.x += Math.cos(pt.drift) * 0.10;
      pt.y += Math.sin(pt.drift) * 0.06;
    }

    // связи — только между точками одного поля, иначе дуга пересекла бы контент
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      for (let j = i + 1; j < points.length; j++) {
        const b = points[j];
        if (a.side !== b.side) continue;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist >= LINK_DIST) continue;
        const alpha = (1 - dist / LINK_DIST) * LINE_ALPHA * a.alpha * b.alpha;
        if (alpha < 0.01) continue;
        arc(a, b, alpha);
      }
    }

    for (const pt of points) {
      const a = pt.alpha;
      if (a < 0.01) continue;

      const halo = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.r * 5);
      halo.addColorStop(0, `rgba(${rgb()}, ${0.22 * a})`);
      halo.addColorStop(1, `rgba(${rgb()}, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${rgb()}, ${DOT_ALPHA * a})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    requestAnimationFrame(frame);
  };

  /* ---------- запуск ---------- */
  const init = () => {
    measure();
    points.forEach(p => place(p));
    darkness = darkTargets();
    prev = performance.now();
    requestAnimationFrame(frame);
  };

  window.addEventListener('resize', () => { measure(); points.forEach(p => place(p)); });
  window.addEventListener('load', measure);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
