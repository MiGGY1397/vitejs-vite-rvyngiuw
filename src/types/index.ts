export interface Vehicle {
  id: string;
  name: string; // e.g. "Honda Civic FE", "Toyota Corolla Cross"
  licensePlate: string; // e.g. "1ขข 9999 กทม."
  initialOdometer: number; // km
  currentOdometer: number; // km
  fuelTankCapacity?: number; // ลิตร
  fuelType?: string; // e.g. "Gasohol 95", "Diesel", "E20"
  color?: string;
  imageUrl?: string; // Photo of the vehicle (data URL or web URL)
  notes?: string;
  createdAt: string;
}

export interface FuelLog {
  id: string;
  carId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  odometer: number; // km
  liters: number; // ลิตร
  totalCost: number; // บาท
  pricePerLiter: number; // บาท/ลิตร
  isFullTank: boolean; // เติมเต็มถังหรือไม่
  tripDistance?: number; // ระยะทางที่วิ่งได้ (km) คำนวณเมื่อเติมเต็มถัง
  consumptionKmL?: number; // km/L (คำนวณเมื่อเติมเต็มถัง)
  costPerKm?: number; // บาท/km
  accumulatedLitersWindow?: number; // ลิตรสะสมในรอบนี้ (ถ้ามี partial)
  accumulatedCostWindow?: number; // เงินสะสมในรอบนี้
  gasStation?: string; // PTT, Bangchak, Shell, Caltex, etc.
  notes?: string;
}

export type MaintenanceCategory = 
  | 'routine'       // เช็คระยะ / บำรุงรักษาทั่วไป (เปลี่ยนน้ำมันเครื่อง, กรอง)
  | 'repair'        // งานซ่อมแซม / แก้ปัญหาชำรุด
  | 'upgrade'       // ของแต่ง / อุปกรณ์เสริม / จูนนิ่ง
  | 'tires_brakes'  // ยาง / เบรก / ช่วงล่าง
  | 'tax_insurance' // ประกันภัย / พรบ. / ต่อภาษี
  | 'other';        // อื่นๆ

export interface MaintenanceLog {
  id: string;
  carId: string;
  date: string; // YYYY-MM-DD
  odometer: number; // km
  category: MaintenanceCategory;
  title: string; // ชื่อรายการ
  cost: number; // บาท
  workshop?: string; // ร้าน / อู่ / ศูนย์ / ทำเอง
  notes?: string;
  rawInput?: string; // ข้อความเดิมที่พิมพ์
}

export interface MonthlySummary {
  monthKey: string; // "YYYY-MM"
  displayMonth: string; // e.g. "ตุลาคม 2026"
  totalCost: number;
  fuelCost: number;
  maintenanceCost: number;
  totalLiters: number;
  distanceDriven: number; // km
  avgKmL: number | null; // km/L
  avgFuelCostPerKm: number | null; // THB/km
  totalCostPerKm: number | null; // THB/km
  fuelFillCount: number;
  maintenanceCount: number;
}
