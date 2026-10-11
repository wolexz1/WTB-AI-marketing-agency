const areas = [
  { id: "website", label: "AI website readiness", short: "AI website visibility", impact: "AI search tools may struggle to understand your services or show a clear next step." },
  { id: "whatsapp", label: "WhatsApp AI assistant", short: "WhatsApp replies", impact: "After-hours enquiries may wait until your team is back online." },
  { id: "calls", label: "AI call receptionist and follow-up", short: "After-hours calls", impact: "Callers may hang up without an answer, booking or callback." },
  { id: "email", label: "AI-assisted email automation", short: "Email updates", impact: "Interested subscribers may not hear from you often enough to return." },
  { id: "bookings", label: "Booking or order flow", short: "Bookings and orders", impact: "Ready buyers may leave while waiting to complete a booking or order." },
  { id: "marketing", label: "Marketing growth plan", short: "Marketing results", impact: "Your campaigns may attract attention without enough qualified enquiries or sales." },
];

const cards = Array.from(document.querySelectorAll(".readiness-card"));
const planItems = document.querySelector("#planItems");
const planInputs = document.querySelector("#planInputs");
const form = document.querySelector("#readinessRequestForm");
const requestError = document.querySelector("#requestError");
const selections = Object.fromEntries(areas.map((area) => [area.id, { answer: "unanswered", selected: false }]));
let completionTracked = false;

function track(eventName, details = {}) {
  if (typeof window.gtag === "function") window.gtag("event", eventName, details);
}

function save() {
  try { sessionStorage.setItem("wtb-readiness-check-v3", JSON.stringify(selections)); } catch (_) { return; }
}

function restore() {
  try {
    const saved = JSON.parse(sessionStorage.getItem("wtb-readiness-check-v3") || "{}");
    for (const area of areas) {
      if (["yes", "no", "skipped"].includes(saved[area.id]?.answer)) selections[area.id].answer = saved[area.id].answer;
      selections[area.id].selected = saved[area.id]?.selected === true;
      const answer = document.querySelector(`input[name="${area.id}"][value="${selections[area.id].answer}"]`);
      if (answer) answer.checked = true;
    }
  } catch (_) { return; }
}

function renderAssessment() {
  const answered = areas.filter((area) => selections[area.id].answer !== "unanswered");
  const applicable = areas.filter((area) => ["yes", "no"].includes(selections[area.id].answer));
  const gaps = applicable.filter((area) => selections[area.id].answer === "no");
  const healthy = applicable.length - gaps.length;
  document.querySelector("#checksDone").textContent = `${answered.length} of ${areas.length}`;
  const verdict = document.querySelector(".readiness-verdict");
  const score = document.querySelector("#readinessScore");
  const summary = document.querySelector("#readinessSummary");
  if (answered.length < areas.length) {
    verdict.dataset.level = "pending";
    score.textContent = answered.length ? "Keep going" : "Answer the questions";
    summary.textContent = answered.length
      ? `${healthy} working · ${gaps.length} need attention. Answer ${areas.length - answered.length} more for your overall result.`
      : "Your colour-coded result appears here, based only on what you tell us.";
  } else if (!applicable.length) {
    verdict.dataset.level = "pending";
    score.textContent = "No result yet";
    summary.textContent = "Answer at least one relevant question to see a result.";
  } else {
    const ratio = healthy / applicable.length;
    verdict.dataset.level = ratio >= 0.8 ? "green" : ratio >= 0.5 ? "yellow" : "red";
    score.textContent = ratio >= 0.8 ? "Working well so far" : ratio >= 0.5 ? "Some gaps to close" : "Priority gaps found";
    summary.textContent = `${healthy} working · ${gaps.length} need attention. Based on your answers, not a technical scan.`;
  }
  const gapList = document.querySelector("#readinessGaps");
  gapList.replaceChildren();
  for (const area of gaps) {
    const item = document.createElement("p");
    item.className = "readiness-gap";
    item.innerHTML = `<strong></strong><span></span>`;
    item.querySelector("strong").textContent = area.short;
    item.querySelector("span").textContent = area.impact;
    gapList.append(item);
  }
  for (const card of cards) {
    const area = areas.find((item) => item.id === card.dataset.area);
    const state = selections[area.id];
    card.dataset.status = state.answer;
    const status = card.querySelector(".readiness-status");
    status.textContent = { yes: "Green · Working", no: "Red · Needs attention", skipped: "Not applicable", unanswered: "Not checked" }[state.answer];
    const fix = card.querySelector(".readiness-fix");
    fix.hidden = state.answer !== "no" && !state.selected;
    const skip = card.querySelector(".readiness-skip");
    if (skip) skip.textContent = state.answer === "skipped" ? "Undo: this is relevant" : skip.dataset.original;
    const add = card.querySelector(".readiness-add");
    add.textContent = state.selected ? "Added ✓ — remove from plan" : "Add this fix to my plan";
    add.setAttribute("aria-pressed", String(state.selected));
  }
  document.querySelector("#assessmentAnswers").value = areas.map((area) => `${area.short}: ${selections[area.id].answer}`).join("; ");
  if (answered.length === areas.length && !completionTracked) {
    completionTracked = true;
    track("ai_readiness_check_complete", { gaps: gaps.length });
  }
}

function renderPlan() {
  const selected = areas.filter((area) => selections[area.id].selected);
  document.querySelector("#planCount").textContent = String(selected.length);
  document.querySelector("#mobilePlanCount").textContent = String(selected.length);
  planItems.replaceChildren();
  planInputs.replaceChildren();
  if (!selected.length) {
    const empty = document.createElement("li");
    empty.className = "readiness-empty";
    empty.textContent = "No fixes selected yet.";
    planItems.append(empty);
  }
  for (const area of selected) {
    const item = document.createElement("li");
    const title = document.createElement("span");
    title.textContent = area.label;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${area.label} from plan`);
    remove.addEventListener("click", () => { selections[area.id].selected = false; update(); });
    item.append(title, remove);
    planItems.append(item);
    const field = document.createElement("input");
    field.type = "hidden";
    field.name = "selected_fix[]";
    field.value = area.label;
    planInputs.append(field);
  }
  requestError.hidden = true;
}

function update() {
  renderAssessment();
  renderPlan();
  save();
}

for (const card of cards) {
  const areaId = card.dataset.area;
  card.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.parentElement.lastChild.textContent = input.value === "yes" ? " Yes, we do" : " No, not yet";
  });
  const skip = card.querySelector(".readiness-skip");
  if (skip) {
    skip.dataset.original = skip.textContent;
    skip.addEventListener("click", () => {
      const state = selections[areaId];
      state.answer = state.answer === "skipped" ? "unanswered" : "skipped";
      if (state.answer === "skipped") state.selected = false;
      card.querySelectorAll('input[type="radio"]').forEach((input) => { input.checked = false; });
      update();
    });
  }
  card.querySelectorAll('input[type="radio"]').forEach((input) => input.addEventListener("change", () => {
    selections[areaId].answer = input.value;
    if (input.value === "yes") selections[areaId].selected = false;
    update();
  }));
  card.querySelector(".readiness-add").addEventListener("click", () => {
    selections[areaId].selected = !selections[areaId].selected;
    update();
    track("ai_readiness_plan_update", { selected_count: areas.filter((area) => selections[area.id].selected).length });
  });
}

form.addEventListener("submit", (event) => {
  const count = areas.filter((area) => selections[area.id].selected).length;
  if (!count) {
    event.preventDefault();
    requestError.hidden = false;
    document.querySelector("#plan").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  track("ai_readiness_proposal_attempt", { selected_count: count });
});

restore();
update();
