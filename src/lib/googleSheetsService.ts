import type { Vehicle, FuelLog, MaintenanceLog } from '../types';
import { recalculateFuelLogs } from './fuelAlgorithm';

export const SPREADSHEET_TITLE = 'CarLog Book - สมุดบันทึกรถและน้ำมัน';

export interface SheetSetupResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  isNewlyCreated: boolean;
}

/**
 * Searches for existing CarLog spreadsheet in user's Google Drive.
 * If not found, creates a new one with pre-configured tabs and beautiful formatting.
 */
export async function getOrCreateCarLogSpreadsheet(accessToken: string): Promise<SheetSetupResult> {
  // 1. Search for existing file
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
    SPREADSHEET_TITLE
  )}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name,webViewLink)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    console.error('Failed to search Drive:', errText);
    throw new Error('ไม่สามารถค้นหาไฟล์ใน Google Drive ได้ กรุณาตรวจสอบสิทธิ์การใช้งาน');
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const existing = searchData.files[0];
    return {
      spreadsheetId: existing.id,
      spreadsheetUrl: existing.webViewLink || `https://docs.google.com/spreadsheets/d/${existing.id}/edit`,
      isNewlyCreated: false,
    };
  }

  // 2. Create new spreadsheet
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const createPayload = {
    properties: {
      title: SPREADSHEET_TITLE,
    },
    sheets: [
      {
        properties: {
          title: 'Cars',
          gridProperties: { frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Fuel_Logs',
          gridProperties: { frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Maintenance_Logs',
          gridProperties: { frozenRowCount: 1 },
        },
      },
    ],
  };

  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error('Failed to create sheet:', err);
    throw new Error('ไม่สามารถสร้าง Google Sheet ได้');
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl = createdData.spreadsheetUrl;

  // 3. Write Headers
  const headerData = [
    {
      range: 'Cars!A1:K1',
      values: [[
        'ID', 'ชื่อรถ/รุ่น', 'ทะเบียนรถ', 'เลขไมล์เริ่มต้น (km)', 'เลขไมล์ปัจจุบัน (km)',
        'ความจุถัง (L)', 'ประเภทเชื้อเพลิง', 'สีรถ', 'รูปรถ (Image URL)', 'หมายเหตุ', 'วันที่สร้าง'
      ]],
    },
    {
      range: 'Fuel_Logs!A1:N1',
      values: [[
        'ID', 'Car ID', 'วันที่', 'เวลา', 'เลขไมล์ (km)', 'จำนวนลิตร (L)',
        'ยอดเงินรวม (บาท)', 'ราคา/ลิตร (บาท)', 'เติมเต็มถัง', 'ระยะทางวิ่งได้ (km)',
        'อัตราสิ้นเปลือง (km/L)', 'ต้นทุน (บาท/km)', 'ปั๊มน้ำมัน', 'หมายเหตุ'
      ]],
    },
    {
      range: 'Maintenance_Logs!A1:J1',
      values: [[
        'ID', 'Car ID', 'วันที่', 'เลขไมล์ (km)', 'หมวดหมู่', 'ชื่อรายการ',
        'ค่าใช้จ่าย (บาท)', 'สถานที่/อู่', 'หมายเหตุ', 'ข้อความเดิมที่พิมพ์'
      ]],
    },
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: headerData,
    }),
  });

  return {
    spreadsheetId,
    spreadsheetUrl,
    isNewlyCreated: true,
  };
}

/**
 * Loads all vehicles, fuel logs, and maintenance logs from the user's spreadsheet.
 */
