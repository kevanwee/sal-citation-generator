let footnotes = [];
let isElitigation = true;

// Toggle handlers
document.getElementById('elitigationBtn').addEventListener('click', () => {
    isElitigation = true;
    document.getElementById('citationInput').placeholder = "Paste eLitigation case URL";
    toggleActiveState(true);
});

document.getElementById('otherBtn').addEventListener('click', () => {
    isElitigation = false;
    document.getElementById('citationInput').placeholder = "Enter manual citation";
    toggleActiveState(false);
});

function toggleActiveState(isElit) {
    document.getElementById('elitigationBtn').classList.toggle('active', isElit);
    document.getElementById('otherBtn').classList.toggle('active', !isElit);
}

function handleInput() {
    const input = document.getElementById('citationInput').value.trim();
    if (!input) return;

    if (isElitigation) {
        const parsed = parseElitigationUrl(input);
        if (parsed) {
            footnotes.push({
                ...parsed,
                type: 'elitigation'
            });
            updateDisplay();
            document.getElementById('citationInput').value = '';
        } else {
            alert("Invalid eLitigation URL format. Example: https://www.elitigation.sg/gd/s/2023_SGCA_5");
        }
    } else {
        const newFootnote = {
            text: input,
            type: 'other'
        };
        footnotes.push(newFootnote);
        updateDisplay();
        document.getElementById('citationInput').value = '';
    }
}

function parseElitigationUrl(url) {
    const regex = /(\d{4})_SG([A-Z]+)_(\d+)/i;
    const match = url.match(regex);

    if (match) {
        return {
            caseName: '',
            year: match[1],
            court: 'SG' + match[2].toUpperCase(),
            caseNo: match[3],
            paraStart: '',
            paraEnd: ''
        };
    }
    return null;
}

function updateDisplay() {
    const list = document.getElementById('footnotesList');
    list.innerHTML = '';

    footnotes.forEach((fn, index) => {
        const div = document.createElement('div');
        div.className = 'footnote';

        if (fn.type === 'elitigation') {
            // eLitigation format with italicized case name
            div.innerHTML = `
                <span class="drag-handle">${index + 1}</span>
                <input class="case-name-input" value="${fn.caseName}" onchange="updateElitigationField(${index}, 'caseName', this.value)" style="width: 250px;">
                [<input value="${fn.year}" onchange="updateElitigationField(${index}, 'year', this.value)" size="4">]
                <input value="${fn.court}" onchange="updateElitigationField(${index}, 'court', this.value)" size="4">
                <input value="${fn.caseNo}" onchange="updateElitigationField(${index}, 'caseNo', this.value)" size="3">
                at [<input value="${fn.paraStart || ''}" onchange="updateElitigationField(${index}, 'paraStart', this.value)" size="2">] -
                [<input value="${fn.paraEnd || ''}" onchange="updateElitigationField(${index}, 'paraEnd', this.value)" size="2">]
                <span class="citation-output"></span>
            `;
        } else {
            // Other format - just a simple text field
            div.innerHTML = `
                <span class="drag-handle">${index + 1}</span>
                <input value="${fn.text}" onchange="updateOtherField(${index}, 'text', this.value)" style="width: 100%;">
                <span class="citation-output"></span>
            `;
        }

        list.appendChild(div);
    });

    applyAllRules();
    initSortable();
}

function updateElitigationField(index, field, value) {
    footnotes[index][field] = value;
    updateDisplay();
}

function updateOtherField(index, field, value) {
    footnotes[index][field] = value;
    updateDisplay();
}

function formatElitigationCitation(fn) {
    let citation = `<span class="italic">${fn.caseName || ''}</span> [${fn.year}] ${fn.court} ${fn.caseNo}`;
    
    // Apply paragraph logic
    if (fn.paraStart) {
        if (fn.paraEnd && fn.paraStart !== fn.paraEnd) {
            citation += ` at [${fn.paraStart}] - [${fn.paraEnd}]`;
        } else {
            citation += ` at [${fn.paraStart}]`;
        }
    }

    // Add final period
    return citation + '.';
}

