/* Lightweight SVG line/area chart — no dependencies */
let __chartId = 0;

function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const t = 0.18;
    const c1x = p1[0] + (p2[0] - p0[0]) * t, c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t, c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/**
 * lineChart({ labels, series:[{name,color,data,area}], max, ticks, format })
 */
function lineChart(opts) {
  const id = ++__chartId;
  // Compact canvas on phones keeps the (fixed-size) axis text legible once the SVG is scaled down
  const compact = window.innerWidth < 640;
  const W = compact ? 340 : 560, H = compact ? 220 : 230, padL = compact ? 34 : 40, padR = compact ? 20 : 28, padT = 14, padB = 30;
  const { labels, series, max, ticks = 5, format = (v) => v } = opts;
  const iw = W - padL - padR, ih = H - padT - padB;
  const x = (i) => padL + (labels.length === 1 ? iw / 2 : (i * iw) / (labels.length - 1));
  const y = (v) => padT + ih - (v / max) * ih;

  let grid = '';
  for (let i = 0; i <= ticks; i++) {
    const v = (max / ticks) * i, yy = y(v);
    grid += `<line x1="${padL}" x2="${W - padR}" y1="${yy}" y2="${yy}" class="grid"/>`;
    grid += `<text x="${padL - 8}" y="${yy + 4}" text-anchor="end" class="tick">${format(v)}</text>`;
  }
  const xl = labels.map((l, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="tick">${l}</text>`).join('');

  let defs = '', body = '';
  series.forEach((s, si) => {
    const pts = s.data.map((v, i) => [+x(i).toFixed(1), +y(v).toFixed(1)]);
    const line = smoothPath(pts);
    if (s.area) {
      const gid = `g${id}_${si}`;
      defs += `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".28"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`;
      body += `<path d="${line} L${pts[pts.length - 1][0]},${padT + ih} L${pts[0][0]},${padT + ih} Z" fill="url(#${gid})"/>`;
    }
    body += `<path d="${line}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linecap="round"/>`;
    body += pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.6" fill="#fff" stroke="${s.color}" stroke-width="2"><title>${s.name} · ${labels[i]}: ${format(s.data[i])}</title></circle>`).join('');
  });

  const legend = series.map((s) => `<span class="lg"><i style="background:${s.color}"></i>${s.name}</span>`).join('');
  return `<div class="chart">
    <div class="chart-legend">${legend}</div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.label || 'Line chart'}">
      <defs>${defs}</defs>${grid}${xl}${body}
    </svg></div>`;
}
