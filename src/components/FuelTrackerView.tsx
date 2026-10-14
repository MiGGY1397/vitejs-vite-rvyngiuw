import React, { useState, useMemo } from 'react';
import type { Vehicle, FuelLog } from '../types';
import { previewFuelCalculation } from '../lib/fuelAlgorithm';
import { 
  Fuel, 
  Calendar, 
  Gauge, 
  Coins, 
  CheckCircle, 
  Info, 
  Layers, 
  Plus, 
  ExternalLink,
  Zap,
  ArrowRight
} from 'lucide-react';

interface FuelTrackerViewProps {
  vehicle: Vehicle;
  fuelLogs: FuelLog[];
  onAddFuelLog: (log: Omit<FuelLog, 'id'>) => Promise<void>;
  spreadsheetUrl: string | null;
  isSaving: boolean;
}

const GAS_STATIONS = ['PTT Station', 'Bangchak', 'Shell', 'Caltex', 'PT', 'Susco', 'อื่นๆ'];

export const FuelTrackerView: React.FC<FuelTrackerViewProps> = ({
  vehicle,
  fuelLogs,
  onAddFuelLog,
  spreadsheetUrl,
  isSaving,
}) => {
  const vLogs = useMemo(() => {
    return fuelLogs
      .filter((f) => f.carId === vehicle.id)
      .sort((a, b) => b.odometer - a.odometer);
  }, [fuelLogs, vehicle.id]);

  const latestLog = vLogs[0] || null;
  const previousOdometer = latestLog ? latestLog.odometer : vehicle.initialOdometer;

  // Form State
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(currentTimeStr);
  const [odometer, setOdometer] = useState<string>(previousOdometer > 0 ? String(previousOdometer + 450) : '');
  const [totalCost, setTotalCost] = useState<string>('1000');
  const [pricePerLiter, setPricePerLiter] = useState<string>('38.50');
  const [liters, setLiters] = useState<string>('25.97');
  const [isFullTank, setIsFullTank] = useState<boolean>(true);
  const [gasStation, setGasStation] = useState<string>('PTT Station');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Auto calculate liters when totalCost or pricePerLiter changes
  const handleCostOrPriceChange = (newCostStr: string, newPriceStr: string) => {
    const cost = parseFloat(newCostStr);
    const price = parseFloat(newPriceStr);
    if (!isNaN(cost) && !isNaN(price) && price > 0) {
      setLiters((cost / price).toFixed(2));
    }
  };

  const handleLitersChange = (newLitersStr: string) => {
    setLiters(newLitersStr);
    const lit = parseFloat(newLitersStr);
    const price = parseFloat(pricePerLiter);
    if (!isNaN(lit) && !isNaN(price) && price > 0) {
      setTotalCost((lit * price).toFixed(0));
    }
  };

  // Real-time Preview using partial accumulator logic
  const preview = useMemo(() => {
    const odoNum = parseFloat(odometer);
    const litNum = parseFloat(liters);
    const costNum = parseFloat(totalCost);

    if (isNaN(odoNum) || isNaN(litNum) || isNaN(costNum) || litNum <= 0 || costNum <= 0) {
      return null;
    }

    return previewFuelCalculation(
      vLogs,
      odoNum,
      litNum,
      costNum,
      isFullTank
    );
  }, [vLogs, odometer, liters, totalCost, isFullTank]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const odoNum = parseFloat(odometer);
    const litNum = parseFloat(liters);
    const costNum = parseFloat(totalCost);
    const priceNum = parseFloat(pricePerLiter);

    if (isNaN(odoNum) || odoNum <= 0) {
      setFormError('กรุณากรอกเลขไมล์ปัจจุบัน');
      return;
    }

    if (odoNum <= previousOdometer && vLogs.length > 0) {
      setFormError(`เลขไมล์ปัจจุบัน (${odoNum.toLocaleString()}) ต้องมากกว่าเลขไมล์ครั้งก่อน (${previousOdometer.toLocaleString()})`);
      return;
    }

    if (isNaN(litNum) || litNum <= 0) {
      setFormError('กรุณากรอกจำนวนลิตร');
      return;
    }

    if (isNaN(costNum) || costNum <= 0) {
      setFormError('กรุณากรอกยอดเงินรวม');
      return;
    }

    try {
      await onAddFuelLog({
        carId: vehicle.id,
        date,
        time,
        odometer: odoNum,
        liters: Number(litNum.toFixed(2)),
        totalCost: Math.round(costNum),
        pricePerLiter: Number((priceNum || (costNum / litNum)).toFixed(2)),
        isFullTank,
        gasStation,
        notes: notes.trim(),
      });

      // Reset form slightly for next use
      setNotes('');
      setOdometer(String(odoNum + 400));
    } catch (err: any) {
      setFormError(err.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Fuel className="w-6 h-6 text-emerald-500" />
            <span>ระบบจดบันทึกน้ำมันอัจฉริยะ</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            บันทึกและส่งตรงเข้า Google Sheets ทันที รองรับการทบยอดเติมไม่เต็มถัง
          </p>
        </div>

        {spreadsheetUrl && (
          <a
            href={spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto"
          >
            <span>เปิดดูตารางใน Google Sheets</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Main Logging Form Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date & Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                วันที่และเวลา
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-24 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Odometer */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  เลขไมล์ปัจจุบัน (km)
                </label>
                <span className="text-[11px] text-slate-400">
                  ครั้งก่อน: {previousOdometer.toLocaleString()}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  placeholder="เช่น 45600"
                  required
                  className="w-full text-sm font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Gauge className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Total Cost */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ยอดเงินรวม (บาท)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={totalCost}
                  onChange={(e) => {
                    setTotalCost(e.target.value);
                    handleCostOrPriceChange(e.target.value, pricePerLiter);
                  }}
                  placeholder="1000"
                  required
                  className="w-full text-sm font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs font-medium text-slate-400 absolute right-3 top-2.5">
                  บาท
                </span>
              </div>
            </div>

            {/* Price per Liter & Liters */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ราคาต่อลิตร & จำนวนลิตร
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={pricePerLiter}
                  onChange={(e) => {
                    setPricePerLiter(e.target.value);
                    handleCostOrPriceChange(totalCost, e.target.value);
                  }}
                  placeholder="38.50"
                  className="text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  step="0.01"
                  value={liters}
                  onChange={(e) => handleLitersChange(e.target.value)}
                  placeholder="25.97"
                  className="text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Full Tank vs Partial Switch (Key Algorithm Feature) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  สถานะการเติมน้ำมัน
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  เลือกประเภทเพื่อให้อัลกอริทึมคำนวณอัตราสิ้นเปลืองได้อย่างถูกต้องแม่นยำ
                </p>
              </div>

              {/* Segmented Selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-900 rounded-lg">
                <button
                  type="button"
                  onClick={() => setIsFullTank(true)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                    isFullTank
                      ? 'bg-yellow-400 text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  เติมเต็มถัง (Full Tank)
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullTank(false)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                    !isFullTank
                      ? 'bg-sky-400 text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  เติมไม่เต็มถัง (Partial Fill)
                </button>
              </div>
            </div>

            {/* Live Algorithm Preview Box */}
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs">
              {isFullTank ? (
                preview && preview.tripDistance ? (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sky-600 dark:text-sky-400">
                    <span className="font-semibold flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-sky-400" />
                      ผลลัพธ์คำนวณรอบนี้:
                    </span>
                    <span>
                      ระยะทาง: <strong className="font-mono text-white">{preview.tripDistance} km</strong>
                    </span>
                    <span>
                      ลิตรรวม: <strong className="font-mono text-white">{preview.accumulatedLiters} L</strong>
                      {preview.partialCount > 0 && ` (ทบยอดจาก ${preview.partialCount} ครั้งก่อนหน้า)`}
                    </span>
                    <span className="bg-sky-400/20 text-sky-300 px-2 py-0.5 rounded font-mono font-bold border border-sky-400/30">
                      อัตราสิ้นเปลือง: {preview.consumptionKmL} km/L ({preview.costPerKm} บ./km)
                    </span>
                  </div>
                ) : (
                  <div className="text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-sky-400" />
                    <span>
                      รอบนี้จะถูกบันทึกเป็นฐานเริ่มต้นสำหรับคิดอัตราสิ้นเปลือง (หรือคำนวณเมื่อมีเลขไมล์มากกว่าครั้งก่อน)
                    </span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2 text-sky-300">
                  <Layers className="w-4 h-4 shrink-0 text-sky-400" />
                  <span>
                    <strong className="text-sky-400">โหมดเติมไม่เต็มถัง:</strong> ระบบจะทบยอดจำนวนลิตร ({liters || 0} L) และยอดเงิน ({totalCost || 0} บาท) ไว้ในรอบสะสม และจะนำไปคำนวณอัตราสิ้นเปลืองในครั้งถัดไปที่คุณเติมเต็มถัง
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Gas Station & Notes Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ปั๊มน้ำมัน
              </label>
              <select
                value={gasStation}
                onChange={(e) => setGasStation(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {GAS_STATIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                หมายเหตุเพิ่มเติม (ถ้ามี)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เช่น เดินทางไกลไปเชียงใหม่, รถติดในเมือง"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {formError}
            </div>
          )}

          {/* Submit Button (Racing Yellow & Electric Blue) */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3.5 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/20 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 stroke-[2.5]" />
            <span>{isSaving ? 'กำลังส่งข้อมูลไปยัง Google Sheets...' : 'บันทึกและส่งเข้า Google Sheets ทันที'}</span>
          </button>
        </form>
      </div>

      {/* Fuel History Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            ประวัติการเติมน้ำมัน ({vLogs.length} ครั้ง)
          </h2>
          <span className="text-xs text-slate-400">
            เรียงตามเลขไมล์ล่าสุด
          </span>
        </div>

        {vLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            ยังไม่มีประวัติการเติมน้ำมันสำหรับรถคันนี้
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">วันที่/เวลา</th>
                  <th className="py-3 px-4">เลขไมล์</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4 text-right">จำนวนลิตร</th>
                  <th className="py-3 px-4 text-right">ยอดเงิน (฿)</th>
                  <th className="py-3 px-4 text-right">ระยะทาง (km)</th>
                  <th className="py-3 px-4 text-right">อัตราสิ้นเปลือง</th>
                  <th className="py-3 px-4 text-right">บาท/km</th>
                  <th className="py-3 px-4">ปั๊ม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {vLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-sans whitespace-nowrap">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{log.date}</div>
                      <div className="text-[11px] text-slate-400">{log.time}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white tabular-nums">
                      {log.odometer.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-sans whitespace-nowrap">
                      {log.isFullTank ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                          เต็มถัง
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/20">
                          ไม่เต็มถัง (ทบยอด)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {log.liters.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                      ฿{log.totalCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {log.tripDistance ? `+${log.tripDistance.toLocaleString()} km` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {log.consumptionKmL ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                          {log.consumptionKmL} km/L
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-sans">
                          {log.isFullTank ? 'ฐานเริ่มต้น' : 'ทบยอด'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {log.costPerKm ? `${log.costPerKm} บ.` : '-'}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-500 dark:text-slate-400">
                      {log.gasStation || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
