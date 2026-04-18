"use strict";

// ── DOM ───────────────────────────────────────────────────────────────────────
const textarea       = document.getElementById("notes-input");
const generateBtn    = document.getElementById("generate-btn");
const charCount      = document.getElementById("char-count");
const errorMsg       = document.getElementById("error-msg");
const errorText      = document.getElementById("error-text");
const loader         = document.getElementById("loader");
const outputPanel    = document.getElementById("output-panel");
const mapTitle       = document.getElementById("map-title");
const container      = document.getElementById("mindmap-container");
const expandAllBtn   = document.getElementById("expand-all-btn");
const collapseAllBtn = document.getElementById("collapse-all-btn");
const resetBtn       = document.getElementById("reset-btn");

let treeRoot = null;
let updateFn = null;

// ── Char counter ──────────────────────────────────────────────────────────────
textarea.addEventListener("input", () => {
  const n = textarea.value.length;
  charCount.textContent = `${n} char${n !== 1 ? "s" : ""}`;
  charCount.classList.toggle("active", n > 0);
});

// ── Trigger ───────────────────────────────────────────────────────────────────
generateBtn.addEventListener("click", handleGenerate);
textarea.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleGenerate();
});

async function handleGenerate() {
  const text = textarea.value.trim();
  hideError();

  if (!text) {
    showError("Please paste some notes before generating.");
    return;
  }

  setLoading(true);
  animateSteps();

  try {
    const res  = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      showError(data.error || "Something went wrong. Please try again.");
      return;
    }

    renderMindMap(data);

  } catch (_err) {
    showError("Network error — make sure the Flask server is running.");
  } finally {
    setLoading(false);
  }
}

// ── Loader step animation ─────────────────────────────────────────────────────
function animateSteps() {
  const ids = ["step-1", "step-2", "step-3"];
  ids.forEach((id) => document.getElementById(id).classList.remove("active"));
  document.getElementById("step-1").classList.add("active");

  let i = 1;
  const iv = setInterval(() => {
    if (i >= ids.length) { clearInterval(iv); return; }
    document.getElementById(ids[i - 1]).classList.remove("active");
    document.getElementById(ids[i]).classList.add("active");
    i++;
  }, 700);
}

