import type { FuelLog } from '../types';

/**
 * Recalculates consumption (km/L) and cost per km (THB/km) across all fuel logs for a vehicle,
 * properly handling partial fill-ups ("เติมไม่เต็มถัง") by accumulating liters and cost
 * until the next full tank fill-up.
 */
export function recalculateFuelLogs(logs: FuelLog[]): FuelLog[] {
  if (!logs || logs.length === 0) return [];

  // Sort logs chronologically by odometer ascending (secondary by date)
  const sorted = [...logs].sort((a, b) => {
    if (a.odometer !== b.odometer) {
      return a.odometer - b.odometer;
    }
    return new Date(a.date + ' ' + (a.time || '00:00')).getTime() - 
           new Date(b.date + ' ' + (b.time || '00:00')).getTime();
  });

  let lastFullTankOdometer: number | null = null;
  let accumulatedLiters = 0;
  let accumulatedCost = 0;

  const result: FuelLog[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const entry = { ...sorted[i] };

    if (entry.isFullTank) {
      if (lastFullTankOdometer !== null) {
        // Distance traveled since last known full tank
        const distance = entry.odometer - lastFullTankOdometer;
        const totalLitersInWindow = accumulatedLiters + entry.liters;
        const totalCostInWindow = accumulatedCost + entry.totalCost;

        if (distance > 0 && totalLitersInWindow > 0) {
          entry.tripDistance = Number(distance.toFixed(1));
          entry.consumptionKmL = Number((distance / totalLitersInWindow).toFixed(2));
          entry.costPerKm = Number((totalCostInWindow / distance).toFixed(2));
          entry.accumulatedLitersWindow = Number(totalLitersInWindow.toFixed(2));
          entry.accumulatedCostWindow = Number(totalCostInWindow.toFixed(2));
        } else {
          entry.tripDistance = undefined;
          entry.consumptionKmL = undefined;
          entry.costPerKm = undefined;
        }
      } else {
        // First full tank log in history: sets baseline odometer, cannot compute consumption yet
        entry.tripDistance = undefined;
        entry.consumptionKmL = undefined;
        entry.costPerKm = undefined;
      }

      // Reset accumulator and update baseline
      lastFullTankOdometer = entry.odometer;
      accumulatedLiters = 0;
      accumulatedCost = 0;
    } else {
      // Partial fill-up (เติมไม่เต็มถัง)
      // Accumulate liters and cost into the current open window
      accumulatedLiters += entry.liters;
      accumulatedCost += entry.totalCost;

      // Cannot compute true consumption for a partial fill because remaining fuel in tank is unknown
      entry.tripDistance = undefined;
      entry.consumptionKmL = undefined;
      entry.costPerKm = undefined;
      entry.accumulatedLitersWindow = Number(accumulatedLiters.toFixed(2));
      entry.accumulatedCostWindow = Number(accumulatedCost.toFixed(2));
    }

    result.push(entry);
  }

  // Return with latest logs first for intuitive list display, or as is
  return result;
}

/**
 * Previews what the trip distance and km/L would be for a prospective new entry
 */
export function previewFuelCalculation(
  existingLogs: FuelLog[],
  newOdometer: number,
  newLiters: number,
  newTotalCost: number,
  isFullTank: boolean
): {
  tripDistance?: number;
  consumptionKmL?: number;
  costPerKm?: number;
  accumulatedLiters?: number;
  accumulatedCost?: number;
  prevFullTankOdo?: number;
  partialCount: number;
} {
  if (!existingLogs || existingLogs.length === 0) {
    return { partialCount: 0 };
  }

  // Sort existing ascending
  const sorted = [...existingLogs].sort((a, b) => a.odometer - b.odometer);

  // Find the last full tank log
  let lastFullTankOdo: number | null = null;
  let partialLiters = 0;
  let partialCost = 0;
  let partialCount = 0;

  // Scan backwards from most recent logs
  for (let i = sorted.length - 1; i >= 0; i--) {
    const log = sorted[i];
    if (log.isFullTank) {
      lastFullTankOdo = log.odometer;
      break;
    }
  }

  if (lastFullTankOdo === null) {
    return { partialCount: 0 };
  }

  // Sum up all partial logs between lastFullTankOdo and current
  for (const log of sorted) {
    if (log.odometer > lastFullTankOdo && !log.isFullTank) {
      partialLiters += log.liters;
      partialCost += log.totalCost;
      partialCount += 1;
    }
  }

  if (!isFullTank) {
    return {
      partialCount: partialCount + 1,
      accumulatedLiters: Number((partialLiters + newLiters).toFixed(2)),
      accumulatedCost: Number((partialCost + newTotalCost).toFixed(2)),
      prevFullTankOdo: lastFullTankOdo,
    };
  }

  const distance = newOdometer - lastFullTankOdo;
  const totalLiters = partialLiters + newLiters;
  const totalCost = partialCost + newTotalCost;

  if (distance > 0 && totalLiters > 0) {
    return {
      tripDistance: Number(distance.toFixed(1)),
      consumptionKmL: Number((distance / totalLiters).toFixed(2)),
      costPerKm: Number((totalCost / distance).toFixed(2)),
      accumulatedLiters: Number(totalLiters.toFixed(2)),
      accumulatedCost: Number(totalCost.toFixed(2)),
      prevFullTankOdo: lastFullTankOdo,
      partialCount,
    };
  }

  return {
    prevFullTankOdo: lastFullTankOdo,
    partialCount,
  };
}

/**
 * Calculates lifetime vehicle fuel stats
 */
export function calculateLifetimeStats(logs: FuelLog[]) {
  if (!logs || logs.length === 0) {
    return {
      avgKmL: null,
      avgCostPerKm: null,
      totalFuelSpent: 0,
      totalLiters: 0,
      totalTrackedDistance: 0,
      latestKmL: null,
    };
  }

  const recalculated = recalculateFuelLogs(logs);

  let totalFuelSpent = 0;
  let totalLiters = 0;
  let totalDistanceInValidWindows = 0;
  let totalLitersInValidWindows = 0;
  let latestKmL: number | null = null;

  for (const log of recalculated) {
    totalFuelSpent += log.totalCost;
    totalLiters += log.liters;

    if (log.tripDistance && log.consumptionKmL) {
      latestKmL = log.consumptionKmL;
      totalDistanceInValidWindows += log.tripDistance;
      totalLitersInValidWindows += (log.accumulatedLitersWindow || log.liters);
    }
  }

  const avgKmL = totalDistanceInValidWindows > 0 && totalLitersInValidWindows > 0
    ? Number((totalDistanceInValidWindows / totalLitersInValidWindows).toFixed(2))
    : null;

  const avgCostPerKm = totalDistanceInValidWindows > 0 && totalFuelSpent > 0
    ? Number((totalFuelSpent / totalDistanceInValidWindows).toFixed(2))
    : null;

  return {
    avgKmL,
    avgCostPerKm,
    totalFuelSpent: Math.round(totalFuelSpent),
    totalLiters: Number(totalLiters.toFixed(1)),
    totalTrackedDistance: Math.round(totalDistanceInValidWindows),
    latestKmL,
  };
}
