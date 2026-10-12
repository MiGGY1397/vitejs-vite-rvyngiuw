import React, { useState, useEffect } from 'react';
import type { Vehicle, FuelLog, MaintenanceLog } from './types';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { FuelTrackerView } from './components/FuelTrackerView';
import { MaintenanceView } from './components/MaintenanceView';
import { MonthlyReportView } from './components/MonthlyReportView';
import { VehicleModal } from './components/VehicleModal';
import { recalculateFuelLogs } from './lib/fuelAlgorithm';
import { initAuth, googleSignIn, logout, getAccessToken } from './lib/googleAuth';
import { 
  getOrCreateCarLogSpreadsheet, 
  loadSpreadsheetData, 
  appendVehicleToSheet, 
  appendFuelLogToSheet, 
  appendMaintenanceLogToSheet 
} from './lib/googleSheetsService';
import type { User } from 'firebase/auth';
import { CheckCircle2, AlertTriangle, ShieldCheck, ExternalLink, Sparkles } from 'lucide-react';

const INITIAL_DEMO_VEHICLES: Vehicle[] = [
  {
    id: 'car-1',
    name: 'Honda Civic FE 1.5 Turbo',
    licensePlate: '1ขข 1234 กทม.',
    initialOdometer: 45000,
    currentOdometer: 46250,
    fuelTankCapacity: 47,
    fuelType: 'Gasohol 95',
    color: 'Platinum White',
    imageUrl: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80',
    notes: 'รถคันหลัก ใช้งานเดินทางประจำวัน',
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'car-2',
    name: 'Mazda 2 Skyactiv-G',
    licensePlate: '5กน 8899 เชียงใหม่',
    initialOdometer: 32000,
    currentOdometer: 32680,
    fuelTankCapacity: 44,
    fuelType: 'Gasohol 95',
    color: 'Soul Red Crystal',
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    notes: 'รถซิตี้คาร์ ขับในเมืองคล่องตัว',
    createdAt: '2026-02-10T10:00:00Z',
  },
];

const INITIAL_DEMO_FUEL_LOGS: FuelLog[] = [
  {
    id: 'fuel-1',
    carId: 'car-1',
    date: '2026-09-28',
    time: '08:30',
    odometer: 45000,
    liters: 42.0,
    totalCost: 1617,
    pricePerLiter: 38.50,
    isFullTank: true, // Baseline
    gasStation: 'PTT Station',
    notes: 'เติมเต็มถังเป็นฐานเริ่มต้น',
  },
  {
    id: 'fuel-2',
    carId: 'car-1',
    date: '2026-10-03',
    time: '18:15',
    odometer: 45320,
    liters: 10.5,
    totalCost: 400,
    pricePerLiter: 38.10,
    isFullTank: false, // เติมไม่เต็มถัง (ทบยอด)
    gasStation: 'Bangchak',
    notes: 'เติมรีบๆ 400 บาท (ทบยอด)',
  },
  {
    id: 'fuel-3',
    carId: 'car-1',
    date: '2026-10-07',
    time: '12:40',
    odometer: 45780,
    liters: 13.1,
    totalCost: 500,
    pricePerLiter: 38.15,
    isFullTank: false, // เติมไม่เต็มถัง (ทบยอดรอบที่ 2)
    gasStation: 'Shell',
    notes: 'เติมแวะปั๊ม 500 บาท',
  },
  {
    id: 'fuel-4',
    carId: 'car-1',
    date: '2026-10-11',
    time: '17:20',
    odometer: 46250,
    liters: 28.4,
    totalCost: 1093,
    pricePerLiter: 38.50,
    isFullTank: true, // เต็มถัง! ปิดรอบทบยอด
    gasStation: 'PTT Station',
    notes: 'เติมเต็มถังปิดรอบสะสม',
  },
];

