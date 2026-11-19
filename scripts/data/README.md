# Source spreadsheets

`npm run build:data` reads OECD spreadsheets from this folder and writes the JSON the site uses. The spreadsheets aren't committed (see `.gitignore`), so download each one listed below into this folder before running the build (only one right now, but will add more as we need). Keep OECD's file names.

| File | Download | What it is
| --- | --- | --- |
| `xmra2f.xlsx` | <https://stat.link/xmra2f> | PISA 2025 Results (Volume I), Annex B1, Chapter 4 tables |
| `mrq53f.xlsx`| <https://stat.link/mrq53f> | PISA 2025 Results (Volume I, Annex B1, Chapter 2 tables |

After running the build, commit the generated `src/pisa_data.json`. To add a new spreadsheet and parse its variables:
1. Add a row for it in the table above.
2. Define a spreadsheet for it and how to parse its variables in `scripts/build-data.ts`.
3. Add it to `SPREADSHEETS`.

For example, to import mean science scores by country which is located in file `mrq53f.xlsx`:
```
const CHAPTER_2: Spreadsheet = {
  file: "mrq53f.xlsx",
  sheets: [
    {
      sheet_name: "Table I.B1.2a.1",
      parse: rows => {
        const average_row = findRow(rows, "OECD average")
        const country_rows = findCountryRows(rows)

        /* A country's average science score */
        const science = (row: Row) => ({
          value: num(row.B),        // country mean
          se: num(row.C),           // its standard error
        })

        return {
          SCIENCE_SCORES: {
            label: "Mean score in science",
            oecd_average: science(average_row),
            countries: mapRows(country_rows, science),
          },
        }
      },
    },
  ],
}
```
