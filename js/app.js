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

// -------- Item icon resolution --------

function resolveItem(id) {
  const entry = ITEM_DATA[String(id)] || ITEM_DATA[String(id - 1)];
  if (!entry) return null;
  const [name, page] = entry;

  // Remove '#' characters
  let cleanPage = page.replace(/#/g, '');

  // Remove specific suffixes
  cleanPage = cleanPage.replace(/[_]?full$|[_]?locked$|[_]?charged$|[_]?inventory$|[_]?normal$|[_]?assembled$|[_]?filled$|[_]?closed|[_]?open$|[_]?uncharged$|[_]?active$|[_]?used$|[_]?new$/i, '');
  cleanPage = cleanPage.replace(/trimmed/gi, '(t)');

  // Capitalize the first letter
  let capitalizedPage = cleanPage.charAt(0).toUpperCase() + cleanPage.slice(1);

  // Handle special cases
  if (capitalizedPage === "Seeking_dragon_arrow") {
    capitalizedPage = "Seeking_dragon_arrow_5";
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

  if (capitalizedPage === "Ring_of_suffering_(i)recoil") {
    capitalizedPage = "Ring_of_suffering_(i)";
  }
 
  if (capitalizedPage === "Ring_of_sufferingrecoil") {
    capitalizedPage = "Ring_of_suffering";
  }

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

function renderNotesToggle(text, extraClass) {
  if (!text || !text.trim()) return null;
  const wrap = document.createElement("div");
  wrap.className = "notes-block" + (extraClass ? " " + extraClass : "");
  const label = document.createElement("div");
  label.className = "notes-label";
  label.textContent = "Notes";
  const content = document.createElement("div");
  content.className = "notes-content";
  content.textContent = text;
  wrap.appendChild(label);
  wrap.appendChild(content);
  return wrap;
}

// -------- Single setup block (heading + grid + copy button + updated date) --------

// Renders one setup as 4 separate grid cells (heading, content, button,
// meta) rather than one wrapping element. renderSetupRow places these
// directly into a shared CSS Grid (grid-auto-flow: column) so that each
// row of content - the heading, the gear grid, the copy button, and the
// updated/notes block - lines up across every column in the row, no
// matter how tall an individual setup's grid or notes are.
function renderSetup(setup, headingTag) {
  const style = getGridStyle();

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

  const content = document.createElement("div");
  content.className = "setup-content";

  let layout = null;
  try {
    layout = getSetupLayout(setup, style);
  } catch (e) {
    console.error("Failed to load setup layout:", setup.label, e);
    layout = null;
  }

  const grid = renderGrid(layout);
  const meta = document.createElement("div");
  meta.className = "setup-meta";
  const buttonCell = document.createElement("div");
  buttonCell.className = "setup-button-cell";

  if (!grid) {
    const p = document.createElement("p");
    p.className = "no-setup";
    p.textContent = "No setup data added yet.";
    content.appendChild(p);
    return [heading, content, buttonCell, meta];
  }
  content.appendChild(grid);

  if (setup.updated) {
    const updated = document.createElement("div");
    updated.className = "updated-date";
    updated.textContent = `Updated as of ${formatDate(setup.updated)}`;
    meta.appendChild(updated);
  }

  const notesEl = renderNotesToggle(setup.notes);
  if (notesEl) meta.appendChild(notesEl);

  const format = getCopyFormat();
  let copyText = null;
  try {
    copyText = getSetupCopyText(setup, format, style);
  } catch (e) {
    copyText = null;
  }

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
      navigator.clipboard.writeText(copyText.trim()).then(() => {
        const original = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = original), 1200);
      });
    });
  }
  buttonCell.appendChild(btn);

  return [heading, content, buttonCell, meta];
}

