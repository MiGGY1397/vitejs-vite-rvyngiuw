import React, { useState, useMemo } from 'react';
import type { Vehicle, MaintenanceLog, MaintenanceCategory } from '../types';
import { parseMaintenanceInput, CATEGORY_LABELS } from '../lib/textParser';
import { 
  Wrench, 
  Sparkles, 
  CheckCircle, 
  Tag, 
  Gauge, 
  Calendar, 
  Building2, 
  ExternalLink,
  Sliders,
  DollarSign
} from 'lucide-react';

interface MaintenanceViewProps {
  vehicle: Vehicle;
  maintenanceLogs: MaintenanceLog[];
  onAddMaintenanceLog: (log: Omit<MaintenanceLog, 'id'>) => Promise<void>;
  spreadsheetUrl: string | null;
  isSaving: boolean;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  vehicle,
  maintenanceLogs,
  onAddMaintenanceLog,
  spreadsheetUrl,
  isSaving,
}) => {
  const vLogs = useMemo(() => {
    return maintenanceLogs
      .filter((m) => m.carId === vehicle.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [maintenanceLogs, vehicle.id]);

  const [rawInput, setRawInput] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualCost, setManualCost] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory>('routine');
  const [hasManualOverride, setHasManualOverride] = useState(false);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [date, setDate] = useState(todayStr);
  const [odometer, setOdometer] = useState<string>(vehicle.currentOdometer > 0 ? String(vehicle.currentOdometer) : '');
  const [workshop, setWorkshop] = useState('');
  const [notes, setNotes] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [formError, setFormError] = useState<string | null>(null);

  // Live Regex parsing of trailing number as user types
  const parsed = useMemo(() => {
    return parseMaintenanceInput(rawInput);
  }, [rawInput]);

  // Sync parsed result to form fields if user hasn't manually overridden them
  const effectiveTitle = hasManualOverride ? manualTitle : parsed.title;
  const effectiveCost = hasManualOverride ? manualCost : (parsed.cost !== null ? String(parsed.cost) : '');
  const effectiveCategory = hasManualOverride ? category : parsed.category;

  const handleRawInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRawInput(e.target.value);
    setHasManualOverride(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const titleToSave = effectiveTitle.trim();
    const costNum = parseFloat(effectiveCost);
    const odoNum = parseFloat(odometer);

    if (!titleToSave) {
      setFormError('กรุณาระบุชื่อรายการ');
      return;
    }

    if (isNaN(costNum) || costNum < 0) {
      setFormError('กรุณาระบุราคาหรือค่าใช้จ่าย');
      return;
    }

    try {
      await onAddMaintenanceLog({
        carId: vehicle.id,
        date,
        odometer: !isNaN(odoNum) ? odoNum : vehicle.currentOdometer,
        category: effectiveCategory,
        title: titleToSave,
        cost: Math.round(costNum),
        workshop: workshop.trim(),
        notes: notes.trim(),
        rawInput: rawInput.trim(),
      });

      // Reset
      setRawInput('');
      setManualTitle('');
      setManualCost('');
      setWorkshop('');
      setNotes('');
      setHasManualOverride(false);
    } catch (err: any) {
      setFormError(err.message || 'บันทึกไม่สำเร็จ');
    }
  };

  // Filtered list
  const filteredList = useMemo(() => {
    if (filterCategory === 'all') return vLogs;
    return vLogs.filter((m) => m.category === filterCategory);
  }, [vLogs, filterCategory]);

  // Aggregate totals
  const totalCost = vLogs.reduce((sum, m) => sum + m.cost, 0);
  const upgradesCost = vLogs.filter((m) => m.category === 'upgrade').reduce((sum, m) => sum + m.cost, 0);
  const routineCost = vLogs.filter((m) => m.category === 'routine').reduce((sum, m) => sum + m.cost, 0);
  const repairCost = vLogs.filter((m) => m.category === 'repair').reduce((sum, m) => sum + m.cost, 0);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-sky-400" />
            <span>บันทึกงานซ่อมบำรุง & ของแต่ง</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            พิมพ์ข้อความยาวๆ พร้อมเว้นวรรคได้อิสระ บอทจะดึงตัวเลขชุดสุดท้ายเป็นราคาให้อัตโนมัติ
          </p>
        </div>

        {spreadsheetUrl && (
          <a
            href={spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline bg-sky-950/60 px-3 py-1.5 rounded-lg border border-sky-800/80 self-start sm:self-auto font-medium"
          >
            <span>ดูตารางซ่อมบำรุงใน Sheets</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Smart Logging Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Smart Input Field with Trailing Number Extractor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>พิมพ์ข้อความรายการ (ดึงราคาตัวเลขท้ายสุดอัตโนมัติ)</span>
              </label>
            </div>
            <input
              type="text"
              value={rawInput}
              onChange={handleRawInputChange}
              placeholder="เช่น: เปลี่ยนถ่ายน้ำมันเครื่องสังเคราะห์ 5W-30 กรองแท้ 1850"
              className="w-full text-sm sm:text-base font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-inner"
            />
          </div>

          {/* Real-time Parsed Preview & Field Adjustments (Sky & Yellow) */}
          <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-500/30">
            <div className="text-xs font-bold text-sky-300 mb-2 flex items-center justify-between">
              <span>ผลการวิเคราะห์ข้อความอัจฉริยะ (Smart Parser Preview):</span>
              {parsed.hasExtractedCost && (
                <span className="text-[11px] font-bold text-slate-950 bg-yellow-400 px-2 py-0.5 rounded shadow-sm">
                  ตรวจพบราคา ฿{parsed.cost?.toLocaleString()}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Item Title */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  ชื่อรายการ
                </label>
                <input
                  type="text"
                  value={effectiveTitle}
                  onChange={(e) => {
                    setManualTitle(e.target.value);
                    setHasManualOverride(true);
                  }}
                  placeholder="ชื่ออะไหล่หรือรายการ"
                  required
                  className="w-full text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Cost */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  ราคา (บาท)
                </label>
                <input
                  type="number"
                  step="1"
                  value={effectiveCost}
                  onChange={(e) => {
                    setManualCost(e.target.value);
                    setHasManualOverride(true);
                  }}
                  placeholder="0"
                  required
                  className="w-full text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Metadata Row: Category, Odometer, Date, Workshop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                หมวดหมู่
              </label>
              <select
                value={effectiveCategory}
                onChange={(e) => {
                  setCategory(e.target.value as MaintenanceCategory);
                  setHasManualOverride(true);
                }}
                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="routine">เช็คระยะ / บำรุงรักษาทั่วไป</option>
                <option value="repair">งานซ่อมแซม / แก้ไขปัญหา</option>
                <option value="upgrade">ของแต่ง / อัพเกรดรถ</option>
                <option value="tires_brakes">ยาง / เบรก / ช่วงล่าง</option>
                <option value="tax_insurance">ประกันภัย / พรบ. / ภาษี</option>
                <option value="other">อื่นๆ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                เลขไมล์ (km)
              </label>
              <input
                type="number"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                placeholder="เช่น 45000"
                className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                วันที่ทำรายการ
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                สถานที่ / อู่ / แหล่งซื้อ
              </label>
              <input
                type="text"
                value={workshop}
                onChange={(e) => setWorkshop(e.target.value)}
                placeholder="เช่น ศูนย์ฮอนด้า, อู่พี่ชาญ, Shopee"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              บันทึกช่วยจำเพิ่มเติม (Notes)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น รับประกัน 6 เดือน หรือ 10,000 km, เปลี่ยนตอนน้ำมันเบรกดำ"
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3.5 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 stroke-[2.5]" />
            <span>{isSaving ? 'กำลังบันทึกลง Google Sheets...' : 'บันทึกรายการลง Google Sheets ทันที'}</span>
          </button>
        </form>
      </div>

      {/* Aggregate Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400">ยอดรวมทั้งหมด</span>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums mt-0.5">
            ฿{totalCost.toLocaleString()}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-indigo-500">ของแต่ง & อัพเกรด</span>
          <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums mt-0.5">
            ฿{upgradesCost.toLocaleString()}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-emerald-500">เช็คระยะ & บำรุงรักษา</span>
          <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
            ฿{routineCost.toLocaleString()}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-rose-500">งานซ่อมแซม</span>
          <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
            ฿{repairCost.toLocaleString()}
          </div>
        </div>
      </div>

      {/* History Feed with Category Filter */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            ประวัติงานซ่อมและของแต่ง ({filteredList.length} รายการ)
          </h2>

          {/* Interactive filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'routine', label: 'เช็คระยะ' },
              { id: 'upgrade', label: 'ของแต่ง' },
              { id: 'repair', label: 'ซ่อมแซม' },
              { id: 'tires_brakes', label: 'ยาง/เบรก' },
              { id: 'tax_insurance', label: 'ภาษี/ประกัน' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterCategory(f.id)}
                className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap font-medium ${
                  filterCategory === f.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            ไม่พบรายการในหมวดหมู่นี้
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredList.map((log) => {
              const catMeta = CATEGORY_LABELS[log.category] || CATEGORY_LABELS.routine;
              return (
                <div key={log.id} className="py-3.5 flex items-start justify-between gap-3 text-xs sm:text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${catMeta.color}`}>
                        {catMeta.label}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {log.title}
                      </span>
                    </div>

                    <div className="text-slate-400 text-[11px] flex items-center gap-2 mt-1 flex-wrap">
                      <span>{log.date}</span>
                      <span>·</span>
                      <span className="font-mono">{log.odometer ? `${log.odometer.toLocaleString()} km` : '-'}</span>
                      {log.workshop && (
                        <>
                          <span>·</span>
                          <span>{log.workshop}</span>
                        </>
                      )}
                      {log.notes && (
                        <>
                          <span>·</span>
                          <span className="italic">{log.notes}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                      ฿{log.cost.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
