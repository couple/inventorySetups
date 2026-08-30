const MAX_LAYOUT_SIZE = 250;
// Grid width used when rendering a Bank Tag Layout / Inventory Setup grid
// (matches GRID_COLS in app.js) - used to reason about "rows" when packing
// miscellaneous items compactly.
const GRID_COLS = 8;

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

// ---- Grid layout styles ----
// Describes, for each layout style ("default" or "zigzag"), which flat
// layout[] position corresponds to each semantic slot (inventory slot N,
// equipment slot N, rune pouch slot N, quiver). This is what lets us pivot
// between a position-indexed layout[] (used by Bank Tag Layout strings and
// the "layout" field of Inventory Setup JSON) and a style-agnostic
// "semantic" description of a setup (used by the Inventory Setup "setup"
// object), in either direction, for either style.
const LAYOUT_STYLES = {
  default: {
    inv: [
      4, 5, 6, 7,
      12, 13, 14, 15,
      20, 21, 22, 23,
      28, 29, 30, 31,
      36, 37, 38, 39,
      44, 45, 46, 47,
      52, 53, 54, 55
    ],
    eq: [1, 8, 9, 16, 17, 18, null, 25, null, 32, 33, null, 34, 10],
    // Default style mirrors the real equipment screen layout, so an empty
    // slot (e.g. no shield) is just left blank - it isn't repacked.
    eqCompact: false,
    rp: [62, 63, 70, 71],
    rpBackup: [40, 41, 42, 43],
    qv: 2,
    // AFI items are packed starting from the grid row containing the
    // highest reserved position - default's rune pouch positions (62, 63,
    // 70, 71) leave a real gap (64-69) mid-row that AFI items fill first.
    afiRowOffset: 0,
  },
  zigzag: {
    inv: [
      16, 24, 17, 25, 18, 26, 19, 27,
      20, 28, 21, 29, 22, 30, 23, 31,
      32, 40, 33, 41, 34, 42,
      35, 43, 36, 44, 37, 45
    ],
    eq: [0, 8, 1, 9, 2, 10, null, 3, null, 11, 4, null, 12, 5],
    // Zigzag style packs equipped items into a compact block, so an empty
    // slot (e.g. no shield) is skipped entirely rather than leaving a gap
    // in that block - later items shift up to fill the space.
    eqCompact: true,
    rp: [48, 49, 50, 51],
    rpBackup: [],
    qv: 13,
    // Zigzag's reserved block ends flush against the rune pouch, with no
    // real gap to use, so AFI items start on the row right after it.
    afiRowOffset: 1,
  },
};

function getLayoutStyle(style) {
  const map = LAYOUT_STYLES[style];
  if (!map) throw new Error(`Unknown layout style "${style}". Expected "default" or "zigzag".`);
  return map;
}

// The equipment slot order and corresponding grid positions, in the order
// they appear in `map.eq` with structural (always-absent) slots removed.
// Used to pack equipped items into `map.eq`'s positions without gaps.
function getEqOrder(map) {
  const slotOrder = [];
  const posOrder = [];
  map.eq.forEach((idx, i) => {
    if (idx === null) return;
    slotOrder.push(i);
    posOrder.push(idx);
  });
  return { slotOrder, posOrder };
}

// ---- layout[] (positions, arranged per `style`) -> semantic slots ----
// The semantic form is style-agnostic: inv[i] always means "inventory slot
// i+1", eq[i] always means the same equipment slot, etc, regardless of
// which layout style the source positions used. This is the pivot
// representation everything converts through.
function layoutToSemantic(layout, style) {
  const map = getLayoutStyle(style);
  const at = (idx) =>
    idx !== null && idx !== undefined && layout[idx] !== -1 && layout[idx] !== undefined ? layout[idx] : -1;

  const inv = map.inv.map((idx) => at(idx));
  const eq = map.eq.map((idx) => (idx === null ? -1 : at(idx)));

  let rp = map.rp.map((idx) => at(idx)).filter((id) => id !== -1);
  let usedRpIndices = map.rp;
  if (rp.length === 0 && map.rpBackup && map.rpBackup.length) {
    rp = map.rpBackup.map((idx) => at(idx)).filter((id) => id !== -1);
    usedRpIndices = map.rpBackup;
  }

  const qv = at(map.qv);

  // Everything not used by inventory/equipment/rune pouch/quiver is an
  // "additional free item" (AFI) - kept with its original grid position so
  // it can be placed sensibly if re-rendered in the same style. Only the
  // rune pouch index set actually in use (primary or backup, whichever
  // supplied `rp`) is excluded here - the other one is left available for
  // AFI, so an item sitting in an unused backup/primary position isn't
  // silently dropped.
  const excludedIndices = new Set([
    ...map.inv,
    ...map.eq.filter((idx) => idx !== null),
    ...usedRpIndices,
    map.qv,
  ]);

  const afi = [];
  for (let i = 0; i < layout.length; i++) {
    if (excludedIndices.has(i)) continue;
    const id = layout[i];
    if (id !== -1 && id !== undefined) afi.push({ id, pos: i });
  }

  return { inv, eq, rp, qv, afi };
}

