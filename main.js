import {
  computeCitationOutputs,
  createCaseFootnoteFromElitigation,
  createTextFootnote,
  parseElitigationUrl,
} from "./citationEngine.js";

const STORAGE_KEY = "sal-citation-generator:v2";
let footnotes = [];
let isElitigation = true;
let sortableInstance = null;

const elements = {
  elitigationBtn: document.getElementById("elitigationBtn"),
  otherBtn: document.getElementById("otherBtn"),
  citationInput: document.getElementById("citationInput"),
  addCitationBtn: document.getElementById("addCitationBtn"),
  clearAllBtn: document.getElementById("clearAllBtn"),
  copyAllBtn: document.getElementById("copyAllBtn"),
  statusMessage: document.getElementById("statusMessage"),
  footnotesList: document.getElementById("footnotesList"),
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(footnotes));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function showStatus(message, kind = "info") {
  elements.statusMessage.textContent = message;
  elements.statusMessage.dataset.kind = kind;
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function toggleActiveState(elitigationMode) {
  elements.elitigationBtn.classList.toggle("active", elitigationMode);
  elements.otherBtn.classList.toggle("active", !elitigationMode);
  elements.citationInput.placeholder = elitigationMode
    ? "Paste eLitigation case URL (eg, https://www.elitigation.sg/gd/s/2023_SGCA_5)"
    : "Enter manual citation text";
}

function handleModeChange(elitigationMode) {
  isElitigation = elitigationMode;
  toggleActiveState(elitigationMode);
}

function addFootnoteFromInput() {
  const input = elements.citationInput.value.trim();
  if (!input) {
    showStatus("Please enter a citation input.", "warn");
    return;
  }

  if (isElitigation) {
    const parsed = parseElitigationUrl(input);
    if (!parsed) {
      showStatus(
        "Could not parse URL. Expected a neutral citation segment like 2023_SGCA_5.",
        "error",
      );
      return;
    }
    footnotes.push(createCaseFootnoteFromElitigation(parsed));
    showStatus("Added eLitigation citation stub. Fill in case details below.", "success");
  } else {
    footnotes.push(createTextFootnote(input));
    showStatus("Added manual citation text.", "success");
  }

  elements.citationInput.value = "";
  render();
}

function removeFootnote(index) {
  footnotes.splice(index, 1);
  render();
}

function clearAllFootnotes() {
  footnotes = [];
  render();
  showStatus("All citations cleared.", "info");
}

async function copyAllCitations() {
  const outputs = computeCitationOutputs(footnotes).map((entry, index) => `${index + 1}. ${entry.text}`);
  if (!outputs.length) {
    showStatus("No citations available to copy.", "warn");
    return;
  }

  await navigator.clipboard.writeText(outputs.join("\n"));
  showStatus("Citations copied to clipboard.", "success");
}

function createCaseCard(note, index, outputHtml) {
  return `
    <article class="footnote">
      <div class="footnote-header">
        <span class="drag-handle" title="Drag to reorder">${index + 1}</span>
        <button type="button" class="danger-btn" data-action="remove" data-index="${index}">Remove</button>
      </div>
      <div class="field-grid">
        <label>Case name
          <input data-index="${index}" data-field="caseName" value="${escapeAttribute(note.caseName)}" placeholder="eg, Tan Kim Seng v Victor Adam Ibrahim">
        </label>
        <label>Short name (for supra)
          <input data-index="${index}" data-field="shortName" value="${escapeAttribute(note.shortName)}" placeholder="eg, Tan Kim Seng">
        </label>
        <label>SLR/report citation (preferred if available)
          <input data-index="${index}" data-field="reportCitation" value="${escapeAttribute(note.reportCitation)}" placeholder="eg, [2002] 3 SLR(R) 345">
        </label>
        <label>Year
          <input data-index="${index}" data-field="year" value="${escapeAttribute(note.year)}" placeholder="YYYY">
        </label>
        <label>Court
          <input data-index="${index}" data-field="court" value="${escapeAttribute(note.court)}" placeholder="SGCA / SGHC / SGHCF">
        </label>
        <label>Case No
          <input data-index="${index}" data-field="caseNo" value="${escapeAttribute(note.caseNo)}" placeholder="5">
        </label>
        <label>Pinpoint start paragraph
          <input data-index="${index}" data-field="paraStart" value="${escapeAttribute(note.paraStart)}" placeholder="eg, 12">
        </label>
        <label>Pinpoint end paragraph
          <input data-index="${index}" data-field="paraEnd" value="${escapeAttribute(note.paraEnd)}" placeholder="optional">
        </label>
      </div>
      <p class="citation-output">${outputHtml}</p>
    </article>
  `;
}

function createTextCard(note, index, outputHtml) {
  return `
    <article class="footnote">
      <div class="footnote-header">
        <span class="drag-handle" title="Drag to reorder">${index + 1}</span>
        <button type="button" class="danger-btn" data-action="remove" data-index="${index}">Remove</button>
      </div>
      <label>Manual citation
        <input data-index="${index}" data-field="text" value="${escapeAttribute(note.text)}" placeholder="Enter citation text">
      </label>
      <p class="citation-output">${outputHtml}</p>
    </article>
  `;
}

function initSortable() {
  if (sortableInstance) {
    sortableInstance.destroy();
  }

  sortableInstance = new Sortable(elements.footnotesList, {
    animation: 150,
    handle: ".drag-handle",
    onEnd: (event) => {
      const moved = footnotes.splice(event.oldIndex, 1)[0];
      footnotes.splice(event.newIndex, 0, moved);
      render();
    },
  });
}

function render() {
  const outputs = computeCitationOutputs(footnotes);
  const html = footnotes
    .map((note, index) =>
      note.type === "case"
        ? createCaseCard(note, index, outputs[index].html)
        : createTextCard(note, index, outputs[index].html),
    )
    .join("");

  elements.footnotesList.innerHTML = html || "<p class=\"empty\">No citations yet.</p>";
  saveState();

  if (footnotes.length) {
    initSortable();
  } else if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }
}

function handleListChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const index = Number(target.dataset.index);
  const field = target.dataset.field;
  if (!Number.isInteger(index) || index < 0 || index >= footnotes.length || !field) {
    return;
  }

  footnotes[index][field] = target.value;
  render();
}

function handleListClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const action = target.dataset.action;
  const index = Number(target.dataset.index);
  if (action === "remove" && Number.isInteger(index)) {
    removeFootnote(index);
  }
}

function bootstrap() {
  footnotes = loadState();
  toggleActiveState(isElitigation);

  elements.elitigationBtn.addEventListener("click", () => handleModeChange(true));
  elements.otherBtn.addEventListener("click", () => handleModeChange(false));
  elements.addCitationBtn.addEventListener("click", addFootnoteFromInput);
  elements.clearAllBtn.addEventListener("click", clearAllFootnotes);
  elements.copyAllBtn.addEventListener("click", () => {
    copyAllCitations().catch(() => showStatus("Clipboard copy failed.", "error"));
  });

  elements.citationInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      addFootnoteFromInput();
    }
  });

  elements.footnotesList.addEventListener("change", handleListChange);
  elements.footnotesList.addEventListener("click", handleListClick);

  render();
}

bootstrap();