// ── Render Mind Map ───────────────────────────────────────────────────────────
function renderMindMap(data) {
  container.innerHTML = "";

  const W      = container.clientWidth || 860;
  const leaves = countLeaves(data);
  const H      = Math.max(500, leaves * 100);
  const M      = { top: 60, right: 240, bottom: 60, left: 200 };
  const iW     = W - M.left - M.right;
  const iH     = H - M.top  - M.bottom;

  // ── SVG ──
  const svg = d3.select(container)
    .append("svg")
    .attr("width", W)
    .attr("height", H);

  // ── Defs: gradients + glow filter ──
  const defs = svg.append("defs");

  addRadialGrad(defs, "gradRoot",  "#c4b5fd", "#7c3aed");
  addRadialGrad(defs, "gradChild", "#93c5fd", "#2563eb");
  addRadialGrad(defs, "gradLeaf",  "#6ee7b7", "#059669");

  const gLink = defs.append("linearGradient").attr("id", "gradLink")
    .attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%");
  gLink.append("stop").attr("offset", "0%")
    .attr("stop-color", "#7c3aed").attr("stop-opacity", "0.7");
  gLink.append("stop").attr("offset", "100%")
    .attr("stop-color", "#2563eb").attr("stop-opacity", "0.3");

  // Glow filter
  const filt = defs.append("filter").attr("id", "glow")
    .attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
  filt.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
  const merge = filt.append("feMerge");
  merge.append("feMergeNode").attr("in", "blur");
  merge.append("feMergeNode").attr("in", "SourceGraphic");

  const g      = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);
  const linksG = g.append("g").attr("class", "links");
  const nodesG = g.append("g").attr("class", "nodes");

  // ── Hierarchy ──
  // NOTE: use _children (not _allChildren) consistently for collapse/expand
  treeRoot = d3.hierarchy(data);
  treeRoot.each((d) => {
    if (d.children) {
      d._children = d.children; // backup for expand/collapse
    }
  });

  const layout = d3.tree().size([iH, iW]);

  // ── Update (called on every expand/collapse) ──
  function update(source) {
    layout(treeRoot);

    const nodes = treeRoot.descendants();
    const links = treeRoot.links();

    // ── Links ──
    const linkSel = linksG.selectAll(".link")
      .data(links, (d) => nodeId(d.target) + "|" + nodeId(d.source));

    const linkEnter = linkSel.enter().append("path")
      .attr("class", "link")
      .attr("d", () => {
        const o = { x: source.x0 !== undefined ? source.x0 : source.x,
                    y: source.y0 !== undefined ? source.y0 : source.y };
        return d3.linkHorizontal().x((d) => d.y).y((d) => d.x)({ source: o, target: o });
      })
      .style("opacity", 0);

    linkEnter.merge(linkSel)
      .transition().duration(450).ease(d3.easeCubicOut)
      .attr("d", d3.linkHorizontal().x((d) => d.y).y((d) => d.x))
      .style("opacity", 1);

    linkSel.exit()
      .transition().duration(300).ease(d3.easeCubicIn)
      .style("opacity", 0).remove();

    // ── Nodes ──
    const nodeSel = nodesG.selectAll(".node")
      .data(nodes, (d) => nodeId(d));

    const getClass = (d) => {
      const base = d.depth === 0 ? "node node--root"
                 : d.depth === 1 ? "node node--child"
                 : "node node--leaf";
      // collapsed = has hidden children
      return base + (!d.children && d._children ? " node--collapsed" : "");
    };

    const nodeEnter = nodeSel.enter().append("g")
      .attr("class", getClass)
      .attr("transform", () => {
        const sx = source.x0 !== undefined ? source.x0 : source.x;
        const sy = source.y0 !== undefined ? source.y0 : source.y;
        return `translate(${sy},${sx})`;
      })
      .style("opacity", 0)
      .on("click", (_evt, d) => toggleNode(d));

    // Circle (starts at r=0, animates to full size)
    nodeEnter.append("circle")
      .attr("r", 0)
      .attr("filter", "url(#glow)");

    // Label background rect
    nodeEnter.append("rect")
      .attr("class", "node-label-bg")
      .attr("rx", 6).attr("ry", 6)
      .attr("fill", "rgba(8,11,20,0.7)")
      .attr("stroke", "rgba(255,255,255,0.07)")
      .attr("stroke-width", 1);

    // Label text
    nodeEnter.append("text")
      .attr("dy", "0.35em")
      .text((d) => truncate(d.data.name, 28));

    // ── Merge enter + update ──
    const nodeMerge = nodeEnter.merge(nodeSel);

    // Transition position + opacity
    nodeMerge.transition().duration(450).ease(d3.easeCubicOut)
      .attr("transform", (d) => `translate(${d.y},${d.x})`)
      .style("opacity", 1)
      .attr("class", getClass);

    // Animate circle radius
    nodeMerge.select("circle")
      .transition().duration(450).ease(d3.easeBackOut.overshoot(1.3))
      .attr("r", (d) => d.depth === 0 ? 18 : d.depth === 1 ? 12 : 8);

    // Position label + background (runs after transition settles)
    nodeMerge.each(function(d) {
      const grp    = d3.select(this);
      const isLeft = !!(d.children || d._children); // node has children → label goes left
      const r      = d.depth === 0 ? 18 : d.depth === 1 ? 12 : 8;
      const gap    = 8;
      const label  = truncate(d.data.name, 28);
      const charW  = d.depth === 0 ? 7.5 : 6.8;
      const approxW = label.length * charW + 16;
      const approxH = 22;
      const tx     = isLeft ? -(r + gap) : (r + gap);
      const anchor = isLeft ? "end" : "start";
      const bgX    = anchor === "end" ? tx - approxW : tx;

      grp.select("text")
        .attr("x", tx)
        .attr("text-anchor", anchor);

      grp.select("rect.node-label-bg")
        .attr("x", bgX)
        .attr("y", -approxH / 2)
        .attr("width", approxW)
        .attr("height", approxH);
    });

    // Exit
    nodeSel.exit()
      .transition().duration(300).ease(d3.easeCubicIn)
      .style("opacity", 0)
      .attr("transform", `translate(${source.y},${source.x})`)
      .remove();

    // Save positions for next transition origin
    nodes.forEach((d) => { d.x0 = d.x; d.y0 = d.y; });
  }

  // ── Toggle collapse / expand ──
  function toggleNode(d) {
    if (d.depth === 0) return; // root always visible
    if (d.children) {
      d._children = d.children;
      d.children  = null;
    } else if (d._children) {
      d.children  = d._children;
      d._children = null;
    }
    update(d);
  }

  // Initial render
  update(treeRoot);
  updateFn = update;

  // Show output panel
  mapTitle.textContent = data.name;
  outputPanel.hidden = false;
  outputPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ── Toolbar ───────────────────────────────────────────────────────────────────
expandAllBtn.addEventListener("click", () => {
  if (!treeRoot || !updateFn) return;
  treeRoot.each((d) => {
    if (d._children) {
      d.children  = d._children;
      d._children = null;
    }
  });
  updateFn(treeRoot);
});

collapseAllBtn.addEventListener("click", () => {
  if (!treeRoot || !updateFn) return;
  treeRoot.each((d) => {
    if (d.depth > 0 && d.children) {
      d._children = d.children;
      d.children  = null;
    }
  });
  updateFn(treeRoot);
});

resetBtn.addEventListener("click", () => {
  outputPanel.hidden = true;
  container.innerHTML = "";
  textarea.value = "";
  charCount.textContent = "0 chars";
  charCount.classList.remove("active");
  hideError();
  treeRoot = null;
  updateFn = null;
  textarea.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function setLoading(on) {
  loader.hidden = !on;
  generateBtn.disabled = on;
  if (on) outputPanel.hidden = true;
}

function showError(msg) {
  errorText.textContent = msg;
  errorMsg.hidden = false;
}

function hideError() {
  errorMsg.hidden = true;
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function countLeaves(node) {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}

// Stable node ID for D3 key function
let _nodeIdCounter = 0;
function nodeId(d) {
  if (!d._uid) d._uid = ++_nodeIdCounter;
  return d._uid;
}

function addRadialGrad(defs, id, colorStart, colorEnd) {
  const g = defs.append("radialGradient").attr("id", id);
  g.append("stop").attr("offset", "0%").attr("stop-color", colorStart);
  g.append("stop").attr("offset", "100%").attr("stop-color", colorEnd);
}
