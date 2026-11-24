"use strict";
document.documentElement.classList.add("js");

const menuButton = document.querySelector(".menu-toggle");
const menu = document.getElementById("menu");
const mobileMenu = window.matchMedia("(max-width: 780px)");
const menuBackdrop = document.querySelector(".menu-backdrop");
function setMenu(open) {
  open = open && mobileMenu.matches;
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Zamknij menu" : "Otwórz menu");
  menu.classList.toggle("open", open);
  document.body.classList.toggle("menu-open", open);
  menu.inert = mobileMenu.matches && !open;
  document.querySelectorAll("main, footer, .skip").forEach(element => { element.inert = open; });
}
setMenu(false);
mobileMenu.addEventListener("change", () => setMenu(false));
menuBackdrop.addEventListener("click", () => { setMenu(false); menuButton.focus(); });
menuButton.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
menu.closest("header").addEventListener("click", event => {
  const link = event.target.closest("a");
  if (!link || !mobileMenu.matches) return;
  setMenu(false);
  if (link.hash) {
    const target = document.querySelector(link.hash);
    if (target) { target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true }); }
  }
});
document.addEventListener("keydown", event => {
  if (event.key !== "Tab" || !menu.classList.contains("open")) return;
  const links = Array.from(document.querySelectorAll("header a, .menu-toggle"));
  const first = links[0], last = links[links.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (menu.classList.contains("open")) {
    setMenu(false);
    menuButton.focus();
  }
});

for (const carousel of document.querySelectorAll("[data-carousel]")) {
  const slides = Array.from(carousel.querySelectorAll("[data-slide]"));
  let index = 0;
  let changing = false;
  const position = carousel.querySelector("[data-position]");
  let syncAutoplay = () => {};
  // Fetch the neighbouring photos ahead of time so the change is instant.
  function warmNeighbours() {
    for (const step of [1, -1]) {
      const slide = slides[(index + step + slides.length) % slides.length];
      if (slide instanceof HTMLImageElement && slide.loading !== "eager") {
        slide.loading = "eager";
        slide.decode().catch(() => {});
      }
    }
  }
  async function advance(step, automatic = false) {
    if (changing) return;
    changing = true;
    surface.setAttribute("aria-live", automatic ? "off" : "polite");
    const previous = slides[index];
    const nextIndex = (index + step + slides.length) % slides.length;
    const next = slides[nextIndex];
    if (next instanceof HTMLImageElement) {
      next.loading = "eager";
      await next.decode().catch(() => {});
    }
    const oldHeight = surface.getBoundingClientRect().height;
    previous.classList.add("slide-leaving");
    previous.setAttribute("aria-hidden", "true");
    previous.inert = true;
    next.hidden = false;
    index = nextIndex;
    if (position) {
      position.textContent = String(index + 1).padStart(2, "0") + " / " + String(slides.length).padStart(2, "0");
    }
    warmNeighbours();
    const newHeight = surface.getBoundingClientRect().height;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const review = carousel.dataset.carousel === "opinie";
      const distance = review ? 18 * Math.sign(step) : 0;
      const timing = { duration: review ? 650 : 420, easing: "cubic-bezier(.25,.7,.3,1)" };
      const animations = [
        previous.animate([{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: `translateX(${-distance}px)` }], timing),
        next.animate([{ opacity: 0, transform: `translateX(${distance}px)` }, { opacity: 1, transform: "translateX(0)" }], timing),
        surface.animate([{ height: oldHeight + "px" }, { height: newHeight + "px" }], timing)
      ];
      await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
    }
    previous.hidden = true;
    previous.classList.remove("slide-leaving");
    previous.removeAttribute("aria-hidden");
    previous.inert = false;
    changing = false;
  }
  carousel.querySelector(".controls").addEventListener("click", event => {
    const button = event.target.closest("[data-step]");
    if (button) {
      advance(Number(button.dataset.step));
      syncAutoplay();
    }
  });
  const surface = carousel.querySelector("[aria-live]");
  if ("IntersectionObserver" in window) {
    const nearby = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      nearby.disconnect();
      warmNeighbours();
    }, { rootMargin: "400px" });
    nearby.observe(carousel);
  }
  let start;
  surface.addEventListener("touchstart", event => { start = event.touches[0]; }, {passive:true});
  surface.addEventListener("touchend", event => {
    if (!start) return;
    const dx = event.changedTouches[0].clientX - start.clientX;
    const dy = event.changedTouches[0].clientY - start.clientY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) advance(dx < 0 ? 1 : -1);
    start = null;
    syncAutoplay();
  }, {passive:true});

  if (carousel.dataset.carousel === 'opinie' && 'IntersectionObserver' in window) {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let hovered = false;
    let timer;
    syncAutoplay = () => {
      window.clearTimeout(timer);
      const running = !motion.matches && visible && !document.hidden &&
        !hovered && !carousel.contains(document.activeElement);
      surface.setAttribute('aria-live', running ? 'off' : 'polite');
      if (running) {
        timer = window.setTimeout(async () => {
          await advance(1, true);
          syncAutoplay();
        }, 4000);
      }
    };
    carousel.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') { hovered = true; syncAutoplay(); }
    });
    carousel.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse') { hovered = false; syncAutoplay(); }
    });
    carousel.addEventListener('focusin', syncAutoplay);
    carousel.addEventListener('focusout', () => queueMicrotask(syncAutoplay));
    document.addEventListener('visibilitychange', syncAutoplay);
    motion.addEventListener('change', syncAutoplay);
    const visibility = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .5;
      syncAutoplay();
    }, { threshold: .5 });
    visibility.observe(carousel);
    syncAutoplay();
  }
}

