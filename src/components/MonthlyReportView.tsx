import React, { useState, useMemo } from 'react';
import type { Vehicle, FuelLog, MaintenanceLog } from '../types';
import { generateMonthlySummaries, compareMonths } from '../lib/monthlyReport';
import { 
  BarChart3, 
  Calendar, 
  Fuel, 
  Wrench, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  TrendingDown,
  Gauge, 
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { CATEGORY_LABELS } from '../lib/textParser';

interface MonthlyReportViewProps {
  vehicle: Vehicle;
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
  spreadsheetUrl: string | null;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  vehicle,
  fuelLogs,
  maintenanceLogs,
  spreadsheetUrl,
}) => {
  const summaries = useMemo(() => {
    return generateMonthlySummaries(fuelLogs, maintenanceLogs, vehicle.id);
  }, [fuelLogs, maintenanceLogs, vehicle.id]);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    summaries[0]?.monthKey || ''
  );

  const comparison = useMemo(() => {
    return compareMonths(summaries, selectedMonthKey);
  }, [summaries, selectedMonthKey]);

  const current = comparison.current;
  const prev = comparison.previous;
  const deltas = comparison.deltas;

  // Monthly transactions
  const monthFuelLogs = useMemo(() => {
    return fuelLogs
      .filter((f) => f.carId === vehicle.id && f.date.startsWith(selectedMonthKey))
      .sort((a, b) => b.odometer - a.odometer);
  }, [fuelLogs, vehicle.id, selectedMonthKey]);

  const monthMaintLogs = useMemo(() => {
    return maintenanceLogs
      .filter((m) => m.carId === vehicle.id && m.date.startsWith(selectedMonthKey))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [maintenanceLogs, vehicle.id, selectedMonthKey]);

  return (
    <div className="space-y-6">
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-sky-500" />
            <span>รายงานสรุปรายเดือน (Monthly Report)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            สรุปยอดค่าใช้จ่าย ค่าน้ำมัน และอัตราสิ้นเปลือง พร้อมเปรียบเทียบกับเดือนที่แล้วทันที
          </p>
        </div>

        {/* Month Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            เลือกเดือน:
          </label>
          <select
            value={selectedMonthKey}
            onChange={(e) => setSelectedMonthKey(e.target.value)}
            className="text-xs sm:text-sm font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            {summaries.map((s) => (
              <option key={s.monthKey} value={s.monthKey}>
                {s.displayMonth} {s.monthKey === summaries[0]?.monthKey ? '(เดือนนี้)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Month-over-Month Delta Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            ค่าใช้จ่ายรวมทั้งสิ้น
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            ฿{current.totalCost.toLocaleString()}
          </div>
          <div className="mt-2 text-xs flex items-center gap-1.5">
            {deltas.totalCostPct !== null ? (
              deltas.totalCostPct > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-0.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{deltas.totalCostPct}% จากเดือนก่อน
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {deltas.totalCostPct}% จากเดือนก่อน
                </span>
              )
            ) : (
              <span className="text-slate-400">ไม่มีข้อมูลเดือนก่อนหน้า</span>
            )}
          </div>
        </div>

        {/* Fuel Spent Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            ค่าน้ำมันรวม ({current.fuelFillCount} ครั้ง)
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-yellow-500 dark:text-yellow-400 mt-1">
            ฿{current.fuelCost.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            เติมรวม {current.totalLiters.toLocaleString()} ลิตร
            {deltas.fuelCostPct !== null && (
              <span className="ml-1 text-[11px] text-slate-400">
                ({deltas.fuelCostPct > 0 ? `+${deltas.fuelCostPct}%` : `${deltas.fuelCostPct}%`})
              </span>
            )}
          </div>
        </div>

        {/* Maintenance / Upgrades Spent Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            ค่าซ่อมบำรุง & ของแต่ง
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-sky-500 dark:text-sky-400 mt-1">
            ฿{current.maintenanceCost.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {current.maintenanceCount} รายการในเดือนนี้
          </div>
        </div>

        {/* Fuel Economy & Cost/km */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            อัตราสิ้นเปลืองเฉลี่ยของเดือน
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-yellow-500 dark:text-yellow-400 mt-1">
            {current.avgKmL !== null ? `${current.avgKmL} km/L` : '--'}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {current.avgFuelCostPerKm !== null
              ? `ต้นทุนเฉลี่ย: ${current.avgFuelCostPerKm} บาท/km`
              : 'ต้องมีรอบเติมเต็มถัง'}
          </div>
        </div>
      </div>

      {/* Visual Spending Breakdown Bar */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
          สัดส่วนค่าใช้จ่ายประจำเดือน ({current.displayMonth})
        </h2>

        {current.totalCost === 0 ? (
          <div className="text-xs text-slate-400 py-4 text-center">
            ไม่มีค่าใช้จ่ายในเดือนนี้
          </div>
        ) : (
          <div className="space-y-3">
            {/* Visual Segmented Progress Bar (Yellow & Sky) */}
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              {current.fuelCost > 0 && (
                <div
                  style={{ width: `${(current.fuelCost / current.totalCost) * 100}%` }}
                  className="bg-yellow-400 h-full transition-all"
                  title={`ค่าน้ำมัน: ฿${current.fuelCost.toLocaleString()}`}
                />
              )}
              {current.maintenanceCost > 0 && (
                <div
                  style={{ width: `${(current.maintenanceCost / current.totalCost) * 100}%` }}
                  className="bg-sky-500 h-full transition-all"
                  title={`ค่าซ่อม/ของแต่ง: ฿${current.maintenanceCost.toLocaleString()}`}
                />
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  ค่าน้ำมัน: ฿{current.fuelCost.toLocaleString()} ({Math.round((current.fuelCost / current.totalCost) * 100)}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-sky-500" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  ค่าซ่อมบำรุง & ของแต่ง: ฿{current.maintenanceCost.toLocaleString()} ({Math.round((current.maintenanceCost / current.totalCost) * 100)}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Itemized Transactions in Month */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
          รายการธุรกรรมทั้งหมดในเดือน {current.displayMonth}
        </h2>

        {monthFuelLogs.length === 0 && monthMaintLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            ไม่มีรายการบันทึกในเดือนนี้
          </div>
        ) : (
          <div className="space-y-4">
            {/* Fuel entries */}
            {monthFuelLogs.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-emerald-500" />
                  <span>การเติมน้ำมัน ({monthFuelLogs.length} ครั้ง)</span>
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                  {monthFuelLogs.map((log) => (
                    <div key={log.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {log.date} · {log.isFullTank ? 'เต็มถัง' : 'เติมไม่เต็มถัง (ทบยอด)'} · {log.gasStation || 'ปั๊ม'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          ไมล์: {log.odometer.toLocaleString()} km · {log.liters} L {log.consumptionKmL ? `· ${log.consumptionKmL} km/L` : ''}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        ฿{log.totalCost.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Maintenance entries */}
            {monthMaintLogs.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-500" />
                  <span>งานซ่อมบำรุงและของแต่ง ({monthMaintLogs.length} รายการ)</span>
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                  {monthMaintLogs.map((log) => {
                    const catMeta = CATEGORY_LABELS[log.category] || CATEGORY_LABELS.routine;
                    return (
                      <div key={log.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${catMeta.color}`}>
                              {catMeta.label}
                            </span>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {log.title}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {log.date} · ไมล์: {log.odometer ? `${log.odometer.toLocaleString()} km` : '-'} {log.workshop ? `· ${log.workshop}` : ''}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                          ฿{log.cost.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
