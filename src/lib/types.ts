export interface OverviewMetrics {
  carbonReserveTCO2e: number
  eudrCommunitiesCompliant: number
  eudrCommunitiesTotal: number
  annualSeqLow: number
  annualSeqHigh: number
  eLedgerPerKgCacao: number
  totalFarmers: number
  totalHa: number
  birdSpecies: number
  monthlyRevenue: number
  phase: number
}

export type EUDRStatus = 'compliant' | 'pending' | 'missing'

export interface Community {
  name: string
  farmers: number
  ha: number
  eudr: EUDRStatus
  carbonTCO2e: number
}

export interface EUDRMetrics {
  communitiesCompliant: number
  communitiesTotal: number
  farmPolygonsCollected: number
  farmPolygonsTotal: number
  deforestationBaselineYear: number
  areaHa: number
  communities: Community[]
}

export interface CarbonScenario {
  label: string
  pricePerTonne: number
  currency: string
  lowSeqRevenue: number
  highSeqRevenue: number
}

export interface CarbonMetrics {
  reserveTCO2e: number
  annualSeqLowT: number
  annualSeqHighT: number
  tradeablePotentialLow: number
  tradeablePotentialHigh: number
  scenarios: CarbonScenario[]
  cAndNStockTPerHa: number
}

export interface ELedgerMetrics {
  seqPerKgCacao: number
  processShippingEmissions: number
  netCarbonPerKgShipped: number
  annualExportTonnes: number
  annualCarbonCertTCO2e: number
}

export interface BiodiversityMetrics {
  totalBirdSpecies: number
  inCacaoAndForest: number
  cacaoOnly: number
  migratoryInCacao: number
  forestOnly: number
}

export interface FinanceMetrics {
  carbonCreditPotentialUSD: number
  dfiRelationships: number
  cbamReadinessYear: number
  pilotCostEUR: number
  annualRevenueUSD: number
  carbonLow: number
  carbonHigh: number
  cbamPotentialLow: number
  cbamPotentialHigh: number
}
