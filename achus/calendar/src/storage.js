const STORAGE_KEY = "cozy-calendar:v1";
const RECOVERY_PREFIX = "cozy-calendar:recovery:";
const MAX_TITLE_LENGTH = 80;
const MAX_NOTES_LENGTH = 300;
const COLORS = new Set(["sage", "sunset", "sky", "plum"]);

function isDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isTime(value) {
  return value === "" || (typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value));
}

function isValidEvent(event) {
  return Boolean(
    event &&
      typeof event === "object" &&
      typeof event.id === "string" &&
      event.id &&
      typeof event.title === "string" &&
      event.title.trim() &&
      event.title.length <= MAX_TITLE_LENGTH &&
      isDateKey(event.date) &&
      typeof event.allDay === "boolean" &&
      isTime(event.startTime) &&
      isTime(event.endTime) &&
      typeof event.notes === "string" &&
      event.notes.length <= MAX_NOTES_LENGTH &&
      COLORS.has(event.color) &&
      typeof event.createdAt === "string" &&
      typeof event.updatedAt === "string",
  );
}

function canUseStorage() {
  try {
    const key = `${STORAGE_KEY}:test`;
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function preserveInvalidValue(value) {
  try {
    localStorage.setItem(`${RECOVERY_PREFIX}${Date.now()}`, value);
  } catch {
    // Recovery is best-effort; the application can still reset safely.
  }
}

export function loadCalendar() {
  if (!canUseStorage()) return { events: [], storageAvailable: false, recovered: false };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { events: [], storageAvailable: true, recovered: false };

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || !Array.isArray(parsed.events) || !parsed.events.every(isValidEvent)) {
      throw new Error("Invalid calendar data");
    }
    return { events: parsed.events, storageAvailable: true, recovered: false };
  } catch {
    preserveInvalidValue(raw);
    localStorage.removeItem(STORAGE_KEY);
    return { events: [], storageAvailable: true, recovered: true };
  }
}

export function saveCalendar(events) {
  if (!canUseStorage()) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, events }));
    return true;
  } catch {
    return false;
  }
}

export { MAX_TITLE_LENGTH, MAX_NOTES_LENGTH, STORAGE_KEY };
