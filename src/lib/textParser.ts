import type { MaintenanceCategory } from '../types';

export interface ParsedMaintenance {
  title: string;
  cost: number | null;
  category: MaintenanceCategory;
  hasExtractedCost: boolean;
}

/**
 * Parses free-form maintenance or car upgrade notes.
 * Extracts the trailing number as cost (e.g. "เปลี่ยนถ่ายน้ำมันเครื่อง 4L 1850" -> title: "เปลี่ยนถ่ายน้ำมันเครื่อง 4L", cost: 1850)
 * and detects suggested category based on keywords.
 */
export function parseMaintenanceInput(input: string): ParsedMaintenance {
  if (!input || !input.trim()) {
    return {
      title: '',
      cost: null,
      category: 'routine',
      hasExtractedCost: false,
    };
  }

  let text = input.trim();

  // Strip trailing currency indicators like "บาท", "บ.", "thb", "THB", "baht"
  text = text.replace(/\s*(?:บาท|บ\.|THB|thb|baht)\s*$/i, '').trim();

  // Regex to match trailing number with optional commas and decimals
  // Handles examples:
  // "เปลี่ยนถ่ายน้ำมันเครื่อง Shell 0W-20 1850" -> "เปลี่ยนถ่ายน้ำมันเครื่อง Shell 0W-20", 1850
  // "โช้ค Tein EnduraPro 24,500" -> "โช้ค Tein EnduraPro", 24500
  // "กรองแอร์ 350.50" -> "กรองแอร์", 350.5
  const trailingNumRegex = /^(.*?)(?:\s+|,|;)([\d,]+(?:\.\d{1,2})?)$/;
  const match = text.match(trailingNumRegex);

  let title = text;
  let cost: number | null = null;
  let hasExtractedCost = false;

  if (match && match[1] && match[2]) {
    const rawNumber = match[2].replace(/,/g, '');
    const parsedNumber = parseFloat(rawNumber);

    if (!isNaN(parsedNumber) && parsedNumber >= 0) {
      title = match[1].trim();
      cost = parsedNumber;
      hasExtractedCost = true;
    }
  }

  // Suggest category based on Thai/English automotive keywords
  const category = detectMaintenanceCategory(text);

  return {
    title,
    cost,
    category,
    hasExtractedCost,
  };
}

export function detectMaintenanceCategory(text: string): MaintenanceCategory {
  const lower = text.toLowerCase();

  // 1. Tax & Insurance
  if (/ประกัน|พรบ|พ\.ร\.บ|ภาษี|ต่อภาษี|ตรอ|ป้ายวงกลม|ตรวจสภาพ|insurance|tax/.test(lower)) {
    return 'tax_insurance';
  }

  // 2. Tires & Brakes
  if (/ยาง|ผ้าเบรก|จานเบรก|เบรก|สลับยาง|ถ่วงล้อ|ตั้งศูนย์|ปะยาง|คาลิปเปอร์|brake|tire|tyre/.test(lower)) {
    return 'tires_brakes';
  }

  // 3. Upgrades / Mods
  if (/แต่ง|ของแต่ง|ท่อ|สปริง|โช้ค|โช๊ค|สตรัท|แม็ก|ล้อแม็ก|ค้ำ|จูน|remap|ฟิล์ม|กรองเปลือย|สปอยเลอร์|สเกิร์ต|ชุดแต่ง|เคลือบแก้ว|ฟิล์มใส|ไฟหน้า|ไฟท้าย|upgrade|mod|carbon|exhaust/.test(lower)) {
    return 'upgrade';
  }

  // 4. Repairs
  if (/ซ่อม|เคลม|รั่ว|ซึม|แก้|ดับ|มีเสียง|ชำรุด|เปลี่ยนแร็ค|ปั๊มน้ำ|ไดชาร์จ|ไดสตาร์ท|หม้อน้ำ|พัดลม|ลูกปืน|ลูกหมาก|เพลาขับ|แอร์ไม่เย็น|คอมแอร์|พัง|repair|fix/.test(lower)) {
    return 'repair';
  }

  // 5. Routine maintenance
  if (/น้ำมันเครื่อง|น้ำมันเกียร์|กรองน้ำมัน|กรองแอร์|กรองอากาศ|เช็คระยะ|รอบ|หมื่นโล|พันโล|ถ่ายน้ำมัน|หัวเทียน|หล่อเย็น|ใบปัด|ล้างแอร์|routine|service|maintenance/.test(lower)) {
    return 'routine';
  }

  return 'routine';
}

export const CATEGORY_LABELS: Record<MaintenanceCategory, { label: string; color: string }> = {
  routine: { label: 'เช็คระยะ/บำรุงรักษา', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  repair: { label: 'งานซ่อมแซม', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  upgrade: { label: 'ของแต่ง/อัพเกรด', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  tires_brakes: { label: 'ยาง/เบรก/ช่วงล่าง', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  tax_insurance: { label: 'ประกัน/พรบ/ภาษี', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  other: { label: 'อื่นๆ', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' },
};
