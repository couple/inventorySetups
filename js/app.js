const WIKI = "https://oldschool.runescape.wiki";
const COLS = 8;

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Like slugify, but for setup-type labels in the URL (e.g. "1+1", "1+X").
// Keeps punctuation like "+" intact instead of turning it into a hyphen -
// it's valid unescaped in a URL fragment, and reads more naturally.
function labelToUrlSegment(text) {
  return text.trim().toLowerCase().replace(/\s+/g, "-");
}

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (!y || !m || !d) return iso;
  return `${d} ${months[m - 1]} ${y}`;
}

// -------- Site-wide copy format toggle --------

function getCopyFormat() {
  return localStorage.getItem("copyFormat") || "banktag";
}

function setCopyFormat(format) {
  localStorage.setItem("copyFormat", format);
  route(); // re-render current page so labels/buttons reflect the new format
}

// -------- Site-wide grid layout toggle (Default / Zigzag) --------

function getGridStyle() {
  return localStorage.getItem("gridStyle") || "default";
}

function setGridStyle(style) {
  localStorage.setItem("gridStyle", style);
  route(); // re-render current page so grids reflect the new layout style
}

// -------- Item preferences (ornament kit swaps, etc.) --------
// Backs the Preferences page. Lets the user swap a "default" item - every
// place it appears, in any setup on the site - for a variant of their
// choosing. Applies to both the icon shown on the site and the item id in
// whatever gets copied. Choices are stored per-browser (localStorage).
//
// Each ITEM_PREFERENCES entry is either:
//   type: "item" - a single swappable item, shown as one dropdown.
//   type: "set"  - a group of armour pieces (e.g. void, blorva), each
//                  swappable on its own, plus optional named presets
//                  (`sets`) that set every piece at once.
//
// A set's pieces are stored under `"${pref.key}:${piece.key}"` so keys
// stay unique across the whole page; getFlatPreferenceEntries() below is
// what turns both shapes into one flat list for substitution/testing.

function getItemPreferenceChoices() {
  try {
    const stored = JSON.parse(localStorage.getItem("itemPreferences") || "{}");
    return stored && typeof stored === "object" ? stored : {};
  } catch (e) {
    return {};
  }
}

// Applies one or more [storageKey, itemIdOrNull] choices in a single
// write, then re-renders once. Use this (rather than several calls to
// setItemPreferenceChoice) when applying a whole-set preset, so picking
// a preset doesn't re-render once per piece.
function setItemPreferenceChoices(pairs) {
  const choices = getItemPreferenceChoices();
  pairs.forEach(([key, itemId]) => {
    if (itemId === null || itemId === undefined) {
      delete choices[key];
    } else {
      choices[key] = itemId;
    }
  });
  localStorage.setItem("itemPreferences", JSON.stringify(choices));
  route(); // re-render current page so any visible icons/copy text update
}

function setItemPreferenceChoice(key, itemId) {
  setItemPreferenceChoices([[key, itemId]]);
}

// A `variants` entry is either a plain item id, or `{ id, name, icon }` to
// override the display text and/or the icon shown (e.g. for an ugly
// auto-generated wiki name, or a wiki page whose image doesn't match).
// These three helpers are the only places that need to know that.
function getVariantId(variant) {
  return typeof variant === "object" && variant !== null ? variant.id : variant;
}
function getVariantIds(variants) {
  return (variants || []).map(getVariantId);
}
function getVariantLabel(variant) {
  if (typeof variant === "object" && variant !== null && variant.name) return variant.name;
  const id = getVariantId(variant);
  let entry = null;
  try {
    entry = resolveItem(id);
  } catch (e) {
    entry = null;
  }
  return entry ? entry.name : `Item ${id}`;
}
// `variant.icon`, if given, is either a full URL or just a wiki image
// filename (e.g. "Dragon_pickaxe.png") which gets resolved against the
// wiki's image path the same way resolveItem does. Returns null when
// there's no override, meaning "use the id's normal icon".
function getVariantIcon(variant) {
  if (typeof variant !== "object" || variant === null || !variant.icon) return null;
  return variant.icon.indexOf("http") === 0 ? variant.icon : `${WIKI}/images/${variant.icon}`;
}
// Finds the variants-list entry (plain id or `{id,...}`) matching a given
// item id, so its `icon`/`name` overrides can be looked up for whichever
// variant is currently selected.
function findVariant(variants, id) {
  return (variants || []).find((v) => getVariantId(v) === id);
}

// The default item id for a preference or set piece: an explicit
// `default` field if given, otherwise the first entry in `variants`. Lets
// most entries stay as just a plain variants list while still allowing a
// specific one (not necessarily the first you typed) to be marked default.
function getPreferenceDefault(prefOrPiece) {
  if (prefOrPiece.default !== undefined) return prefOrPiece.default;
  const ids = getVariantIds(prefOrPiece.variants);
  return ids.length > 0 ? ids[0] : undefined;
}

// Flattens ITEM_PREFERENCES into one list of { storageKey, label, variants,
// default, groups, aliases } entries - one per single item, and one per
// set piece - so substitution and the test setup don't need to know about
// "item" vs "set" shapes. `variants` here is always a plain id list (name
// overrides are only needed when rendering the dropdowns themselves).
// `groups` is `pref.groups` if set (e.g. `["main", "alt"]` to affect
// both), otherwise just `["main"]`. `aliases` is `pref.aliases` if set, or
// `[]` - see getItemSubstitutionMap below for what it does. `requires` is
// `pref.requires` if set, or `{}` - also see getItemSubstitutionMap. A set
// piece always inherits its parent set's `groups`, but can have its own
// `aliases`/`requires` (they don't make sense shared across pieces).
function getFlatPreferenceEntries() {
  const entries = [];
  ITEM_PREFERENCES.forEach((pref) => {
    const groups = pref.groups || ["main"];
    if (pref.type === "set") {
      (pref.pieces || []).forEach((piece) => {
        entries.push({
          storageKey: `${pref.key}:${piece.key}`,
          label: `${pref.label} - ${piece.label}`,
          variants: getVariantIds(piece.variants),
          default: piece.default,
          aliases: piece.aliases || [],
          requires: piece.requires || {},
          groups,
        });
      });
    } else {
      entries.push({
        storageKey: pref.key,
        label: pref.label,
        variants: getVariantIds(pref.variants),
        default: pref.default,
        aliases: pref.aliases || [],
        requires: pref.requires || {},
        groups,
      });
    }
  });
  return entries;
}

// Map of "item id" -> "what it should be replaced with" for one preference
// group ("main", used by every setup by default, or "alt", used only by
// setups a boss's data.js entry explicitly opts in - see
// getSubstitutionMapForSetup below). An entry counts toward a group if
// that group is anywhere in its `groups` list, so an entry listed under
// both (e.g. `groups: ["main", "alt"]`) contributes to both maps from the
// SAME stored choice - setting it from either section updates both places
// at once, rather than tracking two independent values.
//
// Three kinds of entries in the map:
//   - `variant -> effective` for every id in an entry's `variants` list
//     (including the default) - "effective" being the chosen variant, or
//     the default if nothing's been chosen. This is what lets a setup
//     that already has some OTHER (non-default) variant hardcoded in its
//     raw string still respond to changing the preference - not just
//     setups that happen to use the exact default id.
//   - `alias -> effective`, the same way, for every id in an entry's
//     `aliases` - ids that aren't offered as a pickable variant but
//     should still always be normalized (e.g. `27253` for the `ward`
//     preference, when a setup happens to store the ward ornament kit
//     under that id instead of any of ward's own variant ids).
//   - `companion -> -1` for every id in an entry's `requires` map whose
//     required id ISN'T the current effective choice - a companion item
//     that only makes sense alongside one specific variant (e.g. id
//     28328 alongside Ring of shadows, 28327, for `teleportalt`), removed
//     entirely (via the special id -1, meaning "empty"/"not present" -
//     the same convention layouts already use for an empty slot) whenever
//     something else is chosen instead. If the required id IS the
//     effective choice, no entry is added for it at all - it's left as
//     whatever the setup already has, since it's valid as-is.
// Either way, nothing is added to the map for an id that's already equal
// to `effective` (a no-op swap).
//
// Layered on top of MANUAL_ITEM_SUBSTITUTIONS (see data.js), which always
// applies regardless of group or preference - use that instead of
// `aliases`/`requires` for a one-off id swap that has nothing to do with
// any preference's choice.
function getItemSubstitutionMap(group) {
  const targetGroup = group || "main";
  const map = Object.assign({}, MANUAL_ITEM_SUBSTITUTIONS);
  const choices = getItemPreferenceChoices();
  getFlatPreferenceEntries().forEach((entry) => {
    if (!entry.groups.includes(targetGroup)) return;
    if (!entry.variants || entry.variants.length === 0) return;
    const defaultId = getPreferenceDefault(entry);
    const chosen = choices[entry.storageKey];
    const hasChosen = chosen !== undefined && chosen !== defaultId && entry.variants.includes(chosen);
    const effective = hasChosen ? chosen : defaultId;

    entry.variants.forEach((variantId) => {
      if (variantId !== effective) map[variantId] = effective;
    });
    entry.aliases.forEach((aliasId) => {
      if (aliasId !== effective) map[aliasId] = effective;
    });
    Object.keys(entry.requires).forEach((companionIdStr) => {
      const companionId = Number(companionIdStr);
      const requiredId = entry.requires[companionIdStr];
      if (effective !== requiredId) map[companionId] = -1;
    });
  });
  return map;
}

