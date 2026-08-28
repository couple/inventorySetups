const WIKI = "https://oldschool.runescape.wiki";
const COLS = 8;

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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

// -------- Item icon resolution --------

function resolveItem(id) {
  const entry = ITEM_DATA[String(id)] || ITEM_DATA[String(id - 1)];
  if (!entry) return null;
  const [name, page] = entry;

  // Remove '#' characters
  let cleanPage = page.replace(/#/g, '');

  // Remove specific suffixes
  cleanPage = cleanPage.replace(/[_]?locked$|[_]?charged$|[_]?inventory$|[_]?normal$|[_]?assembled$|[_]?filled$|[_]?closed|[_]?open$|[_]?uncharged$|[_]?active$|[_]?used$|[_]?new$/i, '');
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

function renderSetup(setup, headingTag) {
  const wrap = document.createElement("div");
  wrap.className = "setup";

  const h = document.createElement(headingTag);
  h.textContent = setup.label;
  wrap.appendChild(h);

  let layout = null;

  try {
    if (setup.inventory) {
      const parsed = JSON.parse(setup.inventory);

      if (Array.isArray(parsed.layout)) {
        layout = parsed.layout;
      }
    }

    if (!layout) {
      layout = getSetupLayout(setup);
    }
  } catch (e) {
    console.error("Failed to load setup layout:", setup.label, e);
    layout = null;
  }

  const grid = renderGrid(layout);
  if (!grid) {
    const p = document.createElement("p");
    p.className = "no-setup";
    p.textContent = "No setup data added yet.";
    wrap.appendChild(p);
    return wrap;
  }
  wrap.appendChild(grid);

  const format = getCopyFormat();
  let copyText = null;
  try {
    copyText = getSetupCopyText(setup, format);
  } catch (e) {
    copyText = null;
  }

  const btn = document.createElement("button");
  btn.className = "copy-btn";
  const formatLabel = format === "inventory" ? "Inventory Setup" : "Bank Tag Layout";
  btn.textContent = `Copy (${formatLabel})`;
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
  wrap.appendChild(btn);

  if (setup.updated) {
    const updated = document.createElement("div");
    updated.className = "updated-date";
    updated.textContent = `Updated as of ${formatDate(setup.updated)}`;
    wrap.appendChild(updated);
  }

  const notesEl = renderNotesToggle(setup.notes);
  if (notesEl) wrap.appendChild(notesEl);

  return wrap;
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
  setups.forEach((s) => {
    const col = document.createElement("div");
    col.className = "setup-col";
    col.appendChild(renderSetup(s, headingTag));
    row.appendChild(col);
  });
  return row;
}

// -------- Boss page --------

function renderBossPage(boss) {
  const main = document.getElementById("main");
  main.innerHTML = "";

  const h1 = document.createElement("h1");
  h1.textContent = boss.name;
  main.appendChild(h1);

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
    };

    soloBtn.addEventListener("click", () => {
      localStorage.setItem("bossMode", "solo");
      applyMode("solo");
    });
    duoBtn.addEventListener("click", () => {
      localStorage.setItem("bossMode", "duo");
      applyMode("duo");
    });

    const savedMode = localStorage.getItem("bossMode");
    if (savedMode === "duo" && hasDuo) {
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

// -------- Home page (with changelog) --------

function renderHome() {
  const main = document.getElementById("main");
  main.innerHTML = "";

  const h1 = document.createElement("h1");
  h1.textContent = "Changelog";
  main.appendChild(h1);

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
    <p class="empty-state">Convert between Bank Tag Layout and Inventory Setups.</p>

    <div class="converter-card">
      <div class="field">
        <label for="conv-input-type">Input type</label>
        <select id="conv-input-type">
          <option value="auto">Auto-detect</option>
          <option value="inventory">Inventory Setup</option>
          <option value="banklayout">Bank Tag Layout</option>
        </select>
      </div>

      <div class="field" style="margin-top:16px">
        <label for="conv-input">Input</label>
        <textarea id="conv-input" spellcheck="false" placeholder="Paste your Inventory Setup or Bank Tag Layout here..."></textarea>
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
  const statusEl = document.getElementById("conv-status");

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = "converter-status" + (type ? " " + type : "");
  }

  function convert() {
    const input = inputEl.value.trim();
    if (!input) {
      setStatus("Paste something into the input box first.", "error");
      outputEl.value = "";
      return;
    }
    try {
      let type = typeEl.value;
      if (type === "auto") type = detectSetupType(input);

      let result;
      if (type === "inventory") {
        const { name, layout, banktag } = inventoryJSONToLayout(input);
        result = layoutToBankTagString(layout, name, banktag);
        setStatus("Converted Inventory Setup -> Bank Tag Layout.", "success");
      } else if (type === "banklayout") {
        const { name, layout } = parseBankTagLayout(input);
        result = layoutToInventoryJSON(layout, name);
        setStatus("Converted Bank Tag Layout -> Inventory Setup.", "success");
      } else {
        throw new Error("Unknown input type.");
      }
      outputEl.value = result;
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
    const oldInput = inputEl.value;
    inputEl.value = outputEl.value;
    outputEl.value = oldInput;
    typeEl.value = inputEl.value.trim().startsWith("banktaglayoutsplugin:") ? "banklayout" : "inventory";
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

  const changelogLink = document.createElement("a");
  changelogLink.className = "boss-link nav-primary";
  changelogLink.href = "#";
  changelogLink.textContent = "Changelog";
  changelogLink.dataset.slug = "";
  top.appendChild(changelogLink);

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
      a.textContent = boss.name;
      a.dataset.slug = slug;
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
  bankBtn.textContent = "Bank Tag";
  const invBtn = document.createElement("button");
  invBtn.type = "button";
  invBtn.className = "format-btn";
  invBtn.dataset.format = "inventory";
  invBtn.textContent = "Inventory";
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

function route() {
  const slug = window.location.hash.replace(/^#/, "");

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
  renderBossPage(boss);
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", () => {
  buildTopNav();
  buildSidebar();
  buildFormatToggle();
  route();
});