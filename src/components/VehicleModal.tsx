import React, { useState, useRef } from 'react';
import type { Vehicle } from '../types';
import { X, Car, Check, Upload, Image as ImageIcon, Trash2, Sparkles } from 'lucide-react';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => Promise<void>;
  isSaving: boolean;
}

const FUEL_TYPES = [
  'Gasohol 95',
  'Gasohol 91',
  'Gasohol E20',
  'Gasohol E85',
  'Diesel B7',
  'Diesel B10',
  'Diesel Premium',
  'Benzene 95',
  'Electric (EV)',
];

// Preset car silhouette avatars for convenience
const PRESET_CAR_AVATARS = [
  { label: 'ซีดานสปอร์ต', url: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=600&q=80' },
  { label: 'รถครอบครัว SUV', url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80' },
  { label: 'กระบะพันธุ์แกร่ง', url: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=600&q=80' },
  { label: 'แฮทช์แบ็กซิตี้', url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80' },
  { label: 'สปอร์ตคูเป้', url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80' },
];

export const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  onSaveVehicle,
  isSaving,
}) => {
  const [name, setName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [initialOdometer, setInitialOdometer] = useState('');
  const [fuelTankCapacity, setFuelTankCapacity] = useState('47');
  const [fuelType, setFuelType] = useState('Gasohol 95');
  const [color, setColor] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle image upload and client-side resize
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress & scale to max 800px width/height for fast loading & compact storage
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setImageUrl(compressedDataUrl);
        }
        setIsCompressing(false);
      };
      img.onerror = () => {
        setIsCompressing(false);
        setError('ไม่สามารถประมวลผลรูปภาพได้');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('กรุณากรอกชื่อหรือรุ่นรถ');
      return;
    }

    const odoNum = parseFloat(initialOdometer) || 0;
    const capacityNum = parseFloat(fuelTankCapacity) || 45;

    try {
      await onSaveVehicle({
        name: name.trim(),
        licensePlate: licensePlate.trim(),
        initialOdometer: odoNum,
        currentOdometer: odoNum,
        fuelTankCapacity: capacityNum,
        fuelType,
        color: color.trim(),
        imageUrl: imageUrl.trim(),
        notes: notes.trim(),
      });

      // Reset
      setName('');
      setLicensePlate('');
      setInitialOdometer('');
      setColor('');
      setImageUrl('');
      setNotes('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-sky-500/30 shadow-2xl shadow-sky-950/50 overflow-hidden my-8">
        {/* Header: Racing Blue & Yellow accent */}
        <div className="px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-sky-950/60 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-sky-500/20">
              <Car className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>เพิ่มข้อมูลและรูปรถ</span>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                  Car Profile
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Car Photo / Profile Picture Section */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-sky-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>รูปรถสำหรับโปรไฟล์ (Car Photo)</span>
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>ลบรูป</span>
                </button>
              )}
            </div>

            {/* Photo Preview Box */}
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-700/80 aspect-16/9 flex items-center justify-center group">
              {imageUrl ? (
                <>
                  <img
                    src={imageUrl}
                    alt="Car preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-sky-500 text-slate-950 text-xs font-bold shadow-lg"
                    >
                      เปลี่ยนรูปใหม่
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-400 mb-2">
                    <Car className="w-6 h-6 text-sky-400/80" />
                  </div>
                  <p className="text-xs text-slate-300 font-medium">
                    คลิกเพื่ออัปโหลดรูปรถของคุณจากเครื่องหรือมือถือ
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    รองรับไฟล์ JPG, PNG, WEBP (ระบบจะย่อขนาดให้อัตโนมัติ)
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing}
                    className="mt-3 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-sky-950 transition-all active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isCompressing ? 'กำลังประมวลผลรูป...' : 'เลือกรูปภาพรถ'}</span>
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {/* Quick URL or preset selector */}
            <div className="pt-2 border-t border-slate-700/60">
              <span className="text-[11px] text-slate-400 block mb-1.5">
                หรือเลือกรูปรถเริ่มต้น / วาง URL รูป:
              </span>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="url"
                  value={imageUrl.startsWith('data:') ? '' : imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="วางลิงก์รูปภาพ https://..."
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-400 font-mono"
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {PRESET_CAR_AVATARS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImageUrl(p.url)}
                    className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 whitespace-nowrap transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Car Model & Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              ยี่ห้อและรุ่นรถ *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น Honda Civic FE, Toyota Corolla Cross, Mazda 2"
              required
              className="w-full text-xs font-medium bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* License Plate & Initial Odometer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                ทะเบียนรถ
              </label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="เช่น 1ขข 9999 กทม."
                className="w-full text-xs font-medium bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                เลขไมล์เริ่มต้น (km)
              </label>
              <input
                type="number"
                value={initialOdometer}
                onChange={(e) => setInitialOdometer(e.target.value)}
                placeholder="เช่น 45000"
                className="w-full text-xs font-mono font-medium bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Fuel Type & Tank Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                ประเภทเชื้อเพลิง
              </label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full text-xs font-medium bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {FUEL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                ความจุถังน้ำมัน (ลิตร)
              </label>
              <input
                type="number"
                value={fuelTankCapacity}
                onChange={(e) => setFuelTankCapacity(e.target.value)}
                placeholder="เช่น 47"
                className="w-full text-xs font-mono font-medium bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Color & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                สีตัวถัง
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="เช่น ขาวมุก, เทาเข้ม"
                className="w-full text-xs font-medium bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                หมายเหตุ
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เช่น รถคันโปรด"
                className="w-full text-xs font-medium bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Action buttons with Blue & Racing Yellow styling */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving || isCompressing}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 transition-all flex items-center gap-1.5 shadow-lg shadow-sky-500/20 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 text-slate-950" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์รถ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
