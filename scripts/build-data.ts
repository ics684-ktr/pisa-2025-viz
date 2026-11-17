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
const CHAPTER_2_SPREADSHEET_NAME = "mrq53f.xlsx"

const TABLES = {
  AIUSESCH: "Table I.B1.4.53",
  ASSESS_AI_OUTPUT: "Table I.B1.4.68",
  SCIENCE_SCORES: "Table I.B1.2a.1",
}

/* Every spreadsheet this script reads. Download links are in scripts/data/README.md. */
const SPREADSHEETS = [CHAPTER_4_SPREADSHEET_NAME, CHAPTER_2_SPREADSHEET_NAME]

const missing = SPREADSHEETS.filter(file => !fs.existsSync(path.join(DATA_DIR, file)))
if (missing.length > 0) {
  console.error(`Missing spreadsheets in ${DATA_DIR}/: ${missing.join(", ")}`)
  console.error(`See ${DATA_DIR}/README.md for where to download them.`)
  process.exit(1)
}
console.log(`Found spreadsheets in ${DATA_DIR}/: ${SPREADSHEETS.join(", ")}`)

const table_names = Object.values(TABLES)
console.log(`Reading ${table_names.join(", ")} from ${CHAPTER_4_SPREADSHEET_NAME}...`)
const chapter_4_workbook = XLSX.readFile(
  path.join(DATA_DIR, CHAPTER_4_SPREADSHEET_NAME),
  {
    sheets: table_names,
  },
)

const chapter_2_workbook = XLSX.readFile(
  path.join(DATA_DIR, CHAPTER_2_SPREADSHEET_NAME),
  {
    sheets: [TABLES.SCIENCE_SCORES],
  },
)

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

/* Seven PISA codes aren't ISO3 codes, so Plotly's map can't place them. MAP_CODES swaps each
for its country's ISO3 code. Kosovo's "XKX" is a common stand-in, not an official ISO3 code,
and Plotly's map doesn't draw Kosovo, so the app shows it as a dot. */
const MAP_CODES: Record<string, string> = {
  QCI: "CHN", QCY: "CYP", QTJ: "TJK", KSV: "XKX", QKI: "IRQ", TAP: "TWN", QUA: "UKR",
}

/* All PISA 2025 participants. Write to the json for easy country lookup */
const PARTICIPANTS = Object.entries(PISA_CODES).map(([country, pisa_code]) => ({
  country,
  iso3: MAP_CODES[pisa_code] ?? pisa_code,
}))

const ISO3_BY_NAME = new Map(PARTICIPANTS.map(p => [p.country, p.iso3]))

/* Reads one OECD table into { oecd_average, countries }. `parser` picks the table's own
columns out of a row; readTable adds the country name, iso3, caution and coverage. */
function readTable(
  workbook: XLSX.WorkBook,
  table: string,
  range: string,
  parser: (r: Record<string, unknown>) => object,
) {
  console.log(`${table}:`)
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(workbook.Sheets[table], {
    range,
    header: "A"
  })

  /* The first row is always the OECD average; the rest are countries/economies. */
  const [oecd_average_row, ...country_rows] = rows
  const oecd_average = parser(oecd_average_row)

  /* Countries ending with "*" didn't meet OECD's sampling criteria, so results should be
  treated with caution. We strip the "*" from the name and record it as `caution`. */
  const countries = country_rows
  .filter(r => !text(r.A).startsWith("OECD"))
  .map(r => {
    const country = text(r.A).replace(/\*$/, "")
    return {
      country,
      iso3: ISO3_BY_NAME.get(country) ?? null,
      caution: text(r.A).endsWith("*"),
      ...parser(r),
      // TODO: remove hard-coded coverage column when more columns are added.
      // This should probably be provided in the caller's parser.
      coverage: text(r.D) || null,
    }
  })

  const no_iso3 = countries.filter(c => c.iso3 === null).map(c => c.country)
  if (no_iso3.length > 0) {
    console.error(`  No country code for: ${no_iso3.join(", ")}. Add them to PISA_CODES.`)
    process.exit(1)
  }

  const no_data = country_rows
    .filter(r => Object.values(parser(r)).every(v => v === null))
    .map(r => text(r.A))
  const cautioned = countries.filter(c => c.caution).map(c => c.country)
  const average = Object.entries(oecd_average).map(([field, value]) => `${field} ${value}`)
  console.log(`  OECD average: ${average.join(", ")}`)
  console.log(`  ${countries.length} countries/economies`)
  console.log(`  ${no_data.length} with no data: ${no_data.join(", ")}`)
  console.log(`  ${cautioned.length} flagged for caution: ${cautioned.join(", ")}`)

  return {
    oecd_average,
    countries,
  }
}

/* OECD's index of AI usage levels. */
const AIUSESCH = readTable(chapter_4_workbook, TABLES.AIUSESCH, "A10:D102", r => ({
  aiusesch: num(r.B),      // AIUSESCH (students' AI use at school): country mean
  aiusesch_se: num(r.C),   // ... and its standard error
}))

/* ST436Q16DA: % of students who "assess the quality of information generated by AI chatbots"
in their school lessons "sometimes" or more often. */
const ASSESS_AI_OUTPUT = readTable(chapter_4_workbook, TABLES.ASSESS_AI_OUTPUT, "A10:D102", r => ({
  assess_ai_output: num(r.B),      // % of students
  assess_ai_output_se: num(r.C),   // ... and its standard error
}))

const SCIENCE_SCORES = readTable(chapter_2_workbook, TABLES.SCIENCE_SCORES, "A10:C102", r => ({
  science_score: num(r.B),
  science_score_se: num(r.C),
}))

const pisa_data = {
  PARTICIPANTS,
  AIUSESCH,
  ASSESS_AI_OUTPUT,
  SCIENCE_SCORES,
}

fs.writeFileSync(
  path.resolve(process.cwd(), OUTPUT_FILE),
  JSON.stringify(pisa_data, null, 2),
  "utf-8",
)
console.log(`Wrote ${OUTPUT_FILE}`)
