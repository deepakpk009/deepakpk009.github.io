import { loadList, MAX_TEXT_LENGTH, saveList } from "./storage.js";

const elements = {
  addForm: document.querySelector("#add-form"),
  input: document.querySelector("#item-input"),
  list: document.querySelector("#shopping-list"),
  emptyState: document.querySelector("#empty-state"),
  itemCount: document.querySelector("#item-count"),
  clearChecked: document.querySelector("#clear-checked"),
  clearAll: document.querySelector("#clear-all"),
  clearDialog: document.querySelector("#clear-dialog"),
  dialogDescription: document.querySelector("#dialog-description"),
  confirmClear: document.querySelector("#confirm-clear"),
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
let editingId = null;
let deletedSnapshot = null;
let toastTimer = null;
let deferredInstallPrompt = null;
let waitingWorker = null;

elements.input.maxLength = MAX_TEXT_LENGTH;
elements.storageWarning.hidden = loaded.storageAvailable;

if (loaded.recovered) {
  queueMicrotask(() => showToast("A damaged saved list was reset safely."));
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return crypto.randomUUID();
  }

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

function makeIconButton(label, symbol, action, id) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `row-action ${action}`;
  button.dataset.action = action;
  button.dataset.id = id;
  button.setAttribute("aria-label", label);

  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = symbol;
  button.append(icon);

  return button;
}

function renderEditRow(item) {
  const row = document.createElement("li");
  row.className = "shopping-row editing";
  row.dataset.id = item.id;

  const form = document.createElement("form");
  form.className = "edit-form";
  form.dataset.editForm = item.id;

  const label = document.createElement("label");
  label.className = "sr-only";
  label.htmlFor = `edit-${item.id}`;
  label.textContent = `Edit ${item.text}`;

  const input = document.createElement("input");
  input.id = `edit-${item.id}`;
  input.name = "editedItem";
  input.value = item.text;
  input.maxLength = MAX_TEXT_LENGTH;
  input.autocomplete = "off";

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.className = "edit-save";
  saveButton.textContent = "Save";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "edit-cancel";
  cancelButton.dataset.action = "cancel-edit";
  cancelButton.textContent = "Cancel";

  form.append(label, input, saveButton, cancelButton);
  row.append(form);
  return row;
}

function renderItem(item) {
  if (editingId === item.id) {
    return renderEditRow(item);
  }

  const row = document.createElement("li");
  row.className = "shopping-row";
  row.dataset.id = item.id;
  if (item.completed) row.classList.add("completed");

  const checkbox = document.createElement("input");
  checkbox.className = "item-checkbox";
  checkbox.type = "checkbox";
  checkbox.id = `item-${item.id}`;
  checkbox.checked = item.completed;
  checkbox.dataset.action = "toggle";
  checkbox.dataset.id = item.id;

  const label = document.createElement("label");
  label.className = "item-text";
  label.htmlFor = checkbox.id;
  label.textContent = item.text;

  const actions = document.createElement("div");
  actions.className = "row-actions";
  actions.append(
    makeIconButton(`Edit ${item.text}`, "✎", "edit", item.id),
    makeIconButton(`Delete ${item.text}`, "×", "delete", item.id),
  );

  row.append(checkbox, label, actions);
  return row;
}

function render({ focusEdit = false } = {}) {
  const fragment = document.createDocumentFragment();
  items.forEach((item) => fragment.append(renderItem(item)));
  elements.list.replaceChildren(fragment);

  const completedCount = items.filter((item) => item.completed).length;
  elements.emptyState.hidden = items.length > 0;
  elements.itemCount.textContent = pluralize(items.length, "item");
  elements.clearAll.disabled = items.length === 0;
  elements.clearChecked.disabled = completedCount === 0;
  elements.clearChecked.textContent = completedCount
    ? `Clear checked (${completedCount})`
    : "Clear checked";

  if (focusEdit && editingId) {
    const editInput = document.querySelector(`#edit-${CSS.escape(editingId)}`);
    editInput?.focus();
    editInput?.select();
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

function addItem(text) {
  const cleanText = text.trim();
  if (!cleanText) {
    announce("Type an item before adding it.");
    elements.input.focus();
    return;
  }

  const now = new Date().toISOString();
  items.push({ id: createId(), text: cleanText, completed: false, createdAt: now, updatedAt: now });
  persist();
  render();
  elements.input.value = "";
  elements.input.focus();
  announce(`${cleanText} added.`);
}

function toggleItem(id) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) return;

  item.completed = !item.completed;
  item.updatedAt = new Date().toISOString();
  persist();
  render();
  document.querySelector(`[data-action="toggle"][data-id="${CSS.escape(id)}"]`)?.focus();
  announce(`${item.text} marked ${item.completed ? "checked" : "not checked"}.`);
}

