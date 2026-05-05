const briefForm = document.querySelector("#briefForm");
const formNote = document.querySelector("#formNote");
const revealItems = Array.from(document.querySelectorAll(".reveal"));

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

revealItems.forEach((item) => revealObserver.observe(item));

briefForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(briefForm);
  const name = data.get("name");
  const brand = data.get("brand");
  const service = data.get("service");
  const message = data.get("message");

  const body = encodeURIComponent(
    `Name: ${name}\nBusiness/Brand: ${brand}\nService focus: ${service}\n\nBrief:\n${message}`
  );

  formNote.textContent = "Your brief is ready. Opening your email app now.";
  window.location.href = `mailto:wolexzthebrand@gmail.com?subject=WTB Project Brief - ${encodeURIComponent(brand)}&body=${body}`;
});
