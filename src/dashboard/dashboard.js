let state = {};
import { selectPrimaryLimit } from "../utils/limit-selection.js";

function color(p) {
  if (!Number.isFinite(p)) return "#667085";
  return `hsl(${Math.max(0, 125 - p * 1.25)} 82% 52%)`;
}

function formatEstimate(hours) {
  if (!Number.isFinite(hours)) return "Unavailable";
  if (hours < 1) return `~${Math.max(1, Math.round(hours * 60))}m`;
  return `~${Math.round(hours * 10) / 10}h`;
}

const names = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  copilot: "Copilot"
};
const providerMarks = { chatgpt: "✳", claude: "◒", gemini: "✦", copilot: "◈" };

async function load() {
  const res = await chrome.runtime.sendMessage({type:"GET_STATE"});
  state = res?.state || {};

  const cards = document.querySelector("#cards");
  cards.replaceChildren();
  Object.keys(names).forEach(k => {
      const d = selectPrimaryLimit(state.usage?.[k]);
      const p = Number(d?.percentage);
      const c = color(p);
      const card = document.createElement("article"); card.className = "card";
      const activityTokens = Number(k === "chatgpt" ? state.activitySummary?.tokensFiveHours : NaN);
      const localActive = !Number.isFinite(p) && Number.isFinite(activityTokens) && activityTokens > 0;
      card.dataset.mode = Number.isFinite(p) ? "official" : localActive ? "activity" : "neutral";
      card.style.setProperty("--ring-progress", `${Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : localActive ? 34 : 0}%`);
      card.style.setProperty("--ring-hue", Number.isFinite(p) ? String(Math.max(0, 132 - p * 1.32)) : localActive ? "88" : "142");
      const heading = document.createElement("div"); heading.className = "card-heading";
      const miniRing = document.createElement("span"); miniRing.className = "mini-ring"; miniRing.setAttribute("aria-hidden", "true"); miniRing.textContent = providerMarks[k] || "•";
      const title = document.createElement("h2"); title.textContent = names[k];
      const pct = document.createElement("span"); pct.className = "pct"; pct.textContent = Number.isFinite(p) ? `${Math.round(p)}%` : localActive ? `${(activityTokens / 1000).toFixed(1).replace(/\.0$/, "")}K` : "Unavailable";
      const headingTitle = document.createElement("div"); headingTitle.className = "heading-title"; headingTitle.append(miniRing, title);
      heading.append(headingTitle, pct);
      const bar = document.createElement("div"); bar.className = "bar";
      const fill = document.createElement("div"); fill.className = "fill"; fill.style.width = `${Number.isFinite(p) ? p : 0}%`; fill.style.background = c; bar.append(fill);
      const status = document.createElement("p"); status.className = "card-status"; status.textContent = `${state.usage?.[k]?.status || "unavailable"}${state.usage?.[k]?.staleSince ? ` · stale ${Math.max(0, Math.round((Date.now() - state.usage[k].staleSince) / 60000))}m` : ""} · ${d?.name || "No limit reported"}`;
      card.append(heading, bar, status);
      (state.usage?.[k]?.limits || []).forEach(limit => {
        const row = document.createElement("div"); row.className = "limit-row";
        const label = document.createElement("span"); label.textContent = limit.name || "Limit";
        const value = document.createElement("strong"); value.textContent = Number.isFinite(Number(limit.percentage)) ? `${Math.round(limit.percentage)}%` : "Unavailable";
        row.append(label, value); card.append(row);
      });
      const details = document.createElement("p"); details.className = "card-details"; details.textContent = `Used ${d?.used ?? "—"} · Remaining ${d?.remaining ?? "—"}`; card.append(details);
      const insights = state.usage?.[k]?.insights;
      const forecast = document.createElement("p"); forecast.className = "card-insights";
      forecast.textContent = insights?.trend === "unknown" ? "Estimate unavailable" : `${insights.trend} · ${insights.ratePerHour > 0 ? `${insights.ratePerHour.toFixed(1)}/hour` : "no rise"} · exhaustion estimate ${formatEstimate(insights.estimatedExhaustionHours)}`;
      card.append(forecast);
      cards.append(card);
    });

  const s = state.settings || {};
  ["hudEnabled","demoMode","alert75","alert90","alert95","alert100"]
    .forEach(id => document.querySelector("#"+id).checked = !!s[id]);
  document.querySelector("#theme").value = s.theme || "auto";
  document.querySelector("#refreshMinutes").value =
    String(s.refreshMinutes || 5);
  document.querySelector("#historyDays").value = String(s.historyDays || 30);

  document.querySelector("#snapshotStatus").textContent = state.lastUpdated ? `Last updated ${new Date(state.lastUpdated).toLocaleString()}` : "No snapshot recorded";

  drawChart();
}

