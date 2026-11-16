import Plot from "react-plotly.js";
import type { Config, Data, Layout } from "plotly.js";
import "@/App.css";
import PisaData from "@/pisa_data.json";
import { useEffect, useRef, useState } from "react";
import CountrySearch from "@/components/CountrySearch";
import Countries from "@/countries.json";
import ValueFilter from "@/components/ValueFilter";
import type { ValueRange } from "@/components/ValueFilter";

type AIUseEntry = {
  country: string;
  iso3: string;
  caution: boolean;
  coverage: string | null;
  aiusesch: number | null;
  aiusesch_se: number | null;
};
const AIUseEntries: AIUseEntry[] = PisaData.AIUSESCH.countries;

/* Colours, from the dataviz reference palette. */
const COLORS = {
  surface: "#fcfcfb", // page and ocean
  text: "#0b0b0b",
  textSecondary: "#52514e",
  noData: "#e3e3e0", // countries with no AI data, including ones that didn't take part in PISA.
  border: "#e1e0d9",
};

/* Places Plotly's world map doesn't draw: too small at its default resolution,
or (Kosovo) not on its map at all. We show these as dots instead.
Positions are the label points (LABEL_Y, LABEL_X) from Natural Earth's 1:50m
Admin 0 countries, version 5.1.1: https://www.naturalearthdata.com */
const DOT_POSITIONS: Record<string, { lat: number; lon: number }> = {
  HKG: { lat: 22.448829, lon: 114.097769 },
  MAC: { lat: 22.129735, lon: 113.556038 },
  SGP: { lat: 1.366587, lon: 103.816925 },
  MLT: { lat: 35.892886, lon: 14.433005 },
  XKX: { lat: 42.593587, lon: 20.860719 },
};

const withData = AIUseEntries.filter((e) => e.aiusesch !== null);
const withoutData = AIUseEntries.filter((e) => e.aiusesch === null);
const asShapes = withData.filter((e) => !(e.iso3 in DOT_POSITIONS));
const asDots = withData.filter((e) => e.iso3 in DOT_POSITIONS);

/* Make the scale symmetric around 0 and just wide enough for the most extreme country,
rounded up to the next 0.1 (e.g. Japan at -0.69 gives -0.7 to +0.7). */
const largestValue = Math.max(
  ...withData.map((e) => Math.abs(e.aiusesch ?? 0))
);
const SCALE_LIMIT = Math.ceil(largestValue * 10) / 10;
const ticks = [-SCALE_LIMIT, 0, SCALE_LIMIT];

const HOVER_TEMPLATE = "%{hovertext}<extra></extra>";