const track = document.querySelector(".project-track");
let requestedPosition = null;
let prepareProjectStep = () => {};
track.addEventListener("scrollend", () => { requestedPosition = null; });
track.addEventListener("touchstart", () => { requestedPosition = null; }, { passive: true });
track.addEventListener("wheel", () => { requestedPosition = null; }, { passive: true });
document.querySelector(".other .controls").addEventListener("click", event => {
  const button = event.target.closest("[data-step]");
  if (!button) return;
  prepareProjectStep();
  const left = track.getBoundingClientRect().left;
  const maxScroll = track.scrollWidth - track.clientWidth;
  const positions = [...new Set(Array.from(track.children, card =>
    Math.min(maxScroll, Math.max(0, Math.round(card.getBoundingClientRect().left - left + track.scrollLeft)))
  ))];
  const current = requestedPosition ?? track.scrollLeft;
  const nearest = positions.reduce((best, position, index) =>
    Math.abs(position - current) < Math.abs(positions[best] - current) ? index : best, 0);
  const nextIndex = (nearest + Number(button.dataset.step) + positions.length) % positions.length;
  requestedPosition = positions[nextIndex];
  track.scrollTo({
    left: requestedPosition,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"
  });
});


// Allow keyboard navigation while focus is inside either slider.
for (const carousel of document.querySelectorAll('[data-carousel]')) {
 carousel.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  carousel.querySelector(`[data-step="${event.key === 'ArrowRight' ? 1 : -1}"]`).click();
 });
}

