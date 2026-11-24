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
  async function advance(step) {
    if (changing) return;
    changing = true;
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
      const timing = { duration: 420, easing: "cubic-bezier(.25,.7,.3,1)" };
      const animations = [
        previous.animate([{ opacity: 1 }, { opacity: 0 }], timing),
        next.animate([{ opacity: 0 }, { opacity: 1 }], timing),
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
    if (button) advance(Number(button.dataset.step));
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
  }, {passive:true});
}

const track = document.querySelector(".project-track");
let requestedPosition = null;
track.addEventListener("scrollend", () => { requestedPosition = null; });
track.addEventListener("touchstart", () => { requestedPosition = null; }, { passive: true });
track.addEventListener("wheel", () => { requestedPosition = null; }, { passive: true });
document.querySelector(".other .controls").addEventListener("click", event => {
  const button = event.target.closest("[data-step]");
  if (!button) return;
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
