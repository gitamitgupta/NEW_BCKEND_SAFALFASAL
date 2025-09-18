import { ApiError } from "./ApiError.js";

const RESOURCE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

async function fetchMarketPrices(options) {
  const {
    apiKey = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b',
    state,
    district,
    market,
    commodity,
    variety,
    grade,
    offset = 0,
    limit = 100,
    format = "json"
  } = options || {};

  if (!apiKey) throw new Error("apiKey is required.");

  const params = new URLSearchParams();
  params.set("api-key", apiKey);
  params.set("format", format);
  params.set("offset", String(offset));
  params.set("limit", String(limit));

  if (state) params.set("filters[state.keyword]", state);
  if (district) params.set("filters[district]", district);
  if (market) params.set("filters[market]", market);
  if (commodity) params.set("filters[commodity]", commodity);
  if (variety) params.set("filters[variety]", variety);
  if (grade) params.set("filters[grade]", grade);

  const url = `${RESOURCE_URL}?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, `Data.gov.in API error: ${res.status} ${res.statusText} — ${text}`);
  }

  const json = await res.json();
  const records = json?.records ?? json;
  
  const normalized = (Array.isArray(records) ? records : [])
    .map(r => {
      const copy = { ...r };
      ["min_price", "max_price", "modal_price", "price"].forEach(k => {
        if (copy[k] !== undefined) {
          const n = Number(copy[k]);
          copy[k] = Number.isFinite(n) ? n : copy[k];
        }
      });
      return copy;
    });

  return normalized;
}

export { fetchMarketPrices };