const statusText = document.querySelector("#offline-status");
const statusDot = document.querySelector("#status-dot");
const installButton = document.querySelector("#install-button");
let installPrompt = null;
let offlineReady = false;

function updateConnectionStatus() {
  const isOnline = navigator.onLine;
  statusText.textContent = !isOnline
    ? "Offline mode — your apps are still available"
    : offlineReady
      ? "Ready offline on this device"
      : "Preparing offline access…";
  statusDot.classList.toggle("offline", !isOnline);
}

window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);
updateConnectionStatus();

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./service-worker.js");
      await navigator.serviceWorker.ready;
      offlineReady = true;
      updateConnectionStatus();
    } catch {
      statusText.textContent = "Offline setup is unavailable in this browser";
      statusDot.classList.add("offline");
    }
  });
}