function drawChart() {
  const canvas = document.querySelector("#chart");
  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth || 900;
  canvas.width = width;
  canvas.height = 300;
  ctx.clearRect(0,0,width,300);

  ctx.strokeStyle = "#292b30";
  for (let i=0;i<=4;i++) {
    const y = 25 + i*55;
    ctx.beginPath();
    ctx.moveTo(40,y);
    ctx.lineTo(width-15,y);
    ctx.stroke();
  }

  const filter = document.querySelector("#historyFilter").value;
  const history = (state.history || []).filter(entry => {
    if (filter === "all") return true;
    return Number.isFinite(selectPrimaryLimit(entry.usage?.[filter])?.percentage);
  }).slice(-30);
  const points = history.map((e,i) => {
    const keys = filter === "all" ? Object.keys(names) : [filter];
    const vals = keys
      .map(k => selectPrimaryLimit(e.usage?.[k])?.percentage)
      .filter(Number.isFinite);

    return {
      x: 40 + (i / Math.max(1, history.length-1)) * (width-55),
      y: vals.length ? 25 + (100 - vals.reduce((a,b)=>a+b,0)/vals.length) * 2.2 : 245
    };
  });

  if (!points.length) {
    ctx.fillStyle = "#777";
    ctx.font = "12px system-ui";
    ctx.fillText("No history yet.",40,55);
    return;
  }

  ctx.strokeStyle = "#f5f5f7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
  ctx.stroke();
}

document.querySelectorAll("aside button").forEach(button => {
  button.onclick = () => {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.querySelector("#"+button.dataset.page).classList.add("active");
    document.querySelectorAll("aside button").forEach(item => item.classList.remove("selected"));
    button.classList.add("selected");
  };
});

document.querySelector("#historyFilter").onchange = drawChart;

document.querySelector("#refreshDashboard").onclick = async event => {
  event.currentTarget.disabled = true;
  await chrome.runtime.sendMessage({ type: "REFRESH_NOW" });
  await load();
  event.currentTarget.disabled = false;
};

document.querySelector("#save").onclick = async () => {
  const settings = {
    ...(state.settings || {}),
    hudEnabled: document.querySelector("#hudEnabled").checked,
    demoMode: document.querySelector("#demoMode").checked,
    theme: document.querySelector("#theme").value,
    refreshMinutes: Number(document.querySelector("#refreshMinutes").value),
    alert75: document.querySelector("#alert75").checked,
    alert90: document.querySelector("#alert90").checked,
    alert95: document.querySelector("#alert95").checked,
    alert100: document.querySelector("#alert100").checked,
    historyDays: Number(document.querySelector("#historyDays").value)
  };

  await chrome.storage.local.set({settings});
  await chrome.runtime.sendMessage({
    type:"SET_REFRESH",
    minutes:settings.refreshMinutes
  });
  await load();
};

document.querySelector("#saveManual").onclick = async () => {
  const provider = document.querySelector("#manualProvider").value;
  const used = Number(document.querySelector("#manualUsed").value);
  const limit = Number(document.querySelector("#manualLimit").value);
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return;
  const existing = await chrome.storage.local.get("manualLimits");
  await chrome.storage.local.set({
    manualLimits: { ...(existing.manualLimits || {}), [provider]: {
      name: document.querySelector("#manualName").value.trim() || "Manual limit",
      used, limit, period: document.querySelector("#manualPeriod").value,
      resetAt: document.querySelector("#manualReset").value ? new Date(document.querySelector("#manualReset").value).toISOString() : null
    } }
  });
  await chrome.runtime.sendMessage({ type: "REFRESH_NOW" });
  await load();
};

function downloadFile(filename, content, type) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

document.querySelector("#exportJson").onclick = () => {
  downloadFile("ai-limit-history.json", JSON.stringify(state.history || [], null, 2), "application/json");
};

document.querySelector("#exportCsv").onclick = () => {
  const rows = ["timestamp,provider,limit,percentage,used,remaining,status"];
  (state.history || []).forEach(snapshot => Object.entries(snapshot.usage || {}).forEach(([provider, entry]) => {
    (entry.limits || []).forEach(limit => rows.push([
      new Date(snapshot.timestamp).toISOString(), provider, limit.name || "", limit.percentage ?? "", limit.used ?? "", limit.remaining ?? "", entry.status || ""
    ].map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")));
  }));
  downloadFile("ai-limit-history.csv", rows.join("\n"), "text/csv");
};

load();
