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

/* Countries ending with "*" indicates that country didn't meet OECD's sampling criteria, so results should be treated with caution. So we filter out the "*" when parsing country names and note the caution.
*/
const records = aiusesch_json.map(r => ({
  country: text(r.A).replace(/\*$/, ""),
  caution: text(r.A).endsWith("*"),
  coverage: text(r.D) || null,
  aiusesch: num(r.B),      // AIUSESCH (students' AI use at school): country mean
  aiusesch_se: num(r.C),   // ... and its standard error
}))

const no_data = records.filter(r => r.aiusesch === null).map(r => r.country)
const cautioned = records.filter(r => r.caution).map(r => r.country)
console.log(`  ${records.length} rows (OECD average + ${records.length - 1} countries/economies)`)
console.log(`  ${no_data.length} with no AIUSESCH data: ${no_data.join(", ")}`)
console.log(`  ${cautioned.length} flagged for caution: ${cautioned.join(", ")}`)

const pisa_data = {
  AIUSESCH: records
}

fs.writeFileSync(
  path.resolve(process.cwd(), OUTPUT_FILE),
  JSON.stringify(pisa_data, null, 2),
  "utf-8",
)
console.log(`Wrote ${OUTPUT_FILE}`)
