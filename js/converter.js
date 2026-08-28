const MAX_LAYOUT_SIZE = 250;

function validateLayoutArray(layout) {
  if (!Array.isArray(layout)) throw new Error("The layout must be an array.");
  if (layout.length < 1 || layout.length > MAX_LAYOUT_SIZE) {
    throw new Error(`Layout must contain between 1 and ${MAX_LAYOUT_SIZE} slots; received ${layout.length}.`);
  }
  for (let i = 0; i < layout.length; i++) {
    if (!Number.isInteger(layout[i])) throw new Error(`Layout position ${i} is not an integer.`);
    if (layout[i] < -1) throw new Error(`Layout position ${i} contains invalid item ID ${layout[i]}.`);
  }
}

// ---- Bank Tag Layout -> {name, layout[], banktag} ----
function parseBankTagLayout(input) {
  const prefix = "banktaglayoutsplugin:";
  const trimmed = input.trim();
  if (!trimmed.startsWith(prefix)) {
    throw new Error('Bank Tag Layout must start with "banktaglayoutsplugin:".');
  }

  const records = trimmed.split(/,(?=banktag:)/);
  const layoutRecord = records[0];
  const bankTagRecord = records.length > 1 ? records.slice(1).join(",") : null;

  const raw = layoutRecord.slice(prefix.length).trim();
  if (!raw) throw new Error("Bank Tag Layout is empty.");

  const parts = raw.split(",");
  const name = parts.shift().trim() || "setup";

  const layoutEntries = [];
  let maxPosition = -1;

  for (const partRaw of parts) {
    const part = partRaw.trim();
    if (!part) continue;
    const separator = part.lastIndexOf(":");
    if (separator === -1) throw new Error(`Invalid Bank Tag Layout entry "${part}". Expected itemId:position.`);

    const idText = part.slice(0, separator).trim();
    const slotText = part.slice(separator + 1).trim();
    if (!/^\d+$/.test(idText)) throw new Error(`Invalid item ID "${idText}".`);
    if (!/^\d+$/.test(slotText)) throw new Error(`Invalid position "${slotText}".`);

    const itemId = Number(idText);
    const slot = Number(slotText);
    if (!Number.isSafeInteger(itemId)) throw new Error(`Item ID "${idText}" is too large.`);
    if (!Number.isSafeInteger(slot) || slot < 0 || slot >= MAX_LAYOUT_SIZE) {
      throw new Error(`Position ${slot} is outside the supported 0-${MAX_LAYOUT_SIZE - 1} range.`);
    }
    layoutEntries.push({ itemId, slot });
    maxPosition = Math.max(maxPosition, slot);
  }

  const layout = Array(Math.max(1, maxPosition + 1)).fill(-1);
  for (const { itemId, slot } of layoutEntries) {
    if (layout[slot] !== -1) throw new Error(`Position ${slot} is assigned more than once.`);
    layout[slot] = itemId;
  }

  return { name, layout, banktag: bankTagRecord };
}

// ---- layout[] -> full Bank Tag Layout ----
function layoutToBankTagString(layout, name, banktagOverride) {
  validateLayoutArray(layout);
  const entries = [];
  for (let index = 0; index < layout.length; index++) {
    const itemId = layout[index];
    if (itemId === -1) continue;
    entries.push(`${itemId}:${index}`);
  }

  let banktag = (banktagOverride || "").trim();

  if (banktag) {
    if (!banktag.startsWith("banktag:")) {
      if (banktag.includes(",")) {
        banktag = `banktag:${name},${banktag}`;
      } else {
        throw new Error('Bank tag data must start with "banktag:" or be a comma-separated item list.');
      }
    }
    const raw = banktag.slice("banktag:".length);
    const comma = raw.indexOf(",");
    const items = comma >= 0 ? raw.slice(comma + 1) : "";
    banktag = `banktag:${name}${items ? "," + items : ""}`;
  } else {
    const seen = new Set();
    const items = [];
    let firstItemId = null;
    for (const itemId of layout) {
      if (itemId === -1 || seen.has(itemId)) continue;
      seen.add(itemId);
      items.push(String(itemId));
      if (firstItemId === null) firstItemId = itemId;
    }
    banktag = `banktag:${name},${items.join(",")},${firstItemId}`;
  }

  return `banktaglayoutsplugin:${name},${entries.join(",")},${banktag}`;
}

