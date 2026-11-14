# Source spreadsheets

`npm run build:data` reads OECD spreadsheets from this folder and writes the JSON the site uses. The spreadsheets aren't committed (see `.gitignore`), so download each one listed below into this folder before running the build (only one right now, but will add more as we need). Keep OECD's file names.

| File | Download | What it is | Tables used |
| --- | --- | --- | --- |
| `xmra2f.xlsx` | <https://stat.link/xmra2f> | PISA 2025 Results (Volume I), Annex B1, Chapter 4 tables | I.B1.4.53 (students' AI use) |

After running the build, commit the generated `src/pisa_data.json`. The site imports that file directly and never runs the build itself, so it only gets new data when the JSON is committed. Check its diff before committing: changed numbers you didn't expect usually mean a different version of a spreadsheet.

When the build script starts reading a new spreadsheet, add a row here and add its file name to `SPREADSHEETS` in `scripts/build-data.ts`.