// The effective item id for one flattened preference entry: the chosen
// variant if the user picked one (and it's still a valid option), else the
// entry's default. This looks the choice up by the entry's own
// `storageKey`, so it stays correct even when two entries happen to share
// default/variant ids (e.g. `capesmain:mage` and `capesalt:mage`) - unlike
// a flat id -> id substitution map, which can't tell those two apart once
// their ids collide.
function getEntryEffectiveId(entry) {
  const choices = getItemPreferenceChoices();
  const defaultId = getPreferenceDefault(entry);
  const chosen = choices[entry.storageKey];
  return chosen !== undefined && chosen !== defaultId && entry.variants.includes(chosen) ? chosen : defaultId;
}

// Which substitution map a given boss setup should use. Every setup gets
// "main" (the Sets/Items sections) unless its data.js entry sets
// `prefGroup: "alt"`, in which case it gets the "Alt" section's
// substitutions instead - an alt-flagged setup ignores "main"-only
// entries entirely (entries listed under both groups still apply, since
// they're in the "alt" map too).
//
// The Preferences page's own test setup uses `prefGroup: "test"` and gets
// no substitution map at all ({}) - buildPreferencesTestSetup already
// bakes each item's correct effective id (via getEntryEffectiveId, above)
// directly into the setup it builds, entry by entry, rather than relying
// on a single merged id -> id map the way every other setup does. A
// merged main+alt map can't represent "this occurrence of id X should
// become main's choice, but that other occurrence of the same id X should
// become alt's choice" when a main and an alt entry happen to share ids -
// which capesmain/capesalt and other main/alt pairs deliberately do.
//
// Finally, `setup.itemOverrides` (if present) constrains specific
// preferences to a setup-specific choice - see applyItemOverrides below.
function getSubstitutionMapForSetup(setup) {
  let map;
  if (setup && setup.prefGroup === "alt") map = getItemSubstitutionMap("alt");
  else if (setup && setup.prefGroup === "test") map = {};
  else map = getItemSubstitutionMap("main");
  return applyItemOverrides(map, setup);
}

// Applies `setup.itemOverrides` on top of an already-computed substitution
// map, constraining specific preferences to a choice appropriate for that
// one setup - e.g. K'ril's setups should only ever show a Zamorak mage
// cape, whichever god the `capesmain:mage` preference is actually set to
// site-wide.
//
// Shape, per overridden preference:
//   itemOverrides: {
//     "capesmain:mage": {
//       groups: [
//         { match: [21791, 24248, 21793, 24249, 21795, 24250], use: 21795 },
//         { match: [21776, 24232, 21784, 24234, 21780, 24233], use: 21780 },
//       ],
//     },
//   }
// For each overridden storageKey: find which `groups` entry's `match`
// list contains the preference's current site-wide EFFECTIVE id (see
// getEntryEffectiveId - the chosen variant, or the default), and force
// every id that preference could otherwise produce (its own variants and
// aliases) to that group's `use` id instead. If the effective id doesn't
// fall into any listed group, the override does nothing for it (falls
// back to whatever the normal substitution map already has) - so a
// `groups` list only needs to cover the categories that actually matter,
// e.g. "which god" doesn't need enumerating, only "max vs not max".
function applyItemOverrides(map, setup) {
  if (!setup || !setup.itemOverrides) return map;
  const result = Object.assign({}, map);
  Object.keys(setup.itemOverrides).forEach((storageKey) => {
    const entry = getFlatPreferenceEntries().find((e) => e.storageKey === storageKey);
    if (!entry) return;
    const effective = getEntryEffectiveId(entry);
    const groups = setup.itemOverrides[storageKey].groups || [];
    const matched = groups.find((g) => g.match.includes(effective));
    if (!matched) return;
    const useId = matched.use;
    // For the id we're forcing TO, explicitly clear any entry the base
    // map may have already set for it (e.g. from a differently-chosen
    // site-wide preference normalizing every variant, including this one,
    // to ITS effective id) - otherwise that stale rule would still fire
    // and undo the override on the very id it's supposed to leave alone.
    [...entry.variants, ...(entry.aliases || [])].forEach((id) => {
      if (id === useId) delete result[id];
      else result[id] = useId;
    });
  });
  return result;
}

// -------- Item icon resolution --------

