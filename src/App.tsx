import Plot from "react-plotly.js"
import type { Config, Data, Layout } from "plotly.js"
import '@/App.css'
import PisaData from "@/pisa_data.json"

type AIUseEntry = {
  country: string,
  iso3: string,
  caution: boolean,
  coverage: string | null,
  aiusesch: number | null,
  aiusesch_se: number | null,
}
const AIUseEntries: AIUseEntry[] = PisaData.AIUSESCH.countries;

/* Colours, from the dataviz reference palette. */
const COLORS = {
  surface: "#fcfcfb",       // page and ocean
  text: "#0b0b0b",
  textSecondary: "#52514e",
  noData: "#e3e3e0",        // countries with no AI data, including ones that didn't take part in PISA.
  border: "#e1e0d9",
}

/* Places Plotly's world map doesn't draw: too small at its default resolution,
or (Kosovo) not on its map at all. We show these as dots instead.
Positions are the label points (LABEL_Y, LABEL_X) from Natural Earth's 1:50m
Admin 0 countries, version 5.1.1: https://www.naturalearthdata.com */
const DOT_POSITIONS: Record<string, { lat: number, lon: number }> = {
  HKG: { lat: 22.448829, lon: 114.097769 },
  MAC: { lat: 22.129735, lon: 113.556038 },
  SGP: { lat: 1.366587, lon: 103.816925 },
  MLT: { lat: 35.892886, lon: 14.433005 },
  XKX: { lat: 42.593587, lon: 20.860719 },
}

const withData = AIUseEntries.filter(e => e.aiusesch !== null)
const withoutData = AIUseEntries.filter(e => e.aiusesch === null)
const asShapes = withData.filter(e => !(e.iso3 in DOT_POSITIONS))
const asDots = withData.filter(e => e.iso3 in DOT_POSITIONS)

/* Make the scale symmetric around 0 and just wide enough for the most extreme country,
rounded up to the next 0.1 (e.g. Japan at -0.69 gives -0.7 to +0.7). */
const largestValue = Math.max(...withData.map(e => Math.abs(e.aiusesch ?? 0)))
const SCALE_LIMIT = Math.ceil(largestValue * 10) / 10
const ticks = [-SCALE_LIMIT, 0, SCALE_LIMIT]

const HOVER_TEMPLATE = "%{hovertext}<extra></extra>"

const signed = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(2)

/* The text that shows when you hover over a country. */
function hoverText(entry: AIUseEntry): string {
  const lines = [`<b>${entry.country}</b>`]
  if (entry.aiusesch === null || entry.aiusesch_se === null) {
    lines.push("Took part in PISA 2025, but has no AI data")
  } else {
    // ± 1.96 standard errors is the 95% confidence interval
    // https://medium.com/@alfie.baines/statistical-significance-in-1000-words-why-1-96-rules-research-c11d515b17e7
    lines.push(`AI use index: ${signed(entry.aiusesch)} ± ${(1.96 * entry.aiusesch_se).toFixed(2)}`)
  }
  if (entry.caution) lines.push("Caution: PISA sampling standards not met")
  return lines.join("<br>")
}

const data: Data[] = [
  {
    type: "choropleth",
    name: "No AI data",
    showlegend: true,
    locationmode: "ISO-3",
    locations: withoutData.map(e => e.iso3),
    z: withoutData.map(() => 0),
    colorscale: [[0, COLORS.noData], [1, COLORS.noData]],
    showscale: false,
    marker: { line: { color: COLORS.surface, width: 0.5 } },
    hovertext: withoutData.map(hoverText),
    hovertemplate: HOVER_TEMPLATE,
  },
  {
    type: "choropleth",
    name: "AI use index",
    locationmode: "ISO-3",
    locations: asShapes.map(e => e.iso3),
    z: asShapes.map(e => e.aiusesch),
    coloraxis: "coloraxis",
    marker: { line: { color: COLORS.surface, width: 0.5 } },
    hovertext: asShapes.map(hoverText),
    hovertemplate: HOVER_TEMPLATE,
  },
  {
    type: "scattergeo",
    name: "Small places",
    mode: "markers",
    lat: asDots.map(e => DOT_POSITIONS[e.iso3].lat),
    lon: asDots.map(e => DOT_POSITIONS[e.iso3].lon),
    marker: {
      size: 9,
      color: asDots.map(e => e.aiusesch ?? 0),
      coloraxis: "coloraxis",
      line: { color: COLORS.textSecondary, width: 1 },
    },
    showlegend: false,
    hovertext: asDots.map(hoverText),
    hovertemplate: HOVER_TEMPLATE,
  },
]

const layout: Partial<Layout> = {
  autosize: true,
  font: { family: 'system-ui, sans-serif', color: COLORS.text },
  paper_bgcolor: COLORS.surface,
  margin: { t: 0, r: 0, b: 0, l: 0 },
  showlegend: true,
  legend: {
    x: 0,
    xanchor: "left",
    y: 0,
    yanchor: "bottom",          // bottom-left corner of the map, over the ocean
    bgcolor: "rgba(0,0,0,0)",
    font: { size: 12, color: COLORS.textSecondary },
  },
  geo: {
    projection: { type: "natural earth" },
    showframe: false,
    showcoastlines: true,   // outlines the light grey land against the near-white ocean
    coastlinecolor: "#c3c2b7",
    coastlinewidth: 0.5,
    showland: true,
    landcolor: COLORS.noData,
    showcountries: true,
    countrycolor: COLORS.surface,
    countrywidth: 0.5,
    showsubunits: false,
    bgcolor: COLORS.surface,
  },
  coloraxis: {
    colorscale: "RdBu",   // Plotly's built-in diverging scale: blue (less AI use), grey at 0, red (more)
    cmin: -SCALE_LIMIT,
    cmax: SCALE_LIMIT,
    colorbar: {
      orientation: "h",
      x: 0.5,
      xanchor: "center",
      y: 0,
      yanchor: "top",
      len: 0.5,
      thickness: 10,
      outlinewidth: 0,
      title: { text: "Less AI use ← → More AI use", side: "top", font: { size: 12 } },
      tickvals: ticks,
      ticktext: ticks.map(signed),
      tickfont: { size: 11, color: COLORS.textSecondary },
    },
  },
  hoverlabel: {
    bgcolor: COLORS.surface,
    bordercolor: COLORS.border,
    font: { color: COLORS.text, size: 13 },
    align: "left",
  },
}

const config: Partial<Config> = {
  displaylogo: false,
  responsive: true,
}

/* The title and source are plain HTML rather than Plotly text,
so they wrap properly on narrow screens. */
function App() {

  return (
    <div className="page">
      <header>
        <h1>How much do 15-year-olds use AI for school work?</h1>
        <p>
          Index of students' AI use at school (AIUSESCH), PISA 2025. 0 is the OECD average.
          Hover over a country for details.
        </p>
      </header>
      <main className="map-wrapper">
        <Plot
          data={data}
          layout={layout}
          config={config}
          useResizeHandler
          style={{ width: "100%", height: "100%" }}
        />
      </main>
      <footer>
        <span>Source: OECD, PISA 2025 Results (Volume I)</span>
      </footer>
    </div>
  )
}

export default App