function formatOtherCitation(fn) {
    // Make sure there's only one period at the end
    let text = fn.text || '';
    text = text.replace(/\.+$/, ''); // Remove any trailing periods
    return text + '.';
}

function getCitationKey(fn) {
    if (fn.type === 'elitigation') {
        // Include paragraph numbers in the key to ensure exact matching
        return `${fn.caseName}-${fn.year}-${fn.court}-${fn.caseNo}-${fn.paraStart || ''}-${fn.paraEnd || ''}`;
    }
    return fn.text;
}

function applyAllRules() {
    // First pass: map citation keys to their first occurrence index
    const firstOccurrence = {};
    
    footnotes.forEach((fn, index) => {
        // Create a base citation key without paragraph info for Id checking
        if (fn.type === 'elitigation') {
            const baseKey = `${fn.caseName}-${fn.year}-${fn.court}-${fn.caseNo}`;
            if (firstOccurrence[baseKey] === undefined) {
                firstOccurrence[baseKey] = index;
            }
        }
        
        // Also track the full citation key for Supra references
        const fullKey = getCitationKey(fn);
        if (firstOccurrence[fullKey] === undefined) {
            firstOccurrence[fullKey] = index;
        }
    });
    
    // Second pass: apply Ibid/Id and Supra rules
    const outputSpans = document.querySelectorAll('.citation-output');
    
    footnotes.forEach((fn, index) => {
        if (index === 0 || fn.type !== 'elitigation') {
            // Handle first or non-elitigation citations
            if (fn.type === 'elitigation') {
                outputSpans[index].innerHTML = formatElitigationCitation(fn);
            } else {
                outputSpans[index].innerHTML = formatOtherCitation(fn);
            }
            return;
        }
        
        const prev = footnotes[index - 1];
        
        // Check for same case but ignore paragraph numbers
        const sameCaseAsPrevious = prev.type === 'elitigation' && 
                                  fn.caseName === prev.caseName && 
                                  fn.year === prev.year && 
                                  fn.court === prev.court && 
                                  fn.caseNo === prev.caseNo;
        
        if (sameCaseAsPrevious) {
            // Same case, check paragraphs
            if (fn.paraStart === prev.paraStart && fn.paraEnd === prev.paraEnd) {
                // Same paragraphs = Ibid
                outputSpans[index].innerHTML = '<span class="italic">Ibid</span>.';
            } else {
                // Different paragraphs = Id at [x]
                let idText = '<span class="italic">Id</span> at';
                if (fn.paraStart) {
                    if (fn.paraEnd && fn.paraStart !== fn.paraEnd) {
                        idText += ` [${fn.paraStart}] - [${fn.paraEnd}]`;
                    } else {
                        idText += ` [${fn.paraStart}]`;
                    }
                }
                outputSpans[index].innerHTML = idText + '.';
            }
        } else {
            // Not the same as previous case, check for Supra
            const fullKey = getCitationKey(fn);
            const firstIndex = firstOccurrence[fullKey];
            
            if (firstIndex !== undefined && firstIndex < index) {
                // This exact citation appeared earlier
                outputSpans[index].innerHTML = `<span class="italic">Supra</span> n ${firstIndex + 1}.`;
            } else {
                // First occurrence of this citation
                outputSpans[index].innerHTML = formatElitigationCitation(fn);
            }
        }
    });
}


function initSortable() {
    new Sortable(document.getElementById('footnotesList'), {
        animation: 150,
        handle: '.drag-handle',
        onEnd: (evt) => {
            const movedItem = footnotes.splice(evt.oldIndex, 1)[0];
            footnotes.splice(evt.newIndex, 0, movedItem);
            updateDisplay();
        }
    });
}