// ---- semantic slots -> layout[] (positions, arranged per `style`) ----
// `sourceStyle` is the style the semantic form was originally decoded from
// (if known). When both it and `style` are "default" - i.e. no style
// change is actually happening - AFI items keep their original grid
// position wherever possible, exactly as a plain default Bank Tag Layout
// would. Any other combination (including zigzag -> zigzag) always packs
// AFI items into a fixed spot instead, since there's no single "original"
// arrangement to preserve once a style conversion is involved.
function semanticToLayout(semantic, style, sourceStyle) {
  const map = getLayoutStyle(style);
  const occupied = new Map();

  map.inv.forEach((idx, i) => {
    const id = semantic.inv[i];
    if (id !== -1 && id !== undefined) occupied.set(idx, id);
  });

  if (map.eqCompact) {
    // Pack equipped items into this style's equipment positions in slot
    // order, skipping any empty slots so they don't leave a gap in the
    // compact block (the semantic `eq` array itself is untouched).
    const { slotOrder, posOrder } = getEqOrder(map);
    const eqValues = slotOrder
      .map((i) => semantic.eq[i])
      .filter((id) => id !== -1 && id !== undefined);
    eqValues.forEach((id, i) => occupied.set(posOrder[i], id));
  } else {
    map.eq.forEach((idx, i) => {
      if (idx === null) return;
      const id = semantic.eq[i];
      if (id !== -1 && id !== undefined) occupied.set(idx, id);
    });
  }

  (semantic.rp || []).forEach((id, i) => {
    if (id === -1 || id === undefined) return;
    const idx = map.rp[i];
    if (idx !== undefined) occupied.set(idx, id);
  });

  if (semantic.qv !== -1 && semantic.qv !== undefined) {
    occupied.set(map.qv, semantic.qv);
  }

  // Every position this style reserves for a semantic slot - inventory,
  // equipment, rune pouch (both primary and backup), quiver - even when
  // that particular slot happens to be empty right now. AFI items must
  // never land on one of these, or decoding would misread them back as
  // whatever semantic slot that position maps to instead of as AFI.
  const reserved = new Set([
    ...map.inv,
    ...map.eq.filter((idx) => idx !== null),
    ...map.rp,
    ...(map.rpBackup || []),
    map.qv,
  ]);
  const reservedMax = reserved.size ? Math.max(...reserved) : -1;

  if (style === "default" && sourceStyle === "default") {
    // No style change: keep each AFI item at its original grid position
    // where that's still free and falls within the first fully free row -
    // close enough to the rest of the layout that preserving it doesn't
    // leave an empty row hanging in between. Anything else (colliding, or
    // sitting much further out than that) gets appended afterwards,
    // starting from that first free row.
    const isPlaceable = (idx) => !occupied.has(idx) && !reserved.has(idx);
    const firstFreeRowStart = reservedMax < 0 ? 0 : Math.ceil((reservedMax + 1) / GRID_COLS) * GRID_COLS;
    const firstFreeRowEnd = firstFreeRowStart + GRID_COLS - 1;

    const deferred = [];
    for (const { id, pos } of semantic.afi || []) {
      if (isPlaceable(pos) && pos <= firstFreeRowEnd) {
        occupied.set(pos, id);
      } else {
        deferred.push(id);
      }
    }

    let nextSlot = Math.max(occupied.size ? Math.max(...occupied.keys()) + 1 : 0, firstFreeRowStart);
    for (const id of deferred) {
      while (reserved.has(nextSlot)) nextSlot++;
      occupied.set(nextSlot, id);
      nextSlot++;
    }
  } else {
    // A style conversion is happening (or the source style is unknown):
    // AFI items are always packed starting from the grid row containing
    // the highest reserved position, offset per-style by `afiRowOffset` -
    // never left scattered - read off in column-major order from their
    // original grid position (down each column before moving to the next)
    // so items that were stacked in the same column stay adjacent.
    const firstFreeRowStart =
      reservedMax < 0 ? 0 : (Math.floor(reservedMax / GRID_COLS) + (map.afiRowOffset || 0)) * GRID_COLS;

    const afiOrder = (semantic.afi || [])
      .slice()
      .sort((a, b) => {
        const colA = a.pos % GRID_COLS;
        const colB = b.pos % GRID_COLS;
        if (colA !== colB) return colA - colB;
        return a.pos - b.pos;
      });

    let nextSlot = firstFreeRowStart;
    for (const { id } of afiOrder) {
      while (occupied.has(nextSlot) || reserved.has(nextSlot)) nextSlot++;
      occupied.set(nextSlot, id);
      nextSlot++;
    }
  }

  const maxIndex = occupied.size ? Math.max(...occupied.keys()) : 0;
  const layout = Array(maxIndex + 1).fill(-1);
  occupied.forEach((id, idx) => {
    layout[idx] = id;
  });
  return layout;
}

