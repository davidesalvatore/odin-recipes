const STORAGE_KEY = "inventario_v1";
const SCAN_DEBOUNCE_MS = 1500;

let state = loadState();
let scanner = null;
let lastScannedCode = null;
let lastScannedAt = 0;
let audioCtx = null;
let overlayTimeout = null;

const readerEl = document.getElementById("reader");
const scanOverlayEl = document.getElementById("scan-overlay");
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const undoBtn = document.getElementById("undo-btn");
const exportBtn = document.getElementById("export-btn");
const resetBtn = document.getElementById("reset-btn");
const lastScanEl = document.getElementById("last-scan");
const inventoryBody = document.getElementById("inventory-body");
const inventoryTable = document.getElementById("inventory-table");
const emptyMessage = document.getElementById("empty-message");

function playBeep() {
  if (!audioCtx) return;
  try {
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.2;
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
  } catch (e) {
    // audio non disponibile
  }
}

function flashOverlay() {
  scanOverlayEl.classList.add("visible");
  clearTimeout(overlayTimeout);
  overlayTimeout = setTimeout(() => scanOverlayEl.classList.remove("visible"), 400);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { quantities: {}, history: [] };
  try {
    return JSON.parse(raw);
  } catch (e) {
    return { quantities: {}, history: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  const codes = Object.keys(state.quantities);
  inventoryBody.innerHTML = "";

  codes.forEach((code) => {
    const tr = document.createElement("tr");

    const codeTd = document.createElement("td");
    codeTd.textContent = code;

    const qtyTd = document.createElement("td");
    qtyTd.textContent = state.quantities[code];

    const actionsTd = document.createElement("td");
    actionsTd.className = "row-actions";

    const minusBtn = document.createElement("button");
    minusBtn.textContent = "-1";
    minusBtn.addEventListener("click", () => adjustQuantity(code, -1));

    const plusBtn = document.createElement("button");
    plusBtn.textContent = "+1";
    plusBtn.addEventListener("click", () => adjustQuantity(code, 1));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Elimina";
    deleteBtn.addEventListener("click", () => deleteCode(code));

    actionsTd.append(minusBtn, plusBtn, deleteBtn);
    tr.append(codeTd, qtyTd, actionsTd);
    inventoryBody.appendChild(tr);
  });

  const isEmpty = codes.length === 0;
  emptyMessage.classList.toggle("hidden", !isEmpty);
  inventoryTable.classList.toggle("hidden", isEmpty);

  undoBtn.disabled = state.history.length === 0;
}

function addScan(code) {
  state.quantities[code] = (state.quantities[code] || 0) + 1;
  state.history.push(code);
  saveState();
  render();

  lastScanEl.textContent = `Ultima scansione: ${code}`;
  if (navigator.vibrate) navigator.vibrate(100);
  playBeep();
  flashOverlay();
}

function undoLastScan() {
  if (state.history.length === 0) return;
  const code = state.history.pop();
  state.quantities[code] -= 1;
  if (state.quantities[code] <= 0) delete state.quantities[code];
  saveState();
  render();
  lastScanEl.textContent = `Annullata scansione: ${code}`;
}

function adjustQuantity(code, delta) {
  state.quantities[code] = (state.quantities[code] || 0) + delta;
  if (state.quantities[code] <= 0) delete state.quantities[code];
  saveState();
  render();
}

function deleteCode(code) {
  delete state.quantities[code];
  state.history = state.history.filter((c) => c !== code);
  saveState();
  render();
}

function resetInventory() {
  if (!confirm("Azzerare tutto l'inventario? L'azione non è reversibile.")) return;
  state = { quantities: {}, history: [] };
  saveState();
  render();
  lastScanEl.textContent = "Nessuna scansione ancora";
}

function exportCsv() {
  const rows = [["codice", "quantita"]];
  Object.keys(state.quantities).forEach((code) => {
    rows.push([code, state.quantities[code]]);
  });
  const csv = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inventario_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function onScanSuccess(decodedText) {
  const now = Date.now();
  if (decodedText === lastScannedCode && now - lastScannedAt < SCAN_DEBOUNCE_MS) {
    return;
  }
  lastScannedCode = decodedText;
  lastScannedAt = now;
  addScan(decodedText);
}

async function startScanning() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      // audio non disponibile su questo dispositivo
    }
  } else if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  scanner = new Html5Qrcode("reader");
  const cameraConstraints = { facingMode: "environment" };
  const config = {
    fps: 10,
    qrbox: { width: 280, height: 120 },
    formatsToSupport: [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.CODABAR,
      Html5QrcodeSupportedFormats.ITF,
    ],
  };

  try {
    await scanner.start(cameraConstraints, config, onScanSuccess);
    startBtn.disabled = true;
    stopBtn.disabled = false;

    try {
      await scanner.applyVideoConstraints({
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      });
    } catch (constraintErr) {
      // risoluzione più alta non disponibile su questo dispositivo, si continua con quella di default
    }
  } catch (err) {
    alert("Impossibile avviare la fotocamera: " + err);
  }
}

async function stopScanning() {
  if (!scanner) return;
  try {
    await scanner.stop();
    await scanner.clear();
  } catch (err) {
    // fotocamera già ferma
  }
  scanner = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

startBtn.addEventListener("click", startScanning);
stopBtn.addEventListener("click", stopScanning);
undoBtn.addEventListener("click", undoLastScan);
exportBtn.addEventListener("click", exportCsv);
resetBtn.addEventListener("click", resetInventory);

render();