// Offset the green outline from the review card, including its rounded corner.
const heroPanel = document.querySelector('.hero-panel');
const heroProof = document.querySelector('.hero-proof');
function updateHeroOutline() {
  const panel = heroPanel.getBoundingClientRect();
  const proof = heroProof.getBoundingClientRect();
  const gap = 24;
  const x = proof.left - panel.left - gap;
  const y = proof.top - panel.top - gap;
  const radius = parseFloat(getComputedStyle(heroProof).borderTopLeftRadius) + gap;
  const outer = 18;
  const w = panel.width;
  const h = panel.height;
  if (x <= outer || x + radius >= w - outer || y <= outer || y + radius >= h - outer) {
    heroPanel.style.removeProperty('--hero-panel-clip');
    return;
  }
  // Concentric arcs give the same 24px clearance along both edges and the curve.
  const path = `M ${outer} 0 H ${w-outer} A ${outer} ${outer} 0 0 1 ${w} ${outer}
    V ${y-outer} A ${outer} ${outer} 0 0 1 ${w-outer} ${y}
    H ${x+radius} A ${radius} ${radius} 0 0 0 ${x} ${y+radius}
    V ${h-outer} A ${outer} ${outer} 0 0 1 ${x-outer} ${h}
    H ${outer} A ${outer} ${outer} 0 0 1 0 ${h-outer}
    V ${outer} A ${outer} ${outer} 0 0 1 ${outer} 0 Z`;
  heroPanel.style.setProperty('--hero-panel-clip', `path("${path.replace(/\s+/g, ' ')}")`);
}
const heroObserver = new ResizeObserver(updateHeroOutline);
[heroPanel, heroProof, document.querySelector('.hero-photo')].forEach(element => heroObserver.observe(element));
window.addEventListener('resize', updateHeroOutline);
document.fonts.ready.then(updateHeroOutline);
updateHeroOutline();

// Separate thresholds prevent flicker while the header changes height.
const pageHeader = document.querySelector("header");
let headerUpdatePending = false;
function updateHeader() {
  if (window.scrollY > 96) pageHeader.classList.add("is-scrolled");
  if (window.scrollY < 24) pageHeader.classList.remove("is-scrolled");
  headerUpdatePending = false;
}
window.addEventListener("scroll", () => {
  if (headerUpdatePending) return;
  headerUpdatePending = true;
  requestAnimationFrame(updateHeader);
}, { passive: true });
window.addEventListener("pageshow", updateHeader);
updateHeader();

// Animate each entrance once; content is visible even if scripting is unavailable.
if ('IntersectionObserver' in window && 'animate' in Element.prototype) {
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const entranceTargets = Array.from(document.querySelectorAll([
    '.hero-panel h1', '.hero-sub', '.benefits', '.hero-cta',
    '.projects-head', '.project-track', '.case', '.cta-banner',
    '.scope-head', '.scope-grid', '.team-shell',
    '.process-section > .eyebrow', '.process-section > h2', '.process-section > .lead',
    '.process-grid > li', '.cost-shell', '.consultation-grid',
    '.faq-intro', '.faq-rows > li', '.closing'
  ].join(', ')));
  const entered = new WeakSet();
  const activeEntrances = new Set();
  const entrances = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const element = entry.target;
      entrances.unobserve(element);
      entered.add(element);
      if (motionPreference.matches) continue;
      let delay = 0;
      if (element.matches('.process-grid > li')) {
        delay = Array.from(element.parentElement.children).indexOf(element) % 3 * 70;
      }
      const distance = window.matchMedia('(max-width: 780px)').matches ? 10 : 16;
      const animation = element.animate([
        { opacity: 0, transform: `translateY(${distance}px)` },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 700, delay, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'backwards' });
      activeEntrances.add(animation);
      animation.finished.catch(() => {}).finally(() => activeEntrances.delete(animation));
    }
  }, { threshold: 0.06, rootMargin: '0px 0px -24px 0px' });
  function syncEntrancePreference() {
    entrances.disconnect();
    if (motionPreference.matches) {
      activeEntrances.forEach(animation => animation.cancel());
      activeEntrances.clear();
      return;
    }
    entranceTargets.forEach(element => {
      if (!entered.has(element)) entrances.observe(element);
    });
  }
  motionPreference.addEventListener('change', syncEntrancePreference);
  syncEntrancePreference();

  // Pause the button sheen whenever a CTA is outside the viewport.
  const visibleButtons = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('is-on-screen', entry.isIntersecting));
  });
  document.querySelectorAll('.cta:not(.mini)').forEach(button => visibleButtons.observe(button));
}