// ---- Spellbook ("sb") normalization ----
// Inventory Setups plugin spellbook values: 0 = Standard, 1 = Ancient,
// 2 = Lunar, 3 = Arceuus. Anything else (including "not specified") falls
// back to this default, which represents no particular spellbook.
const DEFAULT_SPELLBOOK = 4;
function normalizeSpellbook(sb) {
  return sb === 0 || sb === 1 || sb === 2 || sb === 3 ? sb : DEFAULT_SPELLBOOK;
}

// ---- semantic slots -> Inventory Setup "setup" object ----
function semanticToInventorySetup(semantic, name, sb) {
  const inv = semantic.inv.map((id) => (id !== -1 && id !== undefined ? { id } : null));
  const eq = semantic.eq.map((id) => {
    if (id === -1 || id === undefined) return null;
    return id === 10 ? { id, q: 77589 } : { id };
  });
  const rp = semantic.rp.length > 0 ? semantic.rp.map((id) => ({ id, q: 100000 })) : [null];
  const qv = semantic.qv !== -1 && semantic.qv !== undefined ? [{ id: semantic.qv, q: 100000 }] : [null];

  const afi = {};
  for (const { id } of semantic.afi || []) afi[id] = { id };

  return {
    inv,
    eq: eq.length > 0 ? eq : null,
    rp,
    qv,
    afi,
    name,
    hc: "#FFFFFFFF",
    fb: true,
    uh: true,
    sb: normalizeSpellbook(sb),
  };
}

// ---- layout[] -> full Inventory Setup ----
// `layoutType` describes the style the *incoming* layout[] positions are
// arranged in (default or zigzag) - it does not change the resulting
// "setup" object, which is always style-agnostic, but it does determine
// how positions are read. The embedded "layout" field is passed through
// verbatim so this remains a lossless round trip when used within a single
// style (as it is everywhere except the general-purpose converter).
function layoutToInventoryJSON(layout, name, layoutType = "default", sb) {
  validateLayoutArray(layout);
  const semantic = layoutToSemantic(layout, layoutType);
  const setup = semanticToInventorySetup(semantic, name, sb);
  return JSON.stringify({ setup, layout }, null, 0);
}

function detectSetupType(input) {
  const trimmed = input.trim();
  if (trimmed.startsWith("banktaglayoutsplugin:")) return "banklayout";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "inventory";
  throw new Error("Could not automatically detect the input format. Paste Inventory Setup JSON or a banktaglayoutsplugin string.");
}

function oppositeSetupType(type) {
  return type === "inventory" ? "banklayout" : "inventory";
}