function startEditing(id) {
  editingId = id;
  render({ focusEdit: true });
}

function cancelEditing(id) {
  editingId = null;
  render();
  document.querySelector(`[data-action="edit"][data-id="${CSS.escape(id)}"]`)?.focus();
}

function saveEdit(id, text) {
  const cleanText = text.trim();
  const item = items.find((candidate) => candidate.id === id);
  if (!item) return;

  if (!cleanText) {
    announce("An item name cannot be empty.");
    document.querySelector(`#edit-${CSS.escape(id)}`)?.focus();
    return;
  }

  item.text = cleanText;
  item.updatedAt = new Date().toISOString();
  editingId = null;
  persist();
  render();
  document.querySelector(`[data-action="edit"][data-id="${CSS.escape(id)}"]`)?.focus();
  announce(`${cleanText} updated.`);
}

function deleteItem(id) {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return;

  const [deletedItem] = items.splice(index, 1);
  deletedSnapshot = { item: deletedItem, index };
  if (editingId === id) editingId = null;
  persist();
  render();

  showToast(`${deletedItem.text} deleted.`, {
    actionLabel: "Undo",
    onAction: () => {
      if (!deletedSnapshot) return;
      items.splice(deletedSnapshot.index, 0, deletedSnapshot.item);
      const restoredText = deletedSnapshot.item.text;
      deletedSnapshot = null;
      persist();
      render();
      elements.toast.hidden = true;
      announce(`${restoredText} restored.`);
    },
  });
}

elements.addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addItem(elements.input.value);
});

elements.list.addEventListener("change", (event) => {
  const control = event.target.closest('[data-action="toggle"]');
  if (control) toggleItem(control.dataset.id);
});

elements.list.addEventListener("click", (event) => {
  const control = event.target.closest("[data-action]");
  if (!control || control.dataset.action === "toggle") return;

  const id = control.dataset.id ?? control.closest("[data-id]")?.dataset.id;
  if (control.dataset.action === "edit") startEditing(id);
  if (control.dataset.action === "delete") deleteItem(id);
  if (control.dataset.action === "cancel-edit") cancelEditing(id);
});

elements.list.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-edit-form]");
  if (!form) return;
  event.preventDefault();
  saveEdit(form.dataset.editForm, new FormData(form).get("editedItem")?.toString() ?? "");
});

elements.list.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const form = event.target.closest("[data-edit-form]");
  if (form) cancelEditing(form.dataset.editForm);
});

elements.clearChecked.addEventListener("click", () => {
  const count = items.filter((item) => item.completed).length;
  items = items.filter((item) => !item.completed);
  editingId = null;
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
  editingId = null;
  persist();
  render();
  elements.input.focus();
  announce(`${pluralize(count, "item")} cleared.`);
});

elements.clearDialog.addEventListener("click", (event) => {
  if (event.target === elements.clearDialog) {
    elements.clearDialog.close("cancel");
  }
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
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          showUpdate(worker);
        }
      });
    });

    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  } catch {
    // Core list behavior remains available even if offline support cannot register.
  }
}

function showUpdate(worker) {
  waitingWorker = worker;
  elements.updateButton.hidden = false;
}

elements.updateButton.addEventListener("click", () => {
  waitingWorker?.postMessage({ type: "SKIP_WAITING" });
});

render();
registerServiceWorker();
