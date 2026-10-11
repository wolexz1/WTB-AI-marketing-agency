const readinessAreas = [
  { id: "website", label: "Website discovery and AI-search readiness", short: "Website clarity and discovery" },
  { id: "whatsapp", label: "WhatsApp AI replies and human handoff", short: "WhatsApp response" },
  { id: "calls", label: "AI receptionist and callback flow", short: "Missed calls" },
  { id: "followup", label: "Lead capture, routing and follow-up", short: "Lead follow-up" },
  { id: "knowledge", label: "Knowledge base, guardrails and staff handoff", short: "Approved answers" },
  { id: "measurement", label: "Outcome tracking and AI workflow review", short: "Business outcomes" },
];

const readinessCards = Array.from(document.querySelectorAll(".readiness-card"));
const planItems = document.querySelector("#planItems");
const planInputs = document.querySelector("#planInputs");
const requestForm = document.querySelector("#readinessRequestForm");
const requestError = document.querySelector("#requestError");
const whatsappLink = document.querySelector("#planWhatsapp");
let assessmentCompletedTracked = false;

function trackReadiness(eventName, parameters = {}) {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, parameters);
  }
}

function selectedAreas() {
  return readinessAreas.filter((area) => document.querySelector(`[data-plan="${area.id}"]`)?.checked);
}

function currentAnswers() {
  return readinessAreas.map((area) => ({
    ...area,
    status: document.querySelector(`input[name="${area.id}"]:checked`)?.value || "unanswered",
  }));
}

function restoreChoices() {
  try {
    const saved = JSON.parse(sessionStorage.getItem("wtb-readiness-check") || "{}");
    readinessAreas.forEach((area) => {
      const status = ["working", "partial", "missing", "unknown"].includes(saved[area.id]?.status)
        ? saved[area.id].status : null;
      const answer = status && document.querySelector(`input[name="${area.id}"][value="${status}"]`);
      if (answer) answer.checked = true;
      const planChoice = document.querySelector(`[data-plan="${area.id}"]`);
      if (planChoice) planChoice.checked = saved[area.id]?.selected === true;
    });
  } catch (_) {
    return;
  }
}

function saveChoices() {
  try {
    const saved = Object.fromEntries(currentAnswers().map((answer) => [answer.id, {
      status: answer.status,
      selected: document.querySelector(`[data-plan="${answer.id}"]`)?.checked === true,
    }]));
    sessionStorage.setItem("wtb-readiness-check", JSON.stringify(saved));
  } catch (_) {
    return;
  }
}

function renderAssessment() {
  const answers = currentAnswers();
  const checked = answers.filter((answer) => answer.status !== "unanswered");
  const gaps = answers.filter((answer) => answer.status === "partial" || answer.status === "missing");
  const unknown = answers.filter((answer) => answer.status === "unknown");
  document.querySelector("#checksDone").textContent = `${checked.length} of ${answers.length}`;
  document.querySelector("#readinessScore").textContent = checked.length
    ? `${gaps.length} area${gaps.length === 1 ? "" : "s"} to improve`
    : "Answer the checks";
  document.querySelector("#readinessSummary").textContent = checked.length
    ? `${checked.length} of ${answers.length} areas checked. ${unknown.length} marked “not sure”; verify those before investing. ${gaps.length ? "Start with the gaps closest to a customer enquiry." : "Keep testing what already works, especially handoffs and real sales outcomes."}`
    : "Your answers and priorities will appear here. Nothing is sent to us unless you choose to request help.";
  const gapList = document.querySelector("#readinessGaps");
  gapList.replaceChildren();
  gaps.forEach((area) => {
    const gap = document.createElement("span");
    gap.className = "readiness-gap";
    gap.textContent = `${area.status === "missing" ? "Missing" : "Partial"}: ${area.short}`;
    gapList.append(gap);
  });
  readinessCards.forEach((card) => {
    const answer = answers.find((area) => area.id === card.dataset.area);
    if (answer.status === "unanswered") delete card.dataset.status;
    else card.dataset.status = answer.status;
  });
  document.querySelector("#assessmentAnswers").value = answers
    .map((area) => `${area.short}: ${area.status}`)
    .join("; ");
  if (checked.length === answers.length && !assessmentCompletedTracked) {
    assessmentCompletedTracked = true;
    trackReadiness("ai_readiness_check_complete", { gaps: gaps.length, unknown: unknown.length });
  }
}

function renderPlan() {
  const selected = selectedAreas();
  document.querySelector("#planCount").textContent = String(selected.length);
  document.querySelector("#mobilePlanCount").textContent = String(selected.length);
  planItems.replaceChildren();
  planInputs.replaceChildren();
  if (!selected.length) {
    const empty = document.createElement("li");
    empty.className = "readiness-empty";
    empty.textContent = "Nothing selected yet. Add a priority from any card.";
    planItems.append(empty);
    whatsappLink.hidden = true;
  } else {
    selected.forEach((area) => {
      const item = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = area.label;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", `Remove ${area.label} from plan`);
      remove.addEventListener("click", () => {
        document.querySelector(`[data-plan="${area.id}"]`).checked = false;
        updateReadiness();
      });
      item.append(label, remove);
      planItems.append(item);
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "service[]";
      input.value = area.label;
      planInputs.append(input);
    });
    const message = `Hello WTB, I used your free AI business readiness check. Please review these areas together and send one scoped proposal:\n\n${selected.map((area, index) => `${index + 1}. ${area.label}`).join("\n")}\n\nMy business is: `;
    whatsappLink.href = `https://wa.me/2348097585489?text=${encodeURIComponent(message)}`;
    whatsappLink.hidden = false;
  }
  requestError.hidden = true;
}

function updateReadiness() {
  renderAssessment();
  renderPlan();
  saveChoices();
}

document.querySelectorAll(".readiness-card input").forEach((input) => {
  input.addEventListener("change", () => {
    updateReadiness();
    if (input.matches("[data-plan]")) {
      trackReadiness("ai_readiness_plan_update", { selected_count: selectedAreas().length });
    }
  });
});

requestForm.addEventListener("submit", (event) => {
  if (selectedAreas().length) {
    trackReadiness("ai_readiness_proposal_attempt", { selected_count: selectedAreas().length });
    return;
  }
  event.preventDefault();
  requestError.hidden = false;
  document.querySelector("#plan").scrollIntoView({ behavior: "smooth", block: "start" });
});

whatsappLink.addEventListener("click", () => {
  trackReadiness("ai_readiness_whatsapp_click", { selected_count: selectedAreas().length });
});

restoreChoices();
updateReadiness();