const INITIAL_DEMO_MAINT_LOGS: MaintenanceLog[] = [
  {
    id: 'maint-1',
    carId: 'car-1',
    date: '2026-09-30',
    odometer: 45100,
    category: 'routine',
    title: 'เปลี่ยนถ่ายน้ำมันเครื่องสังเคราะห์ 0W-20 พร้อมกรองแท้',
    cost: 1850,
    workshop: 'ศูนย์บริการฮอนด้า',
    notes: 'เช็คระยะ 40,000 km ตามคู่มือ',
    rawInput: 'เปลี่ยนถ่ายน้ำมันเครื่องสังเคราะห์ 0W-20 พร้อมกรองแท้ 1850',
  },
  {
    id: 'maint-2',
    carId: 'car-1',
    date: '2026-10-04',
    odometer: 45400,
    category: 'upgrade',
    title: 'ค้ำโช้คหน้า Ultra Racing Bar',
    cost: 3200,
    workshop: 'ร้านแต่งรถ Garage 9',
    notes: 'เพิ่มความกระชับคมตอนเข้าโค้ง',
    rawInput: 'ค้ำโช้คหน้า Ultra Racing Bar 3200',
  },
  {
    id: 'maint-3',
    carId: 'car-1',
    date: '2026-10-08',
    odometer: 45900,
    category: 'tires_brakes',
    title: 'เปลี่ยนผ้าเบรกหน้า Dixcel EC',
    cost: 2800,
    workshop: 'B-Quik',
    notes: 'ผ้าเบรกเดิมเริ่มหมดสภาพ',
    rawInput: 'เปลี่ยนผ้าเบรกหน้า Dixcel EC 2800',
  },
];

