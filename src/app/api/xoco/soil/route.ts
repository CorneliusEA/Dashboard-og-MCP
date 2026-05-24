import { NextResponse } from 'next/server'
import { getSensors, getLatestReadings } from '@/lib/soilsense'

export async function GET() {
  try {
    const [sensors, readings] = await Promise.all([
      getSensors(),
      getLatestReadings(),
    ])

    // Compute field means from latest readings
    const temps = readings.flatMap(r => r.soilTemperature != null ? [r.soilTemperature] : [])
    const paws  = readings.flatMap(r => r.plantAvailableWater != null ? [r.plantAvailableWater] : [])
    const ecs   = readings.flatMap(r => r.electricalConductivity != null ? [r.electricalConductivity] : [])

    const mean = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null

    return NextResponse.json({
      source: 'live',
      sensors,
      readings,
      summary: {
        totalSensors: sensors.length,
        onlineSensors: sensors.filter(s => s.online).length,
        meanTemperature: mean(temps),
        meanPAW: mean(paws),
        meanEC: mean(ecs),
      },
    })
  } catch (err) {
    console.error('SoilSense error:', err)
    return NextResponse.json(
      { source: 'error', error: String(err) },
      { status: 502 },
    )
  }
}
