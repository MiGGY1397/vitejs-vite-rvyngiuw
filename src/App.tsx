import React, { useState, useEffect } from 'react';
import type { Vehicle, FuelLog, MaintenanceLog } from './types';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { FuelTrackerView } from './components/FuelTrackerView';
import { MaintenanceView } from './components/MaintenanceView';
import { MonthlyReportView } from './components/MonthlyReportView';
import { VehicleModal } from './components/VehicleModal';
import { recalculateFuelLogs } from './lib/fuelAlgorithm';
import type { User } from 'firebase/auth';
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

// ============================================================================
// 🚨 นำ Web App URL ที่ได้จาก Google Apps Script มาวางใส่ในเครื่องหมายคำพูดด้านล่างนี้ครับ
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxr9naIREqoJNho2qaohxkMMoyt7HioeP5iUoYpzUuwZoIgdlSOPbrbc96EfeBqzmcK/exec';
// ============================================================================

// สร้างข้อมูลผู้ใช้จำลองไว้ตลอดเวลา เพื่อซ่อนปุ่มบังคับล็อกอินของหน้าเว็บ
const STATIC_OWNER_USER = {
  displayName: 'Mik (Connected)',
  email: 'Connected via Google Sheets',
  photoURL: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png',
} as unknown as User;

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
];

