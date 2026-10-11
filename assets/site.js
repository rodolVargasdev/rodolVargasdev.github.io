(function () {
  var root = document.documentElement;

  /* language preference: only the English home may redirect, once, to its Spanish
     counterpart. The preference is written before the redirect, so the Spanish home
     (which never redirects) cannot send the visitor back. */
  var LANG_KEY = "portfolio.lang";
  (function rememberedLanguage() {
    if (root.getAttribute("data-page") !== "home" || root.getAttribute("lang") !== "en") return;
    if (navigator.webdriver) return;
    var pref;
    try { pref = localStorage.getItem(LANG_KEY); } catch (e) { return; }
    if (pref !== "en" && pref !== "es") {
      var first = (navigator.languages && navigator.languages[0]) || navigator.language || "";
      pref = /^es(-|$)/i.test(first) ? "es" : "en";
      try { localStorage.setItem(LANG_KEY, pref); } catch (e) { return; }
    }
    var alt = root.getAttribute("data-lang-alt");
    if (pref === "es" && alt) location.replace(new URL(alt, location.href).href + location.hash);
  })();

  /* a click on the switch stores the choice before the browser follows the link */
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest(".lang-switch a[data-lang]") : null;
    var lang = a && a.getAttribute("data-lang");
    if (lang !== "en" && lang !== "es") return;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  });

  try {
    var saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  } catch (e) {}

  root.classList.add("js");
  var mqReduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function animAllowed() { return !(mqReduce && mqReduce.matches); }
  function syncAnim() { root.classList.toggle("anim", animAllowed()); }
  syncAnim();

  function current() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function qs(s) { return document.querySelector(s); }
  function qsa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }

  document.addEventListener("DOMContentLoaded", function () {
    /* theme toggle */
    var btn = document.getElementById("theme-toggle");
    /* the button text comes from the page (data attributes), never from this script */
    function label() {
      var lightLabel = btn.getAttribute("data-label-to-light");
      var darkLabel = btn.getAttribute("data-label-to-dark");
      var lightAria = btn.getAttribute("data-aria-to-light");
      var darkAria = btn.getAttribute("data-aria-to-dark");
      if (lightLabel === null || darkLabel === null || lightAria === null || darkAria === null) return;
      var dark = current() === "dark";
      btn.textContent = dark ? lightLabel : darkLabel;
      btn.setAttribute("aria-label", dark ? lightAria : darkAria);
    }
    if (btn) {
      label();
      btn.addEventListener("click", function () {
        var next = current() === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("theme", next); } catch (e) {}
        label();
        window.dispatchEvent(new Event("themechange"));
      });
    }

    /* landing only: scroll effects */
    var statement = qs("#statement-text");
    if (!statement) return;

    var words = [];
    (function splitWords() {
      var text = statement.textContent.trim().split(/\s+/);
      statement.setAttribute("aria-label", statement.textContent.trim());
      statement.textContent = "";
      text.forEach(function (w, i) {
        var s = document.createElement("span");
        s.className = "w";
        s.setAttribute("aria-hidden", "true");
        s.textContent = w;
        statement.appendChild(s);
        if (i < text.length - 1) statement.appendChild(document.createTextNode(" "));
        words.push(s);
      });
    })();

    var statementScene = qs("#statement");
    var loopScene = qs("#loop-scene");
    var steps = qsa("#loop-steps li");
    var nodes = qsa(".loop .node");
    var segs = qsa(".loop .seg");
    var narrow = window.matchMedia("(max-width: 899px)");
    var chapters = qsa(".chapter").map(function (c) {
      return { el: c, img: c.querySelector(".shot img"), text: c.querySelector(".chapter-text") };
    });
    var hero = qs(".hero");
    var heroCopy = qs(".hero-copy");
    var navLinks = qsa(".site-head nav a");
    var navTargets = navLinks.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
    var activeStep = -1;
    var ticking = false;

    function setStep(i) {
      if (i === activeStep) return;
      activeStep = i;
      steps.forEach(function (li, k) { li.classList.toggle("active", k === i); });
      nodes.forEach(function (n, k) {
        n.classList.toggle("active", k === i);
        n.classList.toggle("done", k < i);
      });
      segs.forEach(function (s, k) { s.classList.toggle("done", k < i); });
    }

    function pinProgress(el) {
      var r = el.getBoundingClientRect();
      var span = r.height - window.innerHeight;
      return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
    }

    function clearInline() {
      words.forEach(function (w) { w.classList.add("lit"); });
      chapters.forEach(function (c) {
        if (c.img) c.img.style.transform = "";
        if (c.text) { c.text.style.opacity = ""; c.text.style.transform = ""; }
      });
      if (heroCopy) { heroCopy.style.opacity = ""; heroCopy.style.transform = ""; }
      steps.forEach(function (li) { li.classList.remove("active"); });
      nodes.forEach(function (n) { n.classList.remove("active", "done"); });
      segs.forEach(function (s) { s.classList.remove("done"); });
      activeStep = -1;
    }

    function update() {
      ticking = false;
      var vh = window.innerHeight;

      /* current section in the nav */
      var probe = vh * 0.35, cur = -1;
      navTargets.forEach(function (t, k) {
        if (!t) return;
        var r = t.getBoundingClientRect();
        if (r.top <= probe) cur = k;
      });
      navLinks.forEach(function (a, k) {
        if (k === cur) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });

      if (!animAllowed()) return;

      /* hero copy drifts and fades as the scene takes over */
      var hr = hero.getBoundingClientRect();
      if (hr.bottom > 0) {
        var hp = clamp(-hr.top / (hr.height * 0.7), 0, 1);
        heroCopy.style.opacity = String(1 - hp);
        heroCopy.style.transform = "translate3d(0," + (hp * -40).toFixed(1) + "px,0)";
      }

      /* statement: words light up while the sentence is pinned */
      var sr = statementScene.getBoundingClientRect();
      if (sr.bottom > -vh && sr.top < vh * 2) {
        var sp = clamp(-sr.top / (sr.height - vh) * 1.15, 0, 1);
        var lit = sp * words.length;
        words.forEach(function (w, k) { w.classList.toggle("lit", k < Math.ceil(lit - 0.001) || sp >= 1); });
      }

      /* loop: steps advance with scroll */
      var lr = loopScene.getBoundingClientRect();
      if (lr.bottom > 0 && lr.top < vh) {
        var lp = pinProgress(loopScene);
        setStep(clamp(Math.floor(lp * steps.length), 0, steps.length - 1));
      }

      /* case chapters: screen scales in, text follows */
      if (!narrow.matches) chapters.forEach(function (c) {
        var r = c.el.getBoundingClientRect();
        if (r.bottom < -vh * 0.2 || r.top > vh * 1.2) return;
        var p = pinProgress(c.el);
        var e = clamp(p / 0.5, 0, 1);
        e = 1 - Math.pow(1 - e, 3);
        var entering = clamp((vh - r.top) / vh, 0, 1);
        var scale = (0.7 + 0.3 * e) * (0.9 + 0.1 * entering) / 1;
        if (scale > 1) scale = 1;
        c.img.style.transform = "scale(" + scale.toFixed(4) + ")";
        var o = clamp((p - 0.28) / 0.3, 0, 1);
        c.text.style.opacity = o.toFixed(3);
        c.text.style.transform = "translate3d(0," + ((1 - o) * 36).toFixed(1) + "px,0)";
      });
    }

    function request() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);

    /* reveals */
    var reveals = qsa(".reveal");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
      reveals.forEach(function (r) { io.observe(r); });
    } else {
      reveals.forEach(function (r) { r.classList.add("in"); });
    }

    function onMotionChange() {
      syncAnim();
      if (!animAllowed()) clearInline();
      request();
    }
    if (mqReduce) {
      if (mqReduce.addEventListener) mqReduce.addEventListener("change", onMotionChange);
      else if (mqReduce.addListener) mqReduce.addListener(onMotionChange);
    }

    if (animAllowed()) {
      words.forEach(function (w) { w.classList.remove("lit"); });
      chapters.forEach(function (c) {
        c.img.style.transform = "scale(0.7)";
        c.text.style.opacity = "0";
      });
    } else {
      clearInline();
    }
    update();
  });
})();
