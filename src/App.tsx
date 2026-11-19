import Plot from "react-plotly.js";
import type { Config, Data, Layout } from "plotly.js";
import "@/App.css";
import PisaData from "@/pisa_data.json";
import { useEffect, useRef, useState } from "react";
import CountrySearch from "@/components/CountrySearch";
import Countries from "@/countries_coordinates.json";

import ValueFilter from "@/components/ValueFilter";
import type { ValueRange } from "@/components/ValueFilter";
import { linearRegression, linearRegressionLine } from "simple-statistics";

type CountryWithData = typeof asShapes[0];
type CountryWithScienceScore = typeof ScienceScoreEntries[0];

type AIUseEntry = {
  country: string;
  iso3: string;
  caution: boolean;
  coverage: string | null;
  aiusesch: number | null;
  aiusesch_se: number | null;
};

type ScienceScoreEntry = {
  country: string;
  iso3: string;
  caution: boolean;
  science_score: number | null; 
  science_score_se: number | null;
  coverage: string | null;
};

/* pisa_data.json keys participants and each variable's values by iso3.
These rebuild the lists of entries used below. */
type Estimate = { value: number | null; se: number | null; coverage?: string };
const Participants: Record<string, { name: string; caution: boolean }> = PisaData.PARTICIPANTS;
const AIUse: Record<string, Estimate> = PisaData.VARIABLES.AIUSESCH.countries;
const ScienceScores: Record<string, Estimate> = PisaData.VARIABLES.SCIENCE_SCORES.countries;

const ParticipantList = Object.entries(Participants).map(([iso3, { name }]) => ({ country: name, iso3 }));

const AIUseEntries: AIUseEntry[] = Object.entries(AIUse).map(([iso3, { value, se, coverage }]) => ({
  country: Participants[iso3].name,
  iso3,
  caution: Participants[iso3].caution,
  coverage: coverage ?? null,
  aiusesch: value,
  aiusesch_se: se,
}));
const ScienceScoreEntries: ScienceScoreEntry[] = Object.entries(ScienceScores).map(([iso3, { value, se, coverage }]) => ({
  country: Participants[iso3].name,
  iso3,
  caution: Participants[iso3].caution,
  coverage: coverage ?? null,
  science_score: value,
  science_score_se: se,
}));
const joinedData = (ScienceScoreEntries
  .map(science => {
    const ai = AIUseEntries.find(a => a.iso3 === science.iso3);
    return ai ? { ...science, ...ai } : null;
  })
  .filter(d => d !== null && d?.science_score !== null && d?.aiusesch !== null)) as Array<ScienceScoreEntry & AIUseEntry>;

  const reg = linearRegression(joinedData.map(d => [d.aiusesch!, d.science_score!]));
  const line = linearRegressionLine(reg);
  const minX = Math.min(...joinedData.map(d => d.aiusesch!));
  const maxX = Math.max(...joinedData.map(d => d.aiusesch!));

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

