import React from 'react';
import type { Vehicle, FuelLog, MaintenanceLog } from '../types';
import { calculateLifetimeStats } from '../lib/fuelAlgorithm';
import { 
  Gauge, 
  Fuel, 
  Wrench, 
  Calendar, 
  ArrowUpRight, 
  TrendingUp, 
  Layers, 
  Sparkles, 
  Car,
  Camera,
  AlertCircle
} from 'lucide-react';
import { CATEGORY_LABELS } from '../lib/textParser';

interface DashboardViewProps {
  vehicle: Vehicle | null;
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
  onNavigateToFuel: () => void;
  onNavigateToMaintenance: () => void;
  onNavigateToReport: () => void;
  onOpenEditVehicle: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  vehicle,
  fuelLogs,
  maintenanceLogs,
  onNavigateToFuel,
  onNavigateToMaintenance,
  onNavigateToReport,
  onOpenEditVehicle,
}) => {
  if (!vehicle) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Car className="w-12 h-12 mx-auto text-sky-400 mb-2 opacity-50" />
        <p>ยังไม่มีข้อมูลรถ กรุณาเพิ่มรถคันแรกเพื่อเริ่มใช้งาน</p>
      </div>
    );
  }

  const vFuelLogs = fuelLogs.filter((f) => f.carId === vehicle.id);
  const vMaintLogs = maintenanceLogs.filter((m) => m.carId === vehicle.id);

  const stats = calculateLifetimeStats(vFuelLogs);

  // Calculate current month spend
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const thisMonthFuel = vFuelLogs
    .filter((f) => f.date.startsWith(currentMonthPrefix))
    .reduce((sum, f) => sum + f.totalCost, 0);

  const thisMonthMaint = vMaintLogs
    .filter((m) => m.date.startsWith(currentMonthPrefix))
    .reduce((sum, m) => sum + m.cost, 0);

  const thisMonthTotal = thisMonthFuel + thisMonthMaint;

  // Check pending partial fill-ups
  const sortedFuel = [...vFuelLogs].sort((a, b) => a.odometer - b.odometer);
  let pendingPartialLiters = 0;
  let pendingPartialCost = 0;
  let pendingPartialCount = 0;

  let lastFullIndex = -1;
  for (let i = sortedFuel.length - 1; i >= 0; i--) {
    if (sortedFuel[i].isFullTank) {
      lastFullIndex = i;
      break;
    }
  }

  if (lastFullIndex !== -1) {
    for (let i = lastFullIndex + 1; i < sortedFuel.length; i++) {
      if (!sortedFuel[i].isFullTank) {
        pendingPartialLiters += sortedFuel[i].liters;
        pendingPartialCost += sortedFuel[i].totalCost;
        pendingPartialCount++;
      }
    }
  } else {
    for (const log of sortedFuel) {
      if (!log.isFullTank) {
        pendingPartialLiters += log.liters;
        pendingPartialCost += log.totalCost;
        pendingPartialCount++;
      }
    }
  }

  // Combine latest 5 events
  const combinedActivities = [
    ...vFuelLogs.map((f) => ({
      type: 'fuel' as const,
      id: f.id,
      date: f.date,
      time: f.time,
      odometer: f.odometer,
      title: f.isFullTank ? 'เติมน้ำมัน (เต็มถัง)' : 'เติมน้ำมัน (ไม่เต็มถัง)',
      cost: f.totalCost,
      subtext: `${f.liters} L ${f.consumptionKmL ? `· ${f.consumptionKmL} km/L` : ''}`,
      badge: f.gasStation || 'ปั๊มน้ำมัน',
    })),
    ...vMaintLogs.map((m) => ({
      type: 'maintenance' as const,
      id: m.id,
      date: m.date,
      time: '',
      odometer: m.odometer,
      title: m.title,
      cost: m.cost,
      subtext: CATEGORY_LABELS[m.category]?.label || 'ซ่อมบำรุง',
      badge: m.workshop || 'บันทึกงาน',
    })),
  ].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  }).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Vehicle Hero Card with Profile Picture */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-sky-500/30 text-white shadow-2xl shadow-sky-950/40">
        <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
          {/* Left Column: Car Details & Quick Buttons */}
          <div className="p-6 sm:p-7 md:col-span-7 flex flex-col justify-between z-10">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold tracking-wider text-slate-950 bg-yellow-400 px-2.5 py-0.5 rounded-md shadow-sm">
                  {vehicle.licensePlate || 'ไม่มีทะเบียน'}
                </span>
                {vehicle.fuelType && (
                  <span className="text-xs font-medium text-sky-300 bg-sky-950/80 px-2.5 py-0.5 rounded-md border border-sky-700/60">
                    {vehicle.fuelType}
                  </span>
                )}
                {vehicle.color && (
                  <span className="text-xs text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-700">
                    {vehicle.color}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mt-2.5 text-white">
                {vehicle.name}
              </h1>

              <div className="mt-2 text-xs sm:text-sm text-slate-300 flex items-center gap-2 flex-wrap font-medium">
                <span>ไมล์เริ่มต้น: {vehicle.initialOdometer.toLocaleString()} km</span>
                <span className="text-sky-500">·</span>
                <span>ถังน้ำมัน: {vehicle.fuelTankCapacity ? `${vehicle.fuelTankCapacity} ลิตร` : 'ไม่ระบุ'}</span>
                {vehicle.notes && (
                  <>
                    <span className="text-sky-500">·</span>
                    <span className="text-slate-400 italic">{vehicle.notes}</span>
                  </>
                )}
              </div>
            </div>

            {/* Blue & Yellow Action Buttons */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center gap-2.5 flex-wrap">
              <button
                onClick={onNavigateToFuel}
                className="px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-black rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 transition-all flex items-center gap-2 shadow-lg shadow-yellow-400/20 active:scale-95"
              >
                <Fuel className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <span>+ จดค่าน้ำมัน</span>
              </button>
              <button
                onClick={onNavigateToMaintenance}
                className="px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 transition-all flex items-center gap-2 shadow-lg shadow-sky-500/20 active:scale-95"
              >
                <Wrench className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <span>+ ซ่อม/ของแต่ง</span>
              </button>
              <button
                onClick={onOpenEditVehicle}
                className="px-3 py-2.5 text-xs font-semibold rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5"
                title="เปลี่ยนรูปรถหรือแก้ไขข้อมูล"
              >
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                <span>เพิ่ม/เปลี่ยนรูปรถ</span>
              </button>
            </div>
          </div>

          {/* Right Column: Car Profile Picture Showcase */}
          <div className="md:col-span-5 relative min-h-[220px] md:min-h-full bg-slate-950 flex items-center justify-center overflow-hidden border-t md:border-t-0 md:border-l border-slate-800">
            {vehicle.imageUrl ? (
              <div className="w-full h-full relative group">
                <img
                  src={vehicle.imageUrl}
                  alt={vehicle.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-slate-900/90 via-slate-900/20 to-transparent pointer-events-none" />
                <button
                  onClick={onOpenEditVehicle}
                  className="absolute bottom-3 right-3 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-medium backdrop-blur-xs border border-white/20 transition-all opacity-80 hover:opacity-100 flex items-center gap-1"
                >
                  <Camera className="w-3 h-3 text-yellow-400" />
                  <span>เปลี่ยนรูปรถ</span>
                </button>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-sky-950/60 border border-sky-500/30 mx-auto flex items-center justify-center text-sky-400 mb-2.5 shadow-inner">
                  <Car className="w-8 h-8 stroke-[1.8]" />
                </div>
                <div className="text-xs font-semibold text-slate-300">
                  ยังไม่ได้ใส่รูปรถ
                </div>
                <button
                  onClick={onOpenEditVehicle}
                  className="mt-2.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-sky-950 inline-flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>อัปโหลดรูปรถ</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Automotive Digital Cluster KPI Cards (Blue & Yellow Palette) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Current Odometer */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-sky-500/20 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">เลขไมล์ปัจจุบัน</span>
            <Gauge className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-sky-400">
            {vehicle.currentOdometer.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 ml-1">km</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            วิ่งไปแล้ว {(vehicle.currentOdometer - vehicle.initialOdometer).toLocaleString()} km
          </div>
        </div>

        {/* Card 2: Average Fuel Economy (km/L) in Racing Yellow */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-yellow-500/20 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">อัตราสิ้นเปลืองเฉลี่ย</span>
            <TrendingUp className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-yellow-400">
            {stats.avgKmL !== null ? stats.avgKmL : '--'}
            <span className="text-xs font-normal text-slate-400 ml-1">km/L</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.latestKmL ? `รอบล่าสุด: ${stats.latestKmL} km/L` : 'ต้องการรอบเติมเต็มถัง'}
          </div>
        </div>

        {/* Card 3: Fuel Cost / km */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-sky-500/20 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">ต้นทุนค่าน้ำมัน</span>
            <Fuel className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-white">
            {stats.avgCostPerKm !== null ? stats.avgCostPerKm : '--'}
            <span className="text-xs font-normal text-slate-400 ml-1">บาท/km</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            เติมรวม {stats.totalLiters.toLocaleString()} ลิตร
          </div>
        </div>

        {/* Card 4: Month Total Expenses */}
        <div 
          onClick={onNavigateToReport}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-yellow-500/20 shadow-md cursor-pointer hover:border-yellow-400/40 transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">ค่าใช้จ่ายเดือนนี้</span>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-yellow-400 transition-colors" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-yellow-400">
            ฿{thisMonthTotal.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>น้ำมัน ฿{thisMonthFuel.toLocaleString()}</span>
            <span>ซ่อม ฿{thisMonthMaint.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Partial Fill-up Accumulator Notice */}
      {pendingPartialCount > 0 && (
        <div className="p-4 rounded-2xl bg-yellow-950/40 border border-yellow-500/40 text-yellow-200 shadow-md">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-yellow-400 text-slate-950 shrink-0 mt-0.5 font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div className="text-xs sm:text-sm">
              <div className="font-bold text-yellow-300 flex items-center gap-1.5">
                <span>กำลังทบยอด "เติมไม่เต็มถัง" สะสม {pendingPartialCount} ครั้ง</span>
              </div>
              <p className="mt-1 text-yellow-100/90 leading-relaxed">
                ระบบได้ทบยอดน้ำมันไว้ <strong className="font-mono text-yellow-300">{pendingPartialLiters.toFixed(2)} ลิตร</strong> (เป็นเงิน <strong className="font-mono text-yellow-300">{pendingPartialCost.toLocaleString()} บาท</strong>) เมื่อคุณเติมเต็มถังครั้งถัดไป ระบบจะนำยอดนี้ไปคำนวณอัตราสิ้นเปลือง (km/L) และต้นทุน (บาท/km) เฉลี่ยของทั้งรอบให้อัตโนมัติเป๊ะที่สุด!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Recent Activity Feed */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
            <span>กิจกรรมและบันทึกล่าสุด</span>
          </h2>
          <span className="text-xs text-slate-400">
            ทั้งหมด {vFuelLogs.length + vMaintLogs.length} รายการ
          </span>
        </div>

        {combinedActivities.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            ยังไม่มีบันทึกข้อมูล เริ่มต้นด้วยการกด "+ จดค่าน้ำมัน" หรือ "+ ซ่อม/ของแต่ง" ด้านบน
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {combinedActivities.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      item.type === 'fuel'
                        ? 'bg-yellow-400 text-slate-950 font-bold'
                        : 'bg-sky-500 text-slate-950 font-bold'
                    }`}
                  >
                    {item.type === 'fuel' ? <Fuel className="w-4 h-4 stroke-[2.5]" /> : <Wrench className="w-4 h-4 stroke-[2.5]" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">
                      {item.title}
                    </div>
                    <div className="text-slate-400 text-[11px] flex items-center gap-2 mt-0.5">
                      <span>{item.date}</span>
                      <span>·</span>
                      <span className="font-mono">{item.odometer.toLocaleString()} km</span>
                      <span>·</span>
                      <span>{item.subtext}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`font-black font-mono text-sm sm:text-base ${item.type === 'fuel' ? 'text-yellow-400' : 'text-sky-400'}`}>
                    ฿{item.cost.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {item.badge}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
