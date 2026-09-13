const names = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  copilot: "Copilot"
};
const providerMarks = { chatgpt: "✳", claude: "◒", gemini: "✦", copilot: "◈" };

import { selectPrimaryLimit } from "../utils/limit-selection.js";

function color(p) {
  if (!Number.isFinite(p)) return "#667085";
  return `hsl(${Math.max(0, 125 - p * 1.25)} 82% 52%)`;
}

function render(state = {}) {
  const usage = state.usage || {};
  const container = document.querySelector("#providers");
  container.replaceChildren();

  Object.keys(names).forEach(key => {
      const d = selectPrimaryLimit(usage[key]);
      const p = Number(d?.percentage);
      const c = color(p);
      const card = document.createElement("article");
      card.className = "card";
      const activityTokens = Number(key === "chatgpt" ? state.activitySummary?.tokensFiveHours : NaN);
      const localActive = !Number.isFinite(p) && Number.isFinite(activityTokens) && activityTokens > 0;
      card.dataset.mode = Number.isFinite(p) ? "official" : localActive ? "activity" : "neutral";
      card.style.setProperty("--ring-progress", `${Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : localActive ? 34 : 0}%`);
      card.style.setProperty("--ring-hue", Number.isFinite(p) ? String(Math.max(0, 132 - p * 1.32)) : localActive ? "88" : "142");
      const row = document.createElement("div"); row.className = "row";
      const miniRing = document.createElement("span"); miniRing.className = "mini-ring"; miniRing.setAttribute("aria-hidden", "true"); miniRing.textContent = providerMarks[key] || "•";
      const label = document.createElement("strong"); label.textContent = names[key];
      const value = document.createElement("strong"); value.textContent = Number.isFinite(p) ? `${Math.round(p)}%` : localActive ? `${(activityTokens / 1000).toFixed(1).replace(/\.0$/, "")}K` : "Unavailable";
      const heading = document.createElement("span"); heading.className = "heading-title"; heading.append(miniRing, label);
      row.append(heading, value);
      const bar = document.createElement("div"); bar.className = "bar";
      const fill = document.createElement("div"); fill.className = "fill"; fill.style.width = `${Number.isFinite(p) ? p : 0}%`; fill.style.background = c;
      bar.append(fill);
      const meta = document.createElement("div"); meta.className = "row meta";
      const used = document.createElement("small"); used.textContent = `Used ${d?.used ?? "—"}`;
      const left = document.createElement("small"); left.textContent = `Left ${d?.remaining ?? "—"}`;
      meta.append(used, left);
      const status = document.createElement("small"); status.className = "status"; status.textContent = usage[key]?.status === "cached" && state.lastUpdated ? `cached · ${Math.max(0, Math.round((Date.now() - state.lastUpdated) / 60000))}m ago` : usage[key]?.status || "unavailable";
      card.append(row, bar, meta, status); container.append(card);
    });
  const timestamp = Number(state.lastUpdated);
  document.querySelector("#updated").textContent = timestamp ? `Updated ${new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "No usage snapshot yet";
}

function load() { chrome.runtime.sendMessage({ type: "GET_STATE" }, response => render(response?.state)); }

document.querySelector("#refresh").onclick = async event => {
  event.currentTarget.classList.add("spinning");
  await chrome.runtime.sendMessage({ type: "REFRESH_NOW" });
  event.currentTarget.classList.remove("spinning");
  load();
};

document.querySelector("#dashboard").onclick =
  () => chrome.runtime.openOptionsPage();

load();
