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

  return { name, layout, banktag, setup };
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

// ---- Rune pouch item detection ----
// Real rune items are named exactly "<Word> rune" (e.g. "Air rune", "Blood
// rune", "Steam rune") with no other qualifier - this deliberately excludes
// look-alikes like "Rune platebody", "Rune arrowtips", or "Rune pouch".
// Relies on ITEM_DATA (from items-data.js) being loaded first.
const RUNE_NAME_PATTERN = /^[A-Za-z]+ [Rr]une$/;
function isRuneItem(id) {
  if (typeof ITEM_DATA === "undefined") return false;
  const entry = ITEM_DATA[id];
  return !!entry && RUNE_NAME_PATTERN.test(entry[0]);
}

// Rune pouches hold up to 4 runes.
const RUNE_POUCH_SIZE = 4;

// Matches a real, usable rune pouch container ("Rune pouch", "Divine rune
// pouch", including their various charged/locked/minigame variants), but
// not a "Rune pouch note" (a bank note can't hold runes). Runes are only
// gathered into `rp` when one of these is actually present in the main
// inventory - otherwise there's nothing to hold them.
function isRunePouchContainer(id) {
  if (typeof ITEM_DATA === "undefined") return false;
  const entry = ITEM_DATA[id];
  if (!entry) return false;
  const name = entry[0].toLowerCase();
  if (name.includes("note")) return false;
  return name.startsWith("rune pouch") || name.startsWith("divine rune pouch");
}

// Divine rune pouch variants (normal, locked). The Inventory Setups plugin
// fuzzy-matches these with an "f" flag on the item entry so that any
// variant/charge state of the pouch satisfies the setup, rather than
// requiring the exact one on record.
const FUZZY_MATCH_ITEM_IDS = new Set([27281, 27510, 27509, 27282]);

// Adds the plugin's "f": true fuzzy-match flag to an item entry when its id
// is one of FUZZY_MATCH_ITEM_IDS - otherwise returns the entry unchanged.
function withFuzzyFlag(entry) {
  if (!entry || typeof entry !== "object" || !FUZZY_MATCH_ITEM_IDS.has(entry.id)) return entry;
  return { ...entry, f: true };
}

// Applies withFuzzyFlag across every item-entry field of an Inventory Setup
// "setup" object (inv/eq/rp/qv arrays, afi dict) in place, then returns it.
function applyFuzzyFlags(setup) {
  if (!setup) return setup;
  for (const key of ["inv", "eq", "rp", "qv"]) {
    if (Array.isArray(setup[key])) setup[key] = setup[key].map(withFuzzyFlag);
  }
  if (setup.afi && typeof setup.afi === "object") {
    const afi = {};
    for (const [id, entry] of Object.entries(setup.afi)) afi[id] = withFuzzyFlag(entry);
    setup.afi = afi;
  }
  return setup;
}

// ---- Legs-slot item detection ----
// Used to resolve a decoding ambiguity in the zigzag equipment block (see
// below): matches common legs-slot naming conventions ("Bandos tassets",
// "Rune platelegs", "Zamorak plateskirt", "Studded chaps", "Ancestral robe
// bottom", "Fremennik kilt", etc), ignoring a trailing recolour/variant
// qualifier like "(g)" or "(f)".
const LEG_ITEM_SUFFIXES = [
  "platelegs",
  "plateskirt",
  "chaps",
  "tassets",
  "trousers",
  "legs",
  "robe bottom",
  "robe bottoms",
  "skirt",
  "kilt",
];
function isLegItem(id) {
  if (typeof ITEM_DATA === "undefined") return false;
  const entry = ITEM_DATA[id];
  if (!entry) return false;
  const base = entry[0]
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
    .toLowerCase();
  return LEG_ITEM_SUFFIXES.some((suffix) => base.endsWith(suffix));
}