// A continuous loop of project photos; the six original cards remain accessible.
if ('IntersectionObserver' in window) {
  const area = track.closest('.other');
  const originals = Array.from(track.children);
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let copies = [];
  let cycleWidth = 0;
  let position = 0;
  let visible = false;
  let hovered = false;
  let pointerDown = false;
  let frame = 0;
  let lastTime = 0;
  let holdUntil = 0;
  let resumeTimer;

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }
  function normalize() {
    if (!cycleWidth) return;
    position = track.scrollLeft;
    position = cycleWidth + ((position - cycleWidth) % cycleWidth + cycleWidth) % cycleWidth;
    track.scrollLeft = position;
  }
  function canMove() {
    return copies.length && visible && !preference.matches && !document.hidden &&
      !hovered && !pointerDown && !area.contains(document.activeElement);
  }
  function tick(now) {
    frame = 0;
    if (!canMove()) { lastTime = 0; return; }
    const elapsed = lastTime ? Math.min(now - lastTime, 64) : 0;
    lastTime = now;
    position += (window.innerWidth <= 780 ? 28 : 36) * elapsed / 1000;
    if (position >= cycleWidth * 2) position -= cycleWidth;
    track.scrollLeft = position;
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    stop();
    clearTimeout(resumeTimer);
    if (!canMove()) return;
    const wait = holdUntil - performance.now();
    if (wait > 0) { resumeTimer = setTimeout(sync, wait); return; }
    normalize();
    frame = requestAnimationFrame(tick);
  }
  function hold() {
    stop();
    holdUntil = performance.now() + 1600;
    sync();
  }
  function measure() {
    if (!copies.length) return;
    const previous = cycleWidth;
    const fraction = previous ? ((track.scrollLeft - previous) % previous + previous) % previous / previous : 0;
    cycleWidth = originals[0].offsetLeft - copies[0].offsetLeft;
    if (!cycleWidth) return;
    position = cycleWidth * (1 + fraction);
    track.scrollLeft = position;
    requestedPosition = null;
    sync();
  }
  function configure() {
    stop();
    clearTimeout(resumeTimer);
    if (preference.matches) {
      const offset = cycleWidth ? ((track.scrollLeft - cycleWidth) % cycleWidth + cycleWidth) % cycleWidth : track.scrollLeft;
      copies.forEach(card => card.remove());
      copies = [];
      cycleWidth = 0;
      track.classList.remove('is-looping');
      track.scrollLeft = offset;
      requestedPosition = null;
      return;
    }
    if (!copies.length) {
      const copy = card => {
        const clone = card.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.inert = true;
        return clone;
      };
      const before = originals.map(copy);
      const after = originals.map(copy);
      track.classList.add('is-looping');
      track.prepend(...before);
      track.append(...after);
      copies = [...before, ...after];
    }
    measure();
  }
  prepareProjectStep = () => { stop(); normalize(); hold(); };
  area.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') { hovered = true; sync(); }
  });
  area.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') { hovered = false; sync(); }
  });
  area.addEventListener('focusin', sync);
  area.addEventListener('focusout', () => queueMicrotask(sync));
  track.addEventListener('pointerdown', () => { pointerDown = true; sync(); });
  window.addEventListener('pointerup', () => { if (pointerDown) { pointerDown = false; hold(); } });
  window.addEventListener('pointercancel', () => { pointerDown = false; hold(); });
  track.addEventListener('touchstart', () => { pointerDown = true; sync(); }, { passive: true });
  track.addEventListener('touchend', () => { pointerDown = false; hold(); }, { passive: true });
  track.addEventListener('wheel', hold, { passive: true });
  document.addEventListener('visibilitychange', sync);
  preference.addEventListener('change', configure);
  const viewport = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .15;
    sync();
  }, { threshold: .15 });
  viewport.observe(track);
  const sizing = new ResizeObserver(measure);
  sizing.observe(track);
  configure();
}