function resolveItem(id) {
  const entry = ITEM_DATA[String(id)] || ITEM_DATA[String(id - 1)];
  if (!entry) return null;
  const [name, page] = entry;

  // Remove '#' characters
  let cleanPage = page.replace(/#/g, '');

  // Remove specific suffixes
  cleanPage = cleanPage.replace(/[_]?recoil$|[_]?restored$|[_]?untrimmed$|[_]?worn$|[_]?nightmare_zone$|[_]?full$|[_]?locked$|[_]?charged$|[_]?inventory$|[_]?normal$|[_]?assembled$|[_]?filled$|[_]?closed|[_]?open$|[_]?uncharged$|[_]?active$|[_]?used$|[_]?new$/i, '');
  cleanPage = cleanPage.replace(/trimmed/gi, '(t)');

  // Capitalize the first letter
  let capitalizedPage = cleanPage.charAt(0).toUpperCase() + cleanPage.slice(1);

  // Handle special cases
  if (capitalizedPage === "Seeking_dragon_arrow") {
    capitalizedPage = "Seeking_dragon_arrow_5";
  }

  if (capitalizedPage === "Dragon_dagger_(cr)(p++)") {
    capitalizedPage = "Dragon_dagger_(p++)(cr)";
  }

  if (capitalizedPage === "Scythe_of_vitur") {
    capitalizedPage = "Scythe_of_Vitur";
  }

  if (capitalizedPage === "Volatile_nightmare_staff") {
    capitalizedPage = "Volatile_Nightmare_staff";
  }

  if (capitalizedPage === "Volatile_nightmare_staff_(deadman)") {
    capitalizedPage = "Volatile_Nightmare_staff_(Deadman)";
  }

  if (capitalizedPage === "Voidwaker_(deadman)") {
    capitalizedPage = "Voidwaker_(Deadman)";
  }

  if (capitalizedPage === "Armadyl_godsword_(deadman)") {
    capitalizedPage = "Armadyl_godsword_(Deadman)";
  }

  if (capitalizedPage === "Imbued_guthix_cape") {
    capitalizedPage = "Imbued_Guthix_cape";
  } 

  if (capitalizedPage === "Blessed_dizana's_quiver") {
    capitalizedPage = "Blessed_Dizana's_quiver";
  }

  if (capitalizedPage === "Dizana's_quiverlocked_+") {
    capitalizedPage = "Dizana's_quiver";
  }

  if (capitalizedPage === "Ruby_dragon_bolts_(e)") {
    capitalizedPage = "Ruby_dragon_bolts_(e)_5";
  }

  if (capitalizedPage === "Sapphire_dragon_bolts_(e)") {
    capitalizedPage = "Sapphire_dragon_bolts_(e)_5";
  }

  if (capitalizedPage === "Sunlight_moth_mix2_dose") {
    capitalizedPage = "Sunlight_moth_mix_(2)";
  }

  if (capitalizedPage === "Mokhaiotl_waystone") {
    capitalizedPage = "Mokhaiotl_waystone_5";
  }

  if (capitalizedPage === "Haemostatic_dressing(4)") {
    capitalizedPage = "Haemostatic_dressing_(4)";
  }

  if (capitalizedPage === "Bronze_arrow(unp)") {
    capitalizedPage = "Bronze_arrow_5";
  }

  if (capitalizedPage === "Eye_of_ayak") {
    capitalizedPage = "Eye_of_Ayak";
  }

  if (capitalizedPage === "Pendant_of_ates") {
    capitalizedPage = "Pendant_of_Ates";
  }  

  if (capitalizedPage === "Dwarven_rock_cakecool") {
    capitalizedPage = "Dwarven_rock_cake_(cool)";
  }   

  if (capitalizedPage === "Harmonised_nightmare_staff") {
    capitalizedPage = "Harmonised_Nightmare_staff";
  }

  if (capitalizedPage === "Berserker_ring_(i)nightmare_zone") {
    capitalizedPage = "Berserker_ring_(i)";
  }

  if (capitalizedPage === "Tome_of_fire") {
    capitalizedPage = "Tome_of_Fire";
  }

  if (capitalizedPage === "Eldritch_nightmare_staff") {
    capitalizedPage = "Eldritch_Nightmare_staff";
  }

  if (capitalizedPage === "Blade_of_saeldor_(c)_(iorwerth)") {
    capitalizedPage = "Blade_of_Saeldor_(c)_(Iorwerth)";
  }

  if (capitalizedPage === "Burning_amulet(5)") {
    capitalizedPage = "Burning_amulet";
  }

  if (capitalizedPage === "Burning_amulet(4)") {
    capitalizedPage = "Burning_amulet";
  }

  if (capitalizedPage === "Burning_amulet(3)") {
    capitalizedPage = "Burning_amulet";
  }

  if (capitalizedPage === "Burning_amulet(2)") {
    capitalizedPage = "Burning_amulet";
  }

  if (capitalizedPage === "Burning_amulet(1)") {
    capitalizedPage = "Burning_amulet";
  }

  if (capitalizedPage === "Diamond_bolts_(e)") {
    capitalizedPage = "Diamond_bolts_(e)_5";
  }

  if (capitalizedPage === "Ring_of_wealth_(i)(i5)") {
    capitalizedPage = "Ring_of_wealth_(i)";
  }

  if (capitalizedPage === "Challenge_scrollelite") {
    capitalizedPage = "Clue_scroll_(elite)";
  }

  if (capitalizedPage === "Achievement_diary_cape(t)") {
    capitalizedPage = "Achievement_diary_cape_(t)";
  }

  if (capitalizedPage === "Ring_of_the_gods_(i)nightmare_zone") {
    capitalizedPage = "Ring_of_the_gods_(i)";
  }

  if (capitalizedPage === "Imbued_saradomin_max_cape") {
    capitalizedPage = "Imbued_Saradomin_max_cape";
  }

  if (capitalizedPage === "Coins") {
    capitalizedPage = "Coins_10000";
  }  

  if (capitalizedPage === "Imbued_zamorak_max_cape") {
    capitalizedPage = "Imbued_Zamorak_max_cape";
  }  

  if (capitalizedPage === "Imbued_guthix_max_cape") {
    capitalizedPage = "Imbued_Guthix_max_cape";
  }

  if (capitalizedPage === "Imbued_saradomin_cape") {
    capitalizedPage = "Imbued_Saradomin_cape";
  }

  if (capitalizedPage === "Imbued_zamorak_cape") {
    capitalizedPage = "Imbued_Zamorak_cape";
  }

  // if (capitalizedPage === "Ring_of_suffering_(i)recoil") {
  //   capitalizedPage = "Ring_of_suffering_(i)";
  // }
 
  // if (capitalizedPage === "Ring_of_sufferingrecoil") {
  //   capitalizedPage = "Ring_of_suffering";
  // }

  if (capitalizedPage === "Book_of_darkness") {
    capitalizedPage = "Book_of_Darkness";
  }

  if (capitalizedPage === "Revenant_ether") {
    capitalizedPage = "Revenant_ether_5";
  }


  if (capitalizedPage === "Book_of_the_dead") {
    capitalizedPage = "Book_of_the_Dead";
  }

  if (capitalizedPage === "Tonalztics_of_ralos") {
    capitalizedPage = "Tonalztics_of_Ralos";
  }

  if (capitalizedPage === "Zulrah's_scales") {
    capitalizedPage = "Zulrah's_scales_5";
  }

  if (capitalizedPage === "Tzkal_slayer_helmet_(i)nightmare_zone") {
    capitalizedPage = "Tzkal_slayer_helmet";
  }

  if (capitalizedPage === "Purple_sweets") {
    capitalizedPage = "Purple_sweets_100";
  }  

  if (capitalizedPage === "3rd_age_pickaxe") {
    capitalizedPage = "3rd_Age_pickaxe";
  }  

  return {
    name,
    icon: `${WIKI}/images/${capitalizedPage}.png`,
    link: `${WIKI}/w/${cleanPage}`
  };
}

// -------- Grid rendering (from a flat layout[] array) --------

function renderGrid(layout) {
  if (!layout || layout.length === 0) return null;
  const grid = document.createElement("div");
  grid.className = "gear-grid";
  grid.style.gridTemplateColumns = `repeat(${COLS}, 44px)`;

  for (let i = 0; i < layout.length; i++) {
    const id = layout[i];
    const slot = document.createElement("div");
    slot.className = "gear-slot";

    if (id === -1 || id === undefined) {
      slot.classList.add("empty");
    } else {
      const item = resolveItem(id);
      if (item) {
        const link = document.createElement("a");
        link.href = item.link;
        link.title = item.name;
        link.target = "_blank";
        link.rel = "noopener";
        const img = document.createElement("img");
        img.src = item.icon;
        img.alt = item.name;
        img.loading = "lazy";
        link.appendChild(img);
        slot.appendChild(link);
      } else {
        slot.classList.add("unresolved");
        const link = document.createElement("a");
        link.href = `${WIKI}/w/Special:Search?search=${id}`;
        link.title = `Unrecognised item id ${id} - not in the local item data yet`;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = `#${id}`;
        link.style.color = "inherit";
        slot.appendChild(link);
      }
    }
    grid.appendChild(slot);
  }
  return grid;
}

// -------- Notes (always-visible, used per-setup and per-mode) --------

// A bare URL token, e.g. "https://discord.com/channels/...".
const NOTES_URL_RE = /^https?:\/\/\S+$/;

// Renders one line of notes text into `container`, turning any number of
// "label - url" pairs chained with " - " into clickable links, e.g.
//   "Trio - https://a.com - 5s - https://b.com"
// becomes two separate links, "Trio" and "5s", joined by " - ". Segments
// with no adjoining URL (or lines with no links at all) are left as plain
// text, so this is a no-op for ordinary notes.
function appendNotesLine(container, line) {
  const tokens = line.split(/ - /);
  let first = true;

  for (let i = 0; i < tokens.length; i++) {
    if (!first) container.appendChild(document.createTextNode(" - "));
    first = false;

    const token = tokens[i];
    const next = tokens[i + 1];

    if (next && NOTES_URL_RE.test(next)) {
      // "label - url" pair: label becomes the link text.
      const a = document.createElement("a");
      a.href = next;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = token;
      container.appendChild(a);
      i++; // consume the url token too
    } else if (NOTES_URL_RE.test(token)) {
      // Bare url with no preceding label.
      const a = document.createElement("a");
      a.href = token;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = token;
      container.appendChild(a);
    } else {
      container.appendChild(document.createTextNode(token));
    }
  }
}

// Appends full notes text to a container, line by line. Newlines are kept
// as plain text nodes since .notes-content uses white-space: pre-wrap to
// render them as line breaks.
function appendNotesText(container, text) {
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    appendNotesLine(container, line);
    if (i < lines.length - 1) {
      container.appendChild(document.createTextNode("\n"));
    }
  });
}

function renderNotesToggle(text, extraClass) {
  if (!text || !text.trim()) return null;
  const wrap = document.createElement("div");
  wrap.className = "notes-block" + (extraClass ? " " + extraClass : "");
  const label = document.createElement("div");
  label.className = "notes-label";
  label.textContent = "Notes";
  const content = document.createElement("div");
  content.className = "notes-content";
  appendNotesText(content, text);
  wrap.appendChild(label);
  wrap.appendChild(content);
  return wrap;
}

// -------- Single setup block (heading + grid + copy button + updated date) --------