// Equipment slot index of the shield/off-hand slot within the semantic
// `eq` array - the slot most commonly left empty, and so the one most at
// risk of the zigzag decoding ambiguity below.
const SHIELD_SLOT = 5;

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

  if (map.eqCompact) {
    // Zigzag's equipment block is packed with no gaps for an empty slot
    // (see `eqCompact` above), so decoding it positionally is ambiguous
    // whenever the shield/off-hand slot - by far the most commonly empty
    // one, e.g. with a two-handed weapon - was skipped: everything from
    // legs onward would be misread one slot early, landing a legs-slot
    // item in "shield" instead. Detect that by item identity and shift
    // shield onward back into their correct slots, leaving shield empty.
    const shieldValue = eq[SHIELD_SLOT];
    if (shieldValue !== -1 && isLegItem(shieldValue)) {
      const { slotOrder } = getEqOrder(map);
      const shieldOrderPos = slotOrder.indexOf(SHIELD_SLOT);
      if (shieldOrderPos !== -1) {
        const oldValues = slotOrder.map((slot) => eq[slot]);
        for (let i = slotOrder.length - 1; i > shieldOrderPos; i--) {
          eq[slotOrder[i]] = oldValues[i - 1];
        }
        eq[SHIELD_SLOT] = -1;
      }
    }
  }

  // The rune pouch's *positions* only decide which grid slots are treated
  // as "reserved for rp" (and so excluded from AFI) - primary is always
  // reserved, and backup only when primary has no data at all, exactly as
  // before. Its *contents*, however, are determined purely by item
  // identity: any actual rune item found anywhere outside the inventory
  // slots (equipment, rune pouch positions, quiver, or plain AFI spots),
  // read off in ascending grid position order, up to a rune pouch's
  // capacity - never a non-rune item, even if it happens to occupy a rune
  // pouch position - and only gathered at all when a real rune pouch
  // container is actually present in the main inventory; loose runes
  // lying around with no pouch to hold them aren't rp data.
  const primaryHasAnyData = map.rp.some((idx) => at(idx) !== -1);
  const usedRpIndices = primaryHasAnyData || !(map.rpBackup && map.rpBackup.length) ? map.rp : map.rpBackup;

  const qv = at(map.qv);

  const inventoryPositions = new Set(map.inv);

  // If the rune pouch's own grid positions (whichever set is in use - see
  // above) are entirely filled and every one of them is a genuine rune,
  // that's trusted directly as a complete, self-evident rune pouch - no
  // container item needed. Otherwise (missing/partial data, or something
  // non-rune sitting there) fall back to gathering any rune found anywhere
  // outside the inventory, but only when an actual rune pouch container is
  // present in the main inventory to justify treating scattered runes as
  // pouch contents at all.
  const usedRpValues = usedRpIndices.map((idx) => at(idx));
  const usedRpComplete = usedRpValues.length > 0 && usedRpValues.every((id) => id !== -1);
  const usedRpAllRunes = usedRpComplete && usedRpValues.every((id) => isRuneItem(id));

  let rp = [];
  if (usedRpAllRunes) {
    rp = usedRpValues.slice(0, RUNE_POUCH_SIZE);
  } else {
    const hasRunePouchContainer = inv.some((id) => id !== -1 && isRunePouchContainer(id));
    if (hasRunePouchContainer) {
      for (let i = 0; i < layout.length && rp.length < RUNE_POUCH_SIZE; i++) {
        if (inventoryPositions.has(i)) continue;
        const id = layout[i];
        if (id !== -1 && id !== undefined && isRuneItem(id)) rp.push(id);
      }
    }
  }

  // The literal, unfiltered content originally sitting at the rune pouch
  // positions in use - kept so a same-style "identity" re-encode (see
  // semanticToLayout) can restore the grid exactly as it was, even where
  // that content isn't actually a rune and so doesn't appear in `rp`
  // above. Style-converting re-encodes ignore this and place `rp` (the
  // real runes) into the new style's rune pouch positions instead.
  const rpRaw = usedRpIndices.map((idx) => ({ idx, id: at(idx) })).filter((entry) => entry.id !== -1);

  // Everything not used by inventory/equipment/rune pouch (position)/quiver
  // is an "additional free item" (AFI) - kept with its original grid
  // position so it can be placed sensibly if re-rendered in the same
  // style. A rune pouch position is excluded here regardless of whether
  // its contents actually made it into `rp` above (a non-rune item sitting
  // there is simply dropped, not turned into AFI) - but a non-reserved
  // position that happened to supply a rune is still recorded as AFI too,
  // same as any other item there.
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

  // No real rune pouch container justifies treating the rune pouch cells
  // as pouch content (`rp` ended up empty) - but real items may still be
  // sitting there (loose runes with nothing to hold them). Rather than
  // silently dropping them (they were excluded from the loop above along
  // with the rest of the rune pouch cells), surface them as ordinary AFI
  // items at their original position.
  if (rp.length === 0 && rpRaw.length > 0) {
    rpRaw.forEach(({ idx, id }) => afi.push({ id, pos: idx }));
  }

  return { inv, eq, rp, qv, afi, rpRaw };
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

  const isIdentity = style === "default" && sourceStyle === "default";

  if (isIdentity && semantic.rpRaw && semantic.rp && semantic.rp.length > 0) {
    // No style change, and a real rune pouch is in use: restore whatever
    // was literally sitting at the rune pouch positions, unchanged -
    // including a non-rune item that doesn't appear in `rp` - rather than
    // relocating the computed rune-only `rp` into those positions, which
    // could otherwise overwrite genuine grid content with different items.
    semantic.rpRaw.forEach(({ idx, id }) => occupied.set(idx, id));
  } else if (isIdentity && semantic.rpRaw && semantic.rpRaw.length > 0) {
    // No style change, but no real rune pouch container justifies the
    // items sitting in those cells being pouch content: compact them into
    // the same cell block (dropping any gap) instead of leaving them
    // scattered at their original, possibly non-adjacent positions.
    semantic.rpRaw.forEach(({ id }, i) => {
      const idx = map.rp[i];
      if (idx !== undefined) occupied.set(idx, id);
    });
  } else if (!isIdentity) {
    (semantic.rp || []).forEach((id, i) => {
      if (id === -1 || id === undefined) return;
      const idx = map.rp[i];
      if (idx !== undefined) occupied.set(idx, id);
    });
  }

  if (semantic.qv !== -1 && semantic.qv !== undefined) {
    occupied.set(map.qv, semantic.qv);
  }

  // Every position this style reserves for a semantic slot - inventory,
  // equipment, rune pouch, quiver - even when that particular slot happens
  // to be empty right now. AFI items must never land on one of these, or
  // decoding would misread them back as whatever semantic slot that
  // position maps to instead of as AFI. The rune pouch *backup* positions
  // are only reserved when they're actually load-bearing - i.e. when
  // there's no primary rune pouch data, so a later decode would fall back
  // to reading rp from there. When primary rp data exists (as encoded
  // here always writes it), the backup positions are never touched by
  // encoding and are safe to hand to AFI items instead.
  const rpNeedsBackup = !(semantic.rp && semantic.rp.length > 0) && map.rpBackup && map.rpBackup.length > 0;
  const reserved = new Set([
    ...map.inv,
    ...map.eq.filter((idx) => idx !== null),
    ...map.rp,
    ...(rpNeedsBackup ? map.rpBackup : []),
    map.qv,
  ]);
  const reservedMax = reserved.size ? Math.max(...reserved) : -1;

  if (isIdentity) {
    // No style change: keep each AFI item at its original grid position
    // where that's still free and falls within the first fully free row -
    // close enough to the rest of the layout that preserving it doesn't
    // leave an empty row hanging in between. Anything else (colliding, or
    // sitting much further out than that) gets appended afterwards,
    // starting from that first free row.
    const isPlaceable = (idx) => !occupied.has(idx) && !reserved.has(idx);
    const firstFreeRowStart = reservedMax < 0 ? 0 : Math.ceil((reservedMax + 1) / GRID_COLS) * GRID_COLS;
    const firstFreeRowEnd = firstFreeRowStart + GRID_COLS - 1;

    // Items that came from the rune pouch cells (with no real pouch to
    // justify them being there) were already placed above, compacted into
    // that cell block - skip them here so they don't also get placed a
    // second time as an ordinary AFI item.
    const rpRawIndices = new Set((semantic.rpRaw || []).map((entry) => entry.idx));

    const deferred = [];
    for (const { id, pos } of semantic.afi || []) {
      if (rpRawIndices.has(pos)) continue;
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

    // AFI items whose id is also being placed into the rune pouch below
    // are skipped here entirely - otherwise the same item would end up
    // duplicated at two different grid positions (once as rp, once as a
    // separate AFI entry). The remaining items simply shift up to fill
    // the gap left behind.
    const rpIds = new Set(semantic.rp || []);
    const afiOrder = (semantic.afi || [])
      .filter((entry) => !rpIds.has(entry.id))
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
  // Always a fixed 4 slots (a divine rune pouch's capacity), padding
  // unused slots with null rather than shortening the array.
  const rp = [];
  for (let i = 0; i < RUNE_POUCH_SIZE; i++) {
    const id = semantic.rp[i];
    rp.push(id !== undefined ? { id, q: 100000 } : null);
  }
  const qv = semantic.qv !== -1 && semantic.qv !== undefined ? [{ id: semantic.qv, q: 100000 }] : [null];

  const afi = {};
  for (const { id } of semantic.afi || []) afi[id] = { id };

  return applyFuzzyFlags({
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
  });
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
  throw new Error("Could not automatically detect the input plugin. Paste an Inventory Setup or Bank Tag Layout.");
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
  let name, rawLayout, banktag, origSetup;

  if (inputType === "inventory") {
    ({ name, layout: rawLayout, banktag, setup: origSetup } = inventoryJSONToLayout(input));
  } else if (inputType === "banklayout") {
    ({ name, layout: rawLayout, banktag } = parseBankTagLayout(input));
  } else {
    throw new Error("Unknown input type.");
  }

  const semantic = layoutToSemantic(rawLayout, inputStyle);

  if (outputType === "inventory") {
    // A true identity conversion - Inventory Setup in, Inventory Setup out,
    // no style change - has a richer source of truth than the recomputed
    // semantic form: the original "setup" object itself, which carries
    // details (item quantities, highlight color, and any "afi" entries
    // that don't survive a flat-layout decode, e.g. one also sitting in an
    // occupied inv/eq slot) that a from-scratch rebuild would otherwise
    // lose or reset to defaults. Passing it through unchanged keeps a
    // no-op conversion truly lossless.
    if (inputStyle === outputStyle && origSetup) {
      const setup = { ...origSetup, sb: normalizeSpellbook(sb) };
      // "rp" is always a fixed 4-slot array (a divine rune pouch's
      // capacity) elsewhere in the app - normalize a short/missing one
      // here too, rather than passing through an under-length array just
      // because that's what happened to be in the source data.
      const rp = (Array.isArray(setup.rp) ? setup.rp : []).slice(0, RUNE_POUCH_SIZE);
      while (rp.length < RUNE_POUCH_SIZE) rp.push(null);
      setup.rp = rp;
      return JSON.stringify({ setup: applyFuzzyFlags(setup), layout: rawLayout }, null, 0);
    }

    const outLayout = semanticToLayout(semantic, outputStyle, inputStyle);
    const setup = semanticToInventorySetup(semantic, name, sb);
    // Even when a style change means the semantic form has to be rebuilt
    // from scratch, an "afi" entry from the original Inventory Setup
    // input can be real data the flat-layout decode alone can't recover -
    // e.g. one that's also sitting in an occupied inv/eq slot, and so
    // wouldn't otherwise be read as AFI at all. Merge those in on top of
    // the recomputed set rather than dropping them. The one exception is
    // an id that the recompute already placed in the quiver slot: that's
    // the same kind of stale duplicate, but re-adding it as AFI here
    // would be wrong rather than merely redundant, since the recomputed
    // quiver slot is the trusted, corrected reading of that same data.
    if (origSetup && origSetup.afi && typeof origSetup.afi === "object") {
      const mergedAfi = { ...setup.afi };
      for (const [id, entry] of Object.entries(origSetup.afi)) {
        if (Number(id) === semantic.qv) continue;
        mergedAfi[id] = withFuzzyFlag(entry);
      }
      setup.afi = mergedAfi;
    }
    return JSON.stringify({ setup, layout: outLayout }, null, 0);
  } else if (outputType === "banklayout") {
    const outLayout = semanticToLayout(semantic, outputStyle, inputStyle);
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