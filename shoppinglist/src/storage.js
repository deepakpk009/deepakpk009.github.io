const STORAGE_KEY = "shopping-list:v1";
const RECOVERY_PREFIX = "shopping-list:recovery:";
const MAX_TEXT_LENGTH = 120;

function isValidItem(item) {
  return (
    item &&
    typeof item === "object" &&
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.text === "string" &&
    item.text.trim().length > 0 &&
    item.text.length <= MAX_TEXT_LENGTH &&
    typeof item.completed === "boolean" &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string" &&
    (item.slot === undefined || (Number.isInteger(item.slot) && item.slot >= 0))
  );
}

function canUseStorage() {
  try {
    const testKey = `${STORAGE_KEY}:test`;
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function preserveInvalidValue(rawValue) {
  try {
    localStorage.setItem(`${RECOVERY_PREFIX}${Date.now()}`, rawValue);
  } catch {
    // Recovery is best-effort. The app can still reset to a safe state.
  }
}

export function loadList() {
  if (!canUseStorage()) {
    return { items: [], storageAvailable: false, recovered: false };
  }

  const rawValue = localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return { items: [], storageAvailable: true, recovered: false };
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (parsed?.version !== 1 || !Array.isArray(parsed.items) || !parsed.items.every(isValidItem)) {
      throw new Error("Invalid shopping-list data");
    }

    return { items: parsed.items, storageAvailable: true, recovered: false };
  } catch {
    preserveInvalidValue(rawValue);
    localStorage.removeItem(STORAGE_KEY);
    return { items: [], storageAvailable: true, recovered: true };
  }
}

export function saveList(items) {
  if (!canUseStorage()) {
    return false;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items }));
    return true;
  } catch {
    return false;
  }
}

export { MAX_TEXT_LENGTH, STORAGE_KEY };
