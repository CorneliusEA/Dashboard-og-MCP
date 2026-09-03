/**
 * Open-Meteo client — free weather API, no key required.
 * Docs: https://open-meteo.com/en/docs
 */

export interface WeatherForecast {
  latitude: number
  longitude: number
  timezone: string
  current: {
    time: string
    temperatureC: number
    precipitationMm: number
    relativeHumidityPct: number
    windSpeedKmh: number
    weatherCode: number
  }
  daily: Array<{
    date: string
    precipitationSumMm: number
    temperatureMaxC: number
    temperatureMinC: number
    weatherCode: number
  }>
}

export async function fetchForecast(lat: number, lon: number): Promise<WeatherForecast> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,precipitation,relative_humidity_2m,wind_speed_10m,weather_code',
    daily: 'precipitation_sum,temperature_2m_max,temperature_2m_min,weather_code',
    timezone: 'auto',
    forecast_days: '7',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 900 } })
  if (!res.ok) throw new Error(`Open-Meteo forecast failed: ${res.status}`)
  const json = await res.json()

  const dailyTimes: string[] = json.daily?.time ?? []
  return {
    latitude: json.latitude,
    longitude: json.longitude,
    timezone: json.timezone,
    current: {
      time: json.current?.time,
      temperatureC: json.current?.temperature_2m,
      precipitationMm: json.current?.precipitation,
      relativeHumidityPct: json.current?.relative_humidity_2m,
      windSpeedKmh: json.current?.wind_speed_10m,
      weatherCode: json.current?.weather_code,
    },
    daily: dailyTimes.map((date, i) => ({
      date,
      precipitationSumMm: json.daily.precipitation_sum[i],
      temperatureMaxC: json.daily.temperature_2m_max[i],
      temperatureMinC: json.daily.temperature_2m_min[i],
      weatherCode: json.daily.weather_code[i],
    })),
  }
}

// WMO weather interpretation codes: https://open-meteo.com/en/docs (see "WMO Weather interpretation codes")
export function describeWeatherCode(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Clear sky', icon: '☀️' }
  if (code <= 2) return { label: 'Partly cloudy', icon: '🌤️' }
  if (code === 3) return { label: 'Overcast', icon: '☁️' }
  if (code === 45 || code === 48) return { label: 'Fog', icon: '🌫️' }
  if (code >= 51 && code <= 55) return { label: 'Drizzle', icon: '🌦️' }
  if (code >= 61 && code <= 65) return { label: 'Rain', icon: '🌧️' }
  if (code >= 71 && code <= 75) return { label: 'Snow', icon: '🌨️' }
  if (code >= 80 && code <= 82) return { label: 'Rain showers', icon: '🌧️' }
  if (code >= 95) return { label: 'Thunderstorm', icon: '⛈️' }
  return { label: 'Unknown', icon: '—' }
}
