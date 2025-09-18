import { ApiError } from "./ApiError.js";

async function fetchSoilData(lat, lon) {
  const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}&property=nitrogen&property=phh2o&depth=0-5cm&depth=5-15cm&depth=15-30cm&depth=0-30cm&value=mean`;

  const response = await fetch(url, { headers: { "accept": "application/json" } });
  if (!response.ok) {
    throw new ApiError(response.status, `SoilGrids HTTP error: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

export { fetchSoilData };