export default function App() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('carlog_vehicles');
    return saved ? JSON.parse(saved) : INITIAL_DEMO_VEHICLES;
  });

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(() => {
    return vehicles[0] || null;
  });

  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(() => {
    const saved = localStorage.getItem('carlog_fuel_logs');
    const logs = saved ? JSON.parse(saved) : INITIAL_DEMO_FUEL_LOGS;
    return recalculateFuelLogs(logs);
  });

  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>(() => {
    const saved = localStorage.getItem('carlog_maint_logs');
    return saved ? JSON.parse(saved) : INITIAL_DEMO_MAINT_LOGS;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'fuel' | 'maintenance' | 'report'>('dashboard');
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  
  // Google Sheets & Auth State
  const [user, setUser] = useState<User | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem('carlog_spreadsheet_id') || null;
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(() => {
    return localStorage.getItem('carlog_spreadsheet_url') || null;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Save to local cache as immediate responsive storage
  useEffect(() => {
    localStorage.setItem('carlog_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('carlog_fuel_logs', JSON.stringify(fuelLogs));
  }, [fuelLogs]);

  useEffect(() => {
    localStorage.setItem('carlog_maint_logs', JSON.stringify(maintenanceLogs));
  }, [maintenanceLogs]);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      async (authUser, token) => {
        setUser(authUser);
        try {
          setIsSyncing(true);
          const setup = await getOrCreateCarLogSpreadsheet(token);
          setSpreadsheetId(setup.spreadsheetId);
          setSpreadsheetUrl(setup.spreadsheetUrl);
          localStorage.setItem('carlog_spreadsheet_id', setup.spreadsheetId);
          localStorage.setItem('carlog_spreadsheet_url', setup.spreadsheetUrl);

          if (setup.isNewlyCreated) {
            // Seed newly created sheet with initial demo cars & logs so it's ready immediately
            for (const v of vehicles) {
              await appendVehicleToSheet(setup.spreadsheetId, v, token);
            }
            for (const f of fuelLogs) {
              await appendFuelLogToSheet(setup.spreadsheetId, f, token);
            }
            for (const m of maintenanceLogs) {
              await appendMaintenanceLogToSheet(setup.spreadsheetId, m, token);
            }
            showToast('สร้าง Google Sheet "CarLog Book" พร้อมหัวตารางสำเร็จแล้ว!', 'success');
          } else {
            // Load existing data from the sheet
            const data = await loadSpreadsheetData(setup.spreadsheetId, token);
            if (data.vehicles.length > 0) {
              setVehicles(data.vehicles);
              setSelectedVehicle(data.vehicles[0]);
            }
            if (data.fuelLogs.length > 0) {
              setFuelLogs(data.fuelLogs);
            }
            if (data.maintenanceLogs.length > 0) {
              setMaintenanceLogs(data.maintenanceLogs);
            }
            showToast('ซิงค์ข้อมูลกับ Google Sheet ของคุณเรียบร้อย', 'info');
          }
        } catch (err: any) {
          console.error('Google Sheet auto-connect error:', err);
        } finally {
          setIsSyncing(false);
        }
      },
      () => {
        setUser(null);
      }
    );

    return () => unsubscribe();
  }, []);

  // Google Login Handler
  const handleGoogleLogin = async () => {
    try {
      setIsSyncing(true);
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        const setup = await getOrCreateCarLogSpreadsheet(res.accessToken);
        setSpreadsheetId(setup.spreadsheetId);
        setSpreadsheetUrl(setup.spreadsheetUrl);
        localStorage.setItem('carlog_spreadsheet_id', setup.spreadsheetId);
        localStorage.setItem('carlog_spreadsheet_url', setup.spreadsheetUrl);

        if (setup.isNewlyCreated) {
          for (const v of vehicles) {
            await appendVehicleToSheet(setup.spreadsheetId, v, res.accessToken);
          }
          for (const f of fuelLogs) {
            await appendFuelLogToSheet(setup.spreadsheetId, f, res.accessToken);
          }
          for (const m of maintenanceLogs) {
            await appendMaintenanceLogToSheet(setup.spreadsheetId, m, res.accessToken);
          }
          showToast('สร้าง Google Sheet บน Google Drive ของคุณสำเร็จ 100%!', 'success');
        } else {
          const data = await loadSpreadsheetData(setup.spreadsheetId, res.accessToken);
          if (data.vehicles.length > 0) {
            setVehicles(data.vehicles);
            setSelectedVehicle(data.vehicles[0]);
          }
          if (data.fuelLogs.length > 0) {
            setFuelLogs(data.fuelLogs);
          }
          if (data.maintenanceLogs.length > 0) {
            setMaintenanceLogs(data.maintenanceLogs);
          }
          showToast('เชื่อมต่อ Google Sheet สำเร็จ พร้อมโหลดข้อมูลเรียบร้อย', 'success');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'เชื่อมต่อ Google ไม่สำเร็จ', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    showToast('ออกจากระบบแล้ว', 'info');
  };

  // Manual Sync with Sheets
  const handleSyncWithSheets = async () => {
    const token = await getAccessToken();
    if (!token || !spreadsheetId) {
      handleGoogleLogin();
      return;
    }

    try {
      setIsSyncing(true);
      const data = await loadSpreadsheetData(spreadsheetId, token);
      if (data.vehicles.length > 0) {
        setVehicles(data.vehicles);
        if (selectedVehicle) {
          const updated = data.vehicles.find((v) => v.id === selectedVehicle.id);
          if (updated) setSelectedVehicle(updated);
        }
      }
      setFuelLogs(data.fuelLogs);
      setMaintenanceLogs(data.maintenanceLogs);
      showToast('ซิงค์ข้อมูลล่าสุดจาก Google Sheets สำเร็จ', 'success');
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถซิงค์ได้', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Add Vehicle
  const handleAddVehicle = async (data: Omit<Vehicle, 'id' | 'createdAt'>) => {
    const newVehicle: Vehicle = {
      ...data,
      id: `car-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      const token = await getAccessToken();
      if (token && spreadsheetId) {
        await appendVehicleToSheet(spreadsheetId, newVehicle, token);
      }

      setVehicles((prev) => [...prev, newVehicle]);
      setSelectedVehicle(newVehicle);
      showToast(`เพิ่มรถ "${newVehicle.name}" เรียบร้อยแล้ว`, 'success');
    } finally {
      setIsSaving(false);
    }
  };

  // Add Fuel Log
  const handleAddFuelLog = async (logData: Omit<FuelLog, 'id'>) => {
    const newLog: FuelLog = {
      ...logData,
      id: `fuel-${Date.now()}`,
    };

    setIsSaving(true);
    try {
      // Calculate updated array with recalculated consumption
      const updatedLogs = recalculateFuelLogs([...fuelLogs, newLog]);
      const enrichedNewLog = updatedLogs.find((l) => l.id === newLog.id) || newLog;

      const token = await getAccessToken();
      if (token && spreadsheetId) {
        await appendFuelLogToSheet(spreadsheetId, enrichedNewLog, token);
      }

      setFuelLogs(updatedLogs);

      // Update vehicle current odometer if higher
      if (selectedVehicle && newLog.odometer > selectedVehicle.currentOdometer) {
        const updatedVehicle = { ...selectedVehicle, currentOdometer: newLog.odometer };
        setSelectedVehicle(updatedVehicle);
        setVehicles((prev) =>
          prev.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v))
        );
      }

      showToast(
        newLog.isFullTank
          ? 'บันทึกค่าน้ำมันเต็มถังและส่งเข้า Google Sheets เรียบร้อย!'
          : 'บันทึกและทบยอดน้ำมัน (ไม่เต็มถัง) เข้า Google Sheets เรียบร้อย!',
        'success'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Add Maintenance Log
  const handleAddMaintenanceLog = async (maintData: Omit<MaintenanceLog, 'id'>) => {
    const newMaint: MaintenanceLog = {
      ...maintData,
      id: `maint-${Date.now()}`,
    };

    setIsSaving(true);
    try {
      const token = await getAccessToken();
      if (token && spreadsheetId) {
        await appendMaintenanceLogToSheet(spreadsheetId, newMaint, token);
      }

      setMaintenanceLogs((prev) => [newMaint, ...prev]);

      // Update vehicle current odometer if higher
      if (selectedVehicle && newMaint.odometer > selectedVehicle.currentOdometer) {
        const updatedVehicle = { ...selectedVehicle, currentOdometer: newMaint.odometer };
        setSelectedVehicle(updatedVehicle);
        setVehicles((prev) =>
          prev.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v))
        );
      }

      showToast(`บันทึกรายการ "${newMaint.title}" (฿${newMaint.cost.toLocaleString()}) ลง Google Sheets แล้ว!`, 'success');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-yellow-400 selection:text-slate-950">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs sm:text-sm font-semibold border ${
              toast.type === 'success'
                ? 'bg-slate-900 text-yellow-300 border-yellow-500/60 shadow-yellow-500/10'
                : toast.type === 'error'
                ? 'bg-rose-950 text-rose-100 border-rose-700'
                : 'bg-slate-900 text-sky-200 border-sky-600'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Header
        vehicles={vehicles}
        selectedVehicle={selectedVehicle}
        onSelectVehicle={(v) => setSelectedVehicle(v)}
        onOpenAddVehicle={() => setIsAddVehicleOpen(true)}
        user={user}
        spreadsheetUrl={spreadsheetUrl}
        onLogin={handleGoogleLogin}
        onLogout={handleLogout}
        onSync={handleSyncWithSheets}
        isSyncing={isSyncing}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Google Sheets Ownership Hero Banner (If not yet connected) */}
      {!user && (
        <div className="bg-gradient-to-r from-slate-950 via-sky-950/70 to-slate-950 border-b border-sky-900/40 text-white px-4 py-3 shadow-inner">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-yellow-400 shrink-0" />
              <span>
                <strong className="text-yellow-400">ฐานข้อมูลส่วนตัว (Data Ownership 100%):</strong> เชื่อมต่อ Google Sheets เพื่อส่งข้อมูลทุกรายการไปเก็บใน Google Drive ของคุณเอง ไม่มีโฆษณา ไม่หาย
              </span>
            </div>
            <button
              onClick={handleGoogleLogin}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-slate-950 font-black text-xs whitespace-nowrap self-start sm:self-auto transition-all shadow-md shadow-yellow-400/20 active:scale-95 cursor-pointer"
            >
              ลงชื่อเข้าใช้ด้วย Google ทันที
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-12">
        {activeTab === 'dashboard' && (
          <DashboardView
            vehicle={selectedVehicle}
            fuelLogs={fuelLogs}
            maintenanceLogs={maintenanceLogs}
            onNavigateToFuel={() => setActiveTab('fuel')}
            onNavigateToMaintenance={() => setActiveTab('maintenance')}
            onNavigateToReport={() => setActiveTab('report')}
            onOpenEditVehicle={() => setIsAddVehicleOpen(true)}
          />
        )}

        {activeTab === 'fuel' && selectedVehicle && (
          <FuelTrackerView
            vehicle={selectedVehicle}
            fuelLogs={fuelLogs}
            onAddFuelLog={handleAddFuelLog}
            spreadsheetUrl={spreadsheetUrl}
            isSaving={isSaving}
          />
        )}

        {activeTab === 'maintenance' && selectedVehicle && (
          <MaintenanceView
            vehicle={selectedVehicle}
            maintenanceLogs={maintenanceLogs}
            onAddMaintenanceLog={handleAddMaintenanceLog}
            spreadsheetUrl={spreadsheetUrl}
            isSaving={isSaving}
          />
        )}

        {activeTab === 'report' && selectedVehicle && (
          <MonthlyReportView
            vehicle={selectedVehicle}
            fuelLogs={fuelLogs}
            maintenanceLogs={maintenanceLogs}
            spreadsheetUrl={spreadsheetUrl}
          />
        )}
      </main>

      {/* Add Vehicle Modal */}
      <VehicleModal
        isOpen={isAddVehicleOpen}
        onClose={() => setIsAddVehicleOpen(false)}
        onSaveVehicle={handleAddVehicle}
        isSaving={isSaving}
      />
    </div>
  );
}
