/* =============================================================
   TopNET GSI — правовые документы (privacy.html):
   подсветка текущего раздела в оглавлении при скролле.
   ============================================================= */

(function () {
  'use strict';

  var links = Array.prototype.slice.call(document.querySelectorAll('.legal-toc__link'));
  if (!links.length || !('IntersectionObserver' in window)) return;

  var byId = {};
  var sections = [];
  links.forEach(function (link) {
    var id = link.getAttribute('href').slice(1);
    var sec = document.getElementById(id);
    if (!sec) return;
    byId[id] = link;
    sections.push(sec);
  });

  var setActive = function (id) {
    links.forEach(function (l) { l.classList.remove('is-active'); });
    if (byId[id]) byId[id].classList.add('is-active');
  };

  var visible = {};
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      visible[entry.target.id] = entry.isIntersecting;
    });
    // активен самый верхний из видимых разделов
    for (var i = 0; i < sections.length; i++) {
      if (visible[sections[i].id]) { setActive(sections[i].id); return; }
    }
  }, { rootMargin: '-120px 0px -55% 0px', threshold: 0 });

  sections.forEach(function (sec) { io.observe(sec); });
  setActive(sections[0].id);
})();
