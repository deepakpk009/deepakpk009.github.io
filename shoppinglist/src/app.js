import { loadList, MAX_TEXT_LENGTH, saveList } from "./storage.js";

const MIN_LINES = 12;

const elements = {
  list: document.querySelector("#shopping-list"),
  itemCount: document.querySelector("#item-count"),
  clearChecked: document.querySelector("#clear-checked"),
  clearAll: document.querySelector("#clear-all"),
  clearDialog: document.querySelector("#clear-dialog"),
  dialogDescription: document.querySelector("#dialog-description"),
  storageWarning: document.querySelector("#storage-warning"),
  installButton: document.querySelector("#install-button"),
  updateButton: document.querySelector("#update-button"),
  toast: document.querySelector("#toast"),
  toastMessage: document.querySelector("#toast-message"),
  toastAction: document.querySelector("#toast-action"),
  announcer: document.querySelector("#announcer"),
};

const loaded = loadList();
let items = loaded.items;
let deletedSnapshot = null;
let toastTimer = null;
let deferredInstallPrompt = null;
let waitingWorker = null;

elements.storageWarning.hidden = loaded.storageAvailable;

if (loaded.recovered) {
  queueMicrotask(() => showToast("A damaged saved list was reset safely."));
}

function createId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function announce(message) {
  elements.announcer.textContent = "";
  window.setTimeout(() => {
    elements.announcer.textContent = message;
  }, 20);
}

function persist() {
  const saved = saveList(items);
  elements.storageWarning.hidden = saved;
  return saved;
}

function pluralize(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function normalizeSlots() {
  const usedSlots = new Set();
  let changed = false;

  items.forEach((item) => {
    let slot = item.slot;
    if (!Number.isInteger(slot) || slot < 0 || usedSlots.has(slot)) {
      slot = 0;
      while (usedSlots.has(slot)) slot += 1;
      item.slot = slot;
      changed = true;
    }
    usedSlots.add(slot);
  });

  if (changed) persist();
}

function itemAtSlot(slot) {
  return items.find((item) => item.slot === slot);
}

function firstAvailableSlot() {
  let slot = 0;
  while (itemAtSlot(slot)) slot += 1;
  return slot;
}

function totalLineCount() {
  const highestSlot = items.reduce((highest, item) => Math.max(highest, item.slot), -1);
  return Math.max(MIN_LINES, highestSlot + 2);
}

function createLine(item, slot) {
  const row = document.createElement("li");
  row.className = "shopping-row";
  row.dataset.slot = String(slot);
  if (item?.completed) row.classList.add("completed");

  const checkbox = document.createElement("input");
  checkbox.className = "item-checkbox";
  checkbox.type = "checkbox";
  checkbox.checked = item?.completed ?? false;
  checkbox.disabled = !item;
  checkbox.dataset.action = "toggle";
  checkbox.dataset.slot = String(slot);
  if (item) checkbox.dataset.id = item.id;
  checkbox.setAttribute(
    "aria-label",
    item ? `Mark ${item.text} as ${item.completed ? "not checked" : "checked"}` : `Line ${slot + 1} is empty`,
  );

  const input = document.createElement("input");
  input.className = "slot-input";
  input.type = "text";
  input.maxLength = MAX_TEXT_LENGTH;
  input.autocomplete = "off";
  input.enterKeyHint = "next";
  input.value = item?.text ?? "";
  input.dataset.slot = String(slot);
  if (item) input.dataset.id = item.id;
  input.setAttribute("aria-label", `Shopping item ${slot + 1}`);
  if (!item && slot === firstAvailableSlot()) input.placeholder = "Type an item…";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "row-action delete";
  deleteButton.dataset.action = "delete";
  deleteButton.dataset.slot = String(slot);
  deleteButton.hidden = !item;
  if (item) deleteButton.dataset.id = item.id;
  deleteButton.setAttribute("aria-label", item ? `Delete ${item.text}` : "Delete item");
  const deleteIcon = document.createElement("span");
  deleteIcon.setAttribute("aria-hidden", "true");
  deleteIcon.textContent = "×";
  deleteButton.append(deleteIcon);

  row.append(checkbox, input, deleteButton);
  return row;
}

function updateControls() {
  const completedCount = items.filter((item) => item.completed).length;
  elements.itemCount.textContent = pluralize(items.length, "item");
  elements.clearAll.disabled = items.length === 0;
  elements.clearChecked.disabled = completedCount === 0;
  elements.clearChecked.textContent = completedCount
    ? `Clear checked (${completedCount})`
    : "Clear checked";
}

function render({ focusSlot = null } = {}) {
  const lines = document.createDocumentFragment();
  for (let slot = 0; slot < totalLineCount(); slot += 1) {
    lines.append(createLine(itemAtSlot(slot), slot));
  }
  elements.list.replaceChildren(lines);
  updateControls();

  if (focusSlot !== null) {
    elements.list.querySelector(`.slot-input[data-slot="${focusSlot}"]`)?.focus();
  }
}

function ensureTrailingLine() {
  const requiredCount = totalLineCount();
  while (elements.list.children.length < requiredCount) {
    const slot = elements.list.children.length;
    elements.list.append(createLine(itemAtSlot(slot), slot));
  }
}

function showToast(message, { actionLabel = "", onAction = null, duration = 4200 } = {}) {
  window.clearTimeout(toastTimer);
  elements.toastMessage.textContent = message;
  elements.toastAction.hidden = !actionLabel;
  elements.toastAction.textContent = actionLabel;
  elements.toastAction.onclick = onAction;
  elements.toast.hidden = false;

  toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
    elements.toastAction.onclick = null;
  }, duration);
}