const INITIAL_DEMO_FUEL_LOGS: FuelLog[] = [];
const INITIAL_DEMO_MAINT_LOGS: MaintenanceLog[] = [];

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

  // ล็อกสถานะว่าเชื่อมต่อแล้วตลอดเวลา ไม่ต้องล็อกอินผ่าน Firebase
  const [user] = useState<User | null>(STATIC_OWNER_USER);
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

  useEffect(() => {
    localStorage.setItem('carlog_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('carlog_fuel_logs', JSON.stringify(fuelLogs));
  }, [fuelLogs]);

  useEffect(() => {
    localStorage.setItem('carlog_maint_logs', JSON.stringify(maintenanceLogs));
  }, [maintenanceLogs]);

  // ฟังก์ชันดึงข้อมูลจาก Google Sheets ผ่าน GAS โดยตรง
  const fetchFromGas = async (silent = false) => {
    if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes('วาง_URL')) {
      return;
    }

    try {
      setIsSyncing(true);
      const response = await fetch(GAS_WEB_APP_URL);
      const data = await response.json();

      if (data.status === 'success') {
        if (data.spreadsheetUrl) {
          setSpreadsheetUrl(data.spreadsheetUrl);
          localStorage.setItem('carlog_spreadsheet_url', data.spreadsheetUrl);
        }

        if (data.vehicles && data.vehicles.length > 0) {
          setVehicles(data.vehicles);
          setSelectedVehicle((prev) => {
            if (!prev) return data.vehicles[0];
            return data.vehicles.find((v: Vehicle) => v.id === prev.id) || data.vehicles[0];
          });
        }

        if (data.fuelLogs) {
          setFuelLogs(recalculateFuelLogs(data.fuelLogs));
        }

        if (data.maintenanceLogs) {
          setMaintenanceLogs(data.maintenanceLogs);
        }

        if (!silent) {
          showToast('ซิงค์ข้อมูลล่าสุดจาก Google Sheets สำเร็จ!', 'success');
        }
      } else {
        if (!silent) showToast('เกิดข้อผิดพลาดจากตาราง: ' + data.message, 'error');
      }
    } catch (err: any) {
      console.error('GAS Sync Error:', err);
      if (!silent) showToast('เชื่อมต่อ Google Sheets ไม่สำเร็จ กรุณาเช็คอินเทอร์เน็ต', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // ฟังก์ชันส่งข้อมูลไปบันทึกที่ Google Sheets ผ่าน GAS
  const postToGas = async (action: string, payloadData: any) => {
    if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes('วาง_URL')) {
      showToast('ยังไม่ได้ใส่ลิงก์ Google Apps Script ในโค้ด App.tsx', 'error');
      return false;
    }

    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        // ใช้ text/plain เพื่อหลีกเลี่ยงปัญหา CORS Preflight บน Safari / iOS
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action,
        data: payloadData,
      }),
    });

    const result = await res.json();
    if (result.status !== 'success') {
      throw new Error(result.message || 'บันทึกข้อมูลลง Sheet ไม่สำเร็จ');
    }
    return true;
  };

  // โหลดข้อมูลจาก Google Sheets อัตโนมัติทันทีที่เปิดแอป
  useEffect(() => {
    fetchFromGas(true);
  }, []);

  const handleSyncWithSheets = async () => {
    await fetchFromGas(false);
  };

  const handleAddVehicle = async (data: Omit<Vehicle, 'id' | 'createdAt'>) => {
    const newVehicle: Vehicle = {
      ...data,
      id: `car-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      await postToGas('addVehicle', newVehicle);
      setVehicles((prev) => [...prev, newVehicle]);
      setSelectedVehicle(newVehicle);
      showToast(`เพิ่มรถ "${newVehicle.name}" ลง Google Sheets เรียบร้อยแล้ว`, 'success');
    } catch (err: any) {
      showToast(err.message || 'บันทึกข้อมูลรถไม่สำเร็จ', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFuelLog = async (logData: Omit<FuelLog, 'id'>) => {
    const newLog: FuelLog = {
      ...logData,
      id: `fuel-${Date.now()}`,
    };

    setIsSaving(true);
    try {
      const updatedLogs = recalculateFuelLogs([...fuelLogs, newLog]);
      const enrichedNewLog = updatedLogs.find((l) => l.id === newLog.id) || newLog;

      await postToGas('addFuelLog', enrichedNewLog);

      setFuelLogs(updatedLogs);

      if (selectedVehicle && newLog.odometer > selectedVehicle.currentOdometer) {
        const updatedVehicle = { ...selectedVehicle, currentOdometer: newLog.odometer };
        setSelectedVehicle(updatedVehicle);
        setVehicles((prev) =>
          prev.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v))
        );
      }

      showToast(
        newLog.isFullTank
          ? 'บันทึกค่าน้ำมันเต็มถังเข้า Google Sheets เรียบร้อย!'
          : 'บันทึกและทบยอดน้ำมัน (ไม่เต็มถัง) เข้า Google Sheets เรียบร้อย!',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'บันทึกข้อมูลน้ำมันไม่สำเร็จ', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMaintenanceLog = async (maintData: Omit<MaintenanceLog, 'id'>) => {
    const newMaint: MaintenanceLog = {
      ...maintData,
      id: `maint-${Date.now()}`,
    };

    setIsSaving(true);
    try {
      await postToGas('addMaintenanceLog', newMaint);

      setMaintenanceLogs((prev) => [newMaint, ...prev]);

      if (selectedVehicle && newMaint.odometer > selectedVehicle.currentOdometer) {
        const updatedVehicle = { ...selectedVehicle, currentOdometer: newMaint.odometer };
        setSelectedVehicle(updatedVehicle);
        setVehicles((prev) =>
          prev.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v))
        );
      }

      showToast(`บันทึกรายการ "${newMaint.title}" (฿${newMaint.cost.toLocaleString()}) ลง Google Sheets แล้ว!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'บันทึกข้อมูลซ่อมบำรุงไม่สำเร็จ', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-yellow-400 selection:text-slate-950 relative w-full overflow-hidden">
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

      <Header
        vehicles={vehicles}
        selectedVehicle={selectedVehicle}
        onSelectVehicle={(v) => setSelectedVehicle(v)}
        onOpenAddVehicle={() => setIsAddVehicleOpen(true)}
        user={user}
        spreadsheetUrl={spreadsheetUrl}
        onLogin={handleSyncWithSheets}
        onLogout={() => showToast('เชื่อมต่อตรงกับ Google Sheets ตลอดเวลาอยู่แล้ว', 'info')}
        onSync={handleSyncWithSheets}
        isSyncing={isSyncing}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 pb-24 md:pb-12">
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

      <VehicleModal
        isOpen={isAddVehicleOpen}
        onClose={() => setIsAddVehicleOpen(false)}
        onSaveVehicle={handleAddVehicle}
        isSaving={isSaving}
      />
    </div>
  );
}