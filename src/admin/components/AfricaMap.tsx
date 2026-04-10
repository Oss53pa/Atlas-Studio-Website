import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";

interface CountryData {
  country: string;
  code: string;
  value: number;
  label?: string;
}

interface AfricaMapProps {
  data: CountryData[];
  title?: string;
  valueLabel?: string;
  colorScale?: [string, string]; // [min, max] colors
}

// OHADA member country ISO codes
const OHADA_COUNTRIES = new Set([
  "BEN", "BFA", "CMR", "CAF", "TCD", "COM", "COG", "CIV",
  "GAB", "GNB", "GNQ", "MLI", "NER", "SEN", "TGO", "COD", "GIN"
]);

export function AfricaMap({ data, title = "Clients par pays", valueLabel = "clients", colorScale = ["#2A2A3A", "#EF9F27"] }: AfricaMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [geoData, setGeoData] = useState<any>(null);

  // Load Africa TopoJSON
  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(res => res.json())
      .then(world => {
        const countries = feature(world, world.objects.countries);
        setGeoData(countries);
      })
      .catch(() => {});
  }, []);

  // Render map
  useEffect(() => {
    if (!svgRef.current || !geoData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Fixed viewBox for consistent rendering regardless of container size
    const width = 800;
    const height = 600;

    // Data lookup
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const color = d3.scaleLinear<string>().domain([0, maxValue]).range(colorScale);

    // Tight filter for Africa only (exclude Middle East, Europe, Asia)
    const africanFeatures = geoData.features.filter((f: any) => {
      const centroid = d3.geoCentroid(f);
      return centroid[0] > -20 && centroid[0] < 52 && centroid[1] > -36 && centroid[1] < 38;
    });

    const africaCollection = { type: "FeatureCollection", features: africanFeatures } as any;

    // Auto-fit projection to the SVG viewBox
    const projection = d3.geoMercator()
      .fitSize([width, height], africaCollection);

    const path = d3.geoPath().projection(projection);

    // Draw countries
    svg.append("g")
      .selectAll("path")
      .data(africanFeatures)
      .join("path")
      .attr("d", path as any)
      .attr("fill", (d: any) => {
        // Try to match by ISO numeric code to ISO alpha-3
        const isoNum = d.id;
        const entry = data.find(e => e.code === isoNum || e.country === d.properties?.name);
        if (entry) return color(entry.value);
        return colorScale[0];
      })
      .attr("stroke", "#0A0A0A")
      .attr("stroke-width", 0.5)
      .attr("cursor", "pointer")
      .on("mouseover", function (event: any, d: any) {
        d3.select(this).attr("stroke", "#EF9F27").attr("stroke-width", 1.5);
        const entry = data.find(e => e.country === d.properties?.name);
        const name = d.properties?.name || "?";
        const val = entry ? `${entry.value} ${valueLabel}` : "0 " + valueLabel;
        const isOhada = OHADA_COUNTRIES.has(d.id);
        setTooltip({
          x: event.offsetX,
          y: event.offsetY,
          content: `${name}${isOhada ? " (OHADA)" : ""} — ${val}`,
        });
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "#0A0A0A").attr("stroke-width", 0.5);
        setTooltip(null);
      });

  }, [geoData, data, colorScale, valueLabel]);

  return (
    <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-6 relative">
      <h2 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-4">{title}</h2>

      <div className="relative w-full" style={{ aspectRatio: "4 / 3", maxHeight: 520 }}>
        <svg
          ref={svgRef}
          viewBox="0 0 800 600"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
        />

        {/* Tooltip */}
        {tooltip && (
          <div className="absolute pointer-events-none bg-onyx text-white text-[12px] font-medium px-3 py-2 rounded-lg shadow-lg border border-white/10 z-10 whitespace-nowrap"
            style={{
              left: `min(${tooltip.x + 10}px, calc(100% - 180px))`,
              top: Math.max(tooltip.y - 30, 0),
            }}>
            {tooltip.content}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full" style={{ background: `linear-gradient(to right, ${colorScale[0]}, ${colorScale[1]})` }} />
          <span className="text-[11px] text-neutral-muted dark:text-admin-muted">0 — {Math.max(...data.map(d => d.value), 0)} {valueLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm border border-admin-accent/50" style={{ backgroundColor: colorScale[1] }} />
          <span className="text-[11px] text-neutral-muted dark:text-admin-muted">Zone OHADA</span>
        </div>
      </div>
    </div>
  );
}
