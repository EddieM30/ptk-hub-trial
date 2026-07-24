// Small hand-rolled SVG bar chart — no charting library, consistent with
// the rest of the site's no-build-step approach. Admin-only, so it's kept
// deliberately simple: light-mode only (the site has no dark theme at all
// yet), vertical bars, direct labels, a shared hover tooltip.

const NS = "http://www.w3.org/2000/svg";

function el(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, v);
  return node;
}

function roundedTopPath(x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h));
  if (h <= 0) return "";
  return `M${x},${y + h} L${x},${y + radius} Q${x},${y} ${x + radius},${y} L${x + w - radius},${y} Q${x + w},${y} ${x + w},${y + radius} L${x + w},${y + h} Z`;
}

let sharedTooltip = null;
function getTooltip() {
  if (sharedTooltip) return sharedTooltip;
  sharedTooltip = document.createElement("div");
  sharedTooltip.className = "chart-tooltip";
  sharedTooltip.hidden = true;
  document.body.appendChild(sharedTooltip);
  return sharedTooltip;
}

function showTooltip(evt, html) {
  const tip = getTooltip();
  tip.innerHTML = html;
  tip.hidden = false;
  tip.style.left = `${evt.clientX + 12}px`;
  tip.style.top = `${evt.clientY + 12}px`;
}

function hideTooltip() {
  if (sharedTooltip) sharedTooltip.hidden = true;
}

/**
 * @param {HTMLElement} container
 * @param {{label:string, value:number, color?:string}[]} data
 * @param {{formatValue?: (n:number)=>string, color?: string, emptyMessage?: string}} opts
 */
export function renderBarChart(container, data, opts = {}) {
  container.innerHTML = "";
  if (!data || data.length === 0) {
    container.innerHTML = `<p class="tag">${opts.emptyMessage || "No data for this filter."}</p>`;
    return;
  }

  const formatValue = opts.formatValue || ((n) => String(n));
  const defaultColor = opts.color || "#9C4A33"; // --color-link, doubles as the chart accent

  const width = 640;
  const height = 280;
  const padLeft = 40;
  const padRight = 16;
  const padTop = 28;
  const padBottom = 56;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const slot = plotW / n;
  const barW = Math.min(48, slot * 0.6);

  const svg = el("svg", {
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": opts.ariaLabel || "Bar chart",
    class: "mini-chart",
  });

  // Gridlines (recessive) + y-axis baseline
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const y = padTop + (plotH / gridSteps) * i;
    svg.appendChild(
      el("line", {
        x1: padLeft,
        x2: width - padRight,
        y1: y,
        y2: y,
        stroke: "#e1e0d9",
        "stroke-width": 1,
      })
    );
    const value = Math.round(maxValue - (maxValue / gridSteps) * i);
    const labelEl = el("text", {
      x: padLeft - 8,
      y: y + 4,
      "text-anchor": "end",
      class: "mini-chart__axis-label",
    });
    labelEl.textContent = formatValue(value);
    svg.appendChild(labelEl);
  }

  data.forEach((d, i) => {
    const barH = (d.value / maxValue) * plotH;
    const x = padLeft + slot * i + (slot - barW) / 2;
    const y = padTop + plotH - barH;
    const color = d.color || defaultColor;

    const path = el("path", {
      d: roundedTopPath(x, y, barW, barH, 4),
      fill: color,
    });
    path.addEventListener("mousemove", (evt) =>
      showTooltip(evt, `<strong>${d.label}</strong><br>${formatValue(d.value)}`)
    );
    path.addEventListener("mouseleave", hideTooltip);
    svg.appendChild(path);

    // Direct value label above each bar — the category count in every
    // chart on this dashboard stays small enough that labeling all of
    // them (rather than a selective subset) stays readable.
    const valueLabel = el("text", {
      x: x + barW / 2,
      y: Math.max(padTop - 6, y - 6),
      "text-anchor": "middle",
      class: "mini-chart__value-label",
    });
    valueLabel.textContent = formatValue(d.value);
    svg.appendChild(valueLabel);

    const catLabel = el("text", {
      x: x + barW / 2,
      y: padTop + plotH + 16,
      "text-anchor": "end",
      class: "mini-chart__axis-label",
      transform: `rotate(-35 ${x + barW / 2} ${padTop + plotH + 16})`,
    });
    catLabel.textContent = d.label.length > 18 ? `${d.label.slice(0, 17)}…` : d.label;
    svg.appendChild(catLabel);
  });

  svg.appendChild(
    el("line", {
      x1: padLeft,
      x2: width - padRight,
      y1: padTop + plotH,
      y2: padTop + plotH,
      stroke: "#c3c2b7",
      "stroke-width": 1,
    })
  );

  container.appendChild(svg);
}

/** Renders a legend row above/below a categorical chart. */
export function renderLegend(container, entries) {
  container.innerHTML = "";
  const list = document.createElement("ul");
  list.className = "chart-legend";
  entries.forEach(({ label, color }) => {
    const item = document.createElement("li");
    item.innerHTML = `<span class="chart-legend__swatch" style="background:${color}"></span>${label}`;
    list.appendChild(item);
  });
  container.appendChild(list);
}

export function renderStatTile(container, { label, value, sublabel }) {
  const tile = document.createElement("div");
  tile.className = "stat-tile";
  tile.innerHTML = `
    <p class="stat-tile__label">${label}</p>
    <p class="stat-tile__value">${value}</p>
    ${sublabel ? `<p class="stat-tile__sublabel">${sublabel}</p>` : ""}
  `;
  container.appendChild(tile);
}
