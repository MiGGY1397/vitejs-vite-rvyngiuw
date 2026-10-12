import React from 'react';
import type { Vehicle } from '../types';
import { Car, Fuel, Plus, ExternalLink, LogOut, CheckCircle, RefreshCw } from 'lucide-react';
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
      {/* Top 3-Zone Contract Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark & Automotive Blue-Yellow Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-sky-500/20">
            <Fuel className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tight text-white flex items-center">
              <span>Car</span>
              <span className="text-yellow-400">Log</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60 hidden sm:inline-block">
              Sheets Sync
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Blue & Yellow theme) */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            แดชบอร์ด
          </button>
          <button
            onClick={() => setActiveTab('fuel')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'fuel'
                ? 'bg-yellow-400 text-slate-950 font-bold shadow-md shadow-yellow-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            บันทึกน้ำมัน
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'maintenance'
                ? 'bg-sky-400 text-slate-950 font-bold shadow-md shadow-sky-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            ซ่อมบำรุง & ของแต่ง
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'report'
                ? 'bg-yellow-400 text-slate-950 font-bold shadow-md shadow-yellow-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            รายงานรายเดือน
          </button>
        </nav>

        {/* Zone 3: Vehicle Selector with Photo Avatar & User Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Vehicle Selector with Avatar Thumbnail */}
          {vehicles.length > 0 && selectedVehicle && (
            <div className="relative flex items-center bg-slate-900/90 rounded-xl p-1 border border-sky-800/50 shadow-inner">
              {/* Profile Image Avatar Thumbnail */}
              <div className="w-6 h-6 rounded-lg overflow-hidden bg-slate-800 shrink-0 ml-1 border border-yellow-400/40">
                {selectedVehicle.imageUrl ? (
                  <img
                    src={selectedVehicle.imageUrl}
                    alt={selectedVehicle.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sky-400 bg-sky-950/60">
                    <Car className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <select
                value={selectedVehicle.id}
                onChange={(e) => {
                  const found = vehicles.find((v) => v.id === e.target.value);
                  if (found) onSelectVehicle(found);
                }}
                className="bg-transparent text-xs font-semibold text-slate-200 py-1 pl-2 pr-6 appearance-none focus:outline-none cursor-pointer max-w-[120px] sm:max-w-[160px] truncate"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                    {v.name} ({v.licensePlate || 'ไม่มีทะเบียน'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={onOpenAddVehicle}
            title="เพิ่มรูปรถและรถคันใหม่"
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Google Connection & Sheets Status */}
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onSync}
                disabled={isSyncing}
                title="ซิงค์ข้อมูลล่าสุดกับ Google Sheets"
                className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-sky-400' : ''}`} />
              </button>

              {spreadsheetUrl && (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-950 bg-yellow-400 hover:bg-yellow-300 px-2.5 py-1.5 rounded-lg shadow-sm transition-colors"
                >
                  <span>Google Sheet</span>
                  <ExternalLink className="w-3 h-3 text-slate-950" />
                </a>
              )}

              <div className="flex items-center gap-1.5 pl-1 border-l border-slate-800">
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName || user.email}`}
                  alt="avatar"
                  className="w-7 h-7 rounded-full border border-sky-400/60"
                />
                <button
                  onClick={onLogout}
                  title="ออกจากระบบ"
                  className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-slate-950 text-xs font-black px-3 py-1.5 rounded-xl shadow-md transition-all whitespace-nowrap active:scale-95"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>ต่อ Sheets</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Strip (Blue & Yellow) */}
      <div className="md:hidden border-t border-sky-950 bg-slate-950 px-2 py-1.5 flex items-center justify-around text-xs">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-1.5 px-3 rounded-lg font-bold transition-colors ${
            activeTab === 'dashboard' ? 'text-slate-950 bg-sky-400' : 'text-slate-400'
          }`}
        >
          แดชบอร์ด
        </button>
        <button
          onClick={() => setActiveTab('fuel')}
          className={`py-1.5 px-3 rounded-lg font-bold transition-colors ${
            activeTab === 'fuel' ? 'text-slate-950 bg-yellow-400' : 'text-slate-400'
          }`}
        >
          จดน้ำมัน
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`py-1.5 px-3 rounded-lg font-bold transition-colors ${
            activeTab === 'maintenance' ? 'text-slate-950 bg-sky-400' : 'text-slate-400'
          }`}
        >
          ซ่อม/แต่ง
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`py-1.5 px-3 rounded-lg font-bold transition-colors ${
            activeTab === 'report' ? 'text-slate-950 bg-yellow-400' : 'text-slate-400'
          }`}
        >
          รายงาน
        </button>
      </div>
    </header>
  );
};