export async function loadSpreadsheetData(
  spreadsheetId: string,
  accessToken: string
): Promise<{ vehicles: Vehicle[]; fuelLogs: FuelLog[]; maintenanceLogs: MaintenanceLog[] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=Cars!A2:K&ranges=Fuel_Logs!A2:N&ranges=Maintenance_Logs!A2:J`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error('ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้');
  }

  const data = await res.json();
  const valueRanges = data.valueRanges || [];

  const rawCars = valueRanges[0]?.values || [];
  const rawFuel = valueRanges[1]?.values || [];
  const rawMaint = valueRanges[2]?.values || [];

  const vehicles: Vehicle[] = rawCars.map((row: any[]) => {
    // If row has 11 columns, row[8] is imageUrl, row[9] is notes, row[10] is createdAt
    // If row has 10 columns (older format), row[8] is notes, row[9] is createdAt
    const hasImageCol = row.length >= 11 || (row[8] && (row[8].startsWith('data:image') || row[8].startsWith('http')));
    const imageUrl = hasImageCol ? (row[8] || '') : '';
    const notes = hasImageCol ? (row[9] || '') : (row[8] || '');
    const createdAt = hasImageCol ? (row[10] || new Date().toISOString()) : (row[9] || new Date().toISOString());

    return {
      id: row[0] || '',
      name: row[1] || '',
      licensePlate: row[2] || '',
      initialOdometer: Number(row[3]) || 0,
      currentOdometer: Number(row[4]) || Number(row[3]) || 0,
      fuelTankCapacity: row[5] ? Number(row[5]) : undefined,
      fuelType: row[6] || '',
      color: row[7] || '',
      imageUrl,
      notes,
      createdAt,
    };
  }).filter((v: Vehicle) => v.id && v.name);

  const parsedFuel: FuelLog[] = rawFuel.map((row: any[]) => ({
    id: row[0] || '',
    carId: row[1] || '',
    date: row[2] || '',
    time: row[3] || '',
    odometer: Number(row[4]) || 0,
    liters: Number(row[5]) || 0,
    totalCost: Number(row[6]) || 0,
    pricePerLiter: Number(row[7]) || 0,
    isFullTank: row[8] === 'ใช่' || row[8] === 'TRUE' || row[8] === true || row[8] === 'Yes',
    tripDistance: row[9] ? Number(row[9]) : undefined,
    consumptionKmL: row[10] ? Number(row[10]) : undefined,
    costPerKm: row[11] ? Number(row[11]) : undefined,
    gasStation: row[12] || '',
    notes: row[13] || '',
  })).filter((f: FuelLog) => f.id && f.carId);

  const fuelLogs = recalculateFuelLogs(parsedFuel);

  const maintenanceLogs: MaintenanceLog[] = rawMaint.map((row: any[]) => ({
    id: row[0] || '',
    carId: row[1] || '',
    date: row[2] || '',
    odometer: Number(row[3]) || 0,
    category: (row[4] || 'routine') as any,
    title: row[5] || '',
    cost: Number(row[6]) || 0,
    workshop: row[7] || '',
    notes: row[8] || '',
    rawInput: row[9] || '',
  })).filter((m: MaintenanceLog) => m.id && m.carId);

  return { vehicles, fuelLogs, maintenanceLogs };
}

/**
 * Appends a new vehicle to the Cars sheet.
 */
 export async function appendVehicleToSheet(
  spreadsheetId: string,
  vehicle: Vehicle,
  accessToken: string
) {
  // ดักค่าว่างทั้งหมดให้อยู่ในรูปแบบที่ Google Sheets รับได้
  const row = [
    vehicle.id || '',
    vehicle.name || '',
    vehicle.licensePlate || '',
    vehicle.initialOdometer || 0,
    vehicle.currentOdometer || 0,
    vehicle.fuelTankCapacity || '',
    vehicle.fuelType || '',
    vehicle.color || '',
    vehicle.imageUrl || '',
    vehicle.notes || '',
    vehicle.createdAt || new Date().toISOString(),
  ];

  // แก้พิกัดจาก Cars!A เป็น Cars!A1
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Cars!A1:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [row],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Save Vehicle Error:', errText);
    throw new Error('ไม่สามารถบันทึกข้อมูลรถลงใน Google Sheets ได้');
  }
}

/**
 * Appends a new fuel log entry to Fuel_Logs sheet.
 */
/**
 * Appends a new fuel log entry to Fuel_Logs sheet.
 */
 export async function appendFuelLogToSheet(
  spreadsheetId: string,
  log: FuelLog,
  accessToken: string
) {
  // ดักค่าว่างทั้งหมดให้อยู่ในรูปแบบที่ Google Sheets รับได้
  const row = [
    log.id || '',
    log.carId || '',
    log.date || '',
    log.time || '',
    log.odometer || 0,
    log.liters || 0,
    log.totalCost || 0,
    log.pricePerLiter || 0,
    log.isFullTank ? 'ใช่' : 'ไม่เต็มถัง',
    log.tripDistance || '',
    log.consumptionKmL || '',
    log.costPerKm || '',
    log.gasStation || '',
    log.notes || '',
  ];

  // แก้พิกัดจาก Fuel_Logs!A เป็น Fuel_Logs!A1
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Fuel_Logs!A1:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [row],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Save Fuel Error:', errText);
    throw new Error('ไม่สามารถบันทึกข้อมูลน้ำมันลงใน Google Sheets ได้');
  }
}

/**
 * Appends a new maintenance entry to Maintenance_Logs sheet.
 */
export async function appendMaintenanceLogToSheet(
  spreadsheetId: string,
  log: MaintenanceLog,
  accessToken: string
) {
  const row = [
    log.id || '',
    log.carId || '',
    log.date || '',
    log.odometer || 0,
    log.category || '',
    log.title || '',
    log.cost || 0,
    log.workshop || '',
    log.notes || '',
    log.rawInput || '',
  ];

  // แก้พิกัดจาก Maintenance_Logs!A เป็น Maintenance_Logs!A1
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Maintenance_Logs!A1:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [row],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Save Maintenance Error:', errText);
    throw new Error('ไม่สามารถบันทึกงานซ่อมบำรุงลงใน Google Sheets ได้');
  }
}