/**
 * GBIF (Global Biodiversity Information Facility) client — free, no key required.
 * Docs: https://www.gbif.org/developer/occurrence
 * Complements 3Bee/XNatura with global open occurrence records for a bbox.
 */

export interface GbifOccurrence {
  scientificName?: string
  species?: string
  taxonRank?: string
  eventDate?: string
  decimalLatitude?: number
  decimalLongitude?: number
  basisOfRecord?: string
}

export interface GbifOccurrenceResult {
  totalCount: number
  occurrences: GbifOccurrence[]
}

function bboxParams(bbox: [number, number, number, number]): URLSearchParams {
  const [minLon, minLat, maxLon, maxLat] = bbox
  return new URLSearchParams({
    decimalLatitude: `${minLat},${maxLat}`,
    decimalLongitude: `${minLon},${maxLon}`,
  })
}

export async function searchOccurrences(bbox: [number, number, number, number], limit = 20): Promise<GbifOccurrenceResult> {
  const params = bboxParams(bbox)
  params.set('limit', String(limit))

  const res = await fetch(`https://api.gbif.org/v1/occurrence/search?${params}`)
  if (!res.ok) throw new Error(`GBIF occurrence search failed: ${res.status}`)
  const json = await res.json()

  return {
    totalCount: json.count,
    occurrences: (json.results ?? []).map((r: any) => ({
      scientificName: r.scientificName,
      species: r.species,
      taxonRank: r.taxonRank,
      eventDate: r.eventDate,
      decimalLatitude: r.decimalLatitude,
      decimalLongitude: r.decimalLongitude,
      basisOfRecord: r.basisOfRecord,
    })),
  }
}

export interface GbifSpeciesSummary {
  totalOccurrences: number
  topSpecies: Array<{ scientificName: string; occurrenceCount: number }>
}

export async function speciesSummary(bbox: [number, number, number, number], facetLimit = 10): Promise<GbifSpeciesSummary> {
  const params = bboxParams(bbox)
  params.set('limit', '0')
  params.set('facet', 'speciesKey')
  params.set('facetLimit', String(facetLimit))

  const res = await fetch(`https://api.gbif.org/v1/occurrence/search?${params}`)
  if (!res.ok) throw new Error(`GBIF species summary failed: ${res.status}`)
  const json = await res.json()

  const facet = (json.facets ?? []).find((f: any) => f.field === 'SPECIES_KEY')
  const counts: Array<{ name: string; count: number }> = facet?.counts ?? []

  const topSpecies = await Promise.all(
    counts.map(async ({ name: speciesKey, count }) => {
      const sRes = await fetch(`https://api.gbif.org/v1/species/${speciesKey}`)
      const sJson = sRes.ok ? await sRes.json() : null
      return { scientificName: sJson?.species ?? sJson?.scientificName ?? `speciesKey:${speciesKey}`, occurrenceCount: count }
    }),
  )

  return { totalOccurrences: json.count, topSpecies }
}
