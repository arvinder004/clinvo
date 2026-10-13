import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// ── GDPR Encryption Engine (AES-256-GCM) ──────────────────────────────────────
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const DEV_KEY = process.env.CLINVO_GDPR_ENCRYPTION_KEY || 'clinvo_gdpr_aes256_secret_key_prod_2026_secure!';
const BLIND_KEY = process.env.CLINVO_GDPR_BLIND_KEY || 'clinvo_blind_index_hmac_pepper_2026_patient_privacy';

const encKeyBuffer = crypto.createHash('sha256').update(DEV_KEY).digest();
const blindKeyBuffer = crypto.createHash('sha256').update(BLIND_KEY).digest();

function encryptField(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encKeyBuffer, iv, { authTagLength: AUTH_TAG_LENGTH });
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `enc:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function hashBlind(text) {
  if (!text || !text.trim()) return null;
  const normalized = text.trim().toLowerCase().replace(/\s+/g, '');
  return crypto.createHmac('sha256', blindKeyBuffer).update(normalized).digest('hex');
}

function generatePseudonym(prefix = 'CLNV-PAT') {
  const c1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const c2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${c1}-${c2}`;
}

function hashPassword(password, salt) {
  return crypto
    .createHash('sha256')
    .update(password + salt + 'CLINVO_SUPERADMIN_HMAC_PEPPER_2026')
    .digest('hex');
}

function hashPin(pin) {
  return crypto.createHash('sha256').update(pin + 'CLINVO_PIN_PEPPER_2026').digest('hex');
}

