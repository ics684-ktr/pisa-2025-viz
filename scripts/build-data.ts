/* To run this script:
- download the spreadsheets listed in scripts/data/README.md
- put them in scripts/data
- run `npm run build:data`
*/

import XLSX from "xlsx"

/* load 'fs' for readFile and writeFile support */
import * as fs from "node:fs"
import path from "node:path"
XLSX.set_fs(fs)

const DATA_DIR = "scripts/data"
const OUTPUT_FILE = "src/pisa_data.json"
const CHAPTER_4_SPREADSHEET_NAME = "xmra2f.xlsx"
const AIUSESCH_SHEET_NAME = "Table I.B1.4.53"

/* Every spreadsheet this script reads. Download links are in scripts/data/README.md. */
const SPREADSHEETS = [CHAPTER_4_SPREADSHEET_NAME]

const missing = SPREADSHEETS.filter(file => !fs.existsSync(path.join(DATA_DIR, file)))
if (missing.length > 0) {
  console.error(`Missing spreadsheets in ${DATA_DIR}/: ${missing.join(", ")}`)
  console.error(`See ${DATA_DIR}/README.md for where to download them.`)
  process.exit(1)
}
console.log(`Found spreadsheets in ${DATA_DIR}/: ${SPREADSHEETS.join(", ")}`)

console.log(`Reading ${AIUSESCH_SHEET_NAME} from ${CHAPTER_4_SPREADSHEET_NAME}...`)
const chapter_4_tables_xlsx = XLSX.readFile(
  path.join(DATA_DIR, CHAPTER_4_SPREADSHEET_NAME),
  {
    sheets: [AIUSESCH_SHEET_NAME]
  },
)

const aiusesch_sheet = chapter_4_tables_xlsx.Sheets[AIUSESCH_SHEET_NAME]
const aiusesch_json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(aiusesch_sheet, {
  range: "A10:D102",
  header: "A",
})

/* Some values have "m" or "c" indicating missing or insufficient data. */
const num = (v: unknown) => (typeof v === "number" ? v : null)
const text = (v: unknown) => (typeof v === "string" ? v : "")

/* PISA's country codes, from "ISO codes for countries and economies used in this report"
(PISA 2025 Notes on Participating Countries and Economies). Every country needs a code so
it can be displayed on Plotly's maps. */
const PISA_CODES: Record<string, string> = {
  "Albania": "ALB", "Argentina": "ARG", "Armenia": "ARM", "Australia": "AUS", "Austria": "AUT",
  "Azerbaijan": "AZE", "Belgium": "BEL", "Brazil": "BRA", "Brunei Darussalam": "BRN",
  "B-S-J-Z (China)": "QCI", "Bulgaria": "BGR", "Cambodia": "KHM", "Canada": "CAN", "Chile": "CHL",
  "Colombia": "COL", "Costa Rica": "CRI", "Croatia": "HRV", "Cyprus": "QCY", "Czechia": "CZE",
  "Denmark": "DNK", "Dominican Republic": "DOM", "Dushanbe (Tajikistan)": "QTJ", "Ecuador": "ECU",
  "El Salvador": "SLV", "Estonia": "EST", "Finland": "FIN", "France": "FRA", "Georgia": "GEO",
  "Germany": "DEU", "Greece": "GRC", "Guatemala": "GTM", "Hong Kong (China)": "HKG",
  "Hungary": "HUN", "Iceland": "ISL", "Indonesia": "IDN", "Ireland": "IRL", "Israel": "ISR",
  "Italy": "ITA", "Japan": "JPN", "Jordan": "JOR", "Kazakhstan": "KAZ", "Kenya": "KEN",
  "Korea": "KOR", "Kosovo": "KSV", "Kurdistan Region (Iraq)": "QKI", "Kyrgyzstan": "KGZ",
  "Latvia": "LVA", "Lebanon": "LBN", "Lithuania": "LTU", "Luxembourg": "LUX",
  "Macao (China)": "MAC", "Malaysia": "MYS", "Malta": "MLT", "Mauritius": "MUS", "Mexico": "MEX",
  "Moldova": "MDA", "Mongolia": "MNG", "Montenegro": "MNE", "Morocco": "MAR", "Netherlands": "NLD",
  "New Zealand": "NZL", "North Macedonia": "MKD", "Norway": "NOR", "Palestinian Authority": "PSE",
  "Paraguay": "PRY", "Peru": "PER", "Philippines": "PHL", "Poland": "POL", "Portugal": "PRT",
  "Qatar": "QAT", "Romania": "ROU", "Rwanda": "RWA", "Saudi Arabia": "SAU", "Serbia": "SRB",
  "Singapore": "SGP", "Slovak Republic": "SVK", "Slovenia": "SVN", "Spain": "ESP", "Sweden": "SWE",
  "Switzerland": "CHE", "Chinese Taipei": "TAP", "Thailand": "THA", "Türkiye": "TUR",
  "Ukrainian regions (17 of 27)": "QUA", "United Arab Emirates": "ARE", "United Kingdom": "GBR",
  "United States": "USA", "Uruguay": "URY", "Uzbekistan": "UZB", "Viet Nam": "VNM",
  "Zambia": "ZMB",
}