// Renders one setup as a single self-contained card (heading, gear grid,
// copy button, updated/notes block stacked vertically). Cards are laid out
// by renderSetupRow in a wrapping flex row, so the browser decides how many
// fit per line based on available width instead of a fixed column count.
function renderSetup(setup, headingTag) {
  const style = getGridStyle();

  const card = document.createElement("div");
  card.className = "setup-card";

  const heading = document.createElement(headingTag);
  heading.className = "setup-heading";

  const titleEl = document.createElement("div");
  titleEl.className = "setup-title";
  titleEl.textContent = setup.label;
  heading.appendChild(titleEl);

  const spellbook = SPELLBOOKS[setup.sb];
  if (spellbook) {
    const sbRow = document.createElement("div");
    sbRow.className = "setup-spellbook";

    const sbIcon = document.createElement("img");
    sbIcon.className = "spellbook-icon";
    sbIcon.src = `${WIKI}/images/${spellbook.file}`;
    sbIcon.alt = "";
    sbIcon.loading = "lazy";
    sbRow.appendChild(sbIcon);

    const sbName = document.createElement("span");
    sbName.textContent = spellbook.name;
    sbRow.appendChild(sbName);

    heading.appendChild(sbRow);
  }
  card.appendChild(heading);

  const content = document.createElement("div");
  content.className = "setup-content";

  const substitutions = getSubstitutionMapForSetup(setup);

  let layout = null;
  try {
    layout = substituteLayoutIds(getSetupLayout(setup, style), substitutions);
  } catch (e) {
    console.error("Failed to load setup layout:", setup.label, e);
    layout = null;
  }

  const grid = renderGrid(layout);

  if (!grid) {
    const p = document.createElement("p");
    p.className = "no-setup";
    p.textContent = "No setup data added yet.";
    content.appendChild(p);
    card.appendChild(content);
    return card;
  }
  content.appendChild(grid);
  card.appendChild(content);

  const buttonCell = document.createElement("div");
  buttonCell.className = "setup-button-cell";

  const format = getCopyFormat();
  let copyText = null;
  try {
    copyText = getSetupCopyText(setup, format, style, null, substitutions);
  } catch (e) {
    copyText = null;
  }

  // Lets the user override the name embedded in the copied setup (defaults
  // to whatever name the setup would otherwise be copied under).
  let defaultName = null;
  try {
    defaultName = getSetupDefaultName(setup);
  } catch (e) {
    defaultName = null;
  }
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "setup-name-input";
  nameInput.placeholder = defaultName || setup.label || "Setup name";
  nameInput.setAttribute("aria-label", `Custom name for ${setup.label || "this setup"}`);
  if (copyText) buttonCell.appendChild(nameInput);

  const usingZigzag =
    style === "zigzag" && (setup.zigzagRaw || setup.zigzagInventory || setup.raw || setup.inventory);
  const btn = document.createElement("button");
  btn.className = "copy-btn";
  const formatLabel = format === "inventory" ? "Inventory Setup" : "Bank Tag Layout";
  btn.textContent = `Copy (${formatLabel}${usingZigzag ? " · Zigzag" : ""})`;
  if (!copyText) {
    btn.disabled = true;
    btn.title = "Couldn't produce this format for this setup.";
  } else {
    btn.addEventListener("click", () => {
      let text = copyText;
      try {
        text = getSetupCopyText(setup, format, style, nameInput.value, getSubstitutionMapForSetup(setup)) || copyText;
      } catch (e) {
        text = copyText;
      }
      navigator.clipboard.writeText(text.trim()).then(() => {
        const original = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = original), 1200);
      });
    });
  }
  buttonCell.appendChild(btn);
  card.appendChild(buttonCell);

  const meta = document.createElement("div");
  meta.className = "setup-meta";

  if (setup.updated) {
    const updated = document.createElement("div");
    updated.className = "updated-date";
    updated.textContent = `Updated as of ${formatDate(setup.updated)}`;
    meta.appendChild(updated);
  }

  const notesEl = renderNotesToggle(setup.notes);
  if (notesEl) meta.appendChild(notesEl);

  card.appendChild(meta);

  return card;
}

// Setups are laid out in a wrapping flex row (see .setup-row-wrapper),
// capped at 3 cards wide via max-width. The browser handles how many fit
// per line based on available width, wrapping the rest onto new lines.
function renderSetupRow(setups, headingTag) {
  const wrapper = document.createElement("div");
  wrapper.className = "setup-row-wrapper";

  if (!setups || setups.length === 0) {
    const p = document.createElement("p");
    p.className = "no-setup";
    p.textContent = "No setup data added yet.";
    wrapper.appendChild(p);
    return wrapper;
  }

  setups.forEach((s) => {
    wrapper.appendChild(renderSetup(s, headingTag));
  });

  return wrapper;
}

// -------- Boss wiki links --------

// Returns the OSRS Wiki URL for a boss, or null if it shouldn't have a
// wiki button at all. Defaults to deriving the URL straight from the
// boss's display name (spaces -> underscores, matching the wiki's URL
// convention) - which covers the vast majority of bosses since their
// in-game name and their wiki article title are the same. For the rare
// boss whose wiki article lives under a different title, set an explicit
// `wiki: "Page_title"` on that boss's entry in data.js and it will be
// used instead - no other boss needs to be touched. Set `wiki: null`
// (not just leaving it unset) to skip the wiki button entirely, e.g. for
// a boss with no real wiki page of its own.
function getBossWikiUrl(boss) {
  if (boss.wiki === null) return null;
  const page = boss.wiki || boss.name;
  return `${WIKI}/w/${page.trim().replace(/\s+/g, "_")}`;
}

// -------- Boss page --------


// Updates the URL to `#slug/label` (using the boss's own Solo/1+1 style
// labels) without triggering another hashchange, so switching setup type
// doesn't force a full re-render.
function setBossHash(boss, label) {
  const newHash = `#${slugify(boss.name)}/${labelToUrlSegment(label)}`;
  if (window.location.hash !== newHash) {
    history.replaceState(null, "", newHash);
  }
}

// Returns a boss's setup groups as a normalized list of
// { key, label, notes, setups }, in display order.
//
// Preferred: define `boss.modes` directly for any number of groups:
//   modes: [
//     { key: "trio", label: "Trio", notes: "...", setups: [...] },
//     { key: "5s",   label: "5s",   setups: [...] },
//     { key: "8s",   label: "8s",   setups: [...] },
//   ]
//
// Legacy: bosses without `modes` fall back to the old top-level
// solo/duo/soloLabel/duoLabel/soloNotes/duoNotes fields, so none of the
// existing data needs to change.
function getBossModes(boss) {
  if (Array.isArray(boss.modes) && boss.modes.length > 0) {
    return boss.modes
      .filter((m) => Array.isArray(m.setups) && m.setups.length > 0)
      .map((m) => ({
        key: m.key,
        label: m.label || m.key,
        notes: m.notes || null,
        setups: m.setups,
      }));
  }

  const modes = [];
  if (Array.isArray(boss.solo) && boss.solo.length > 0) {
    modes.push({
      key: "solo",
      label: boss.soloLabel || "Solo",
      notes: boss.soloNotes || null,
      setups: boss.solo,
    });
  }
  if (Array.isArray(boss.duo) && boss.duo.length > 0) {
    modes.push({
      key: "duo",
      label: boss.duoLabel || "1+1",
      notes: boss.duoNotes || null,
      setups: boss.duo,
    });
  }
  return modes;
}