//Lat lon for all countries for the zoom in effect when country is clicked
const COUNTRY_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  AFG: { lat: 33.93911, lon: 67.709953 },
  ALB: { lat: 41.153332, lon: 20.168331 },
  DZA: { lat: 28.033886, lon: 1.659626 },
  ARG: { lat: -38.416097, lon: -63.616672 },
  AUS: { lat: -25.274398, lon: 133.775136 },
  AUT: { lat: 47.516231, lon: 14.550072 },
  BEL: { lat: 50.503887, lon: 4.469936 },
  BRA: { lat: -14.235004, lon: -51.92528 },
  CAN: { lat: 56.130366, lon: -106.346771 },
  CHL: { lat: -35.675147, lon: -71.542969 },
  CHN: { lat: 35.86166, lon: 104.195397 },
  COL: { lat: 4.570868, lon: -74.297333 },
  HRV: { lat: 45.1, lon: 15.2 },
  CZE: { lat: 49.817492, lon: 15.472962 },
  DNK: { lat: 56.26392, lon: 9.501785 },
  EGY: { lat: 26.820553, lon: 30.802498 },
  EST: { lat: 58.595272, lon: 25.013607 },
  FIN: { lat: 61.92411, lon: 25.748151 },
  FRA: { lat: 46.227638, lon: 2.213749 },
  DEU: { lat: 51.165691, lon: 10.451526 },
  GRC: { lat: 39.074208, lon: 21.824312 },
  HUN: { lat: 47.162494, lon: 19.503304 },
  IND: { lat: 20.593684, lon: 78.96288 },
  IDN: { lat: -0.789275, lon: 113.921327 },
  IRL: { lat: 53.41291, lon: -8.24389 },
  ISR: { lat: 31.046051, lon: 34.851612 },
  ITA: { lat: 41.87194, lon: 12.56738 },
  JPN: { lat: 36.204824, lon: 138.252924 },
  JOR: { lat: 30.585164, lon: 36.238414 },
  KAZ: { lat: 48.019573, lon: 66.923684 },
  KOR: { lat: 35.907757, lon: 127.766922 },
  LVA: { lat: 56.879635, lon: 24.603189 },
  LTU: { lat: 55.169438, lon: 23.881275 },
  LUX: { lat: 49.815273, lon: 6.129583 },
  MYS: { lat: 4.210484, lon: 101.975766 },
  MEX: { lat: 23.634501, lon: -102.552784 },
  MAR: { lat: 31.791702, lon: -7.09262 },
  NLD: { lat: 52.132633, lon: 5.291266 },
  NZL: { lat: -40.900557, lon: 174.885971 },
  NOR: { lat: 60.472024, lon: 8.468946 },
  POL: { lat: 51.919438, lon: 19.145136 },
  PRT: { lat: 39.399872, lon: -8.224454 },
  ROU: { lat: 45.943161, lon: 24.96676 },
  SAU: { lat: 23.885942, lon: 45.079162 },
  SRB: { lat: 44.016521, lon: 21.005859 },
  SVK: { lat: 48.669026, lon: 19.699024 },
  SVN: { lat: 46.151241, lon: 14.995463 },
  ESP: { lat: 40.463667, lon: -3.74922 },
  SWE: { lat: 60.128161, lon: 18.643501 },
  CHE: { lat: 46.818188, lon: 8.227512 },
  THA: { lat: 15.870032, lon: 100.992541 },
  TUR: { lat: 38.963745, lon: 35.243322 },
  UKR: { lat: 48.379433, lon: 31.16558 },
  GBR: { lat: 55.378051, lon: -3.435973 },
  USA: { lat: 37.09024, lon: -95.712891 },
  URY: { lat: -32.522779, lon: -55.765835 },
  UZB: { lat: 41.377491, lon: 64.585262 },
  VNM: { lat: 14.058324, lon: 108.277199 },
  HKG: { lat: 22.448829, lon: 114.097769 },
  MAC: { lat: 22.129735, lon: 113.556038 },
  SGP: { lat: 1.366587, lon: 103.816925 },
  MLT: { lat: 35.892886, lon: 14.433005 },
  XKX: { lat: 42.593587, lon: 20.860719 },
  KEN: { lat: -0.023559, lon: 37.906193 },
  ISL: { lat: 64.963051, lon: -19.020835 },
  CRI: { lat: 9.748917, lon: -83.753428 },
  BLR: { lat: 53.709807, lon: 27.953389 },
  BOL: { lat: -16.290154, lon: -63.588653 },
  BIH: { lat: 43.915886, lon: 17.679076 },
  BGR: { lat: 42.733883, lon: 25.48583 },
  DOM: { lat: 18.735693, lon: -70.162651 },
  GTM: { lat: 15.783471, lon: -90.230759 },
  MDA: { lat: 47.411631, lon: 28.369885 },
  MNE: { lat: 42.708678, lon: 19.37439 },
  MKD: { lat: 41.608635, lon: 21.745275 },
  PAN: { lat: 8.537981, lon: -80.782127 },
  PER: { lat: -9.189967, lon: -75.015152 },
  PHL: { lat: 12.879721, lon: 121.774017 },
  QAT: { lat: 25.354826, lon: 51.183884 },
  ARE: { lat: 23.424076, lon: 53.847818 },
  TWN: { lat: 23.69781, lon: 120.960515 },
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
    customdata: asDots.map((e) => e.iso3),
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
  //for smaller places
  const dotPosition = DOT_POSITIONS[iso3];
  if(dotPosition) return dotPosition;

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
  const [selectedCountry, setSelectedCountry] = useState<
  CountryWithData | CountryWithScienceScore | {
    country: string;
    iso3: string;
  } | null>(null);

 /*  const selectedEntry = AIUseEntries.find(
    (entry) => entry.iso3 === selectedCountry?.iso3
  ); */

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
    const aiEntry = AIUseEntries.find((entry) => entry.iso3 === country.iso3);
    const scienceEntry = ScienceScoreEntries.find(
      (entry) => entry.iso3 === country.iso3
    );
    
    setSelectedCountry({ ...scienceEntry, ...aiEntry, ...country });
    
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
          OECD average. Hover over or click a country for details.
        </p>
      </header>
      <div className="map-controls">
        <CountrySearch
          participants={ParticipantList}
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

   {/*    {selectedCountry && (
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
      )} */}
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
          //event handler for clicking on the map
          onClick={(event) => {
            if (!event?.points.length) return;
            const point = event.points[0];

            const iso3 = point.location ?? (point as typeof point & { customdata: string }).customdata;
            const country = [...asShapes, ...asDots].find(c => c.iso3 === iso3) ??
              withoutData.find(c => c.iso3 === iso3);
           if (country) {
              const scienceEntry = ScienceScoreEntries.find(s => s.iso3 === iso3);
              setSelectedCountry({ ...country, ...scienceEntry });
            }
            const coords = COUNTRY_CENTROIDS[iso3];
            if (coords) {
              setView({ lat: coords.lat, lon: coords.lon, scale: 4});
            }
          }}
        />
        <Plot
          data={[{
            type: "scatter",
            mode: "markers",
            showlegend: false,  
            x: joinedData.map(d => d.aiusesch),
            y: joinedData.map(d => d.science_score),
            error_y: { 
              type: "data",
              array: joinedData.map(d => d.science_score_se),
              visible: true,
            },
            text: joinedData.map(d => d.country),
            hovertemplate: "<b>%{text}</b><br>AI Use: %{x:.2f}<br>Science Score: %{y:.0f}<extra></extra>",
            marker: { size: 8 },
            },
            {
            type: "scatter",
            mode: "lines+text",
            showlegend: false,
            x: [minX, maxX],
            y: [line(minX), line(maxX)],
            line: { color: "red", dash: "dash" },
          }]}
          
          layout={{
            width: 600,
            height: 600,
            title: { text: "AI Use vs Science Score" },
            xaxis: { title: { text: "AI Use Index" } },
            yaxis: { title: { text: "Science Score" } },
            annotations: [{
            x: maxX,
            y: line(maxX),
            xref: "x",
            yref: "y",
            text: `y = ${reg.m.toFixed(2)}x + ${reg.b.toFixed(2)}`,
            showarrow: false,
            yshift: 0, 
            xshift: 15,
          }]
          }}
        />
        {/*info panel for the selected country*/}
        {selectedCountry && (
          <div className="country-panel">
            <button onClick={() => {setSelectedCountry(null); setView({ lat: 0, lon: 0, scale: 1 }); }}>✕</button>
            <h2>{selectedCountry.country ?? selectedCountry.iso3}</h2>
            <p>AI Use Index: {(selectedCountry as CountryWithData).aiusesch ?? "No data"}</p>
            <p>Science Score: {(selectedCountry as CountryWithScienceScore).science_score?.toFixed(2) ?? "No data"}</p>
          </div>
      )}
      </main>
      <footer>
        <span>Source: OECD, PISA 2025 Results (Volume I)</span>
      </footer>
    </div>
  );
}

export default App;