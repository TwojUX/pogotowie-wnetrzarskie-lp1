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
  function advance(step) {
    slides[index].hidden = true;
    index = (index + step + slides.length) % slides.length;
    slides[index].hidden = false;
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
document.querySelector(".other .controls").addEventListener("click", event => {
  const button = event.target.closest("[data-step]");
  if (!button) return;
  // Start with the card nearest the left edge after a swipe.
  const left = track.getBoundingClientRect().left;
  const cards = Array.from(track.children);
  const first = cards.reduce((best, card) =>
    Math.abs(card.getBoundingClientRect().left - left) < Math.abs(best.getBoundingClientRect().left - left) ? card : best);
  const index = (cards.indexOf(first) + Number(button.dataset.step) + cards.length) % cards.length;
  track.append(...cards.slice(index), ...cards.slice(0, index));
  track.scrollLeft = 0;
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