// ---- full Inventory Setup -> {name, layout[], banktag} ----
function inventoryJSONToLayout(input) {
  let data;
  try {
    data = JSON.parse(input);
  } catch (e) {
    throw new Error("Inventory Setup input is not valid JSON.");
  }

  let layout;
  let name = "setup";
  let setup = null;

  if (Array.isArray(data)) {
    layout = data;
  } else if (data && Array.isArray(data.layout)) {
    layout = data.layout;
    setup = data.setup || {};
    if (typeof setup.name === "string") name = setup.name;
  } else {
    throw new Error('Expected JSON containing a "layout" array.');
  }
  validateLayoutArray(layout);

  let banktag = null;
  if (data && typeof data.banktag === "string") banktag = data.banktag.trim();
  else if (setup && typeof setup.banktag === "string") banktag = setup.banktag.trim();

  return { name, layout, banktag };
}

// ---- layout[] -> full Inventory Setup ----
function layoutToInventoryJSON(layout, name) {
  validateLayoutArray(layout);

  const inventoryIndices = [4, 5, 6, 7, 12, 13, 14, 15, 20, 21, 22, 23, 28, 29, 30, 31, 36, 37, 38, 39, 44, 45, 46, 47, 52, 53, 54, 55];
  const eqOrderIndices = [1, 8, 9, 16, 17, 18, null, 25, null, 32, 33, null, 34, 10];
  const rpPrimaryIndices = [62, 63, 70, 71];
  const rpBackupIndices = [40, 41, 42, 43];
  const qvIndex = 2;

  const inv = [];
  const eq = [];
  const afi = {};
  const qv = [];
  const rp = [];

  for (const idx of inventoryIndices) {
    const id = layout[idx];
    inv.push(id !== -1 && id !== undefined ? { id } : null);
  }

  for (let i = 0; i < eqOrderIndices.length; i++) {
    const index = eqOrderIndices[i];
    if (index === null) {
      eq.push(null);
      continue;
    }
    const id = layout[index];
    if (id !== -1 && id !== undefined) {
      eq.push(id === 10 ? { id, q: 77589 } : { id });
    } else {
      eq.push(null);
    }
  }

  const primaryRp = rpPrimaryIndices.map((idx) => layout[idx]).filter((id) => id !== -1 && id !== undefined);
  const backupRp = rpBackupIndices.map((idx) => layout[idx]).filter((id) => id !== -1 && id !== undefined);

  if (primaryRp.length > 0) {
    for (const id of primaryRp) rp.push({ id, q: 100000 });
  } else if (backupRp.length > 0) {
    for (const id of backupRp) rp.push({ id, q: 100000 });
  } else {
    rp.push(null);
  }

  if (layout[qvIndex] !== -1 && layout[qvIndex] !== undefined) {
    qv.push({ id: layout[qvIndex], q: 100000 });
  } else {
    qv.push(null);
  }

  for (let i = 0; i < layout.length; i++) {
    if (
      !inventoryIndices.includes(i) &&
      !eqOrderIndices.includes(i) &&
      !rpPrimaryIndices.includes(i) &&
      !rpBackupIndices.includes(i) &&
      i !== qvIndex
    ) {
      const id = layout[i];
      if (id !== -1 && id !== undefined) afi[id] = { id };
    }
  }

  const setup = {
    inv,
    eq: eq.length > 0 ? eq : null,
    rp,
    qv,
    afi,
    name,
    hc: "#FFFFFFFF",
    fb: true,
    uh: true,
    sb: 2,
  };

  return JSON.stringify({ setup, layout }, null, 0);
}

function detectSetupType(input) {
  const trimmed = input.trim();
  if (trimmed.startsWith("banktaglayoutsplugin:")) return "banklayout";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "inventory";
  throw new Error("Could not automatically detect the input format. Paste Inventory Setup JSON or a banktaglayoutsplugin string.");
}

// ---- High level helpers used by boss pages ----

// Returns a flat layout[] (ids, -1 = empty) for whichever format a setup has.
function getSetupLayout(setup) {
  if (setup.raw) return parseBankTagLayout(setup.raw).layout;
  if (setup.inventory) return inventoryJSONToLayout(setup.inventory).layout;
  return null;
}

// Returns the text to put on the clipboard for the current site-wide format,
// converting on the fly if the setup only has the other format stored.
function getSetupCopyText(setup, format) {
  if (format === "inventory") {
    if (setup.inventory) return setup.inventory.trim();
    if (setup.raw) {
      const { name, layout } = parseBankTagLayout(setup.raw);
      return layoutToInventoryJSON(layout, name);
    }
  } else {
    if (setup.raw) return setup.raw.trim();
    if (setup.inventory) {
      const { name, layout, banktag } = inventoryJSONToLayout(setup.inventory);
      return layoutToBankTagString(layout, name, banktag);
    }
  }
  return null;
}