/* Each participant's PISA code. MAP_CODES below swaps the ones Plotly's map doesn't know.
Kosovo's "XKX" is a common stand-in, not an official ISO3 code either. */
const MAP_CODES: Record<string, string> = {
  QCI: "CHN", QCY: "CYP", QTJ: "TJK", KSV: "XKX", QKI: "IRQ", TAP: "TWN", QUA: "UKR",
}

/* All PISA 2025 participants. Write to the json for easy country lookup */
const PARTICIPANTS = Object.entries(PISA_CODES).map(([country, pisa_code]) => ({
  country,
  iso3: MAP_CODES[pisa_code] ?? pisa_code,
}))

const ISO3_BY_NAME = new Map(PARTICIPANTS.map(p => [p.country, p.iso3]))

/* The first row is always the OECD average; the rest are countries/economies. */
const [oecd_average_row, ...country_rows] = aiusesch_json
const oecd_average = {
  aiusesch: num(oecd_average_row.B),
  aiusesch_se: num(oecd_average_row.C),
}

/* Countries ending with "*" indicates that country didn't meet OECD's sampling criteria,
so results should be treated with caution. So we filter out the "*" when parsing country
names and note the caution.
*/
const countries = country_rows.map(r => {
  const country = text(r.A).replace(/\*$/, "")
  return {
    country,
    iso3: ISO3_BY_NAME.get(country) ?? null,
    caution: text(r.A).endsWith("*"),
    aiusesch: num(r.B),      // AIUSESCH (students' AI use at school): country mean
    aiusesch_se: num(r.C),   // ... and its standard error
    coverage: text(r.D) || null,
  }
})

const no_iso3 = countries.filter(r => !ISO3_BY_NAME.get(r.country)).map(r => r.country)
if (no_iso3.length > 0) {
  console.error(`No country code for: ${no_iso3.join(", ")}. Add them to PISA_CODES.`)
  process.exit(1)
}

const no_data = countries.filter(r => r.aiusesch === null).map(r => r.country)
const cautioned = countries.filter(r => r.caution).map(r => r.country)
console.log(`  OECD average: ${oecd_average.aiusesch} (SE ${oecd_average.aiusesch_se})`)
console.log(`  ${countries.length} countries/economies`)
console.log(`  ${no_data.length} with no AIUSESCH data: ${no_data.join(", ")}`)
console.log(`  ${cautioned.length} flagged for caution: ${cautioned.join(", ")}`)

const pisa_data = {
  PARTICIPANTS,
  AIUSESCH: {
    oecd_average,
    countries,
  },
}

fs.writeFileSync(
  path.resolve(process.cwd(), OUTPUT_FILE),
  JSON.stringify(pisa_data, null, 2),
  "utf-8",
)
console.log(`Wrote ${OUTPUT_FILE}`)
