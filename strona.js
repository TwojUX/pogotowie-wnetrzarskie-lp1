"use strict";
document.documentElement.classList.add("js");

const menuButton = document.querySelector(".menu-toggle");
const menu = document.getElementById("menu");
function setMenu(open) {
  menuButton.setAttribute("aria-expanded", String(open));
  menu.classList.toggle("open", open);
}
menuButton.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
menu.addEventListener("click", event => {
  if (event.target.closest("a")) setMenu(false);
});

const aiButton = document.querySelector(".ai");
const aiInfo = document.getElementById("ai-info");
function setInfo(open) {
  aiButton.setAttribute("aria-expanded", String(open));
  aiInfo.hidden = !open;
}
aiButton.addEventListener("click", () => setInfo(aiInfo.hidden));
document.addEventListener("click", event => {
  if (!event.target.closest(".ai, .tooltip")) setInfo(false);
});
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (menu.classList.contains("open")) {
    setMenu(false);
    menuButton.focus();
  }
  if (!aiInfo.hidden) {
    setInfo(false);
    aiButton.focus();
  }
});

for (const carousel of document.querySelectorAll("[data-carousel]")) {
  const slides = Array.from(carousel.querySelectorAll("[data-slide]"));
  let index = 0;
  let changing = false;
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

// Play each entrance once. Without animation support, the page stays visible.
if ("IntersectionObserver" in window) {
  const revealTargets = [
    ".hero-grid > *", ".wrap > h2", ".scene", ".scenes + .center",
    ".team-grid > *", ".review-head", ".review-card", ".case-head",
    ".flat-gallery", ".story > *", ".case-foot", ".other > h3", ".project-track",
    ".scope-head", ".keys", ".rows > li", ".samples",
    ".budget-grid > *", ".faq-grid > .stack", ".footer-grid"
  ];
  const entrances = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entrances.unobserve(entry.target);
        entry.target.classList.add("reveal-in");
      }
    }
  });
  for (const element of document.querySelectorAll(revealTargets.join(", "))) {
    entrances.observe(element);
  }
}

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
