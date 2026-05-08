const formNote = document.querySelector("#formNote");
const quickFormNote = document.querySelector("#quickFormNote");
const modal = document.querySelector("#briefModal");
const modalTriggers = Array.from(document.querySelectorAll(".brief-modal-trigger"));
const modalClosers = Array.from(document.querySelectorAll("[data-modal-close]"));
const revealItems = Array.from(document.querySelectorAll(".reveal"));
const statNumbers = Array.from(document.querySelectorAll(".stat-number"));
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

const animateStat = (stat) => {
  if (stat.dataset.counted === "true") {
    return;
  }

  stat.dataset.counted = "true";

  const target = Number(stat.dataset.count || 0);
  const suffix = stat.dataset.suffix || "";
  const duration = 2600;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(target * eased);

    stat.textContent = `${value}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
};

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        entry.target.querySelectorAll(".stat-number").forEach(animateStat);
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

revealItems.forEach((item) => revealObserver.observe(item));
statNumbers.forEach((stat) => {
  if (!stat.closest(".reveal")) {
    animateStat(stat);
  }
});

const openModal = () => {
  if (!modal) {
    document.querySelector("#briefForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  modal?.classList.add("is-open");
  modal?.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modal?.querySelector("input[name='name']")?.focus();
};

const closeModal = () => {
  modal?.classList.remove("is-open");
  modal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
};

modalTriggers.forEach((trigger) => {
  trigger.addEventListener("click", openModal);
});

modalClosers.forEach((closer) => {
  closer.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal?.classList.contains("is-open")) {
    closeModal();
  }

  if (event.key === "Escape" && navLinks?.classList.contains("is-open")) {
    navLinks.classList.remove("is-open");
    navToggle?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
  }
});

navToggle?.addEventListener("click", () => {
  const isOpen = navLinks?.classList.toggle("is-open") || false;
  navToggle.classList.toggle("is-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("is-open");
    navToggle?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

document.querySelector("#briefForm")?.addEventListener("submit", () => {
  formNote.textContent = "Sending your brief securely now.";
});

document.querySelector("#quickBriefForm")?.addEventListener("submit", () => {
  quickFormNote.textContent = "Sending your brief securely now.";
});
