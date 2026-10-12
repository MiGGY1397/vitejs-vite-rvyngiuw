import type { FuelLog, MaintenanceLog, MonthlySummary } from '../types';

export interface MonthComparison {
  current: MonthlySummary;
  previous: MonthlySummary | null;
  deltas: {
    totalCostPct: number | null; // e.g. +15.2%
    fuelCostPct: number | null;
    maintCostPct: number | null;
    distanceDiff: number | null; // km difference
    kmLDiff: number | null; // e.g. -0.8 km/L
  };
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export function formatThaiMonth(yearMonth: string): string {
  // yearMonth format: "YYYY-MM"
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return yearMonth;
  }
  const thaiYear = year + 543; // พ.ศ.
  return `${THAI_MONTHS[month - 1]} ${thaiYear} (${year})`;
}

export function generateMonthlySummaries(
  fuelLogs: FuelLog[],
  maintenanceLogs: MaintenanceLog[],
  carId?: string
): MonthlySummary[] {
  const filteredFuel = carId ? fuelLogs.filter(f => f.carId === carId) : fuelLogs;
  const filteredMaint = carId ? maintenanceLogs.filter(m => m.carId === carId) : maintenanceLogs;

  // Collect all month keys
  const monthKeysSet = new Set<string>();

  filteredFuel.forEach(f => {
    if (f.date && f.date.length >= 7) {
      monthKeysSet.add(f.date.substring(0, 7));
    }
  });

  filteredMaint.forEach(m => {
    if (m.date && m.date.length >= 7) {
      monthKeysSet.add(m.date.substring(0, 7));
    }
  });

  // Also ensure current month and previous month are in the list if empty
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  monthKeysSet.add(currentMonthKey);

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  monthKeysSet.add(prevMonthKey);

  const monthKeys = Array.from(monthKeysSet).sort().reverse(); // Latest month first

  return monthKeys.map(monthKey => {
    const fInMonth = filteredFuel.filter(f => f.date.startsWith(monthKey));
    const mInMonth = filteredMaint.filter(m => m.date.startsWith(monthKey));

    const fuelCost = fInMonth.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);
    const maintenanceCost = mInMonth.reduce((acc, curr) => acc + (curr.cost || 0), 0);
    const totalCost = fuelCost + maintenanceCost;
    const totalLiters = fInMonth.reduce((acc, curr) => acc + (curr.liters || 0), 0);

    // Calculate distance driven in month based on fuel tripDistance or odometer min/max
    let distanceDriven = 0;
    const odomValues = [...fInMonth.map(f => f.odometer), ...mInMonth.map(m => m.odometer)].filter(o => o > 0);
    if (odomValues.length >= 2) {
      distanceDriven = Math.max(...odomValues) - Math.min(...odomValues);
    } else {
      // Sum tripDistance if any
      const tripSum = fInMonth.reduce((acc, curr) => acc + (curr.tripDistance || 0), 0);
      distanceDriven = tripSum;
    }

    // Calculate avg km/L for this month
    const validFullTankLogs = fInMonth.filter(f => f.consumptionKmL && f.tripDistance);
    let avgKmL: number | null = null;
    if (validFullTankLogs.length > 0) {
      const sumDist = validFullTankLogs.reduce((acc, f) => acc + (f.tripDistance || 0), 0);
      const sumLit = validFullTankLogs.reduce((acc, f) => acc + (f.accumulatedLitersWindow || f.liters), 0);
      if (sumDist > 0 && sumLit > 0) {
        avgKmL = Number((sumDist / sumLit).toFixed(2));
      }
    }

    const avgFuelCostPerKm = distanceDriven > 0 && fuelCost > 0
      ? Number((fuelCost / distanceDriven).toFixed(2))
      : null;

    const totalCostPerKm = distanceDriven > 0 && totalCost > 0
      ? Number((totalCost / distanceDriven).toFixed(2))
      : null;

    return {
      monthKey,
      displayMonth: formatThaiMonth(monthKey),
      totalCost: Math.round(totalCost),
      fuelCost: Math.round(fuelCost),
      maintenanceCost: Math.round(maintenanceCost),
      totalLiters: Number(totalLiters.toFixed(1)),
      distanceDriven: Math.round(distanceDriven),
      avgKmL,
      avgFuelCostPerKm,
      totalCostPerKm,
      fuelFillCount: fInMonth.length,
      maintenanceCount: mInMonth.length,
    };
  });
}

export function compareMonths(summaries: MonthlySummary[], selectedMonthKey: string): MonthComparison {
  const currentIndex = summaries.findIndex(s => s.monthKey === selectedMonthKey);
  const current = currentIndex !== -1 ? summaries[currentIndex] : summaries[0];
  
  // Previous chronologically (next index in descending array)
  const previous = (currentIndex !== -1 && currentIndex + 1 < summaries.length)
    ? summaries[currentIndex + 1]
    : null;

  let totalCostPct: number | null = null;
  let fuelCostPct: number | null = null;
  let maintCostPct: number | null = null;
  let distanceDiff: number | null = null;
  let kmLDiff: number | null = null;

  if (previous) {
    if (previous.totalCost > 0) {
      totalCostPct = Number((((current.totalCost - previous.totalCost) / previous.totalCost) * 100).toFixed(1));
    }
    if (previous.fuelCost > 0) {
      fuelCostPct = Number((((current.fuelCost - previous.fuelCost) / previous.fuelCost) * 100).toFixed(1));
    }
    if (previous.maintenanceCost > 0) {
      maintCostPct = Number((((current.maintenanceCost - previous.maintenanceCost) / previous.maintenanceCost) * 100).toFixed(1));
    }
    distanceDiff = current.distanceDriven - previous.distanceDriven;
    if (current.avgKmL !== null && previous.avgKmL !== null) {
      kmLDiff = Number((current.avgKmL - previous.avgKmL).toFixed(2));
    }
  }

  return {
    current,
    previous,
    deltas: {
      totalCostPct,
      fuelCostPct,
      maintCostPct,
      distanceDiff,
      kmLDiff,
    },
  };
}
