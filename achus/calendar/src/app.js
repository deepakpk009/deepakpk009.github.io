import { loadCalendar, saveCalendar } from "./storage.js?v=2";

const locale = navigator.language || "en-US";
const today = startOfDay(new Date());
const loaded = loadCalendar();

let events = loaded.events;
let selectedDate = today;
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let deferredInstallPrompt = null;
let waitingWorker = null;
let toastTimer = null;

const elements = {
  monthHeading: document.querySelector("#month-heading"),
  monthLabel: document.querySelector("#month-label"),
  calendarGrid: document.querySelector("#calendar-grid"),
  previousMonth: document.querySelector("#previous-month"),
  nextMonth: document.querySelector("#next-month"),
  todayButton: document.querySelector("#today-button"),
  todayNumber: document.querySelector("#today-number"),
  selectedDateHeading: document.querySelector("#selected-date-heading"),
  eventCount: document.querySelector("#event-count"),
  eventList: document.querySelector("#event-list"),
  emptyState: document.querySelector("#empty-state"),
  addEvent: document.querySelector("#add-event"),
  addEventLabel: document.querySelector("#add-event-label"),
  storageWarning: document.querySelector("#storage-warning"),
  searchToggle: document.querySelector("#search-toggle"),
  searchForm: document.querySelector("#search-form"),
  searchInput: document.querySelector("#search-input"),
  searchClose: document.querySelector("#search-close"),
  searchResults: document.querySelector("#search-results"),
  dialog: document.querySelector("#event-dialog"),
  form: document.querySelector("#event-form"),
  dialogTitle: document.querySelector("#event-dialog-title"),
  eventId: document.querySelector("#event-id"),
  eventTitle: document.querySelector("#event-title"),
  eventDate: document.querySelector("#event-date"),
  allDay: document.querySelector("#event-all-day"),
  timeFields: document.querySelector("#time-fields"),
  startTime: document.querySelector("#event-start"),
  endTime: document.querySelector("#event-end"),
  notes: document.querySelector("#event-notes"),
  formError: document.querySelector("#form-error"),
  deleteEvent: document.querySelector("#delete-event"),
  eventClose: document.querySelector("#event-close"),
  eventCancel: document.querySelector("#event-cancel"),
  installButton: document.querySelector("#install-button"),
  updateButton: document.querySelector("#update-button"),
  toast: document.querySelector("#toast"),
  announcer: document.querySelector("#announcer"),
};

const missingElements = Object.entries(elements).filter(([, element]) => !element).map(([name]) => name);
if (missingElements.length) throw new Error(`Calendar markup is missing: ${missingElements.join(", ")}`);

elements.todayNumber.textContent = String(today.getDate());
elements.storageWarning.hidden = loaded.storageAvailable;
if (loaded.recovered) queueMicrotask(() => showToast("A damaged saved calendar was reset safely."));

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function sameDay(a, b) {
  return dateKey(a) === dateKey(b);
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function eventsForDate(key) {
  return events
    .filter((event) => event.date === key)
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title));
}

function persist() {
  const saved = saveCalendar(events);
  elements.storageWarning.hidden = saved;
  return saved;
}

function announce(message) {
  elements.announcer.textContent = "";
  window.setTimeout(() => { elements.announcer.textContent = message; }, 20);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = window.setTimeout(() => { elements.toast.hidden = true; }, 3600);
}

function monthGridStart() {
  const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  return addDays(first, -mondayOffset);
}