function renderBossPage(boss, modeParam) {
  const main = document.getElementById("main");
  main.innerHTML = "";

  const header = document.createElement("div");
  header.className = "boss-header";

  const pet = BOSS_PETS[boss.name];
  if (pet) {
    const petImg = document.createElement("img");
    petImg.className = "boss-pet-icon";
    petImg.src = `${WIKI}/images/${pet.file}`;
    petImg.alt = `${pet.name} pet`;
    petImg.title = pet.name;
    petImg.loading = "lazy";
    header.appendChild(petImg);
  }

  const h1 = document.createElement("h1");
  h1.textContent = boss.name;
  header.appendChild(h1);

  const wikiUrl = getBossWikiUrl(boss);
  if (wikiUrl) {
    const wikiLink = document.createElement("a");
    wikiLink.className = "boss-wiki-link";
    wikiLink.href = wikiUrl;
    wikiLink.target = "_blank";
    wikiLink.rel = "noopener";
    wikiLink.title = "View on the OSRS Wiki";
    wikiLink.textContent = "Wiki ↗";
    header.appendChild(wikiLink);
  }

  main.appendChild(header);

  const bossNotes = renderNotesToggle(boss.notes, "boss-notes");
  if (bossNotes) main.appendChild(bossNotes);

  const modes = getBossModes(boss);

  if (modes.length === 0) {
    const p = document.createElement("p");
    p.className = "no-setup";
    p.textContent = "No setup data added yet.";
    main.appendChild(p);
    return;
  }

  if (modes.length === 1) {
    const mode = modes[0];
    const block = document.createElement("div");
    block.className = "setup-block is-visible";
    block.dataset.mode = mode.key;
    const modeNotes = renderNotesToggle(mode.notes, "mode-notes");
    if (modeNotes) block.appendChild(modeNotes);
    block.appendChild(renderSetupRow(mode.setups, "h2"));
    main.appendChild(block);
    return;
  }

  // Multiple modes: show a toggle button per mode, with only the active
  // block visible at a time.
  const toggle = document.createElement("div");
  toggle.className = "mode-toggle";

  const buttons = [];
  const blocks = [];

  modes.forEach((mode) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mode-btn";
    btn.dataset.mode = mode.key;
    btn.textContent = mode.label;
    toggle.appendChild(btn);
    buttons.push(btn);

    const block = document.createElement("div");
    block.className = "setup-block";
    block.dataset.mode = mode.key;
    const modeNotes = renderNotesToggle(mode.notes, "mode-notes");
    if (modeNotes) block.appendChild(modeNotes);
    block.appendChild(renderSetupRow(mode.setups, "h2"));
    blocks.push(block);
  });

  main.appendChild(toggle);
  blocks.forEach((b) => main.appendChild(b));

  const applyMode = (key) => {
    buttons.forEach((b) => b.classList.toggle("is-active", b.dataset.mode === key));
    blocks.forEach((b) => b.classList.toggle("is-visible", b.dataset.mode === key));
    const mode = modes.find((m) => m.key === key);
    setBossHash(boss, mode.label);
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      localStorage.setItem("bossMode", btn.dataset.mode);
      applyMode(btn.dataset.mode);
    });
  });

  // URL wins if it names a valid, available mode (e.g. shared/bookmarked
  // link); otherwise fall back to whatever the user used last time; then
  // the boss's first defined mode.
  const availableKeys = modes.map((m) => m.key);
  const savedMode = localStorage.getItem("bossMode");

  if (modeParam && availableKeys.includes(modeParam)) {
    applyMode(modeParam);
  } else if (savedMode && availableKeys.includes(savedMode)) {
    applyMode(savedMode);
  } else {
    applyMode(modes[0].key);
  }
}

// -------- Home page (guide + changelog) --------

function renderHome() {
  const main = document.getElementById("main");
  main.innerHTML = "";

  // Guide
  const guideHeading = document.createElement("h1");
  guideHeading.className = "section-heading";
  guideHeading.textContent = "Guide";
  main.appendChild(guideHeading);

  const guideList = document.createElement("ul");
  guideList.className = "guide-list";
  FAQ.forEach((entry) => {
    const item = document.createElement("li");
    const q = document.createElement("strong");
    q.textContent = entry.q;
    item.appendChild(q);
    item.appendChild(document.createTextNode(" " + entry.a));
    guideList.appendChild(item);
  });
  main.appendChild(guideList);

  // Changelog
  const changelogHeading = document.createElement("h1");
  changelogHeading.className = "section-heading";
  changelogHeading.textContent = "Changelog";
  main.appendChild(changelogHeading);

  const list = document.createElement("div");
  list.className = "changelog";
  CHANGELOG.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "changelog-entry";
    const date = document.createElement("div");
    date.className = "changelog-date";
    date.textContent = formatDate(entry.date);
    const text = document.createElement("div");
    text.className = "changelog-text";
    text.textContent = entry.text;
    item.appendChild(date);
    item.appendChild(text);
    list.appendChild(item);
  });
  main.appendChild(list);
}

// -------- Setup Converter page --------

function renderConverter() {
  const main = document.getElementById("main");
  main.innerHTML = "";

  main.innerHTML = `
    <h1>Setup Converter</h1>
    <p class="empty-state">Convert between setup plugins and layouts.</p>

    <div class="converter-card">
      <div class="field">
        <label for="conv-input-type">Input plugin</label>
        <select id="conv-input-type">
          <option value="auto">Auto-detect</option>
          <option value="banklayout">Bank Tag Layout</option>
          <option value="inventory">Inventory Setup</option>
        </select>
      </div>

      <div class="field" style="margin-top:16px">
        <label for="conv-input-layout">Input layout</label>
        <select id="conv-input-layout">
          <option value="default">Default</option>
          <option value="zigzag">Zigzag</option>
        </select>
      </div>

      <div class="field" style="margin-top:16px">
        <label for="conv-spellbook">Spellbook</label>
        <select id="conv-spellbook">
          <option value="4">None</option>
          <option value="0">Standard</option>
          <option value="1">Ancient</option>
          <option value="2">Lunar</option>
          <option value="3">Arceuus</option>
        </select>
      </div>

      <div class="field" style="margin-top:16px">
        <label for="conv-input">Input</label>
        <textarea id="conv-input" spellcheck="false" placeholder="Paste your Bank Tag Layout or Inventory Setup here..."></textarea>
      </div>

      <div class="converter-actions">
        <button class="btn btn-primary" id="conv-convert">Convert</button>
        <button class="btn" id="conv-clear">Clear</button>
        <button class="btn" id="conv-swap">Swap input/output</button>
      </div>

      <div id="conv-status" class="converter-status"></div>
    </div>

    <div class="converter-card">
      <div class="field">
        <label for="conv-output-type">Output plugin</label>
        <select id="conv-output-type">
          <option value="auto">Auto (opposite of input)</option>
          <option value="banklayout">Bank Tag Layout</option>
          <option value="inventory">Inventory Setup</option>
        </select>
      </div>

      <div class="field" style="margin-top:16px">
        <label for="conv-output-layout">Output layout</label>
        <select id="conv-output-layout">
          <option value="auto">Auto (same as input layout)</option>
          <option value="default">Default</option>
          <option value="zigzag">Zigzag</option>
        </select>
      </div>
    </div>

    <div class="converter-card">
      <div class="field">
        <label for="conv-output">Output</label>
        <textarea id="conv-output" class="converter-output" readonly spellcheck="false" placeholder="Converted result will appear here..."></textarea>
      </div>
      <div class="converter-actions">
        <button class="btn btn-primary" id="conv-copy">Copy to clipboard</button>
      </div>
    </div>
  `;

  const inputEl = document.getElementById("conv-input");
  const outputEl = document.getElementById("conv-output");
  const typeEl = document.getElementById("conv-input-type");
  const inputLayoutEl = document.getElementById("conv-input-layout");
  const spellbookEl = document.getElementById("conv-spellbook");
  const outputTypeEl = document.getElementById("conv-output-type");
  const outputLayoutEl = document.getElementById("conv-output-layout");
  const statusEl = document.getElementById("conv-status");

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = "converter-status" + (type ? " " + type : "");
  }

  const typeLabel = (type) => (type === "inventory" ? "Inventory Setup" : "Bank Tag Layout");
  const styleLabel = (style) => (style === "zigzag" ? "Zigzag" : "Default");

  function convert() {
    const input = inputEl.value.trim();
    if (!input) {
      setStatus("Paste something into the input box first.", "error");
      outputEl.value = "";
      return;
    }
    try {
      let inputType = typeEl.value;
      if (inputType === "auto") inputType = detectSetupType(input);

      const inputStyle = inputLayoutEl.value;

      let outputType = outputTypeEl.value;
      if (outputType === "auto") outputType = oppositeSetupType(inputType);

      let outputStyle = outputLayoutEl.value;
      if (outputStyle === "auto") outputStyle = inputStyle;

      // Spellbook only matters for an Inventory Setup output - it's simply
      // ignored (per convertSetup) for a Bank Tag Layout output.
      const sb = parseInt(spellbookEl.value, 10);

      const result = convertSetup(input, inputType, inputStyle, outputType, outputStyle, sb);
      outputEl.value = result;
      setStatus(
        `Converted ${typeLabel(inputType)} (${styleLabel(inputStyle)}) -> ${typeLabel(outputType)} (${styleLabel(outputStyle)}).`,
        "success"
      );
    } catch (error) {
      outputEl.value = "";
      setStatus(error.message, "error");
    }
  }

  function clearAll() {
    inputEl.value = "";
    outputEl.value = "";
    setStatus("", "");
  }

  function swap() {
    if (!outputEl.value) {
      setStatus("Convert something first.", "error");
      return;
    }

    // Resolve any "auto" choices to concrete values first, since after the
    // swap they'd otherwise resolve relative to the new (swapped) input
    // instead of mirroring what was actually produced.
    let inputType = typeEl.value;
    if (inputType === "auto") inputType = detectSetupType(inputEl.value.trim());
    const inputStyle = inputLayoutEl.value;
    let outputType = outputTypeEl.value;
    if (outputType === "auto") outputType = oppositeSetupType(inputType);
    let outputStyle = outputLayoutEl.value;
    if (outputStyle === "auto") outputStyle = inputStyle;

    const oldInput = inputEl.value;
    inputEl.value = outputEl.value;
    outputEl.value = oldInput;

    typeEl.value = outputType;
    inputLayoutEl.value = outputStyle;
    outputTypeEl.value = inputType;
    outputLayoutEl.value = inputStyle;

    setStatus("Input and output swapped.", "success");
  }

  async function copyOutput() {
    if (!outputEl.value) {
      setStatus("There is no output to copy.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(outputEl.value);
      setStatus("Output copied to clipboard.", "success");
    } catch (e) {
      outputEl.focus();
      outputEl.select();
      document.execCommand("copy");
      setStatus("Output copied to clipboard.", "success");
    }
  }

  document.getElementById("conv-convert").addEventListener("click", convert);
  document.getElementById("conv-clear").addEventListener("click", clearAll);
  document.getElementById("conv-swap").addEventListener("click", swap);
  document.getElementById("conv-copy").addEventListener("click", copyOutput);
  inputEl.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") convert();
  });
}