function activateLine(input) {
  const text = input.value;
  if (!text.trim()) return null;

  const slot = Number(input.dataset.slot);
  const now = new Date().toISOString();
  const item = {
    id: createId(),
    slot,
    text,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
  items.push(item);
  input.dataset.id = item.id;

  const row = input.closest(".shopping-row");
  const checkbox = row.querySelector(".item-checkbox");
  checkbox.disabled = false;
  checkbox.dataset.id = item.id;
  checkbox.setAttribute("aria-label", `Mark ${item.text} as checked`);

  const deleteButton = row.querySelector('[data-action="delete"]');
  deleteButton.hidden = false;
  deleteButton.dataset.id = item.id;
  deleteButton.setAttribute("aria-label", `Delete ${item.text}`);

  persist();
  updateControls();
  ensureTrailingLine();
  return item;
}

function updateLine(input) {
  let item = items.find((candidate) => candidate.id === input.dataset.id);
  if (!item) item = activateLine(input);
  if (!item) return;

  item.text = input.value;
  item.updatedAt = new Date().toISOString();
  persist();

  const row = input.closest(".shopping-row");
  const checkbox = row.querySelector(".item-checkbox");
  checkbox.setAttribute("aria-label", `Mark ${item.text || "this item"} as ${item.completed ? "not checked" : "checked"}`);
  row.querySelector('[data-action="delete"]')?.setAttribute("aria-label", `Delete ${item.text || "this item"}`);
}

function commitLine(input) {
  const item = items.find((candidate) => candidate.id === input.dataset.id);
  if (!item) {
    input.value = "";
    return;
  }

  const cleanText = input.value.trim();
  if (!cleanText) {
    const slot = item.slot;
    items = items.filter((candidate) => candidate.id !== item.id);
    persist();
    render({ focusSlot: slot });
    announce("Empty item removed.");
    return;
  }

  if (cleanText !== item.text) {
    item.text = cleanText;
    item.updatedAt = new Date().toISOString();
    input.value = cleanText;
    persist();
  }
}

function toggleItem(control) {
  const item = items.find((candidate) => candidate.id === control.dataset.id);
  if (!item) return;

  item.completed = control.checked;
  item.updatedAt = new Date().toISOString();
  control.closest(".shopping-row").classList.toggle("completed", item.completed);
  control.setAttribute("aria-label", `Mark ${item.text} as ${item.completed ? "not checked" : "checked"}`);
  persist();
  updateControls();
  announce(`${item.text} marked ${item.completed ? "checked" : "not checked"}.`);
}

function deleteItem(id) {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return;

  const [deletedItem] = items.splice(index, 1);
  deletedSnapshot = { item: deletedItem, index };
  persist();
  render({ focusSlot: deletedItem.slot });

  showToast(`${deletedItem.text} deleted.`, {
    actionLabel: "Undo",
    onAction: () => {
      if (!deletedSnapshot) return;
      items.splice(deletedSnapshot.index, 0, deletedSnapshot.item);
      const restoredItem = deletedSnapshot.item;
      deletedSnapshot = null;
      persist();
      render({ focusSlot: restoredItem.slot });
      elements.toast.hidden = true;
      announce(`${restoredItem.text} restored.`);
    },
  });
}

elements.list.addEventListener("input", (event) => {
  const input = event.target.closest(".slot-input");
  if (input) updateLine(input);
});

elements.list.addEventListener("blur", (event) => {
  const input = event.target.closest(".slot-input");
  if (input) commitLine(input);
}, true);

elements.list.addEventListener("keydown", (event) => {
  const input = event.target.closest(".slot-input");
  if (!input || event.key !== "Enter") return;
  event.preventDefault();
  const nextSlot = Number(input.dataset.slot) + 1;
  commitLine(input);
  ensureTrailingLine();
  elements.list.querySelector(`.slot-input[data-slot="${nextSlot}"]`)?.focus();
});

elements.list.addEventListener("change", (event) => {
  const control = event.target.closest('[data-action="toggle"]');
  if (control) toggleItem(control);
});

elements.list.addEventListener("click", (event) => {
  const control = event.target.closest('[data-action="delete"]');
  if (control?.dataset.id) deleteItem(control.dataset.id);
});

elements.clearChecked.addEventListener("click", () => {
  const count = items.filter((item) => item.completed).length;
  items = items.filter((item) => !item.completed);
  persist();
  render();
  announce(`${pluralize(count, "checked item")} cleared.`);
});

elements.clearAll.addEventListener("click", () => {
  elements.dialogDescription.textContent = `Clear all ${pluralize(items.length, "item")}? This cannot be undone.`;
  elements.clearDialog.showModal();
});

elements.clearDialog.addEventListener("close", () => {
  if (elements.clearDialog.returnValue !== "confirm") {
    elements.clearAll.focus();
    return;
  }

  const count = items.length;
  items = [];
  persist();
  render({ focusSlot: 0 });
  announce(`${pluralize(count, "item")} cleared.`);
});

elements.clearDialog.addEventListener("click", (event) => {
  if (event.target === elements.clearDialog) elements.clearDialog.close("cancel");
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  elements.installButton.hidden = false;
});

elements.installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  elements.installButton.hidden = true;
  if (outcome === "accepted") announce("Shopping List installed.");
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  elements.installButton.hidden = true;
});

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
    // The list remains usable online if offline support cannot register.
  }
}

function showUpdate(worker) {
  waitingWorker = worker;
  elements.updateButton.hidden = false;
}

elements.updateButton.addEventListener("click", () => {
  waitingWorker?.postMessage({ type: "SKIP_WAITING" });
});

normalizeSlots();
render();
registerServiceWorker();