const signed = (v: number) =>
  (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(2);

/* The text that shows when you hover over a country. */
function hoverText(entry: AIUseEntry): string {
  const lines = [`<b>${entry.country}</b>`];
  if (entry.aiusesch === null || entry.aiusesch_se === null) {
    lines.push("Took part in PISA 2025, but has no AI data");
  } else {
    // ± 1.96 standard errors is the 95% confidence interval
    // https://medium.com/@alfie.baines/statistical-significance-in-1000-words-why-1-96-rules-research-c11d515b17e7
    lines.push(
      `AI use index: ${signed(entry.aiusesch)} ± ${(
        1.96 * entry.aiusesch_se
      ).toFixed(2)}`
    );
  }
  if (entry.caution) lines.push("Caution: PISA sampling standards not met");
  return lines.join("<br>");
}

const data: Data[] = [
  {
    type: "choropleth",
    name: "No AI data",
    showlegend: true,
    locationmode: "ISO-3",
    locations: withoutData.map((e) => e.iso3),
    z: withoutData.map(() => 0),
    colorscale: [
      [0, COLORS.noData],
      [1, COLORS.noData],
    ],
    showscale: false,
    marker: { line: { color: COLORS.surface, width: 0.5 } },
    hovertext: withoutData.map(hoverText),
    hovertemplate: HOVER_TEMPLATE,
  },
  {
    type: "choropleth",
    name: "AI use index",
    locationmode: "ISO-3",
    locations: asShapes.map((e) => e.iso3),
    z: asShapes.map((e) => e.aiusesch),
    coloraxis: "coloraxis",
    marker: { line: { color: COLORS.surface, width: 0.5 } },
    hovertext: asShapes.map(hoverText),
    hovertemplate: HOVER_TEMPLATE,
  },
  {
    type: "scattergeo",
    name: "Small places",
    mode: "markers",
    lat: asDots.map((e) => DOT_POSITIONS[e.iso3].lat),
    lon: asDots.map((e) => DOT_POSITIONS[e.iso3].lon),
    marker: {
      size: 9,
      color: asDots.map((e) => e.aiusesch ?? 0),
      coloraxis: "coloraxis",
      line: { color: COLORS.textSecondary, width: 1 },
    },
    showlegend: false,
    hovertext: asDots.map(hoverText),
    hovertemplate: HOVER_TEMPLATE,
  },
];

const layout: Partial<Layout> = {
  autosize: true,
  font: { family: "system-ui, sans-serif", color: COLORS.text },
  paper_bgcolor: COLORS.surface,
  margin: { t: 0, r: 0, b: 0, l: 0 },
  showlegend: true,
  legend: {
    x: 0,
    xanchor: "left",
    y: 0,
    yanchor: "bottom", // bottom-left corner of the map, over the ocean
    bgcolor: "rgba(0,0,0,0)",
    font: { size: 12, color: COLORS.textSecondary },
  },
  geo: {
    projection: { type: "natural earth" },
    showframe: false,
    showcoastlines: true, // outlines the light grey land against the near-white ocean
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
    colorscale: "RdBu", // Plotly's built-in diverging scale: blue (less AI use), grey at 0, red (more)
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
      title: {
        text: "Less AI use ← → More AI use",
        side: "top",
        font: { size: 12 },
      },
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
};

const config: Partial<Config> = {
  displaylogo: false,
  responsive: true,
};

//Find and return the selected country's coordinates
function getCountryCoordinates(iso3: string) {
  const country = Countries.find((item) => item.cca3 === iso3);
  //Return null if no country matches or fewer than two coordinates exist.
  if (!country || country.latlng.length < 2) return null;

  //Return latitude and longitude from the coordinate array.
  return {
    lat: country.latlng[0],
    lon: country.latlng[1],
  };
}

/* The title and source are plain HTML rather than Plotly text,
so they wrap properly on narrow screens. */
function App() {
  const [selectedCountry, setSelectedCountry] = useState<{
    country: string;
    iso3: string;
  } | null>(null);

  const selectedEntry = AIUseEntries.find(
    (entry) => entry.iso3 === selectedCountry?.iso3
  );

  const [view, setView] = useState({
    lat: 0,
    lon: 0,
    scale: 1,
  });

  const viewRef = useRef(view);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  //to smoothly zoom into the country that users selected
  function moveToCountry(target: typeof view) {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    const start = { ...viewRef.current };

    // Take the shortest route across the international date line.
    const lonDifference =
      ((((target.lon - start.lon + 180) % 360) + 360) % 360) - 180;

    const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 0
      : 1000;

    const startTime = performance.now();

    function animate(now: number) {
      const progress =
        duration === 0 ? 1 : Math.min((now - startTime) / duration, 1);

      // Ease in and out.
      const eased = progress * progress * (3 - 2 * progress);

      const next = {
        lat: start.lat + (target.lat - start.lat) * eased,
        lon: start.lon + lonDifference * eased,
        scale: start.scale + (target.scale - start.scale) * eased,
      };

      viewRef.current = next;
      setView(next);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }

  //Update the selected country and smoothly move and zoom the map to it.
  function handleSelectCountry(country: { country: string; iso3: string }) {
    //store the country name 
    setSelectedCountry(country);
    
    //find the coordinate of the country that users selected
    const coordinates = getCountryCoordinates(country.iso3);

    //if returned coordinates are found, the map smoolthy zooms in the country.
    if (coordinates) {
      moveToCountry({
        ...coordinates,
        scale: 4,
      });
    }
  }

  //for the filtering feature
  const [range, setRange] = useState<ValueRange>({
    min: "",
    max: "",
  });

  //if min is greater than max, it is invalid
  const invalidRange =
    range.min !== "" &&
    range.max !== "" &&
    Number(range.min) > Number(range.max);

  //if still range is not invalid and either min or max is not empty, still active
  const filterActive = !invalidRange && (range.min !== "" || range.max !== "");

  //checks the filteirng
  function matchesRange(entry: AIUseEntry) {
    if (!filterActive) return true;

    const value = entry.aiusesch;
    if (value === null || !Number.isFinite(value)) return false;

    return (
      (range.min === "" || value >= Number(range.min)) &&
      (range.max === "" || value <= Number(range.max))
    );
  }

  //checking whether the country matches filtering
  const matchingShapes = filterActive ? asShapes.filter(matchesRange) : [];

  //for smaller countries
  const matchingDots = filterActive ? asDots.filter(matchesRange) : [];

  //to find the number of countries that match the filter
  const matchingCount = withData.filter(matchesRange).length;

  const filteredData: Data[] = [
    ...data,

    // soft golden color around the edge of matched country
    ...[
      //to make it looks light
      { width: 10, color: "rgba(255, 210, 110, 0.10)" },
      { width: 6, color: "rgba(255, 220, 140, 0.22)" },
      { width: 3, color: "rgba(255, 235, 180, 0.65)" },
      { width: 1.5, color: "#FFF4D6" },
    ].map(
      ({ width, color }): Data => ({
        type: "choropleth",
        locationmode: "ISO-3",
        locations: matchingShapes.map((entry) => entry.iso3),
        z: matchingShapes.map(() => 0),
        zmin: 0,
        zmax: 1,
        colorscale: [
          [0, "rgba(0,0,0,0)"],
          [1, "rgba(0,0,0,0)"],
        ],
        showscale: false,
        showlegend: false,
        marker: {
          line: { color, width },
        },
        hoverinfo: "skip",
      })
    ),

    // Golden rings around matched smaller countries.
    {
      type: "scattergeo",
      mode: "markers",
      lat: matchingDots.map((entry) => DOT_POSITIONS[entry.iso3].lat),
      lon: matchingDots.map((entry) => DOT_POSITIONS[entry.iso3].lon),
      marker: {
        size: 14,
        symbol: "circle-open",
        color: "#F2C66D",
        line: { width: 2.5 },
      },
      showlegend: false,
      hoverinfo: "skip",
    },
  ];

  return (
    <div className="page">
      <header>
        <h1>How much do 15-year-olds use AI for school work?</h1>
        <p>
          Index of students' AI use at school (AIUSESCH), PISA 2025. 0 is the
          OECD average. Hover over a country for details.
        </p>
      </header>
      <div className="map-controls">
        <CountrySearch
          participants={PisaData.PARTICIPANTS}
          onSelectCountry={handleSelectCountry}
        />
        <div className="filter-group">
        <ValueFilter range={range} onChange={setRange} invalid={invalidRange} />
        <p className="filter-summary" role="status">
        {invalidRange
          ? "Filter paused: fix the range to apply it."
          : filterActive
          ? `${matchingCount} of ${withData.length} countries with AI data match. Gray also includes countries with missing data.`
          : "Showing all countries."}
        </p>
        </div>
      </div>

      {selectedCountry && (
        <aside aria-label="Selected country details">
          <h2>{selectedCountry.country}</h2>

          <p>
            AI use index:{" "}
            {selectedEntry?.aiusesch != null
              ? signed(selectedEntry.aiusesch)
              : "No data available"}
          </p>

          {selectedEntry?.caution && (
            <p>Caution: PISA sampling standards not met.</p>
          )}
        </aside>
      )}
      <main className="map-wrapper">
        <Plot
          data={filteredData}
          layout={{
            ...layout,
            geo: {
              ...layout.geo,
              center: {
                lat: view.lat,
                lon: view.lon,
              },
              projection: {
                type: "natural earth",
                scale: view.scale,
                rotation: { lon: view.lon },
              },
            },
          }}
          config={config}
          useResizeHandler
          style={{ width: "100%", height: "100%" }}
        />
      </main>
      <footer>
        <span>Source: OECD, PISA 2025 Results (Volume I)</span>
      </footer>
    </div>
  );
}

export default App;