// -------- Sidebar + routing --------

function buildTopNav() {
  const top = document.getElementById("top-nav");
  top.innerHTML = "";

  const homeLink = document.createElement("a");
  homeLink.className = "boss-link nav-primary";
  homeLink.href = "#";
  homeLink.textContent = "Home";
  homeLink.dataset.slug = "";
  top.appendChild(homeLink);

  const converterLink = document.createElement("a");
  converterLink.className = "boss-link nav-primary";
  converterLink.href = "#converter";
  converterLink.textContent = "Setup Converter";
  converterLink.dataset.slug = "converter";
  top.appendChild(converterLink);

  const preferencesLink = document.createElement("a");
  preferencesLink.className = "boss-link nav-primary";
  preferencesLink.href = "#preferences";
  preferencesLink.textContent = "Preferences";
  preferencesLink.dataset.slug = "preferences";
  top.appendChild(preferencesLink);
}

// -------- Preferences page --------
// Builds a single synthetic setup carrying every preference's/piece's
// CURRENT effective item (see getEntryEffectiveId above - the chosen
// variant if one's picked, otherwise the default), one per slot, computed
// directly per entry rather than via the normal substitution-map path (see
// getSubstitutionMapForSetup for why: main/alt pairs deliberately share
// ids, which a merged map can't handle). This still doubles as a live
// test of the real thing, though: any bug in how a choice gets resolved
// would show up here exactly the same way it would on a real setup.
//
// Item order follows PREFERENCES_TEST_LAYOUT (see data.js) - list an
// entry's identifier there (a plain preference's `key`, or a set piece's
// "setKey:pieceKey") to pin its position; anything left out is appended
// afterward in its normal ITEM_PREFERENCES order, so nothing is ever
// silently dropped just for not being listed. A `null` entry in that list
// leaves an empty gap at that position instead of placing an item, for
// visually grouping things apart on the grid.
function buildPreferencesTestSetup() {
  const flat = getFlatPreferenceEntries().filter((entry) => entry.variants && entry.variants.length > 0);
  const byKey = new Map(flat.map((entry) => [entry.storageKey, entry]));
  const ordered = [];
  (typeof PREFERENCES_TEST_LAYOUT !== "undefined" ? PREFERENCES_TEST_LAYOUT : []).forEach((storageKey) => {
    if (storageKey === null) {
      ordered.push(null); // explicit empty gap
      return;
    }
    const entry = byKey.get(storageKey);
    if (entry) {
      ordered.push(entry);
      byKey.delete(storageKey);
    }
  });
  flat.forEach((entry) => {
    if (byKey.has(entry.storageKey)) ordered.push(entry);
  });

  const ids = ordered.map((entry) => (entry === null ? null : getEntryEffectiveId(entry)));
  if (ids.every((id) => id === null)) return { label: "Preferences test", raw: null };
  const entries = ids.map((id, i) => (id === null ? null : `${id}:${i}`)).filter((e) => e !== null);
  const bankIds = ids.filter((id) => id !== null);
  const raw =
    `banktaglayoutsplugin:preferences test,${entries.join(",")},` +
    `banktag:preferences test,${bankIds.join(",")}${bankIds.length ? "," + bankIds[0] : ""}`;
  return { label: "Preferences test", raw, prefGroup: "test" };
}

// Builds a <select> of `variants` (plain ids, or `{ id, name }` to
// override the shown text), pre-selected to `selectedId`, that calls
// `onChange(newId)` when the user picks something else. Shared by
// single-item preferences and individual set pieces.
function buildVariantSelect(variants, selectedId, onChange) {
  const select = document.createElement("select");
  select.className = "preference-select";
  variants.forEach((variant) => {
    const variantId = getVariantId(variant);
    const opt = document.createElement("option");
    opt.value = String(variantId);
    opt.textContent = getVariantLabel(variant);
    if (variantId === selectedId) opt.selected = true;
    select.appendChild(opt);
  });
  select.addEventListener("change", () => onChange(Number(select.value)));
  return select;
}

// Same icon-links-to-wiki pattern used by the setup grids (renderGrid).
// `iconOverride`, if given (see getVariantIcon above), replaces the icon
// src that would otherwise come from resolving `itemId` - the wiki link
// and tooltip still reflect the actual item.
function renderPreferenceIcon(itemId, iconOverride) {
  let entry = null;
  try {
    entry = resolveItem(itemId);
  } catch (e) {
    entry = null;
  }
  if (!entry) {
    const img = document.createElement("img");
    img.src = iconOverride || "";
    img.alt = "";
    img.loading = "lazy";
    return img;
  }
  const link = document.createElement("a");
  link.href = entry.link;
  link.title = entry.name;
  link.target = "_blank";
  link.rel = "noopener";
  const img = document.createElement("img");
  img.src = iconOverride || entry.icon;
  img.alt = entry.name;
  img.loading = "lazy";
  link.appendChild(img);
  return link;
}

// Renders a single-item preference: an icon plus one dropdown.
function renderItemPreference(pref, choices) {
  const block = document.createElement("div");
  block.className = "preference-block";

  const label = document.createElement("div");
  label.className = "preference-label";
  label.textContent = pref.label;
  block.appendChild(label);

  if (!pref.variants || pref.variants.length === 0) {
    const empty = document.createElement("div");
    empty.className = "preference-empty";
    empty.textContent = "No item ids added yet - add them to this entry's `variants` list in data.js.";
    block.appendChild(empty);
    return block;
  }

  const defaultId = getPreferenceDefault(pref);
  const selectedId = choices[pref.key] !== undefined ? choices[pref.key] : defaultId;

  const row = document.createElement("div");
  row.className = "preference-item-row";
  row.appendChild(renderPreferenceIcon(selectedId, getVariantIcon(findVariant(pref.variants, selectedId))));
  row.appendChild(
    buildVariantSelect(pref.variants, selectedId, (newId) => {
      setItemPreferenceChoice(pref.key, newId === defaultId ? null : newId);
    })
  );
  block.appendChild(row);
  return block;
}

// Renders a set preference: an optional whole-set dropdown (from
// `pref.sets`), followed by each piece laid out with its own icon and
// dropdown, matching how the pieces would sit together in a setup.
// Named whole-set options for a set preference: `pref.sets` verbatim if
// given, otherwise auto-derived when every piece that has variants lines
// up the same way - piece.variants[i] across all pieces forms "tier i"
// (e.g. torva/oathplate: each piece is just [regular, upgraded], so tier 0
// = all-regular, tier 1 = all-upgraded). Lets a plain set of same-shaped
// pieces get a whole-set toggle for free, without hand-writing `sets`.
// `pref.setLabels`, if given, overrides the option text by position (e.g.
// `["Regular", "Sanguine"]`) independently of each piece's own item name -
// handy since the auto-derived label is just the first piece's item name,
// which can be a mouthful. Set `pref.sets: false` to opt out of the toggle
// entirely, even if the pieces would otherwise auto-derive one (e.g. for
// sceptres, where each is a distinct item rather than a real "tier" pairing).
// Returns [] if there's nothing sensible to offer (or the toggle was opted
// out of).
function getSetPresets(pref, pieces) {
  if (pref.sets === false) return [];

  let presets;
  if (pref.sets && pref.sets.length > 0) {
    presets = pref.sets;
  } else {
    const withVariants = pieces.filter((p) => p.variants && p.variants.length > 0);
    if (withVariants.length === 0 || withVariants.length !== pieces.length) return [];
    const tierCount = withVariants[0].variants.length;
    if (tierCount < 2 || !withVariants.every((p) => p.variants.length === tierCount)) return [];

    presets = [];
    for (let i = 0; i < tierCount; i++) {
      const items = {};
      pieces.forEach((piece) => {
        items[piece.key] = getVariantId(piece.variants[i]);
      });
      presets.push({ label: getVariantLabel(pieces[0].variants[i]), items });
    }
  }

  if (pref.setLabels && pref.setLabels.length === presets.length) {
    presets = presets.map((preset, i) => ({ ...preset, label: pref.setLabels[i] }));
  }
  return presets;
}

