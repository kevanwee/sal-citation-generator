const DEFAULT_PINPOINT_SEPARATOR = "-";

function normalizeString(value) {
  return String(value ?? "").trim();
}

function stripOuterBrackets(value) {
  return normalizeString(value).replace(/^\[/, "").replace(/\]$/, "");
}

function escapeHtml(value) {
  return normalizeString(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function hasValue(value) {
  return normalizeString(value).length > 0;
}

function normalizeTextCitation(text) {
  return normalizeString(text).replace(/[.]+$/g, "");
}

function normalizeCaseNumber(caseNo) {
  const normalized = normalizeString(caseNo);
  if (!/^\d+$/.test(normalized)) {
    return normalized;
  }
  return String(Number(normalized));
}

function normalizeCaseIdentity(note) {
  if (!note || note.type !== "case") {
    return "";
  }

  const reportCitation = normalizeString(note.reportCitation).toLowerCase();
  if (reportCitation) {
    return `report:${reportCitation}`;
  }

  const year = normalizeString(note.year);
  const court = normalizeString(note.court).toUpperCase();
  const caseNo = normalizeCaseNumber(note.caseNo);
  if (year && court && caseNo) {
    return `neutral:${year}|${court}|${caseNo}`;
  }

  return `name:${normalizeString(note.caseName).toLowerCase()}`;
}

function getPinpointParts(note) {
  const start = stripOuterBrackets(note?.paraStart);
  const end = stripOuterBrackets(note?.paraEnd);
  return { start, end };
}

function isSameCase(left, right) {
  return normalizeCaseIdentity(left) && normalizeCaseIdentity(left) === normalizeCaseIdentity(right);
}

function isSamePinpoint(left, right) {
  const leftPin = getPinpointParts(left);
  const rightPin = getPinpointParts(right);
  return leftPin.start === rightPin.start && leftPin.end === rightPin.end;
}

function resolvePinpoint(note, separator = DEFAULT_PINPOINT_SEPARATOR) {
  const { start, end } = getPinpointParts(note);
  if (!start) {
    return "";
  }

  if (end && end !== start) {
    return `at [${start}]${separator}[${end}]`;
  }

  return `at [${start}]`;
}

function resolveNeutralCitation(note) {
  const year = normalizeString(note.year);
  const court = normalizeString(note.court).toUpperCase();
  const caseNo = normalizeCaseNumber(note.caseNo);
  if (!year || !court || !caseNo) {
    return "";
  }
  return `[${year}] ${court} ${caseNo}`;
}

function resolvePrimaryCaseCitation(note) {
  const reportCitation = normalizeString(note.reportCitation);
  if (reportCitation) {
    return reportCitation;
  }
  return resolveNeutralCitation(note);
}

function resolveShortCaseName(note) {
  const shortName = normalizeString(note.shortName);
  if (shortName) {
    return shortName;
  }
  const caseName = normalizeString(note.caseName);
  if (caseName) {
    return caseName;
  }
  return resolvePrimaryCaseCitation(note);
}

function ensureTrailingPeriod(text) {
  return `${normalizeString(text).replace(/[.]+$/g, "")}.`;
}

function formatTextCitation(note) {
  const text = normalizeTextCitation(note?.text);
  return {
    html: `${escapeHtml(text)}.`,
    text: `${text}.`,
  };
}

function formatFullCaseCitation(note) {
  const caseName = normalizeString(note.caseName);
  const citation = resolvePrimaryCaseCitation(note);
  const pinpoint = resolvePinpoint(note);

  const parts = [];
  if (caseName) {
    parts.push(`<span class="italic">${escapeHtml(caseName)}</span>`);
  }
  if (citation) {
    parts.push(escapeHtml(citation));
  }
  if (pinpoint) {
    parts.push(escapeHtml(pinpoint));
  }

  const plainParts = [];
  if (caseName) {
    plainParts.push(caseName);
  }
  if (citation) {
    plainParts.push(citation);
  }
  if (pinpoint) {
    plainParts.push(pinpoint);
  }

  return {
    html: ensureTrailingPeriod(parts.join(" ")),
    text: ensureTrailingPeriod(plainParts.join(" ")),
  };
}

function formatIbid() {
  return {
    html: "<span class=\"italic\">Ibid</span>.",
    text: "Ibid.",
  };
}

function formatId(note) {
  const pinpoint = resolvePinpoint(note);
  if (!pinpoint) {
    return {
      html: "<span class=\"italic\">Id</span>.",
      text: "Id.",
    };
  }

  return {
    html: `<span class="italic">Id</span>, ${escapeHtml(pinpoint)}.`,
    text: `Id, ${pinpoint}.`,
  };
}

function formatSupra(note, firstIndex) {
  const shortName = resolveShortCaseName(note);
  const pinpoint = resolvePinpoint(note);
  const suffix = pinpoint ? `, ${pinpoint}` : "";

  return {
    html: `${escapeHtml(shortName)}, <span class="italic">supra</span> n ${firstIndex + 1}${escapeHtml(suffix)}.`,
    text: `${shortName}, supra n ${firstIndex + 1}${suffix}.`,
  };
}

export function parseElitigationUrl(url) {
  const input = normalizeString(url);
  if (!input) {
    return null;
  }

  const decoded = decodeURIComponent(input);
  const match = decoded.match(/(\d{4})_(SG[A-Z]+)_(\d+)/i);
  if (!match) {
    return null;
  }

  return {
    year: match[1],
    court: match[2].toUpperCase(),
    caseNo: normalizeCaseNumber(match[3]),
  };
}

export function computeCitationOutputs(footnotes) {
  const items = Array.isArray(footnotes) ? footnotes : [];
  const outputs = new Array(items.length);
  const firstCaseReference = new Map();

  items.forEach((note, index) => {
    if (note?.type !== "case") {
      return;
    }
    const key = normalizeCaseIdentity(note);
    if (key && !firstCaseReference.has(key)) {
      firstCaseReference.set(key, index);
    }
  });

  items.forEach((note, index) => {
    if (!note || note.type === "text") {
      outputs[index] = formatTextCitation(note ?? { text: "" });
      return;
    }

    if (note.type !== "case") {
      outputs[index] = formatTextCitation({ text: "" });
      return;
    }

    const previous = items[index - 1];
    if (index > 0 && previous?.type === "case" && isSameCase(note, previous)) {
      outputs[index] = isSamePinpoint(note, previous) ? formatIbid() : formatId(note);
      return;
    }

    const firstIndex = firstCaseReference.get(normalizeCaseIdentity(note));
    if (typeof firstIndex === "number" && firstIndex < index) {
      outputs[index] = formatSupra(note, firstIndex);
      return;
    }

    outputs[index] = formatFullCaseCitation(note);
  });

  return outputs;
}

export function createCaseFootnoteFromElitigation(parsed) {
  return {
    type: "case",
    source: "elitigation",
    caseName: "",
    shortName: "",
    reportCitation: "",
    year: normalizeString(parsed?.year),
    court: normalizeString(parsed?.court).toUpperCase(),
    caseNo: normalizeCaseNumber(parsed?.caseNo),
    paraStart: "",
    paraEnd: "",
  };
}

export function createTextFootnote(text) {
  return {
    type: "text",
    text: normalizeString(text),
  };
}
