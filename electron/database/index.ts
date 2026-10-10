import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';

let db: any;

export const database = {
  init: (Database: any) => {
    const DATA_DIR = path.join(app.getPath('documents'), 'ClinvoData', 'Database');
    const DB_PATH = path.join(DATA_DIR, 'clinvo.db');

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.exec('PRAGMA foreign_keys = OFF;');

    // ── Base Tables ──────────────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS doctors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        specialization TEXT,
        qualifications TEXT,
        phone TEXT,
        address TEXT
      );

      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        amount REAL
      );

      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        receiptNumber TEXT NOT NULL,
        date TEXT NOT NULL,
        patientName TEXT NOT NULL,
        patientAge TEXT,
        patientDob TEXT,
        patientGender TEXT,
        patientPhone TEXT,
        doctorId TEXT,
        doctorName TEXT,
        items TEXT,
        total REAL,
        paymentMethod TEXT
      );

      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // ── Incremental Migrations ────────────────────────────────────────────────
    // Safe ALTER TABLE calls — silently skip if column already exists.
    try { db.exec(`ALTER TABLE receipts ADD COLUMN patientDob TEXT;`); } catch (_) { /* exists */ }
    try { db.exec(`ALTER TABLE receipts ADD COLUMN diagnosis TEXT;`); }  catch (_) { /* exists */ }
  },

  getDbPath: (): string => {
    return path.join(app.getPath('documents'), 'ClinvoData', 'Database', 'clinvo.db');
  },

  // ── Doctors ──────────────────────────────────────────────────────────────
  getDoctors: () => db.prepare('SELECT * FROM doctors').all(),
  saveDoctor: (doctor: any) => {
    return db.prepare(`
      INSERT OR REPLACE INTO doctors (id, name, specialization, qualifications, phone, address)
      VALUES (@id, @name, @specialization, @qualifications, @phone, @address)
    `).run(doctor);
  },
  deleteDoctor: (id: string) => db.prepare('DELETE FROM doctors WHERE id = ?').run(id),

  // ── Services ─────────────────────────────────────────────────────────────
  getServices: () => db.prepare('SELECT * FROM services').all(),
  saveService: (service: any) => {
    return db.prepare(
      'INSERT OR REPLACE INTO services (id, name, amount) VALUES (@id, @name, @amount)'
    ).run(service);
  },
  deleteService: (id: string) => db.prepare('DELETE FROM services WHERE id = ?').run(id),

  // ── Receipts ─────────────────────────────────────────────────────────────
  getReceipts: () => {
    const receipts = db.prepare('SELECT * FROM receipts ORDER BY date DESC').all() as any[];
    return receipts.map(r => {
      try {
        return { ...r, items: JSON.parse(r.items || '[]') };
      } catch (e) {
        console.error('Failed to parse receipt items:', r.id, e);
        return { ...r, items: [] };
      }
    });
  },
  saveReceipt: (receipt: any) => {
    return db.prepare(`
      INSERT OR REPLACE INTO receipts
        (id, receiptNumber, date, patientName, patientAge, patientDob, patientGender,
         patientPhone, doctorId, doctorName, diagnosis, items, total, paymentMethod)
      VALUES
        (@id, @receiptNumber, @date, @patientName, @patientAge, @patientDob, @patientGender,
         @patientPhone, @doctorId, @doctorName, @diagnosis, @items, @total, @paymentMethod)
    `).run({
      patientAge: '', patientDob: '', patientGender: 'Male', patientPhone: '',
      doctorId: '', doctorName: '', diagnosis: '', paymentMethod: 'CASH',
      ...receipt,
      items: JSON.stringify(receipt.items || []),
    });
  },
  updateReceipt: (receipt: any) => {
    return db.prepare(`
      UPDATE receipts SET
        receiptNumber = @receiptNumber, date = @date, patientName = @patientName,
        patientAge = @patientAge, patientDob = @patientDob, patientGender = @patientGender,
        patientPhone = @patientPhone, doctorId = @doctorId, doctorName = @doctorName,
        diagnosis = @diagnosis, items = @items, total = @total, paymentMethod = @paymentMethod
      WHERE id = @id
    `).run({
      patientAge: '', patientDob: '', patientGender: 'Male', patientPhone: '',
      doctorId: '', doctorName: '', diagnosis: '', paymentMethod: 'CASH',
      ...receipt,
      items: JSON.stringify(receipt.items || []),
    });
  },
  deleteReceipt: (id: string) => db.prepare('DELETE FROM receipts WHERE id = ?').run(id),

  // ── Metadata ─────────────────────────────────────────────────────────────
  getMetadata: (key: string) => db.prepare('SELECT value FROM metadata WHERE key = ?').get(key),
  setMetadata: (key: string, value: string) => {
    return db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)').run(key, value);
  },

  // ── Batch Import ─────────────────────────────────────────────────────────
  batchImportDoctors: (doctors: any[]) => {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO doctors (id, name, specialization, qualifications, phone, address)
      VALUES (@id, @name, @specialization, @qualifications, @phone, @address)
    `);
    const transaction = db.transaction((docs: any[]) => {
      for (const doc of docs) insert.run(doc);
    });
    transaction(doctors);
  },
};