function renderSetPreference(pref, choices) {
  const block = document.createElement("div");
  block.className = "preference-block";

  const labelRow = document.createElement("div");
  labelRow.className = "preference-label-row";
  const label = document.createElement("div");
  label.className = "preference-label";
  label.textContent = pref.label;
  labelRow.appendChild(label);
  block.appendChild(labelRow);

  const pieces = pref.pieces || [];
  if (pieces.length === 0) {
    const empty = document.createElement("div");
    empty.className = "preference-empty";
    empty.textContent = "No pieces added yet - add them to this entry's `pieces` list in data.js.";
    block.appendChild(empty);
    return block;
  }

  // Whole-set dropdown, shown inline next to the title whenever there's at
  // least one option to offer (an explicit `pref.sets`, or an auto-derived
  // toggle - see getSetPresets above). A single option still renders as a
  // two-way toggle ("Custom" vs that one option) - handy for things like
  // "Infernal" that only make sense as on/off. Applies every listed piece
  // at once; pre-selects whichever option matches what's currently chosen,
  // or "Custom" if the pieces don't line up with any single one.
  const presets = getSetPresets(pref, pieces);
  if (presets.length > 0) {
    const currentIndex = presets.findIndex((preset) =>
      pieces.every((piece) => {
        if (!(piece.key in preset.items)) return true; // this option doesn't touch this piece
        const selected = choices[`${pref.key}:${piece.key}`] !== undefined
          ? choices[`${pref.key}:${piece.key}`]
          : getPreferenceDefault(piece);
        return selected === preset.items[piece.key];
      })
    );

    const setSelect = document.createElement("select");
    setSelect.className = "preference-select";
    setSelect.setAttribute("aria-label", `Whole set for ${pref.label}`);
    const customOpt = document.createElement("option");
    customOpt.value = "";
    customOpt.textContent = "Custom";
    if (currentIndex === -1) customOpt.selected = true;
    setSelect.appendChild(customOpt);
    presets.forEach((preset, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = preset.label;
      if (i === currentIndex) opt.selected = true;
      setSelect.appendChild(opt);
    });
    setSelect.addEventListener("change", () => {
      if (setSelect.value === "") return; // "Custom" is a display-only state
      const preset = presets[Number(setSelect.value)];
      const pairs = Object.entries(preset.items).map(([pieceKey, itemId]) => {
        const piece = pieces.find((p) => p.key === pieceKey);
        const defaultId = piece ? getPreferenceDefault(piece) : undefined;
        return [`${pref.key}:${pieceKey}`, itemId === defaultId ? null : itemId];
      });
      setItemPreferenceChoices(pairs);
    });
    labelRow.appendChild(setSelect);
  }

  const piecesRow = document.createElement("div");
  piecesRow.className = "preference-set-pieces";

  pieces.forEach((piece) => {
    const storageKey = `${pref.key}:${piece.key}`;
    const pieceEl = document.createElement("div");
    pieceEl.className = "preference-set-piece";

    if (!piece.variants || piece.variants.length === 0) {
      const icon = renderPreferenceIcon(undefined);
      icon.title = piece.label;
      pieceEl.appendChild(icon);
      const empty = document.createElement("div");
      empty.className = "preference-empty";
      empty.textContent = "No item ids yet";
      pieceEl.appendChild(empty);
      piecesRow.appendChild(pieceEl);
      return;
    }

    const defaultId = getPreferenceDefault(piece);
    const selectedId = choices[storageKey] !== undefined ? choices[storageKey] : defaultId;

    const icon = renderPreferenceIcon(selectedId, getVariantIcon(findVariant(piece.variants, selectedId)));
    icon.title = piece.label;
    pieceEl.appendChild(icon);
    const select = buildVariantSelect(piece.variants, selectedId, (newId) => {
      setItemPreferenceChoice(storageKey, newId === defaultId ? null : newId);
    });
    select.setAttribute("aria-label", piece.label);
    pieceEl.appendChild(select);
    piecesRow.appendChild(pieceEl);
  });

  block.appendChild(piecesRow);
  return block;
}

