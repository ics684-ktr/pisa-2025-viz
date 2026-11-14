import Plot from "react-plotly.js"
import '@/App.css'

function App() {

  return (
    <div className="map-wrapper">
      <Plot
        data={[
          {
            type: "choropleth",
          },
        ]}
        layout={{
          autosize: true,
          title: { text: "A Fancy Plot" },
          geo: { projection: { type: "natural earth" } },
        }}
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  )
}

export default App
