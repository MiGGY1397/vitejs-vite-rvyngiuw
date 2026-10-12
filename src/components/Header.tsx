import React from 'react';
import type { Vehicle } from '../types';
import { Car, Fuel, Plus, ExternalLink, LogOut, RefreshCw } from 'lucide-react';
import type { User } from 'firebase/auth';

interface HeaderProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  onSelectVehicle: (v: Vehicle) => void;
  onOpenAddVehicle: () => void;
  user: User | null;
  spreadsheetUrl: string | null;
  onLogin: () => void;
  onLogout: () => void;
  onSync: () => void;
  isSyncing: boolean;
  activeTab: 'dashboard' | 'fuel' | 'maintenance' | 'report';
  setActiveTab: (tab: 'dashboard' | 'fuel' | 'maintenance' | 'report') => void;
}

export const Header: React.FC<HeaderProps> = ({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  onOpenAddVehicle,
  user,
  spreadsheetUrl,
  onLogin,
  onLogout,
  onSync,
  isSyncing,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-950 border-b border-sky-900/40 text-white shadow-lg shadow-slate-950/40">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 py-2 min-h-[3.5rem] flex items-center justify-between gap-1 flex-wrap">
        
        {/* Zone 1: Logo */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-500 to-yellow-400 flex items-center justify-center text-slate-950">
            <Fuel className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm sm:text-base font-black tracking-tight flex items-center">
              <span>Car</span><span className="text-yellow-400">Log</span>
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links (PC Only) */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium">
          <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-1.5 rounded-lg ${activeTab === 'dashboard' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}>แดชบอร์ด</button>
          <button onClick={() => setActiveTab('fuel')} className={`px-3 py-1.5 rounded-lg ${activeTab === 'fuel' ? 'bg-yellow-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}>บันทึกน้ำมัน</button>
          <button onClick={() => setActiveTab('maintenance')} className={`px-3 py-1.5 rounded-lg ${activeTab === 'maintenance' ? 'bg-sky-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}>ซ่อมบำรุง & ของแต่ง</button>
          <button onClick={() => setActiveTab('report')} className={`px-3 py-1.5 rounded-lg ${activeTab === 'report' ? 'bg-yellow-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}>รายงาน</button>
        </nav>

        {/* Zone 3: Controls (ปรับให้ยืดหยุ่นและปัดบรรทัดได้) */}
        <div className="flex items-center gap-1 sm:gap-2.5 flex-wrap justify-end ml-auto">
          {vehicles.length > 0 && selectedVehicle && (
            <div className="relative flex items-center bg-slate-900/90 rounded-lg p-1 border border-sky-800/50">
              <select
                value={selectedVehicle.id}
                onChange={(e) => {
                  const found = vehicles.find((v) => v.id === e.target.value);
                  if (found) onSelectVehicle(found);
                }}
                className="bg-transparent text-[10px] sm:text-xs font-semibold text-slate-200 py-1 pl-1 pr-4 appearance-none focus:outline-none cursor-pointer max-w-[85px] sm:max-w-[140px] truncate"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button onClick={onOpenAddVehicle} className="p-1 sm:p-1.5 rounded-lg bg-slate-900 text-yellow-400 border border-yellow-500/30 shrink-0">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {user ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <button onClick={onSync} disabled={isSyncing} className="p-1 sm:p-1.5 rounded-lg bg-slate-900 text-slate-300">
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-400' : ''}`} />
              </button>
              <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
                <img src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`} alt="avatar" className="w-6 h-6 rounded-full" />
                <button onClick={onLogout} className="p-1 text-slate-400 hover:text-rose-400">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button onClick={onLogin} className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-950 text-[11px] sm:text-xs font-black px-2 py-1.5 rounded-lg whitespace-nowrap shrink-0">
              <span>ต่อ Sheets</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Strip */}
      <div className="md:hidden border-t border-sky-950 bg-slate-950 px-1 py-1.5 flex items-center justify-around text-[10px]">
        <button onClick={() => setActiveTab('dashboard')} className={`py-1.5 px-2 rounded-lg font-bold ${activeTab === 'dashboard' ? 'text-slate-950 bg-sky-400' : 'text-slate-400'}`}>แดชบอร์ด</button>
        <button onClick={() => setActiveTab('fuel')} className={`py-1.5 px-2 rounded-lg font-bold ${activeTab === 'fuel' ? 'text-slate-950 bg-yellow-400' : 'text-slate-400'}`}>จดน้ำมัน</button>
        <button onClick={() => setActiveTab('maintenance')} className={`py-1.5 px-2 rounded-lg font-bold ${activeTab === 'maintenance' ? 'text-slate-950 bg-sky-400' : 'text-slate-400'}`}>ซ่อม/แต่ง</button>
        <button onClick={() => setActiveTab('report')} className={`py-1.5 px-2 rounded-lg font-bold ${activeTab === 'report' ? 'text-slate-950 bg-yellow-400' : 'text-slate-400'}`}>รายงาน</button>
      </div>
    </header>
  );
};