// -------- Custom confirm modal --------
// Replaces the browser's native confirm() with an on-theme dialog (the
// native one shows browser chrome, like the page's origin, above the
// message - not something a page can restyle or remove). Calls
// `onConfirm` only if the user clicks OK; Cancel, clicking outside the
// dialog, or pressing Escape all just dismiss it with no callback.
// `options.title`, if given, adds a heading with a warning icon above the
// message - without it, the dialog is just the message and buttons.
function showConfirmModal(message, onConfirm, options) {
  const opts = options || {};

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";

  if (opts.title) {
    const header = document.createElement("div");
    header.className = "modal-header";
    const icon = document.createElement("span");
    icon.className = "modal-icon";
    icon.textContent = "!";
    header.appendChild(icon);
    const titleEl = document.createElement("h3");
    titleEl.className = "modal-title";
    titleEl.textContent = opts.title;
    header.appendChild(titleEl);
    dialog.appendChild(header);
  }

  const text = document.createElement("p");
  text.className = "modal-message";
  text.textContent = message;
  dialog.appendChild(text);

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKeydown);
    document.body.style.overflow = previousOverflow;
  };

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "modal-btn modal-btn-cancel";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", close);

  const okBtn = document.createElement("button");
  okBtn.type = "button";
  okBtn.className = "modal-btn modal-btn-confirm";
  okBtn.textContent = "Reset";
  okBtn.addEventListener("click", () => {
    close();
    onConfirm();
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(okBtn);
  dialog.appendChild(actions);
  overlay.appendChild(dialog);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  function onKeydown(e) {
    if (e.key === "Escape") close();
  }
  document.addEventListener("keydown", onKeydown);

  // Lock body scrolling while the modal is open, restoring whatever the
  // page's own overflow was (rather than always resetting to "") so this
  // doesn't clobber unrelated styling if something else set it.
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  document.body.appendChild(overlay);
  okBtn.focus();
}

function renderPreferences() {
  const main = document.getElementById("main");
  main.innerHTML = "";

  const header = document.createElement("div");
  header.className = "boss-header";
  const h1 = document.createElement("h1");
  h1.textContent = "Preferences";
  header.appendChild(h1);

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "preferences-reset-btn";
  resetBtn.textContent = "Reset to defaults";
  resetBtn.addEventListener("click", () => {
    showConfirmModal(
      "Reset ALL preferences back to their defaults?\nThis can't be undone.",
      () => {
        localStorage.removeItem("itemPreferences");
        route();
      },
    );
  });
  header.appendChild(resetBtn);

  main.appendChild(header);

  const intro = document.createElement("p");
  intro.className = "preferences-intro";
  intro.textContent =
    "Choose your desired variants for the items below and these preferences will be changed for all setups on the site.\nPlease note that some setups are protected, for example certain GWD bosses require specific MA2 capes.";
  main.appendChild(intro);

  const choices = getItemPreferenceChoices();

  if (!ITEM_PREFERENCES || ITEM_PREFERENCES.length === 0) {
    const p = document.createElement("p");
    p.className = "no-setup";
    p.textContent = "No preferences have been added yet.";
    main.appendChild(p);
    return;
  }

  // A preference's `groups` (defaulting to just ["main"]) decides which
  // section(s) it renders in. Listing an entry under both means it shows
  // - and is editable - in both places, backed by the same stored choice.
  const inMain = (pref) => !pref.groups || pref.groups.includes("main");
  const inAlt = (pref) => pref.groups && pref.groups.includes("alt");
  const sets = ITEM_PREFERENCES.filter((pref) => pref.type === "set" && inMain(pref));
  const items = ITEM_PREFERENCES.filter((pref) => pref.type !== "set" && inMain(pref));
  const alt = ITEM_PREFERENCES.filter(inAlt);

  if (sets.length > 0) {
    const setsHeading = document.createElement("h2");
    setsHeading.className = "section-heading";
    setsHeading.textContent = "Sets";
    main.appendChild(setsHeading);

    const setsGrid = document.createElement("div");
    setsGrid.className = "preferences-grid";
    sets.forEach((pref) => setsGrid.appendChild(renderSetPreference(pref, choices)));
    main.appendChild(setsGrid);
  }

  if (items.length > 0) {
    const itemsHeading = document.createElement("h2");
    itemsHeading.className = "section-heading";
    itemsHeading.textContent = "Items";
    main.appendChild(itemsHeading);

    const itemsGrid = document.createElement("div");
    itemsGrid.className = "preferences-grid";
    items.forEach((pref) => itemsGrid.appendChild(renderItemPreference(pref, choices)));
    main.appendChild(itemsGrid);
  }

  if (alt.length > 0) {
    const altHeading = document.createElement("h2");
    altHeading.className = "section-heading";
    altHeading.textContent = "Alt";
    main.appendChild(altHeading);

    const altNote = document.createElement("p");
    altNote.className = "preferences-intro";
    altNote.textContent =
      "These only apply to setups intended for alt accounts.";
    main.appendChild(altNote);

    const altGrid = document.createElement("div");
    altGrid.className = "preferences-grid";
    alt.forEach((pref) => {
      const block = pref.type === "set" ? renderSetPreference(pref, choices) : renderItemPreference(pref, choices);
      altGrid.appendChild(block);
    });
    main.appendChild(altGrid);
  }

  const testHeading = document.createElement("h2");
  testHeading.className = "section-heading";
  testHeading.textContent = "Test setup";
  main.appendChild(testHeading);

  const testNote = document.createElement("p");
  testNote.className = "preferences-intro";
  testNote.textContent = "Every preference in one setup, so you can check your choices show and copy correctly.";
  main.appendChild(testNote);

  const testSetup = buildPreferencesTestSetup();
  if (testSetup.raw) {
    main.appendChild(renderSetupRow([testSetup], "h3"));
  } else {
    const p = document.createElement("p");
    p.className = "no-setup";
    p.textContent = "Add item ids to at least one preference above to see a test setup here.";
    main.appendChild(p);
  }
}

function buildSidebar() {
  const nav = document.getElementById("sidebar-nav");
  nav.innerHTML = "";

  GROUPS.forEach((group) => {
    const members = BOSSES.filter((b) => b.group === group);
    if (members.length === 0) return;

    const header = document.createElement("div");
    header.className = "group-header";
    header.textContent = group;
    nav.appendChild(header);

    members.forEach((boss) => {
      const slug = slugify(boss.name);
      const a = document.createElement("a");
      a.className = "boss-link";
      a.href = `#${slug}`;
      a.dataset.slug = slug;

      const pet = BOSS_PETS[boss.name];
      if (pet) {
        const petImg = document.createElement("img");
        petImg.className = "sidebar-pet-icon";
        petImg.src = `${WIKI}/images/${pet.file}`;
        petImg.alt = "";
        petImg.title = pet.name;
        petImg.loading = "lazy";
        a.appendChild(petImg);
      } else {
        const spacer = document.createElement("span");
        spacer.className = "sidebar-pet-icon sidebar-pet-icon-empty";
        a.appendChild(spacer);
      }

      const label = document.createElement("span");
      label.className = "boss-link-label";
      label.textContent = boss.name;
      a.appendChild(label);

      nav.appendChild(a);
    });
  });
}

function buildFormatToggle() {
  const el = document.getElementById("format-toggle");
  el.innerHTML = "";
  const bankBtn = document.createElement("button");
  bankBtn.type = "button";
  bankBtn.className = "format-btn";
  bankBtn.dataset.format = "banktag";
  bankBtn.textContent = "Bank Tag Layout";
  const invBtn = document.createElement("button");
  invBtn.type = "button";
  invBtn.className = "format-btn";
  invBtn.dataset.format = "inventory";
  invBtn.textContent = "Inventory Setup";
  el.appendChild(bankBtn);
  el.appendChild(invBtn);

  const applyActive = () => {
    const current = getCopyFormat();
    [bankBtn, invBtn].forEach((b) => b.classList.toggle("is-active", b.dataset.format === current));
  };
  bankBtn.addEventListener("click", () => {
    setCopyFormat("banktag");
    applyActive();
  });
  invBtn.addEventListener("click", () => {
    setCopyFormat("inventory");
    applyActive();
  });
  applyActive();
}

function buildGridToggle() {
  const el = document.getElementById("grid-toggle");
  el.innerHTML = "";
  const defaultBtn = document.createElement("button");
  defaultBtn.type = "button";
  defaultBtn.className = "format-btn";
  defaultBtn.dataset.style = "default";
  defaultBtn.textContent = "Default";
  const zigzagBtn = document.createElement("button");
  zigzagBtn.type = "button";
  zigzagBtn.className = "format-btn";
  zigzagBtn.dataset.style = "zigzag";
  zigzagBtn.textContent = "Zigzag";
  el.appendChild(defaultBtn);
  el.appendChild(zigzagBtn);

  const applyActive = () => {
    const current = getGridStyle();
    [defaultBtn, zigzagBtn].forEach((b) => b.classList.toggle("is-active", b.dataset.style === current));
  };
  defaultBtn.addEventListener("click", () => {
    setGridStyle("default");
    applyActive();
  });
  zigzagBtn.addEventListener("click", () => {
    setGridStyle("zigzag");
    applyActive();
  });
  applyActive();
}

// Lowercases, drops apostrophes (straight or curly), and collapses/trims
// whitespace so "kril", "k'ril", "k ril" and "K'Ril " all compare equal.
function normalizeSearchText(str) {
  return str
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildBossSearch() {
  const input = document.getElementById("boss-search");
  const clearBtn = document.getElementById("boss-search-clear");
  const field = input ? input.closest(".sidebar-search-field") : null;
  if (!input) return;

  const runFilter = () => {
    const query = normalizeSearchText(input.value);

    if (field) field.classList.toggle("has-value", input.value.length > 0);

    // If the query matches (fully or partially) one of the nicknames in
    // BOSS_ALIASES, also match that alias's target boss.
    const aliasTargets = [];
    if (query) {
      Object.entries(BOSS_ALIASES).forEach(([alias, targetName]) => {
        const normAlias = normalizeSearchText(alias);
        if (normAlias.includes(query) || query.includes(normAlias)) {
          aliasTargets.push(normalizeSearchText(targetName));
        }
      });
    }

    let currentGroupHeader = null;
    let currentGroupHasMatch = false;

    const finishGroup = () => {
      if (currentGroupHeader) {
        currentGroupHeader.classList.toggle("is-hidden", !currentGroupHasMatch);
      }
    };

    document.querySelectorAll("#sidebar-nav .group-header, #sidebar-nav .boss-link").forEach((el) => {
      if (el.classList.contains("group-header")) {
        finishGroup();
        currentGroupHeader = el;
        currentGroupHasMatch = false;
        return;
      }
      const elText = normalizeSearchText(el.textContent);
      const matches =
        !query ||
        elText.includes(query) ||
        aliasTargets.some((target) => elText.includes(target));
      el.classList.toggle("is-hidden", !matches);
      if (matches) currentGroupHasMatch = true;
    });
    finishGroup();
  };

  input.addEventListener("input", runFilter);

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      input.value = "";
      runFilter();
      input.focus();
    });
  }
}

function route() {
  const hash = window.location.hash.replace(/^#/, "");
  const [slug, modeLabelSlug] = hash.split("/");

  document.querySelectorAll(".boss-link").forEach((a) => {
    a.classList.toggle("active", a.dataset.slug === slug);
  });

  if (!slug) {
    renderHome();
    return;
  }
  if (slug === "converter") {
    renderConverter();
    return;
  }
  if (slug === "preferences") {
    renderPreferences();
    return;
  }
  const boss = BOSSES.find((b) => slugify(b.name) === slug);
  if (!boss) {
    renderHome();
    return;
  }

  let modeParam;
  if (modeLabelSlug) {
    const match = getBossModes(boss).find(
      (m) => labelToUrlSegment(m.label) === modeLabelSlug
    );
    if (match) modeParam = match.key;
  }

  renderBossPage(boss, modeParam);
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", () => {
  buildTopNav();
  buildSidebar();
  buildFormatToggle();
  buildGridToggle();
  buildBossSearch();
  route();
});