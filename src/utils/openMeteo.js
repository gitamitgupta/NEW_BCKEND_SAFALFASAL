import { ApiError } from "./ApiError.js";

async function fetchOpenMeteo(lat, lon) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: "temperature_2m,relativehumidity_2m,precipitation",
    daily: "temperature_2m_max,precipitation_sum",
    timezone: "UTC"
  }).toString();

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new ApiError(res.status, `Open-Meteo HTTP error: ${res.status}`);
  }
  return res.json();
}

export { fetchOpenMeteo };