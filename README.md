# Boss Tags

A static, dependency-free site for OSRS boss gear setups, built from real RuneLite
plugin export strings. No MkDocs, no build step, no GitHub required — it's plain
HTML/CSS/JS you can upload to any web host and edit yourself.

## Hosting it

Upload the whole folder to any static web host — shared hosting, an S3/Cloudflare
bucket, nginx, whatever. Nothing to build or compile. To preview locally, open
`index.html` directly, or run a tiny local server from this folder if your browser
blocks local file requests:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000

## Pages

- **Home** (`#`) — landing page + changelog. The sidebar title ("Boss Tags") links
  here from anywhere.
- **Boss pages** (`#boss-slug`) — one per boss, built from `js/data.js`.
- **Setup Converter** (`#converter`) — a tool page (linked at the bottom of the
  sidebar) that converts pasted setups between the two formats below.

## The two setup formats

RuneLite has two different plugins that export gear setups as text, and this site
understands both:

- **Bank Tag Layout** (Bank Tags plugin) — a string starting with
  `banktaglayoutsplugin:...`
- **Inventory Setup** (Inventory Setups plugin) — a JSON blob with a `layout`
  array

Both ultimately describe the same flat, position-indexed grid, so the site can
convert between them on the fly (`js/converter.js`, ported from the standalone
converter tool). There's a **site-wide "Copy format" toggle** in the sidebar
(Bank Tag / Inventory) — it controls which format every boss page's Copy button
produces, converting automatically if a setup was only entered in the other
format.

## Adding or editing bosses

Everything lives in **`js/data.js`**.

```js
{
  name: "Vorkath",
  group: "Quest",           // must match one of the GROUPS entries at the top
  solo: [
    {
      label: "Range",
      raw: "banktaglayoutsplugin:vorkath,...,banktag:vorkath,...", // optional
      inventory: "{\"setup\":{...},\"layout\":[...]}",              // optional
      updated: "2026-08-28",
    }
  ],
  // duo is optional - omit it and "1+1" mode just shows the solo setups.
  // If a mode has 2+ setups (e.g. Main/Alt, or Melee/Range), they're shown
  // side by side automatically - no extra config needed for that.
  duo: [
    { label: "Main", raw: "...", updated: "2026-08-28" },
    { label: "Alt",  raw: "...", updated: "2026-08-28" },
  ],
}
```

You only need **one** of `raw` / `inventory` per setup — the site derives
whichever format the site-wide toggle currently wants. Provide both if you'd
rather not rely on the auto-conversion (e.g. you want to preserve an exact
original export in each format).

**Where "raw" comes from:** in-game, right-click your Bank Tags tab in the
RuneLite **Bank Tags** plugin → copy/export. Paste the whole clipboard contents,
unedited.

**Where "inventory" comes from:** the RuneLite **Inventory Setups** plugin's own
export (right-click a setup → Export), pasted as-is.

A setup with neither field (or an empty `solo: []` with no `duo`) renders
"No setup data added yet."

## The changelog

Also in `js/data.js`, at the top: a `CHANGELOG` array, newest entry first.
Add a line whenever you update a setup so the home page reflects it:

```js
{ date: "2026-09-02", text: "Vorkath (Quest): updated Range setup after the Masori rebalance." },
```

There's no automatic link between a boss's `updated` date and a changelog entry —
they're both just dates you set by hand, so keep them in sync yourself when you
edit a setup.

## How the grid is drawn

Layout positions are read left-to-right, top-to-bottom in an 8-column grid
(`row = floor(pos / 8)`, `col = pos % 8`). Grid size is inferred from the highest
position found in the data — you never need to specify it.

## Item icons — how they're resolved, and the one gap to know about

`js/items-data.js` is a bundled `id -> [name, wikiPageSlug]` lookup table (~10,800
items), built from the [osrsbox-db](https://github.com/osrsbox/osrsbox-db) project.
It turns a bare item ID into an icon (`oldschool.runescape.wiki/images/<page>.png`)
and a working wiki link.

**The catch:** that dataset hasn't been updated since ~2021, so anything added to
OSRS after that won't be in it. There's no public, free API that maps item ID →
name for current items, so an unresolved ID falls back to a small `#12345` box
that links to a wiki search for that ID.

**To fix a specific missing item:** look it up on the wiki (its ID is shown in the
"Advanced data" section near the bottom of most item pages, or search
[Item IDs](https://oldschool.runescape.wiki/w/Item_IDs)), then add a line to
`js/items-data.js`:

```js
"12345": ["Item name", "Item_wiki_page_slug"],
```

The "page slug" is the part of the wiki URL after `/w/` — e.g. for
`oldschool.runescape.wiki/w/Twisted_bow` that's `Twisted_bow`.

The **Mad Angel** boss is a real, currently-live Bank Tag export and is a good
test case: 33 unique item IDs, several of which (mostly 2022+ items) aren't in
the bundled dataset yet and show as `#id` placeholders until patched in.

## Structure

```
index.html          # single page, hash-routed (#boss-slug, #converter, or empty for home)
css/style.css         # all styling - minimal dark theme
js/data.js             # <- you edit this: GROUPS + CHANGELOG + BOSSES
js/items-data.js         # bundled item id -> name/icon lookup (~10.8k items)
js/converter.js            # Bank Tag Layout <-> Inventory Setup conversion logic
js/app.js                    # sidebar, routing, rendering, toggles, converter page UI
```

## Notes on the Solo / 1+1 toggle

Per boss page, remembers your last choice across pages via `localStorage`. If a
boss has no `duo` array, 1+1 mode reuses the `solo` setups so the toggle never
shows a blank page.

The **KQ** entry currently uses hand-built demo data (not a real plugin export)
just to show the Main/Alt side-by-side layout working — swap it for a real export
whenever you have one.