// ---- General-purpose conversion between any (plugin type x layout style) ----
// Parses `input` as `inputType` ("inventory" or "banklayout"), decodes its
// positions using `inputStyle` ("default" or "zigzag") into the
// style-agnostic semantic form, then renders that out as `outputType` in
// `outputStyle`. This lets any of the four combinations convert to any
// other: e.g. Inventory Setup (zigzag) -> Bank Tag Layout (default).
// `sb` (spellbook) only matters when `outputType` is "inventory" - it's
// ignored for a Bank Tag Layout output, which has no spellbook field.
function convertSetup(input, inputType, inputStyle, outputType, outputStyle, sb) {
  let name, rawLayout, banktag;

  if (inputType === "inventory") {
    ({ name, layout: rawLayout, banktag } = inventoryJSONToLayout(input));
  } else if (inputType === "banklayout") {
    ({ name, layout: rawLayout, banktag } = parseBankTagLayout(input));
  } else {
    throw new Error("Unknown input type.");
  }

  const semantic = layoutToSemantic(rawLayout, inputStyle);
  const outLayout = semanticToLayout(semantic, outputStyle, inputStyle);

  if (outputType === "inventory") {
    const setup = semanticToInventorySetup(semantic, name, sb);
    return JSON.stringify({ setup, layout: outLayout }, null, 0);
  } else if (outputType === "banklayout") {
    return layoutToBankTagString(outLayout, name, banktag);
  }
  throw new Error("Unknown output type.");
}

// ---- High level helpers used by boss pages ----

// Decodes whatever a setup already has - preferring "raw" (a Bank Tag
// Layout string) and falling back to "inventory" (an Inventory Setup JSON
// string) - into the style-agnostic semantic form. Both are always
// authored in the "default" layout style. This is the single source of
// truth a setup's data is decoded from; everything else (the default
// Inventory Setup JSON, and both zigzag variants) is derived from it on
// the fly, so a boss entry in data.js only needs to provide "raw" (or,
// failing that, "inventory") and nothing more. An optional "sb" field
// (0-3) on the setup selects its spellbook for Inventory Setup output;
// anything else, including a missing "sb", uses the default.
function getSetupSemantic(setup) {
  const sb = normalizeSpellbook(setup.sb);
  if (setup.raw) {
    const { name, layout, banktag } = parseBankTagLayout(setup.raw);
    return { name, banktag, sb, semantic: layoutToSemantic(layout, "default") };
  }
  if (setup.inventory) {
    const { name, layout, banktag } = inventoryJSONToLayout(setup.inventory);
    return { name, banktag, sb, semantic: layoutToSemantic(layout, "default") };
  }
  return null;
}

// Returns a flat layout[] (ids, -1 = empty) for whichever format a setup has.
// When style is "zigzag", the zigzag arrangement is derived on the fly from
// "raw"/"inventory" unless the setup explicitly provides its own
// "zigzagRaw"/"zigzagInventory" override.
function getSetupLayout(setup, style) {
  if (style === "zigzag") {
    if (setup.zigzagRaw) return parseBankTagLayout(setup.zigzagRaw).layout;
    if (setup.zigzagInventory) return inventoryJSONToLayout(setup.zigzagInventory).layout;
  } else if (setup.raw) {
    return parseBankTagLayout(setup.raw).layout;
  } else if (setup.inventory) {
    return inventoryJSONToLayout(setup.inventory).layout;
  }

  const base = getSetupSemantic(setup);
  if (!base) return null;
  return semanticToLayout(base.semantic, style, "default");
}

// Returns the text to put on the clipboard for the current site-wide
// format and grid style, converting on the fly from "raw"/"inventory" for
// anything the setup doesn't explicitly provide (default Inventory Setup
// JSON, zigzag Bank Tag Layout, zigzag Inventory Setup JSON).
function getSetupCopyText(setup, format, style) {
  if (style === "zigzag") {
    if (format === "inventory" && setup.zigzagInventory) return setup.zigzagInventory.trim();
    if (format !== "inventory" && setup.zigzagRaw) return setup.zigzagRaw.trim();
  } else {
    if (format === "inventory" && setup.inventory) return setup.inventory.trim();
    if (format !== "inventory" && setup.raw) return setup.raw.trim();
  }

  const base = getSetupSemantic(setup);
  if (!base) return null;
  const layout = semanticToLayout(base.semantic, style, "default");

  if (format === "inventory") {
    const inventorySetup = semanticToInventorySetup(base.semantic, base.name, base.sb);
    return JSON.stringify({ setup: inventorySetup, layout }, null, 0);
  }
  return layoutToBankTagString(layout, base.name, base.banktag);
}