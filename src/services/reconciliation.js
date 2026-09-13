import { calculateDivergence } from "./activity-model.js";

export function reconcile(providerQuota, localActivity) {
  const comparable = providerQuota?.type === "tokens" &&
    providerQuota?.unit === "tokens" && localActivity?.unit === "tokens" &&
    providerQuota?.period != null && providerQuota.period === localActivity.window &&
    Number.isFinite(Number(providerQuota?.used)) && Number.isFinite(Number(localActivity?.totalTokens));
  const divergence = comparable ? calculateDivergence(providerQuota.used, localActivity.totalTokens) : null;
  return {
    officialQuota: providerQuota || { percentage: null, source: "unavailable", confidence: "low" },
    activity: localActivity || { totalTokens: 0, source: null, confidence: "low" },
    reconciliation: {
      agreement: comparable ? (divergence != null && divergence > 0.25 ? "divergent" : "agreeing") : "not-comparable",
      divergence,
      confidence: divergence != null && divergence > 0.25 ? "low" : (localActivity?.confidence || "medium"),
      notes: comparable ? "Comparable token measurements" : "Provider quota and local activity are independent measurements"
    }
  };
}
