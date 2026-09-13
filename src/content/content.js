(() => {
  const config = window.AILimitProviderConfig?.getCurrent();
  const provider = config?.id;
  const providerName = config?.name || "AI provider";
  const providerMarks = { chatgpt: "assets/icons/provider-chatgpt.svg", gemini: "assets/icons/provider-gemini.svg", claude: "assets/icons/provider-claude.svg", copilot: "assets/icons/provider-copilot.svg" };
  const host = location.hostname;

  function createLightningMark(className) {
    const svgMark = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgMark.classList.add(className);
    svgMark.setAttribute("viewBox", "0 0 100 110");
    svgMark.setAttribute("aria-hidden", "true");
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    gradient.id = `ai-limit-bolt-${className}`;
    gradient.setAttribute("x1", "0"); gradient.setAttribute("y1", "0"); gradient.setAttribute("x2", "1"); gradient.setAttribute("y2", "1");
    [["0", "#fff7a6"], [".52", "#ffb347"], ["1", "#ff4e58"]].forEach(([offset, color]) => {
      const stop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      stop.setAttribute("offset", offset); stop.setAttribute("stop-color", color); gradient.append(stop);
    });
    defs.append(gradient); svgMark.append(defs);
    const boltPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    boltPath.setAttribute("d", "M61 3 19 57h28l-6 50 43-64H56z");
    boltPath.setAttribute("fill", `url(#ai-limit-bolt-${className})`);
    svgMark.append(boltPath);
    return svgMark;
  }

  if (!provider || document.getElementById("ai-limit-root")) return;

  const root = document.createElement("div");
  root.id = "ai-limit-root";
  root.dataset.provider = provider;

  const toggle = document.createElement("button");
  toggle.className = "ai-limit-hud";
  toggle.type = "button";
  toggle.setAttribute("aria-label", `${providerName} usage`);
  toggle.setAttribute("aria-expanded", "false");

  const circle = document.createElement("span");
  circle.className = "ai-limit-circle";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 42 42");
  const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  track.setAttribute("class", "track");
  track.setAttribute("cx", "21");
  track.setAttribute("cy", "21");
  track.setAttribute("r", "17");
  const progress = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  progress.setAttribute("class", "progress");
  progress.setAttribute("cx", "21");
  progress.setAttribute("cy", "21");
  progress.setAttribute("r", "17");
  progress.setAttribute("pathLength", "100");
  svg.append(track, progress);
  const bolt = document.createElement("span");
  bolt.className = "bolt";
  bolt.setAttribute("aria-hidden", "true");
  bolt.append(createLightningMark("bolt-mark"));
  const number = document.createElement("span");
  number.className = "number";
  number.setAttribute("aria-hidden", "true");
  circle.append(svg, bolt);
  toggle.append(circle);

  const panel = document.createElement("section");
  panel.className = "ai-limit-panel";
  panel.setAttribute("aria-label", `${providerName} usage details`);
  const panelHeader = document.createElement("div");
  panelHeader.className = "panel-header";
  const brandMark = document.createElement("span");
  brandMark.className = "brand-mark";
  brandMark.setAttribute("aria-hidden", "true");
  brandMark.textContent = providerName;
  brandMark.dataset.provider = provider || "unknown";
  const providerAsset = providerMarks[provider];
  if (providerAsset && globalThis.chrome?.runtime?.getURL) {
    const markImage = document.createElement("img");
    markImage.src = chrome.runtime.getURL(providerAsset);
    markImage.alt = `${providerName} mark`;
    brandMark.replaceChildren(markImage);
  }
  const title = document.createElement("strong");
  title.textContent = `${providerName} usage`;
  const close = document.createElement("button");
  close.className = "close";
  close.type = "button";
  close.setAttribute("aria-label", "Close usage details");
  close.textContent = "×";
  const titleBlock = document.createElement("span");
  titleBlock.className = "title-block";
  titleBlock.append(brandMark, title);
  panelHeader.append(titleBlock, close);
  const detail = document.createElement("div");
  detail.className = "detail";
  const detailValue = document.createElement("strong");
  detailValue.className = "detail-value";
  const detailRing = document.createElement("span");
  detailRing.className = "detail-ring";
  const detailSvg = svg.cloneNode(true);
  detailSvg.classList.add("detail-ring-svg");
  const detailBolt = document.createElement("span");
  detailBolt.className = "detail-bolt";
  detailBolt.setAttribute("aria-hidden", "true");
  detailBolt.append(createLightningMark("detail-bolt-mark"));
  detailRing.append(detailSvg, detailBolt);
  const detailMode = document.createElement("span");
  detailMode.className = "detail-mode";
  detailMode.textContent = "LOCAL ACTIVITY";
  const detailLabel = document.createElement("span");
  detailLabel.textContent = "used";
  detail.append(detailRing, detailMode, detailValue, detailLabel);
  const stats = document.createElement("dl");
  const used = document.createElement("div");
  const remaining = document.createElement("div");
  const reset = document.createElement("div");
  const credits = document.createElement("div");
  stats.append(used, remaining, reset, credits);
  const officialSection = document.createElement("div");
  const officialHeading = document.createElement("p");
  officialHeading.className = "detail-label";
  officialHeading.textContent = "Official quota";
  officialSection.append(officialHeading, stats);
  const quotaStatus = document.createElement("div");
  quotaStatus.className = "quota-status";
  const quotaStatusValue = document.createElement("strong");
  const quotaStatusDetail = document.createElement("span");
  quotaStatus.append(quotaStatusValue, quotaStatusDetail);
  const quotaSource = document.createElement("small");
  quotaSource.className = "quota-source";
  const quotaUpdated = document.createElement("small");
  quotaUpdated.className = "quota-updated";
  const statusBlock = document.createElement("div");
  statusBlock.className = "quota-meta";
  const statusHeading = document.createElement("strong");
  statusHeading.textContent = "STATUS";
  statusBlock.append(statusHeading, quotaSource);
  const updateBlock = document.createElement("div");
  updateBlock.className = "quota-meta";
  const updateHeading = document.createElement("strong");
  updateHeading.textContent = "LAST UPDATE";
  updateBlock.append(updateHeading, quotaUpdated);
  officialSection.append(quotaStatus, statusBlock, updateBlock);
  const updated = document.createElement("small");
  updated.className = "updated";
  const activitySection = document.createElement("div");
  const activityHeading = document.createElement("p");
  activityHeading.className = "detail-label";
  activityHeading.textContent = "Local activity";
  const activity = document.createElement("small");
  const lastGeneration = document.createElement("small");
  const context = document.createElement("small");
  const burnRate = document.createElement("small");
  activity.className = "updated activity-summary";
  lastGeneration.className = "updated activity-summary";
  context.className = "updated activity-summary";
  burnRate.className = "updated activity-summary";
  const primaryMetrics = document.createElement("div");
  primaryMetrics.className = "primary-metrics";
  primaryMetrics.append(activity, lastGeneration);
  const secondaryMetrics = document.createElement("div");
  secondaryMetrics.className = "secondary-metrics";
  secondaryMetrics.append(context, burnRate);
  activitySection.append(activityHeading, primaryMetrics, secondaryMetrics);
  const sourceInfo = document.createElement("button");
  sourceInfo.className = "source-info";
  sourceInfo.type = "button";
  sourceInfo.setAttribute("aria-label", "Show usage source information");
  sourceInfo.setAttribute("aria-expanded", "false");
  sourceInfo.textContent = "ⓘ";
  const sourcePopover = document.createElement("div");
  sourcePopover.className = "source-popover";
  sourcePopover.setAttribute("role", "status");
  sourcePopover.hidden = true;
  const more = document.createElement("button");
  more.className = "more";
  more.type = "button";
  more.setAttribute("aria-label", "More usage actions");
  more.textContent = "…";
  const footer = document.createElement("div");
  footer.className = "panel-footer";
  footer.append(updated, sourceInfo, more);
  const leftColumn = document.createElement("div");
  leftColumn.className = "left-column";
  leftColumn.append(detail, activitySection);
  panel.append(panelHeader, leftColumn, officialSection, footer, sourcePopover);
  root.append(toggle, panel);
  document.documentElement.appendChild(root);

  let state = null;
  let dragging = false;
  let moved = false;
  let suppressClick = false;
   const positioningState = {
     isPointerDown: false,
     isDragging: false,
     userPositioned: false,
     autoPositioned: false
   };
  let pointerStart = { x: 0, y: 0 };
  let dragOffset = { x: 0, y: 0 };
  let placementTimer = null;
  let panelPlacementFrame = null;

  function setText(element, label, value) {
    element.replaceChildren();
    const term = document.createElement("dt");
    term.textContent = label;
    element.className = `stat-row stat-${label.toLowerCase()}`;
    const description = document.createElement("dd");
    description.textContent = value;
    element.append(term, description);
  }

  function formatAge(timestamp) {
    if (!timestamp) return "Last update unavailable";
    const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
    return minutes < 1 ? "Updated just now" : `Updated ${minutes}m ago`;
  }

  function render(nextState) {
    state = nextState || {};
    const settings = state.settings || {};
    const entry = state.usage?.[provider];
    const sourcePriority = { "provider-api": 3, "provider-visible": 2, estimated: 1 };
    const percentageLimits = entry?.limits?.filter(item =>
      item?.percentage != null && Number.isFinite(Number(item.percentage))
    ) || [];
    const limit = percentageLimits.sort((left, right) =>
      (sourcePriority[right?.source] || 0) - (sourcePriority[left?.source] || 0)
    )[0] || (provider === "chatgpt" ? null : entry?.limits?.find(item => item?.id !== "credits") || entry?.limits?.[0]);
    const officialQuotaAvailable = percentageLimits.length > 0;
    const officialQuotaCached = officialQuotaAvailable && entry?.status === "cached";
    const creditsLimit = entry?.limits?.find(item => item?.id === "credits");
    const hasProviderData = Boolean(entry?.limits?.some(item =>
      item && item.source !== "estimated" && item.estimated !== true &&
      [item.used, item.limit, item.remaining, item.percentage, item.resetAt, item.displayValue]
        .some(value => value != null)
    ));
    const percentage = Number(limit?.percentage);
    const known = Number.isFinite(percentage);
    const bounded = known ? Math.min(100, Math.max(0, percentage)) : 0;
    const age = entry?.staleSince ? formatAge(entry.staleSince) : formatAge(state.lastUpdated);
    const statusKey = entry?.status === "unavailable" && hasProviderData ? "detected" :
      entry?.status || (known ? "available" : "unavailable");
    const stateLabel = entry?.status === "demo" ? "Demo data" :
      entry?.status === "manual" ? "Manual value" :
      entry?.status === "estimated" && provider !== "chatgpt" ? "Estimated" :
      entry?.status === "detected" ? "Detected · provider-visible" :
      entry?.status === "cached" ? `Cached · ${age.replace("Updated ", "")}` :
      entry?.status === "error" ? "Refresh error" :
      hasProviderData ? "Detected · provider-visible" :
      known ? "Usage available" : "Usage unavailable";
    const officialLabel = officialQuotaCached ? "Official quota · Cached" :
      officialQuotaAvailable ? "Official quota" : "Official quota unavailable";

    root.hidden = settings.hudEnabled === false;
    root.dataset.theme = settings.theme || "auto";
    root.dataset.state = known ? "known" : "unknown";
    root.dataset.status = statusKey;
    const activitySummary = state.activitySummary;
    const activityTokens = activitySummary?.tokensFiveHours;
    const hasActivity = Number.isFinite(Number(activityTokens)) && Number(activityTokens) > 0;
    const compactTokens = value => {
      if (!Number.isFinite(Number(value))) return "—";
      const numeric = Number(value);
      if (numeric >= 1000) return `${(numeric / 1000).toFixed(1).replace(/\.0$/, "")}K`;
      return Math.round(numeric).toLocaleString();
    };
    const activityHero = hasActivity ? compactTokens(activityTokens) : "—";
    const localActive = !officialQuotaAvailable && hasActivity;
    const ringFill = officialQuotaAvailable ? bounded : localActive ? 34 : 0;
    const ringHue = officialQuotaAvailable ? Math.max(0, 132 - bounded * 1.32) : localActive ? 88 : 142;
    root.style.setProperty("--ai-limit-progress", `${ringFill}%`);
    root.style.setProperty("--ai-limit-hue", String(ringHue));
    root.dataset.mode = officialQuotaAvailable ? "official" : localActive ? "activity" : "neutral";
    progress.style.strokeDashoffset = String(100 - ringFill);
    detailSvg.querySelector(".progress").style.strokeDashoffset = String(100 - ringFill);
    toggle.setAttribute("aria-label", officialQuotaAvailable ? `${providerName} usage, official quota` : `${providerName} usage, local activity`);
    detailValue.textContent = officialQuotaAvailable ? `${Math.round(bounded)}%` : localActive ? activityHero : "Unavailable";
    detailLabel.textContent = officialQuotaAvailable ? "used" : officialLabel;
    used.hidden = !officialQuotaAvailable;
    remaining.hidden = !officialQuotaAvailable;
    reset.hidden = !officialQuotaAvailable;
    if (officialQuotaAvailable) {
      setText(used, "Used", limit?.used == null ? "—" : String(limit.used));
      setText(remaining, "Remaining", limit?.remaining == null ? "—" : String(limit.remaining));
      setText(reset, "Reset", limit?.resetAt ? new Date(limit.resetAt).toLocaleString() : "Unavailable");
    }
    credits.hidden = !creditsLimit;
    if (creditsLimit) setText(credits, "Credits", creditsLimit.displayValue || `${creditsLimit.remaining} credits left`);
    const formatTokens = value => Number.isFinite(Number(value)) ? `${Math.round(Number(value)).toLocaleString()} tokens` : "—";
    const activitySource = activitySummary?.activityModel?.source || activitySummary?.source;
    const activityConfidence = activitySummary?.activityModel?.confidence || activitySummary?.confidence;
    const activitySourceLabel = activitySource === "local-o200k" ? "O200K" :
      activitySource === "provider-reported" ? "Provider-reported" :
      activitySource === "tokenizer-estimate" ? "O200K · Estimated" :
      activitySource === "rough-estimate" ? "Rough estimate" : activitySource || "Local activity";
    const activityContext = activitySummary?.activityModel?.contextTokens ?? null;
    const activityWindow = Number.isFinite(Number(activitySummary?.messagesFiveHours)) ? `${activitySummary.messagesFiveHours} messages · 5h` : "5h";
    activity.textContent = provider === "chatgpt" ? `${activitySummary?.messagesFiveHours ?? "—"} messages` : "";
    lastGeneration.textContent = provider === "chatgpt" ? `${activitySummary?.lastGenerationTokens ?? "—"} last generation` : "";
    activity.title = provider === "chatgpt" ? `Activity (5h) · ${activityHero} tokens · ${activityWindow}` : "";
    lastGeneration.title = provider === "chatgpt" ? `Last generation · ${formatTokens(activitySummary?.lastGenerationTokens)}` : "";
    context.textContent = provider === "chatgpt" ? `Context · ${formatTokens(activityContext)}` : "";
    burnRate.textContent = provider === "chatgpt" ? `Burn rate · ${Number.isFinite(Number(activitySummary?.burnRate)) ? `~${Math.round(activitySummary.burnRate)} tokens/min` : "—"}` : "";
    const noData = !officialQuotaAvailable && !hasActivity && !creditsLimit;
    activityHeading.textContent = noData ? "No usage data" : "Local activity";
    officialHeading.textContent = officialQuotaAvailable ? "Official quota" : "Official quota";
    officialSection.style.order = officialQuotaAvailable ? "1" : "2";
    activitySection.style.order = officialQuotaAvailable ? "2" : "1";
    if (officialQuotaAvailable) panel.insertBefore(officialSection, activitySection);
    else panel.insertBefore(activitySection, officialSection);
    activitySection.hidden = provider !== "chatgpt";
    officialSection.dataset.state = officialQuotaAvailable ? (officialQuotaCached ? "cached" : "available") : "unavailable";
    quotaStatusValue.textContent = officialQuotaAvailable ? `${Math.round(bounded)}% used` : "Unavailable";
    quotaStatusDetail.textContent = officialQuotaAvailable ? (limit?.name || "Provider quota") : "Provider quota not available";
    quotaSource.textContent = officialQuotaAvailable ? `${limit?.source === "provider-api" ? "Provider-reported" : "Provider-visible"}${officialQuotaCached ? " · Cached" : ""}` : "Measured locally";
    quotaUpdated.textContent = officialQuotaAvailable ? (limit?.resetAt ? `Reset ${new Date(limit.resetAt).toLocaleString()}` : "Reset unavailable") : formatAge(state.lastUpdated);
    detailValue.textContent = officialQuotaAvailable ? `${Math.round(bounded)}%` : (hasActivity ? activityHero : "Unavailable");
    detailMode.textContent = officialQuotaAvailable ? "OFFICIAL QUOTA" : "LOCAL ACTIVITY";
    detailLabel.textContent = officialQuotaAvailable ? "used" : (hasActivity ? "tokens · 5h" : "Official quota unavailable");
    detail.classList.toggle("activity-hero", localActive);
    const sourceTitle = officialQuotaAvailable ? "Official provider quota" : "Measured locally";
    const sourceDetail = officialQuotaAvailable ? `${limit?.source === "provider-api" ? "Provider-reported" : "Provider-visible"}${officialQuotaCached ? " · Cached" : ""}` : "Provider quota unavailable";
    const sourceMethod = officialQuotaAvailable ? "AI Limit source information" : activitySourceLabel === "O200K" ? "O200K local activity" : activitySourceLabel;
    sourcePopover.replaceChildren();
    [sourceTitle, sourceDetail, sourceMethod].forEach((text, index) => {
      const line = document.createElement(index === 0 ? "strong" : "span");
      line.textContent = text;
      sourcePopover.append(line);
    });
    sourceInfo.title = `${sourceTitle}. ${sourceDetail}. ${sourceMethod}`;
    sourceInfo.setAttribute("aria-label", sourceInfo.title);
    toggle.dataset.tooltip = officialQuotaAvailable ? "AI Limit · Official Quota" : "AI Limit · Local Activity";
    updated.textContent = "Track smart. Use freely.";
  }

  function toggleSourceInfo(force) {
    const open = force ?? sourcePopover.hidden;
    sourcePopover.hidden = !open;
    sourceInfo.setAttribute("aria-expanded", String(open));
  }

  function setExpanded(expanded) {
    root.classList.toggle("expanded", expanded);
    toggle.setAttribute("aria-expanded", String(expanded));
    if (expanded) {
      positionPanel();
      const updatedAt = Number(state?.usage?.[provider]?.updatedAt || 0);
      if (!updatedAt || Date.now() - updatedAt > 5 * 60 * 1000) {
        chrome.runtime.sendMessage({ type: "REFRESH_NOW" }).catch(() => {});
      }
    }
  }

  function positionPanel() {
    if (!root.classList.contains("expanded")) return;
    cancelAnimationFrame(panelPlacementFrame);
    panelPlacementFrame = requestAnimationFrame(() => {
      const margin = 12;
      const gap = 8;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const hudRect = toggle.getBoundingClientRect();

      panel.style.position = "fixed";
      panel.style.marginTop = "0";
      panel.style.left = "0px";
      panel.style.top = "0px";
      const panelRect = panel.getBoundingClientRect();
      if (!panelRect.width || !panelRect.height) return;

      const rightSpace = viewportWidth - hudRect.right - margin - gap;
      const leftSpace = hudRect.left - margin - gap;
      const aboveSpace = hudRect.top - margin - gap;
      const belowSpace = viewportHeight - hudRect.bottom - margin - gap;
      const canFitRight = rightSpace >= panelRect.width;
      const canFitLeft = leftSpace >= panelRect.width;
      const canFitAbove = aboveSpace >= panelRect.height;
      const canFitBelow = belowSpace >= panelRect.height;
      const nearBottom = belowSpace < panelRect.height;
      const nearTop = aboveSpace < panelRect.height;
      let left;
      let top;

      if (nearBottom && canFitAbove) {
        left = hudRect.right - panelRect.width;
        top = hudRect.top - panelRect.height - gap;
      } else if (nearTop && canFitBelow) {
        left = hudRect.right - panelRect.width;
        top = hudRect.bottom + gap;
      } else if (canFitRight) {
        left = hudRect.right + gap;
        top = hudRect.top;
      } else if (canFitLeft) {
        left = hudRect.left - panelRect.width - gap;
        top = hudRect.top;
      } else if (canFitAbove || (!canFitBelow && aboveSpace >= belowSpace)) {
        left = hudRect.right - panelRect.width;
        top = hudRect.top - panelRect.height - gap;
      } else {
        left = hudRect.right - panelRect.width;
        top = hudRect.bottom + gap;
      }

      const maxLeft = Math.max(margin, viewportWidth - panelRect.width - margin);
      const maxTop = Math.max(margin, viewportHeight - panelRect.height - margin);
      panel.style.left = `${Math.min(maxLeft, Math.max(margin, left))}px`;
      panel.style.top = `${Math.min(maxTop, Math.max(margin, top))}px`;
    });
  }

  function applyPosition(position) {
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return;
    root.style.left = `${Math.max(8, Math.min(window.innerWidth - 62, position.x))}px`;
    root.style.top = `${Math.max(8, Math.min(window.innerHeight - 62, position.y))}px`;
    root.style.right = "auto";
    root.style.bottom = "auto";
  }

  function visibleElement(selectors, scope = document) {
    return (selectors || []).map(selector => scope.querySelector(selector)).find(element => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }) || null;
  }

  function findComposer() {
    const candidates = (config?.composerSelectors || []).flatMap(selector =>
      [...document.querySelectorAll(selector)]
    );
    let best = null;
    let bestScore = -1;
    for (const candidate of candidates) {
      const rect = candidate.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      let score = rect.bottom > window.innerHeight * .35 ? 1 : 0;
      if (candidate.matches("form") && candidate.querySelector("textarea, [contenteditable='true']")) score += 4;
      if (findSendControl(candidate)) score += 5;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return best;
  }

  function findSendControl(composer) {
    const local = visibleElement(config?.sendSelectors, composer || document);
    return local || visibleElement(config?.sendSelectors);
  }

  function placeNearComposer() {
     if (positioningState.userPositioned || positioningState.autoPositioned ||
       positioningState.isPointerDown || positioningState.isDragging) return;
    const composer = findComposer();
    if (!composer) return;
    const send = findSendControl(composer);
    const composerRect = composer.getBoundingClientRect();
    const targetRect = send?.getBoundingClientRect() || composerRect;
    const hudSize = 54;
    const gap = 8;
    let x = send ? targetRect.left - hudSize - gap : composerRect.right - hudSize;
    if (x < 8 && send) x = targetRect.right + gap;
    const y = send ? targetRect.top + (targetRect.height - hudSize) / 2 : composerRect.bottom - hudSize - gap;
    applyPosition({ x, y });
    positioningState.autoPositioned = true;
  }

  toggle.addEventListener("click", event => {
    if (suppressClick) {
      event.preventDefault();
      suppressClick = false;
      return;
    }
    setExpanded(!root.classList.contains("expanded"));
  });
  close.addEventListener("click", () => setExpanded(false));
  sourceInfo.addEventListener("click", () => toggleSourceInfo());
  sourceInfo.addEventListener("mouseenter", () => toggleSourceInfo(true));
  sourceInfo.addEventListener("mouseleave", () => toggleSourceInfo(false));
  toggle.addEventListener("keydown", event => {
    if (event.key === "Escape") setExpanded(false);
  });
  root.addEventListener("pointerdown", event => {
    if (!event.target.closest(".ai-limit-hud")) return;
     positioningState.isPointerDown = true;
     positioningState.isDragging = false;
    const rect = root.getBoundingClientRect();
    pointerStart = { x: event.clientX, y: event.clientY };
    dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    moved = false;
    dragging = false;
    root.setPointerCapture?.(event.pointerId);
  });
  root.addEventListener("pointermove", event => {
     if (!positioningState.isPointerDown) return;
    const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    if (!dragging && distance < 6) return;
    dragging = true;
    positioningState.isDragging = true;
    moved = true;
    positioningState.userPositioned = true;
    applyPosition({ x: event.clientX - dragOffset.x, y: event.clientY - dragOffset.y });
    event.preventDefault();
  });
  root.addEventListener("pointerup", async event => {
     positioningState.isPointerDown = false;
    if (!moved) {
      dragging = false;
       positioningState.isDragging = false;
      suppressClick = true;
      setExpanded(!root.classList.contains("expanded"));
      root.releasePointerCapture?.(event.pointerId);
      setTimeout(() => { suppressClick = false; }, 0);
      return;
    }
    dragging = false;
    positioningState.isDragging = false;
    suppressClick = true;
    root.releasePointerCapture?.(event.pointerId);
    const rect = root.getBoundingClientRect();
    const saved = await chrome.storage.local.get("positions");
    await chrome.storage.local.set({
      positions: { ...(saved.positions || {}), [host]: { x: rect.left, y: rect.top } }
    });
    setTimeout(() => { suppressClick = false; }, 0);
  });
  root.addEventListener("pointercancel", event => {
     positioningState.isPointerDown = false;
    dragging = false;
     positioningState.isDragging = false;
    moved = false;
    root.releasePointerCapture?.(event.pointerId);
  });

  chrome.runtime.sendMessage({ type: "GET_STATE" }, response => {
    render(response?.state);
    const saved = response?.state?.positions?.[host];
    if (saved) {
       positioningState.userPositioned = true;
       positioningState.autoPositioned = false;
      applyPosition(saved);
    }
    else placeNearComposer();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.usage || changes.settings || changes.lastUpdated || changes.activitySummary) {
      chrome.runtime.sendMessage({ type: "GET_STATE" }, response => render(response?.state));
    }
  });
  const observer = new MutationObserver(() => {
     if (positioningState.isPointerDown || positioningState.isDragging ||
       positioningState.userPositioned || positioningState.autoPositioned) return;
    clearTimeout(placementTimer);
    placementTimer = setTimeout(placeNearComposer, 150);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", () => {
     if (positioningState.isPointerDown || positioningState.isDragging) return;
    const rect = root.getBoundingClientRect();
    if (rect.width && rect.height) applyPosition({ x: rect.left, y: rect.top });
    positionPanel();
  }, { passive: true });
  window.visualViewport?.addEventListener("resize", positionPanel, { passive: true });
})();