function renderSetupRow(setups, headingTag) {
  const row = document.createElement("div");
  row.className = "setup-row";
  if (!setups || setups.length === 0) {
    const p = document.createElement("p");
    p.className = "no-setup";
    p.textContent = "No setup data added yet.";
    row.appendChild(p);
    return row;
  }
  row.style.gridTemplateColumns = `repeat(${setups.length}, 402px)`;
  setups.forEach((s) => {
    const cells = renderSetup(s, headingTag);
    cells.forEach((cell) => row.appendChild(cell));
  });
  return row;
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

  main.appendChild(header);

  const bossNotes = renderNotesToggle(boss.notes, "boss-notes");
  if (bossNotes) main.appendChild(bossNotes);

  const hasSolo = Array.isArray(boss.solo) && boss.solo.length > 0;
  const hasDuo = Array.isArray(boss.duo) && boss.duo.length > 0;

  if (hasSolo && hasDuo) {
    // Show toggle + both
    const toggle = document.createElement("div");
    toggle.className = "mode-toggle";

    const soloLabel = boss.soloLabel || "Solo";
    const duoLabel = boss.duoLabel || "1+1";

    const soloBtn = document.createElement("button");
    soloBtn.type = "button";
    soloBtn.className = "mode-btn";
    soloBtn.dataset.mode = "solo";
    soloBtn.textContent = soloLabel;

    const duoBtn = document.createElement("button");
    duoBtn.type = "button";
    duoBtn.className = "mode-btn";
    duoBtn.dataset.mode = "duo";
    duoBtn.textContent = duoLabel;

    toggle.appendChild(soloBtn);
    toggle.appendChild(duoBtn);
    main.appendChild(toggle);

    const soloBlock = document.createElement("div");
    soloBlock.className = "setup-block";
    soloBlock.dataset.mode = "solo";
    const soloModeNotes = renderNotesToggle(boss.soloNotes, "mode-notes");
    if (soloModeNotes) soloBlock.appendChild(soloModeNotes);
    soloBlock.appendChild(renderSetupRow(boss.solo, "h2"));

    const duoBlock = document.createElement("div");
    duoBlock.className = "setup-block";
    duoBlock.dataset.mode = "duo";
    const duoModeNotes = renderNotesToggle(boss.duoNotes, "mode-notes");
    if (duoModeNotes) duoBlock.appendChild(duoModeNotes);
    duoBlock.appendChild(renderSetupRow(boss.duo, "h2"));

    main.appendChild(soloBlock);
    main.appendChild(duoBlock);

    const applyMode = (mode) => {
      [soloBtn, duoBtn].forEach((b) => b.classList.toggle("is-active", b.dataset.mode === mode));
      [soloBlock, duoBlock].forEach((b) => b.classList.toggle("is-visible", b.dataset.mode === mode));
      setBossHash(boss, mode === "duo" ? duoLabel : soloLabel);
    };

    soloBtn.addEventListener("click", () => {
      localStorage.setItem("bossMode", "solo");
      applyMode("solo");
    });
    duoBtn.addEventListener("click", () => {
      localStorage.setItem("bossMode", "duo");
      applyMode("duo");
    });

    // URL wins if it names a valid, available mode (e.g. shared/bookmarked
    // link); otherwise fall back to whatever the user used last time.
    const savedMode = localStorage.getItem("bossMode");
    if ((modeParam === "solo" && hasSolo) || (modeParam === "duo" && hasDuo)) {
      applyMode(modeParam);
    } else if (savedMode === "duo" && hasDuo) {
      applyMode("duo");
    } else {
      applyMode("solo");
    }
  } else {
    if (hasSolo) {
      const soloBlock = document.createElement("div");
      soloBlock.className = "setup-block is-visible";
      soloBlock.dataset.mode = "solo";
      const soloModeNotes = renderNotesToggle(boss.soloNotes, "mode-notes");
      if (soloModeNotes) soloBlock.appendChild(soloModeNotes);
      soloBlock.appendChild(renderSetupRow(boss.solo, "h2"));
      main.appendChild(soloBlock);
    } else if (hasDuo) {
      const duoBlock = document.createElement("div");
      duoBlock.className = "setup-block is-visible";
      duoBlock.dataset.mode = "duo";
      const duoModeNotes = renderNotesToggle(boss.duoNotes, "mode-notes");
      if (duoModeNotes) duoBlock.appendChild(duoModeNotes);
      duoBlock.appendChild(renderSetupRow(boss.duo, "h2"));
      main.appendChild(duoBlock);
    } else {
      const p = document.createElement("p");
      p.className = "no-setup";
      p.textContent = "No setup data added yet.";
      main.appendChild(p);
    }
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
  const boss = BOSSES.find((b) => slugify(b.name) === slug);
  if (!boss) {
    renderHome();
    return;
  }

  let modeParam;
  if (modeLabelSlug) {
    const soloLabelSlug = labelToUrlSegment(boss.soloLabel || "Solo");
    const duoLabelSlug = labelToUrlSegment(boss.duoLabel || "1+1");
    if (modeLabelSlug === soloLabelSlug) modeParam = "solo";
    else if (modeLabelSlug === duoLabelSlug) modeParam = "duo";
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