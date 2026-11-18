# Source spreadsheets

`npm run build:data` reads OECD spreadsheets from this folder and writes the JSON the site uses. The spreadsheets aren't committed (see `.gitignore`), so download each one listed below into this folder before running the build (only one right now, but will add more as we need). Keep OECD's file names.

| File | Download | What it is
| --- | --- | --- |
| `xmra2f.xlsx` | <https://stat.link/xmra2f> | PISA 2025 Results (Volume I), Annex B1, Chapter 4 tables |
| `mrq53f.xlsx`| <https://stat.link/mrq53f> | PISA 2025 Results (Volume I, Annex B1, Chapter 2 tables |

After running the build, commit the generated `src/pisa_data.json`. If you want to add a new spreadsheet to use, add a row for it here and add its file name to `SPREADSHEETS` in `scripts/build-data.ts`.
