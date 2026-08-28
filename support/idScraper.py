import json
import requests
from bs4 import BeautifulSoup

URL = "https://oldschool.runescape.wiki/w/Item_IDs"
headers = {
    "User-Agent": "Mozilla/5.0 (compatible; OSRS-Item-ID-Scraper/1.0)"
}

response = requests.get(URL, headers=headers, timeout=30)
response.raise_for_status()

soup = BeautifulSoup(response.text, "html.parser")

items = {}

# Find the specific table with class 'sortable wikitable'
table = soup.find("table", class_="sortable wikitable")
if not table:
    print("Could not find the data table.")
    exit()

rows = table.find_all("tr")
for row in rows[1:]:  # skip header row
    cells = row.find_all("td")
    if len(cells) < 2:
        continue

    # First cell: item link
    item_link = cells[0].find("a")
    if not item_link:
        continue
    item_name_full = item_link.get_text(" ", strip=True)

    # Second cell: item ID link
    id_link = cells[1].find("a")
    if not id_link:
        continue
    item_id = id_link.get_text(" ", strip=True)

    # Prepare the data
    item_name = item_name_full  # Keep original case
    wiki_name = item_name.lower().replace(" ", "_")  # Generate wiki_name

    # Save in dictionary
    items[str(item_id)] = [item_name, wiki_name]

# Keep only entries with numeric IDs
numeric_items = {k: v for k, v in items.items() if k.isdigit()}

# Sort by numeric ID
items = dict(sorted(numeric_items.items(), key=lambda x: int(x[0])))

if "33595" in items:
    items["33596"] = items["33595"]
if "33639" in items:
    items["28903"] = items["33639"]
if "27253" in items:
    items["27254"] = items["27253"]
if "27281" in items:
    items["27510"] = items["27281"]
if "9075" in items:
    items["16687"] = items["9075"]
if "21389" in items:
    items["21390"] = items["21389"]
if "31106" in items:
    items["31108"] = items["31106"]
if "11806" in items:
    items["18344"] = items["11806"]
if "27241" in items:
    items["27243"] = items["27241"]
if "563" in items:
    items["13708"] = items["563"]
if "11920" in items:
    items["14766"] = items["11920"]
if "28316" in items:
    items["28318"] = items["28316"]
if "22978" in items:
    items["22980"] = items["22978"]
if "4162" in items:
    items["14040"] = items["4162"]
if "28307" in items:
    items["28309"] = items["28307"]
if "561" in items:
    items["13706"] = items["561"]
if "565" in items:
    items["13710"] = items["565"]
if "12817" in items:
    items["15331"] = items["12817"]
if "29577" in items:
    items["29579"] = items["29577"]
if "30759" in items:
    items["30761"] = items["30759"]
if "29022" in items:
    items["29024"] = items["29022"]
if "29025" in items:
    items["29027"] = items["29025"]
if "29028" in items:
    items["29030"] = items["29028"]
if "22327" in items:
    items["22491"] = items["22327"]
if "22328" in items:
    items["22493"] = items["22328"]



# Prepare JavaScript content
js_content = "const ITEM_DATA = " + json.dumps(items, ensure_ascii=False, separators=(",", ":")) + ";"

# Save to a .js file
with open("items-data.js", "w", encoding='utf-8') as f:
    f.write(js_content)

print("Saved item data to items-data.js")