function renderCalendar() {
  const monthName = visibleMonth.toLocaleDateString(locale, { month: "long" });
  const monthYear = visibleMonth.toLocaleDateString(locale, { month: "long", year: "numeric" });
  elements.monthHeading.textContent = monthName.toUpperCase();
  elements.monthLabel.textContent = monthYear;
  document.title = `${monthYear} · Cozy Calendar`;

  const fragment = document.createDocumentFragment();
  const start = monthGridStart();
  for (let index = 0; index < 42; index += 1) {
    const day = addDays(start, index);
    const key = dateKey(day);
    const dayEvents = eventsForDate(key);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-cell";
    button.dataset.date = key;
    button.setAttribute("role", "gridcell");
    button.setAttribute("aria-selected", String(sameDay(day, selectedDate)));
    button.setAttribute("aria-label", `${day.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}` : ""}`);
    button.classList.toggle("outside-month", day.getMonth() !== visibleMonth.getMonth());
    button.classList.toggle("selected", sameDay(day, selectedDate));
    button.classList.toggle("today", sameDay(day, today));
    if (day.getDay() === 0) button.classList.add("sunday");

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = String(day.getDate());
    const markers = document.createElement("span");
    markers.className = "event-markers";
    dayEvents.slice(0, 3).forEach((event) => {
      const marker = document.createElement("i");
      marker.className = event.color;
      markers.append(marker);
    });
    if (dayEvents.length > 3) {
      const more = document.createElement("small");
      more.textContent = `+${dayEvents.length - 3}`;
      markers.append(more);
    }
    button.append(number, markers);
    fragment.append(button);
  }
  elements.calendarGrid.replaceChildren(fragment);
}

function formatTime(time) {
  if (!time) return "";
  const [hour, minute] = time.split(":").map(Number);
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hour, minute));
}

function eventTimeLabel(event) {
  if (event.allDay) return "All day";
  const start = formatTime(event.startTime);
  const end = formatTime(event.endTime);
  return end ? `${start} – ${end}` : start;
}

function createEventCard(event, includeDate = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `event-card ${event.color}`;
  button.dataset.eventId = event.id;
  button.setAttribute("aria-label", `Edit ${event.title}, ${eventTimeLabel(event)}`);

  const accent = document.createElement("span");
  accent.className = "event-accent";
  const content = document.createElement("span");
  content.className = "event-content";
  const title = document.createElement("strong");
  title.textContent = event.title;
  const meta = document.createElement("span");
  meta.textContent = includeDate
    ? `${fromDateKey(event.date).toLocaleDateString(locale, { month: "short", day: "numeric" })} · ${eventTimeLabel(event)}`
    : eventTimeLabel(event);
  content.append(title, meta);
  if (event.notes) {
    const notes = document.createElement("small");
    notes.textContent = event.notes;
    content.append(notes);
  }
  const arrow = document.createElement("span");
  arrow.className = "event-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "›";
  button.append(accent, content, arrow);
  return button;
}

function renderAgenda() {
  const key = dateKey(selectedDate);
  const dayEvents = eventsForDate(key);
  const dateLabel = selectedDate.toLocaleDateString(locale, { weekday: "short", month: "long", day: "numeric" });
  elements.selectedDateHeading.textContent = dateLabel;
  elements.eventCount.textContent = dayEvents.length ? `${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}` : "Free day";
  elements.addEventLabel.textContent = `Add on ${selectedDate.toLocaleDateString(locale, { month: "short", day: "numeric" })}`;
  elements.eventList.replaceChildren(...dayEvents.map((event) => createEventCard(event)));
  elements.eventList.hidden = dayEvents.length === 0;
  elements.emptyState.hidden = dayEvents.length > 0;
}

function render() {
  renderCalendar();
  renderAgenda();
  if (!elements.searchForm.hidden) renderSearchResults();
}

function selectDate(date) {
  selectedDate = startOfDay(date);
  if (selectedDate.getMonth() !== visibleMonth.getMonth() || selectedDate.getFullYear() !== visibleMonth.getFullYear()) {
    visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  }
  closeSearch();
  render();
}

function moveMonth(amount) {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + amount, 1);
  selectedDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  render();
}

function setTimeVisibility() {
  elements.timeFields.hidden = elements.allDay.checked;
  elements.startTime.required = !elements.allDay.checked;
  if (!elements.allDay.checked && !elements.startTime.value) elements.startTime.value = "09:00";
}

function openEventDialog(event = null) {
  elements.form.reset();
  elements.formError.hidden = true;
  elements.eventId.value = event?.id ?? "";
  elements.dialogTitle.textContent = event ? "Edit event" : "Add event";
  elements.deleteEvent.hidden = !event;
  elements.eventTitle.value = event?.title ?? "";
  elements.eventDate.value = event?.date ?? dateKey(selectedDate);
  elements.allDay.checked = event?.allDay ?? true;
  elements.startTime.value = event?.startTime ?? "09:00";
  elements.endTime.value = event?.endTime ?? "";
  elements.notes.value = event?.notes ?? "";
  const color = event?.color ?? "sage";
  elements.form.querySelector(`input[name="event-color"][value="${color}"]`).checked = true;
  setTimeVisibility();
  elements.dialog.showModal();
  window.setTimeout(() => elements.eventTitle.focus(), 30);
}

function closeEventDialog() {
  elements.dialog.close();
  elements.addEvent.focus();
}

function saveEvent(event) {
  event.preventDefault();
  const title = elements.eventTitle.value.trim();
  const date = elements.eventDate.value;
  const allDay = elements.allDay.checked;
  const startTime = allDay ? "" : elements.startTime.value;
  const endTime = allDay ? "" : elements.endTime.value;
  if (!title) {
    elements.formError.textContent = "Please add an event title.";
    elements.formError.hidden = false;
    elements.eventTitle.focus();
    return;
  }
  if (!allDay && endTime && endTime <= startTime) {
    elements.formError.textContent = "End time must be later than start time.";
    elements.formError.hidden = false;
    elements.endTime.focus();
    return;
  }

  const id = elements.eventId.value;
  const existing = events.find((item) => item.id === id);
  const now = new Date().toISOString();
  const value = {
    id: existing?.id ?? createId(),
    title,
    date,
    allDay,
    startTime,
    endTime,
    color: elements.form.querySelector('input[name="event-color"]:checked').value,
    notes: elements.notes.value.trim(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (existing) Object.assign(existing, value);
  else events.push(value);
  persist();
  selectedDate = fromDateKey(date);
  visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  elements.dialog.close();
  render();
  showToast(existing ? "Event updated." : "Event added.");
  announce(`${title} ${existing ? "updated" : "added"}.`);
}

function deleteCurrentEvent() {
  const current = events.find((event) => event.id === elements.eventId.value);
  if (!current || !window.confirm(`Delete “${current.title}”?`)) return;
  events = events.filter((event) => event.id !== current.id);
  persist();
  elements.dialog.close();
  render();
  showToast("Event deleted.");
  announce(`${current.title} deleted.`);
}

function openSearch() {
  elements.searchForm.hidden = false;
  elements.searchToggle.setAttribute("aria-expanded", "true");
  elements.searchInput.focus();
  renderSearchResults();
}

function closeSearch() {
  elements.searchForm.hidden = true;
  elements.searchResults.hidden = true;
  elements.searchToggle.setAttribute("aria-expanded", "false");
  elements.searchInput.value = "";
  renderAgenda();
}

function renderSearchResults() {
  const query = elements.searchInput.value.trim().toLocaleLowerCase(locale);
  if (!query) {
    elements.searchResults.hidden = true;
    renderAgenda();
    return;
  }
  elements.eventList.hidden = true;
  elements.emptyState.hidden = true;
  const matches = events
    .filter((event) => `${event.title} ${event.notes}`.toLocaleLowerCase(locale).includes(query))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  const heading = document.createElement("p");
  heading.className = "results-heading";
  heading.textContent = `${matches.length} result${matches.length === 1 ? "" : "s"}`;
  const cards = matches.map((event) => createEventCard(event, true));
  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "no-results";
    empty.textContent = "No events match your search.";
    cards.push(empty);
  }
  elements.searchResults.replaceChildren(heading, ...cards);
  elements.searchResults.hidden = false;
}

elements.calendarGrid.addEventListener("click", (event) => {
  const cell = event.target.closest(".day-cell");
  if (cell) selectDate(fromDateKey(cell.dataset.date));
});
elements.previousMonth.addEventListener("click", () => moveMonth(-1));
elements.nextMonth.addEventListener("click", () => moveMonth(1));
elements.todayButton.addEventListener("click", () => selectDate(today));
elements.addEvent.addEventListener("click", () => openEventDialog());
elements.eventList.addEventListener("click", (event) => {
  const card = event.target.closest(".event-card");
  const item = events.find((entry) => entry.id === card?.dataset.eventId);
  if (item) openEventDialog(item);
});
elements.searchResults.addEventListener("click", (event) => {
  const card = event.target.closest(".event-card");
  const item = events.find((entry) => entry.id === card?.dataset.eventId);
  if (!item) return;
  selectedDate = fromDateKey(item.date);
  visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  closeSearch();
  render();
  openEventDialog(item);
});
elements.allDay.addEventListener("change", setTimeVisibility);
elements.form.addEventListener("submit", saveEvent);
elements.eventClose.addEventListener("click", closeEventDialog);
elements.eventCancel.addEventListener("click", closeEventDialog);
elements.deleteEvent.addEventListener("click", deleteCurrentEvent);
elements.dialog.addEventListener("click", (event) => { if (event.target === elements.dialog) closeEventDialog(); });
elements.searchToggle.addEventListener("click", () => elements.searchForm.hidden ? openSearch() : closeSearch());
elements.searchClose.addEventListener("click", closeSearch);
elements.searchForm.addEventListener("submit", (event) => event.preventDefault());
elements.searchInput.addEventListener("input", renderSearchResults);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  elements.installButton.hidden = false;
});
elements.installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  elements.installButton.hidden = true;
});
window.addEventListener("appinstalled", () => { elements.installButton.hidden = true; });

function showUpdate(worker) {
  waitingWorker = worker;
  elements.updateButton.hidden = false;
}

elements.updateButton.addEventListener("click", () => waitingWorker?.postMessage({ type: "SKIP_WAITING" }));

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register("./service-worker.js");
    if (registration.waiting) showUpdate(registration.waiting);
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) showUpdate(worker);
      });
    });
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  } catch {
    // Core calendar functionality remains available without a service worker.
  }
}

render();
registerServiceWorker();