async function main() {
  console.log('🔄 Connecting to PostgreSQL via Prisma...');

  // ── 1. Seed Platform Super Admin ──────────────────────────────────────────
  console.log('🔐 Seeding Platform Super Admin with password protection...');
  const adminSalt = 'clinvo_salt_superadmin_master_2026_x89a';
  const adminPasswordHash = hashPassword('ClinvoAdmin#2026!', adminSalt);

  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: 'admin@clinvo.internal' },
    update: {
      passwordHash: adminPasswordHash,
      salt: adminSalt,
      name: 'Arvinder (Platform Super Admin)',
      role: 'SUPER_ADMIN',
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
    create: {
      email: 'admin@clinvo.internal',
      passwordHash: adminPasswordHash,
      salt: adminSalt,
      name: 'Arvinder (Platform Super Admin)',
      role: 'SUPER_ADMIN',
      failedAttempts: 0,
      lastLoginAt: new Date(),
    },
  });
  console.log(`✅ Super Admin configured: ${superAdmin.email} (Role: ${superAdmin.role})`);

  // ── 2. Seed Clinics ───────────────────────────────────────────────────────
  console.log('🏥 Seeding Multi-tenant Clinics...');

  const clinicsData = [
    {
      id: 'clinic-apex-01',
      name: 'Apex Multispecialty Clinic & Diagnostics',
      ownerName: 'Dr. Rajesh Sharma',
      ownerEmail: 'rajesh.sharma@apexclinic.in',
      ownerPhone: '+91 98765 43210',
      speciality: 'Internal Medicine & Cardiology',
      city: 'New Delhi',
      address: 'B-42, Ring Road, South Extension Part II, New Delhi - 110049',
      plan: 'Enterprise Cloud',
      status: 'active',
      currency: 'INR',
      licenseKey: 'CLNV-APEX-9821-2026-ENT',
      masterPinHash: hashPin('1234'),
    },
    {
      id: 'clinic-careplus-02',
      name: 'CarePlus Pediatric & Family Wellness',
      ownerName: 'Dr. Ananya Sen',
      ownerEmail: 'ananya.sen@careplus.in',
      ownerPhone: '+91 98111 22334',
      speciality: 'Pediatrics & Neonatology',
      city: 'Bengaluru',
      address: '12/A, 100 Feet Road, Indiranagar, Bengaluru - 560038',
      plan: 'Growth Practice',
      status: 'active',
      currency: 'INR',
      licenseKey: 'CLNV-CARE-5512-2026-GRO',
      masterPinHash: hashPin('1234'),
    },
    {
      id: 'clinic-lifeline-03',
      name: 'LifeLine Orthopedic & Joint Center',
      ownerName: 'Dr. Vikram Malhotra',
      ownerEmail: 'vikram@lifelineortho.com',
      ownerPhone: '+91 97222 33445',
      speciality: 'Orthopedics & Sports Medicine',
      city: 'Mumbai',
      address: 'Plot 88, Linking Road, Bandra West, Mumbai - 400050',
      plan: 'Starter Trial',
      status: 'trial',
      currency: 'INR',
      licenseKey: 'CLNV-LIFE-3341-2026-TRI',
      masterPinHash: hashPin('1234'),
    },
  ];

  for (const c of clinicsData) {
    await prisma.clinic.upsert({
      where: { ownerEmail: c.ownerEmail },
      update: c,
      create: c,
    });
  }
  console.log(`✅ Seeded ${clinicsData.length} Clinics.`);

  // ── 3. Seed Doctors ───────────────────────────────────────────────────────
  console.log('🩺 Seeding Doctors...');
  const doctorsData = [
    {
      id: 'doc-apex-01',
      clinicId: 'clinic-apex-01',
      name: 'Dr. Rajesh Sharma',
      specialization: 'Consultant Cardiologist',
      qualifications: 'MBBS, MD, DM (Cardiology), FACC',
      phone: '+91 98765 43210',
      address: 'South Extension II, New Delhi',
      registrationNumber: 'MCI-DEL-2009-4412',
    },
    {
      id: 'doc-apex-02',
      clinicId: 'clinic-apex-01',
      name: 'Dr. Preeti Kapoor',
      specialization: 'Senior Physician & Diabetologist',
      qualifications: 'MBBS, MD (Medicine), C.Diab',
      phone: '+91 98765 43211',
      address: 'Lajpat Nagar, New Delhi',
      registrationNumber: 'MCI-DEL-2014-9982',
    },
    {
      id: 'doc-care-01',
      clinicId: 'clinic-careplus-02',
      name: 'Dr. Ananya Sen',
      specialization: 'Pediatric Specialist',
      qualifications: 'MBBS, DCH, DNB (Pediatrics)',
      phone: '+91 98111 22334',
      address: 'Indiranagar, Bengaluru',
      registrationNumber: 'KMC-BLR-2012-7714',
    },
    {
      id: 'doc-life-01',
      clinicId: 'clinic-lifeline-03',
      name: 'Dr. Vikram Malhotra',
      specialization: 'Joint Replacement & Spine Surgeon',
      qualifications: 'MBBS, MS (Ortho), M.Ch (UK)',
      phone: '+91 97222 33445',
      address: 'Bandra West, Mumbai',
      registrationNumber: 'MMC-MUM-2008-3329',
    },
  ];

  for (const d of doctorsData) {
    await prisma.doctor.upsert({
      where: { id: d.id },
      update: d,
      create: d,
    });
  }
  console.log(`✅ Seeded ${doctorsData.length} Doctors.`);

  // ── 4. Seed Clinic Services ───────────────────────────────────────────────
  console.log('💊 Seeding Clinic OPD Services & Rates...');
  const servicesData = [
    { id: 'svc-apex-01', clinicId: 'clinic-apex-01', name: 'Comprehensive Cardiology Consultation', amount: 1500, category: 'Consultation' },
    { id: 'svc-apex-02', clinicId: 'clinic-apex-01', name: '12-Lead Digital ECG', amount: 600, category: 'Diagnostic' },
    { id: 'svc-apex-03', clinicId: 'clinic-apex-01', name: '2D Echocardiography (Echo Doppler)', amount: 2500, category: 'Diagnostic' },
    { id: 'svc-apex-04', clinicId: 'clinic-apex-01', name: 'HbA1c & Fasting Lipid Panel', amount: 1100, category: 'Laboratory' },
    { id: 'svc-care-01', clinicId: 'clinic-careplus-02', name: 'Well-Child Check & Immunization Consultation', amount: 800, category: 'Consultation' },
    { id: 'svc-care-02', clinicId: 'clinic-careplus-02', name: 'Pediatric Nebulization Session', amount: 450, category: 'Procedure' },
    { id: 'svc-life-01', clinicId: 'clinic-lifeline-03', name: 'Orthopedic Joint Evaluation', amount: 1200, category: 'Consultation' },
    { id: 'svc-life-02', clinicId: 'clinic-lifeline-03', name: 'Intra-articular Knee Injection', amount: 3500, category: 'Procedure' },
  ];

  for (const s of servicesData) {
    await prisma.clinicService.upsert({
      where: { id: s.id },
      update: s,
      create: s,
    });
  }
  console.log(`✅ Seeded ${servicesData.length} Clinic Services.`);

  // ── 5. Seed Staff Accounts ────────────────────────────────────────────────
  console.log('👥 Seeding Clinic Staff Accounts...');
  const staffData = [
    { id: 'staff-apex-01', clinicId: 'clinic-apex-01', name: 'Pooja Verma', username: 'reception', pinHash: hashPin('1234'), role: 'receptionist' },
    { id: 'staff-apex-02', clinicId: 'clinic-apex-01', name: 'Rohan Mehra', username: 'billing_desk', pinHash: hashPin('1234'), role: 'admin' },
    { id: 'staff-care-01', clinicId: 'clinic-careplus-02', name: 'Sunita Reddy', username: 'frontdesk', pinHash: hashPin('1234'), role: 'receptionist' },
    { id: 'staff-life-01', clinicId: 'clinic-lifeline-03', name: 'Kavita Joshi', username: 'admin', pinHash: hashPin('1234'), role: 'admin' },
  ];

  for (const st of staffData) {
    await prisma.staffAccount.upsert({
      where: { clinicId_username: { clinicId: st.clinicId, username: st.username } },
      update: st,
      create: st,
    });
  }
  console.log(`✅ Seeded ${staffData.length} Staff Accounts.`);

  // ── 6. Seed Receipts with Full GDPR Field-Level Encryption & Blind Indexes ─
  console.log('🛡️ Seeding Receipts with AES-256-GCM Patient PII Encryption & GDPR Art. 17 support...');

  const samplePatients = [
    { name: 'Sunil Mehra', phone: '+91 98200 11221', dob: '1978-04-12', address: 'Flat 402, Green Glen Layout, Delhi', diagnosis: 'Essential Hypertension, Stage 2' },
    { name: 'Kavita Iyer', phone: '+91 98450 33442', dob: '1985-09-24', address: 'Villa 14, Palm Meadows, Delhi', diagnosis: 'Type 2 Diabetes Mellitus with Dyslipidemia' },
    { name: 'Rahul Deshmukh', phone: '+91 97660 55663', dob: '1992-11-05', address: 'Plot 21, Indira Colony, Delhi', diagnosis: 'Sinus Tachycardia post-viral infection' },
    { name: 'Priya Nambiar', phone: '+91 99120 77884', dob: '1965-02-18', address: 'Sector 15, Rohini, Delhi', diagnosis: 'Coronary Artery Disease - Stable Angina' },
    { name: 'Aarav Gupta', phone: '+91 98990 99005', dob: '2019-06-30', address: '14th Cross, Indiranagar, Bengaluru', diagnosis: 'Acute Bronchiolitis and mild dehydration' },
    { name: 'Diya Krishnan', phone: '+91 98860 11336', dob: '2021-08-14', address: 'Defence Colony, Indiranagar, Bengaluru', diagnosis: 'Allergic Rhinitis and Routine MMR Vaccination' },
    { name: 'Ramesh Patel', phone: '+91 98210 22447', dob: '1960-03-22', address: 'Hill Road, Bandra West, Mumbai', diagnosis: 'Severe Osteoarthritis Right Knee (Grade 4)' },
    { name: 'Siddharth Roy', phone: '+91 98300 44558', dob: '1989-12-10', address: 'Perry Cross Road, Bandra West, Mumbai', diagnosis: 'ACL Sprain and Meniscus Tear - Sports Injury' },
  ];

  const receiptsToSeed = [];
  const now = new Date();

  for (let i = 0; i < samplePatients.length; i++) {
    const p = samplePatients[i];
    const isAnonymized = i === 3; // Make patient 4 anonymized under Article 17
    const clinicId = i < 4 ? 'clinic-apex-01' : i < 6 ? 'clinic-careplus-02' : 'clinic-lifeline-03';
    const doctorId = i < 4 ? (i % 2 === 0 ? 'doc-apex-01' : 'doc-apex-02') : i < 6 ? 'doc-care-01' : 'doc-life-01';
    const doctorName = i < 4 ? (i % 2 === 0 ? 'Dr. Rajesh Sharma' : 'Dr. Preeti Kapoor') : i < 6 ? 'Dr. Ananya Sen' : 'Dr. Vikram Malhotra';

    const dateOffset = new Date(now);
    dateOffset.setDate(now.getDate() - (i % 6));

    const pseudonymId = generatePseudonym('CLNV-PAT');

    const receipt = {
      id: `rec-prisma-${i + 1}`,
      receiptNumber: `INV-2026-${(1001 + i).toString()}`,
      clinicId,
      doctorId,
      doctorName,
      date: dateOffset,
      totalAmount: 1500 + (i * 350),
      paymentMethod: i % 3 === 0 ? 'ONLINE' : i % 3 === 1 ? 'CASH' : 'CARD',
      lineItemsJson: [
        { id: `item-01`, description: 'Specialist Consultation', amount: 1200 },
        { id: `item-02`, description: 'Diagnostic Evaluation', amount: 300 + (i * 350) }
      ],
      // Field-Level AES-256-GCM Encryption
      patientNameEncrypted: isAnonymized ? '[ANONYMIZED_GDPR_ARTICLE_17]' : encryptField(p.name),
      patientPhoneEncrypted: isAnonymized ? '[ANONYMIZED_GDPR_ARTICLE_17]' : encryptField(p.phone),
      patientDobEncrypted: isAnonymized ? '[ANONYMIZED_GDPR_ARTICLE_17]' : encryptField(p.dob),
      patientAddressEncrypted: isAnonymized ? '[ANONYMIZED_GDPR_ARTICLE_17]' : encryptField(p.address),
      diagnosisEncrypted: isAnonymized ? '[ANONYMIZED_GDPR_ARTICLE_17]' : encryptField(p.diagnosis),
      // Demographics
      patientAge: `${40 + i}`,
      patientGender: i % 2 === 0 ? 'Male' : 'Female',
      // Pseudonym & Blind Indexes
      pseudonymId,
      phoneSearchHash: isAnonymized ? null : hashBlind(p.phone),
      nameSearchHash: isAnonymized ? null : hashBlind(p.name),
      // Lawful Basis & Consent
      consentGiven: true,
      consentTimestamp: dateOffset,
      legalBasis: 'HEALTHCARE_PROVISION_ART_9_2_H',
      // Article 17 Erasure
      isAnonymized,
      anonymizedAt: isAnonymized ? new Date() : null,
      anonymizedBy: isAnonymized ? 'Platform Super Admin' : null,
      anonymizationReason: isAnonymized ? 'Data subject exercised GDPR Article 17 Right to Erasure. PII permanently scrubbed.' : null,
    };

    receiptsToSeed.push(receipt);
  }

  for (const r of receiptsToSeed) {
    await prisma.receipt.upsert({
      where: { id: r.id },
      update: r,
      create: r,
    });
  }
  console.log(`✅ Seeded ${receiptsToSeed.length} Receipts with AES-256-GCM ciphertext and GDPR Article 17 compliance.`);

  // ── 7. Seed GDPR Access Audit Logs (Article 30 Records of Processing) ──────
  console.log('📋 Seeding GDPR Article 30 Records of Processing Activities (Audit Trail)...');
  const gdprLogsData = [
    {
      id: 'gdpr-log-01',
      clinicId: 'clinic-apex-01',
      receiptId: 'rec-prisma-1',
      patientPseudonym: receiptsToSeed[0].pseudonymId,
      performedBy: 'Dr. Rajesh Sharma',
      staffRole: 'doctor',
      action: 'DECRYPT_PII',
      purpose: 'CLINICAL_BILLING',
      ipAddress: '192.168.1.104',
      userAgent: 'Clinvo-Desktop/3.0.3 (Macintosh; Intel Mac OS X)',
      timestamp: new Date(Date.now() - 3600000 * 4),
    },
    {
      id: 'gdpr-log-02',
      clinicId: 'clinic-apex-01',
      receiptId: 'rec-prisma-4',
      patientPseudonym: receiptsToSeed[3].pseudonymId,
      performedBy: 'Arvinder (Platform Super Admin)',
      staffRole: 'SUPER_ADMIN',
      action: 'ANONYMIZE_PII',
      purpose: 'RIGHT_TO_ERASURE',
      ipAddress: '10.0.0.1',
      userAgent: 'Clinvo-Web-PlatformAdmin/3.0.3',
      timestamp: new Date(Date.now() - 3600000 * 2),
    },
    {
      id: 'gdpr-log-03',
      clinicId: 'clinic-apex-01',
      receiptId: 'rec-prisma-2',
      patientPseudonym: receiptsToSeed[1].pseudonymId,
      performedBy: 'Pooja Verma',
      staffRole: 'receptionist',
      action: 'VIEW_PII',
      purpose: 'CLINICAL_BILLING',
      ipAddress: '192.168.1.105',
      userAgent: 'Clinvo-Web/3.0.3',
      timestamp: new Date(Date.now() - 3600000 * 1),
    },
    {
      id: 'gdpr-log-04',
      clinicId: 'clinic-careplus-02',
      receiptId: 'rec-prisma-5',
      patientPseudonym: receiptsToSeed[4].pseudonymId,
      performedBy: 'Dr. Ananya Sen',
      staffRole: 'doctor',
      action: 'EXPORT_PII',
      purpose: 'DSAR_EXPORT',
      ipAddress: '192.168.2.50',
      userAgent: 'Clinvo-Web/3.0.3',
      timestamp: new Date(Date.now() - 1800000),
    },
  ];

  for (const log of gdprLogsData) {
    await prisma.gdprAccessAuditLog.upsert({
      where: { id: log.id },
      update: log,
      create: log,
    });
  }
  console.log(`✅ Seeded ${gdprLogsData.length} GDPR Access Audit Logs.`);

  // ── 8. Seed Platform Audit Logs ───────────────────────────────────────────
  console.log('📊 Seeding Platform Audit Logs...');
  const platformLogsData = [
    {
      id: 'plat-log-01',
      clinicId: 'clinic-apex-01',
      userName: 'Arvinder (Platform Super Admin)',
      userRole: 'SUPER_ADMIN',
      clinicName: 'Apex Multispecialty Clinic & Diagnostics',
      action: 'SUPER_ADMIN_LOGIN',
      details: 'Super admin authenticated with master credentials. 2FA/Session active.',
      timestamp: new Date(Date.now() - 7200000),
    },
    {
      id: 'plat-log-02',
      clinicId: 'clinic-careplus-02',
      userName: 'Dr. Ananya Sen',
      userRole: 'owner',
      clinicName: 'CarePlus Pediatric & Family Wellness',
      action: 'CLINIC_REGISTERED',
      details: 'New clinic onboarded on Growth Practice plan.',
      timestamp: new Date(Date.now() - 86400000 * 2),
    },
    {
      id: 'plat-log-03',
      clinicId: 'clinic-lifeline-03',
      userName: 'Dr. Vikram Malhotra',
      userRole: 'owner',
      clinicName: 'LifeLine Orthopedic & Joint Center',
      action: 'TRIAL_ACTIVATED',
      details: 'Starter Trial license activated.',
      timestamp: new Date(Date.now() - 86400000),
    },
  ];

  for (const pl of platformLogsData) {
    await prisma.platformAuditLog.upsert({
      where: { id: pl.id },
      update: pl,
      create: pl,
    });
  }
  console.log(`✅ Seeded ${platformLogsData.length} Platform Audit Logs.`);

  console.log('\n======================================================');
  console.log('🎉 PRISMA POSTGRESQL DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  console.log('Super Admin Login: admin@clinvo.internal / ClinvoAdmin#2026!');
  console.log('Total Clinics: 3 (Apex, CarePlus, LifeLine)');
  console.log('Total Receipts: 8 (Encrypted with AES-256-GCM + Blind Indexing)');
  console.log('GDPR Article 17 Erasure test: 1 anonymized receipt included');
  console.log('GDPR Article 30 ROPA Audit records: 4 entries recorded');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during Prisma database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
