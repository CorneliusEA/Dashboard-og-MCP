/**
 * Open-Meteo client — free weather API, no key required.
 * Docs: https://open-meteo.com/en/docs (forecast), https://open-meteo.com/en/docs/historical-weather-api (archive)
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
  }
  daily: Array<{
    date: string
    precipitationSumMm: number
    temperatureMaxC: number
    temperatureMinC: number
  }>
}

export async function fetchForecast(lat: number, lon: number): Promise<WeatherForecast> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,precipitation,relative_humidity_2m',
    daily: 'precipitation_sum,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
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
    },
    daily: dailyTimes.map((date, i) => ({
      date,
      precipitationSumMm: json.daily.precipitation_sum[i],
      temperatureMaxC: json.daily.temperature_2m_max[i],
      temperatureMinC: json.daily.temperature_2m_min[i],
    })),
  }
}

export interface WeatherHistory {
  latitude: number
  longitude: number
  daily: Array<{
    date: string
    precipitationSumMm: number
    temperatureMaxC: number
    temperatureMinC: number
  }>
}

export async function fetchHistory(lat: number, lon: number, from: string, to: string): Promise<WeatherHistory> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: from,
    end_date: to,
    daily: 'precipitation_sum,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
  })
  const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`)
  if (!res.ok) throw new Error(`Open-Meteo archive failed: ${res.status}`)
  const json = await res.json()

  const dailyTimes: string[] = json.daily?.time ?? []
  return {
    latitude: json.latitude,
    longitude: json.longitude,
    daily: dailyTimes.map((date, i) => ({
      date,
      precipitationSumMm: json.daily.precipitation_sum[i],
      temperatureMaxC: json.daily.temperature_2m_max[i],
      temperatureMinC: json.daily.temperature_2m_min[i],
    })),
  }
}
