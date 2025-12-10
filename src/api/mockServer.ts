import type {
  Alert,
  BackOfficeSyncResult,
  DeliveryRecord,
  Jobber,
  FuelOrder,
  OrderSuggestion,
  ManagerContact,
  ServiceCompany,
  ServiceTicket,
  RunoutPrediction,
  SiteSettings,
  SiteSummary,
  Supplier,
  Tank,
  VarianceEvent,
  User,
  UserProfile,
} from '../types';

type HttpMethod = 'GET' | 'POST' | 'PUT';

let mockUser: User = {
  id: 'user-1',
  email: 'owner@example.com',
  name: 'Station Owner',
};

let userProfile: UserProfile = {
  id: 'user-1',
  companyName: 'FuelSense Pilot Stores',
  contactName: 'Station Owner',
  email: 'owner@example.com',
  phone: '+1 (555) 222-7777',
  notes: 'Prefers email first; SMS for critical issues.',
};

let sites: SiteSummary[] = [
  {
    id: 'site-101',
    name: 'Quick Stop Market',
    address: '1200 Market St',
    city: 'Nashville, TN',
    status: 'ATTENTION',
    currentDailyVarianceGallons: -42,
    currentDailyVarianceValue: -147,
    openAlertCount: 3,
    lowestTankPercent: 18,
  },
  {
    id: 'site-202',
    name: 'Lakeside Fuel',
    address: '4557 Lake Ave',
    city: 'Memphis, TN',
    status: 'HEALTHY',
    currentDailyVarianceGallons: -8,
    currentDailyVarianceValue: -28,
    openAlertCount: 1,
    lowestTankPercent: 33,
  },
  {
    id: 'site-303',
    name: 'Ridgeview Gas & Go',
    address: '7824 Ridge Rd',
    city: 'Knoxville, TN',
    status: 'CRITICAL',
    currentDailyVarianceGallons: -65,
    currentDailyVarianceValue: -228,
    openAlertCount: 4,
    lowestTankPercent: 9,
  },
];

let tanks: Tank[] = [
  {
    id: 'tank-101-1',
    siteId: 'site-101',
    name: 'Regular 87',
    gradeCode: 'REG',
    capacityGallons: 12000,
    currentGallons: 3600,
    waterLevelInches: 0.3,
    temperatureC: 18,
    status: 'LOW',
  },
  {
    id: 'tank-101-2',
    siteId: 'site-101',
    name: 'Premium 93',
    gradeCode: 'PREM',
    capacityGallons: 8000,
    currentGallons: 5200,
    waterLevelInches: 0.1,
    temperatureC: 19,
    status: 'OK',
  },
  {
    id: 'tank-101-4',
    siteId: 'site-101',
    name: 'Midgrade 89',
    gradeCode: 'MID',
    capacityGallons: 7000,
    currentGallons: 3600,
    waterLevelInches: 0.12,
    temperatureC: 19,
    status: 'LOW',
  },
  {
    id: 'tank-101-3',
    siteId: 'site-101',
    name: 'Diesel',
    gradeCode: 'DSL',
    capacityGallons: 10000,
    currentGallons: 7500,
    waterLevelInches: 0.6,
    temperatureC: 16,
    status: 'WATER',
  },
  {
    id: 'tank-202-1',
    siteId: 'site-202',
    name: 'Regular 87',
    gradeCode: 'REG',
    capacityGallons: 10000,
    currentGallons: 6200,
    waterLevelInches: 0.05,
    temperatureC: 20,
    status: 'OK',
  },
  {
    id: 'tank-202-2',
    siteId: 'site-202',
    name: 'Diesel',
    gradeCode: 'DSL',
    capacityGallons: 9000,
    currentGallons: 3000,
    waterLevelInches: 0.2,
    temperatureC: 21,
    status: 'CRITICAL',
  },
  {
    id: 'tank-202-3',
    siteId: 'site-202',
    name: 'Premium 93',
    gradeCode: 'PREM',
    capacityGallons: 7000,
    currentGallons: 4200,
    waterLevelInches: 0.08,
    temperatureC: 20,
    status: 'OK',
  },
  {
    id: 'tank-202-4',
    siteId: 'site-202',
    name: 'Midgrade 89',
    gradeCode: 'MID',
    capacityGallons: 6500,
    currentGallons: 3100,
    waterLevelInches: 0.1,
    temperatureC: 20,
    status: 'LOW',
  },
  {
    id: 'tank-303-1',
    siteId: 'site-303',
    name: 'Regular 87',
    gradeCode: 'REG',
    capacityGallons: 12000,
    currentGallons: 1900,
    waterLevelInches: 0.4,
    temperatureC: 17,
    status: 'CRITICAL',
  },
  {
    id: 'tank-303-2',
    siteId: 'site-303',
    name: 'Premium 93',
    gradeCode: 'PREM',
    capacityGallons: 8000,
    currentGallons: 2100,
    waterLevelInches: 0.2,
    temperatureC: 17,
    status: 'LOW',
  },
  {
    id: 'tank-303-3',
    siteId: 'site-303',
    name: 'Diesel',
    gradeCode: 'DSL',
    capacityGallons: 9000,
    currentGallons: 3100,
    waterLevelInches: 0.25,
    temperatureC: 17,
    status: 'LOW',
  },
  {
    id: 'tank-303-4',
    siteId: 'site-303',
    name: 'Midgrade 89',
    gradeCode: 'MID',
    capacityGallons: 7000,
    currentGallons: 2800,
    waterLevelInches: 0.18,
    temperatureC: 17,
    status: 'CRITICAL',
  },
];

let alerts: Alert[] = [
  {
    id: 'alert-1',
    siteId: 'site-101',
    timestamp: new Date().toISOString(),
    severity: 'CRITICAL',
    type: 'WATER_DETECTED',
    message: 'Water detected in Diesel tank above threshold',
    isOpen: true,
  },
  {
    id: 'alert-2',
    siteId: 'site-101',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    severity: 'WARNING',
    type: 'RUNOUT_RISK',
    message: 'Regular 87 predicted to hit 10% in 9 hours',
    isOpen: true,
  },
  {
    id: 'alert-3',
    siteId: 'site-202',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    severity: 'INFO',
    type: 'ATG_POS_MISMATCH',
    message: 'ATG vs POS variance exceeded 15 gallons',
    isOpen: true,
  },
  {
    id: 'alert-4',
    siteId: 'site-303',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    severity: 'CRITICAL',
    type: 'POSSIBLE_THEFT',
    message: 'Unexplained drawdown detected overnight',
    isOpen: true,
  },
  {
    id: 'alert-5',
    siteId: 'site-303',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    severity: 'WARNING',
    type: 'SHORT_DELIVERY',
    message: 'Short delivery suspected on last drop',
    isOpen: false,
  },
];

let deliveries: DeliveryRecord[] = [
  {
    id: 'del-1',
    siteId: 'site-101',
    timestamp: new Date(Date.now() - 1000 * 60 * 220).toISOString(),
    supplier: 'Phillips 66',
    gradeCode: 'REG',
    bolGallons: 6800,
    atgReceivedGallons: 6650,
    status: 'CHECK',
  },
  {
    id: 'del-2',
    siteId: 'site-101',
    timestamp: new Date(Date.now() - 1000 * 60 * 540).toISOString(),
    supplier: 'BP',
    gradeCode: 'DSL',
    bolGallons: 7200,
    atgReceivedGallons: 7200,
    status: 'OK',
  },
  {
    id: 'del-3',
    siteId: 'site-202',
    timestamp: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
    supplier: 'Marathon',
    gradeCode: 'REG',
    bolGallons: 5000,
    atgReceivedGallons: 4885,
    status: 'SHORT',
  },
  {
    id: 'del-4',
    siteId: 'site-202',
    timestamp: new Date(Date.now() - 1000 * 60 * 800).toISOString(),
    supplier: 'Shell',
    gradeCode: 'DSL',
    bolGallons: 6000,
    atgReceivedGallons: 5980,
    status: 'OK',
  },
  {
    id: 'del-4b',
    siteId: 'site-202',
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    supplier: 'Shell',
    gradeCode: 'PREM',
    bolGallons: 4500,
    atgReceivedGallons: 4420,
    status: 'CHECK',
  },
  {
    id: 'del-4c',
    siteId: 'site-202',
    timestamp: new Date(Date.now() - 1000 * 60 * 320).toISOString(),
    supplier: 'BP',
    gradeCode: 'MID',
    bolGallons: 3800,
    atgReceivedGallons: 3700,
    status: 'OK',
  },
  {
    id: 'del-5',
    siteId: 'site-303',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    supplier: 'BP',
    gradeCode: 'REG',
    bolGallons: 6500,
    atgReceivedGallons: 6320,
    status: 'CHECK',
  },
  {
    id: 'del-6',
    siteId: 'site-303',
    timestamp: new Date(Date.now() - 1000 * 60 * 960).toISOString(),
    supplier: 'Marathon',
    gradeCode: 'PREM',
    bolGallons: 4200,
    atgReceivedGallons: 4100,
    status: 'OK',
  },
  {
    id: 'del-7',
    siteId: 'site-303',
    timestamp: new Date(Date.now() - 1000 * 60 * 250).toISOString(),
    supplier: 'Exxon',
    gradeCode: 'DSL',
    bolGallons: 5200,
    atgReceivedGallons: 5000,
    status: 'CHECK',
  },
  {
    id: 'del-8',
    siteId: 'site-303',
    timestamp: new Date(Date.now() - 1000 * 60 * 410).toISOString(),
    supplier: 'Chevron',
    gradeCode: 'MID',
    bolGallons: 3600,
    atgReceivedGallons: 3500,
    status: 'CHECK',
  },
];

let varianceEvents: VarianceEvent[] = [
  {
    id: 'var-1',
    siteId: 'site-101',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    gradeCode: 'REG',
    expectedGallons: 500,
    actualGallons: 470,
    varianceGallons: -30,
    severity: 'WARNING',
    note: 'Pump calibration check suggested',
  },
  {
    id: 'var-2',
    siteId: 'site-101',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    gradeCode: 'DSL',
    expectedGallons: 400,
    actualGallons: 320,
    varianceGallons: -80,
    severity: 'CRITICAL',
    note: 'Possible water displacement',
  },
  {
    id: 'var-3',
    siteId: 'site-202',
    timestamp: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
    gradeCode: 'REG',
    expectedGallons: 600,
    actualGallons: 592,
    varianceGallons: -8,
    severity: 'INFO',
  },
  {
    id: 'var-3c',
    siteId: 'site-202',
    timestamp: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
    gradeCode: 'MID',
    expectedGallons: 500,
    actualGallons: 470,
    varianceGallons: -30,
    severity: 'WARNING',
    note: 'Midgrade variance during afternoon shift',
  },
  {
    id: 'var-3b',
    siteId: 'site-202',
    timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    gradeCode: 'PREM',
    expectedGallons: 420,
    actualGallons: 380,
    varianceGallons: -40,
    severity: 'WARNING',
    note: 'Premium loss observed during evening shift',
  },
  {
    id: 'var-4',
    siteId: 'site-303',
    timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    gradeCode: 'REG',
    expectedGallons: 700,
    actualGallons: 630,
    varianceGallons: -70,
    severity: 'CRITICAL',
  },
  {
    id: 'var-5',
    siteId: 'site-303',
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    gradeCode: 'PREM',
    expectedGallons: 200,
    actualGallons: 190,
    varianceGallons: -10,
    severity: 'WARNING',
  },
  {
    id: 'var-6',
    siteId: 'site-303',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    gradeCode: 'DSL',
    expectedGallons: 350,
    actualGallons: 310,
    varianceGallons: -40,
    severity: 'WARNING',
    note: 'Diesel drawdown during morning deliveries',
  },
  {
    id: 'var-7',
    siteId: 'site-303',
    timestamp: new Date(Date.now() - 1000 * 60 * 62).toISOString(),
    gradeCode: 'MID',
    expectedGallons: 420,
    actualGallons: 390,
    varianceGallons: -30,
    severity: 'WARNING',
    note: 'Midgrade leak suspected',
  },
  // Older events to differentiate 7d vs 30d badges
  {
    id: 'var-8',
    siteId: 'site-101',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    gradeCode: 'REG',
    expectedGallons: 1200,
    actualGallons: 1150,
    varianceGallons: -50,
    severity: 'WARNING',
    note: 'Week-old variance for badge testing',
  },
  {
    id: 'var-9',
    siteId: 'site-101',
    timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    gradeCode: 'REG',
    expectedGallons: 900,
    actualGallons: 860,
    varianceGallons: -40,
    severity: 'INFO',
    note: 'Mid-month variance for badge testing',
  },
  {
    id: 'var-10',
    siteId: 'site-101',
    timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    gradeCode: 'DSL',
    expectedGallons: 800,
    actualGallons: 760,
    varianceGallons: -40,
    severity: 'WARNING',
    note: 'Diesel variance outside 7d but inside 30d',
  },
];

let settings: SiteSettings[] = [
  {
    siteId: 'site-101',
    lowTankPercent: 20,
    criticalTankPercent: 10,
    dailyVarianceAlertGallons: 60,
    notifyByEmail: true,
    notifyBySms: true,
    preferredComm: 'EMAIL',
    alertFrequencyCritical: 'IMMEDIATE',
    alertFrequencyWarning: 'HOURLY',
    alertFrequencyInfo: 'DAILY',
    jobberId: 'job-1',
    jobberContactName: 'T. Reeves',
    jobberPhone: '+1 (555) 201-0101',
    jobberEmail: 'orders@marathonjobber.com',
    serviceCompanyId: 'svc-1',
    serviceContactName: 'Ana Patel',
    servicePhone: '+1 (555) 200-1111',
    serviceEmail: 'dispatch@bluetech.com',
    backOfficeProvider: 'MODISOFT',
    backOfficeUsername: 'quickstop-owner',
    backOfficePassword: 'password123',
  },
  {
    siteId: 'site-202',
    lowTankPercent: 18,
    criticalTankPercent: 8,
    dailyVarianceAlertGallons: 50,
    notifyByEmail: true,
    notifyBySms: false,
    preferredComm: 'SMS',
    alertFrequencyCritical: 'IMMEDIATE',
    alertFrequencyWarning: 'HOURLY',
    alertFrequencyInfo: 'DAILY',
    jobberId: 'job-2',
    jobberContactName: 'L. Parker',
    jobberPhone: '+1 (555) 202-0202',
    jobberEmail: 'dispatch@shelljobber.com',
    serviceCompanyId: 'svc-2',
    serviceContactName: 'Luis Gomez',
    servicePhone: '+1 (555) 333-4444',
    serviceEmail: 'support@pumpcare.com',
    backOfficeProvider: 'C_STORE',
    backOfficeUsername: 'lakeside-admin',
    backOfficePassword: 'welcome!',
  },
  {
    siteId: 'site-303',
    lowTankPercent: 25,
    criticalTankPercent: 12,
    dailyVarianceAlertGallons: 75,
    notifyByEmail: true,
    notifyBySms: true,
    preferredComm: 'CALL',
    alertFrequencyCritical: 'IMMEDIATE',
    alertFrequencyWarning: 'HOURLY',
    alertFrequencyInfo: 'DAILY',
    jobberId: 'job-1',
    jobberContactName: 'T. Reeves',
    jobberPhone: '+1 (555) 201-0101',
    jobberEmail: 'orders@marathonjobber.com',
    serviceCompanyId: 'svc-3',
    serviceContactName: 'Kayla Chen',
    servicePhone: '+1 (555) 888-9999',
    serviceEmail: 'service@fuelsafe.io',
    backOfficeProvider: 'MODISOFT',
    backOfficeUsername: 'ridgeview-manager',
    backOfficePassword: 'fuel-safe-303',
  },
];

let runoutPredictions: RunoutPrediction[] = [
  { siteId: 'site-101', tankId: 'tank-101-1', gradeCode: 'REG', hoursToTenPercent: 9, hoursToEmpty: 27 },
  { siteId: 'site-101', tankId: 'tank-101-2', gradeCode: 'PREM', hoursToTenPercent: 21, hoursToEmpty: 60 },
  { siteId: 'site-101', tankId: 'tank-101-3', gradeCode: 'DSL', hoursToTenPercent: 36, hoursToEmpty: 80 },
  { siteId: 'site-202', tankId: 'tank-202-1', gradeCode: 'REG', hoursToTenPercent: 30, hoursToEmpty: 72 },
  { siteId: 'site-202', tankId: 'tank-202-2', gradeCode: 'DSL', hoursToTenPercent: 7, hoursToEmpty: 19 },
  { siteId: 'site-202', tankId: 'tank-202-3', gradeCode: 'PREM', hoursToTenPercent: 18, hoursToEmpty: 48 },
  { siteId: 'site-303', tankId: 'tank-303-1', gradeCode: 'REG', hoursToTenPercent: 5, hoursToEmpty: 14 },
  { siteId: 'site-303', tankId: 'tank-303-2', gradeCode: 'PREM', hoursToTenPercent: 11, hoursToEmpty: 29 },
  { siteId: 'site-303', tankId: 'tank-303-3', gradeCode: 'DSL', hoursToTenPercent: 9, hoursToEmpty: 24 },
];

function computeLowestTankPercent(siteId: string): number {
  const siteTanks = tanks.filter((t) => t.siteId === siteId && t.gradeCode !== 'MID');
  if (!siteTanks.length) return 0;
  const percents = siteTanks.map((t) => (t.currentGallons / t.capacityGallons) * 100);
  return Math.round(Math.min(...percents));
}

const MID_PREM_RATIO = 0.6;
const MID_REG_RATIO = 0.4;

function getPhysicalSiteTanks(siteId: string): Tank[] {
  return tanks.filter((t) => t.siteId === siteId && t.gradeCode !== 'MID');
}

function computeBlendedGallons(regGallons: number, premGallons: number): number {
  const potentialFromReg = regGallons / MID_REG_RATIO;
  const potentialFromPrem = premGallons / MID_PREM_RATIO;
  return Math.round(Math.min(potentialFromReg, potentialFromPrem));
}

function withComputedSummary(site: SiteSummary): SiteSummary {
  const siteAlerts = alerts.filter((a) => a.siteId === site.id);
  const openCount = siteAlerts.filter((a) => a.isOpen).length;
  return { ...site, lowestTankPercent: computeLowestTankPercent(site.id), openAlertCount: openCount };
}

function deriveMidTank(siteId: string): Tank | null {
  const reg = tanks.find((t) => t.siteId === siteId && t.gradeCode === 'REG');
  const prem = tanks.find((t) => t.siteId === siteId && t.gradeCode === 'PREM');
  if (!reg || !prem) return null;
  const capacityGallons = computeBlendedGallons(reg.capacityGallons, prem.capacityGallons);
  const currentGallons = computeBlendedGallons(reg.currentGallons, prem.currentGallons);
  const temperatureC = Math.round(((reg.temperatureC + prem.temperatureC) / 2) * 10) / 10;
  return {
    id: `mid-${siteId}`,
    siteId,
    name: 'Midgrade 89',
    gradeCode: 'MID',
    capacityGallons,
    currentGallons,
    waterLevelInches: 0,
    temperatureC,
    status: 'OK',
  };
}

function computeRunoutForSite(siteId: string): RunoutPrediction[] {
  const siteTanks = getPhysicalSiteTanks(siteId);
  const staticPreds = runoutPredictions.filter((r) => r.siteId === siteId);

  const siteEvents = varianceEvents
    .filter((v) => v.siteId === siteId)
    .map((v) => ({ date: new Date(v.timestamp).toDateString(), gallons: Math.abs(v.varianceGallons) }))
    .reduce<Record<string, number>>((acc, ev) => {
      acc[ev.date] = (acc[ev.date] || 0) + ev.gallons;
      return acc;
    }, {});

  const dailyTotals = Object.values(siteEvents).sort((a, b) => b - a);
  const periods = 5;
  const alpha = 2 / (periods + 1);
  let ema = 600;
  dailyTotals.forEach((val, idx) => {
    ema = idx === 0 ? val : val * alpha + ema * (1 - alpha);
  });

  const burnPerHour = ema / 24;

  const preds = siteTanks.map((t) => {
    const tenPercentLevel = 0.1 * t.capacityGallons;
    const hoursToTen =
      burnPerHour > 0 ? Math.max(Math.floor((t.currentGallons - tenPercentLevel) / burnPerHour), 0) : 0;
    const hoursToEmpty = burnPerHour > 0 ? Math.max(Math.floor(t.currentGallons / burnPerHour), 0) : 0;
    const match = staticPreds.find((r) => r.tankId === t.id);
    return {
      siteId,
      tankId: t.id,
      gradeCode: t.gradeCode,
      hoursToTenPercent: match?.hoursToTenPercent ?? hoursToTen,
      hoursToEmpty: match?.hoursToEmpty ?? hoursToEmpty,
    };
  });

  const regRunout = preds.find((p) => p.gradeCode === 'REG');
  const premRunout = preds.find((p) => p.gradeCode === 'PREM');
  const midTank = deriveMidTank(siteId);
  if (midTank && regRunout && premRunout) {
    preds.push({
      siteId,
      tankId: midTank.id,
      gradeCode: 'MID',
      hoursToTenPercent: Math.round(regRunout.hoursToTenPercent * 0.4 + premRunout.hoursToTenPercent * 0.6),
      hoursToEmpty: Math.round(regRunout.hoursToEmpty * 0.4 + premRunout.hoursToEmpty * 0.6),
    });
  }

  return preds;
}

let serviceCompanies: ServiceCompany[] = [
  { id: 'svc-1', siteId: 'site-101', name: 'BlueTech Services', contactName: 'Ana Patel', phone: '+1 (555) 200-1111', email: 'dispatch@bluetech.com', notes: '24/7 dispatch' },
  { id: 'svc-2', siteId: 'site-202', name: 'PumpCare Pros', contactName: 'Luis Gomez', phone: '+1 (555) 333-4444', email: 'support@pumpcare.com', notes: 'Prefers morning visits' },
  { id: 'svc-3', siteId: 'site-303', name: 'FuelSafe Technicians', contactName: 'Kayla Chen', phone: '+1 (555) 888-9999', email: 'service@fuelsafe.io', notes: 'Water remediation specialists' },
];

let serviceTickets: ServiceTicket[] = [];

let jobbers: Jobber[] = [
  { id: 'job-1', name: 'Marathon Jobber', contactName: 'T. Reeves', phone: '+1 (555) 201-0101', email: 'orders@marathonjobber.com' },
  { id: 'job-2', name: 'Shell Jobber', contactName: 'L. Parker', phone: '+1 (555) 202-0202', email: 'dispatch@shelljobber.com' },
];

let managerContacts: ManagerContact[] = [
  { id: 'mgr-101-1', siteId: 'site-101', name: 'Jamie Flores', role: 'Store Manager', email: 'jamie@quickstop.com', phone: '+1 (555) 410-1122', notifyCritical: 'IMMEDIATE', notifyWarning: 'HOURLY', notifyInfo: 'DAILY', notifyEmail: true, notifySms: true, notifyCall: false },
  { id: 'mgr-101-2', siteId: 'site-101', name: 'Arun Shah', role: 'Owner', email: 'arun@quickstop.com', phone: '+1 (555) 410-7788', notifyCritical: 'IMMEDIATE', notifyWarning: 'DAILY', notifyInfo: 'DAILY', notifyEmail: true, notifySms: false, notifyCall: true },
  { id: 'mgr-202-1', siteId: 'site-202', name: 'Kelly Wu', role: 'Store Manager', email: 'kelly@lakesidefuel.com', phone: '+1 (555) 620-3344', notifyCritical: 'IMMEDIATE', notifyWarning: 'HOURLY', notifyInfo: 'DAILY', notifyEmail: true, notifySms: true, notifyCall: false },
  { id: 'mgr-303-1', siteId: 'site-303', name: 'Samir Patel', role: 'Store Manager', email: 'samir@ridgeviewgas.com', phone: '+1 (555) 920-4455', notifyCritical: 'IMMEDIATE', notifyWarning: 'HOURLY', notifyInfo: 'DAILY', notifyEmail: true, notifySms: true, notifyCall: true },
];

let suppliers: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Lone Star Fuel Supply',
    contactName: 'Mike Thompson',
    phone: '+1 (555) 123-4567',
    email: 'mike@lonestarfuel.com',
  },
  {
    id: 'sup-2',
    name: 'Gulf Coast Petroleum',
    contactName: 'Sarah Lee',
    phone: '+1 (555) 987-6543',
    email: 'slee@gulfcoastpetro.com',
  },
];

let fuelOrders: FuelOrder[] = [
  {
    id: 'ord-1',
    siteId: 'site-101',
    supplierId: 'sup-1',
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
    requestedDeliveryWindowStart: new Date().toISOString(),
    requestedDeliveryWindowEnd: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    notes: 'Night delivery preferred',
    lines: [
      { id: 'line-1', gradeCode: 'REG', requestedGallons: 6000 },
      { id: 'line-2', gradeCode: 'DSL', requestedGallons: 3000 },
    ],
  },
];

function buildOrderSuggestion(siteId: string): OrderSuggestion {
  const siteTanks = getPhysicalSiteTanks(siteId);
  const mid = deriveMidTank(siteId);
  const allTanks = mid ? [...siteTanks, mid] : siteTanks;
  const runouts = computeRunoutForSite(siteId);
  return {
    siteId,
    generatedAt: new Date().toISOString(),
    suggestedLines: allTanks.map((t) => {
      const percentFull = (t.currentGallons / t.capacityGallons) * 100;
      const estHoursToTenPercent = runouts.find((r) => r.tankId === t.id)?.hoursToTenPercent ?? 24;
      const suggestedOrderGallons = Math.max(0, t.capacityGallons - t.currentGallons - 100);
      return {
        gradeCode: t.gradeCode,
        currentGallons: t.currentGallons,
        capacityGallons: t.capacityGallons,
        percentFull,
        estHoursToTenPercent,
        suggestedOrderGallons,
      };
    }),
  };
}

function delay<T>(value: T, ms = 200 + Math.random() * 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function mockRequest<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  if (method === 'POST' && path === '/auth/login') {
    return delay({
      user: mockUser,
      token: 'mock-token',
    } as unknown as T);
  }

  if (method === 'GET' && path === '/user/profile') {
    return delay(userProfile as unknown as T);
  }

  if (method === 'PUT' && path === '/user/profile') {
    const partial = body as Partial<UserProfile>;
    userProfile = { ...userProfile, ...partial };
    return delay(userProfile as unknown as T);
  }

  if (method === 'GET' && path === '/suppliers') {
    return delay(suppliers as unknown as T);
  }

  if (method === 'GET' && path === '/service-companies') {
    return delay(serviceCompanies as unknown as T);
  }

  if (method === 'GET' && path === '/jobbers') {
    return delay(jobbers as unknown as T);
  }
  if (method === 'POST' && path === '/jobbers') {
    const payload = body as Omit<Jobber, 'id'>;
    const jobber: Jobber = { ...payload, id: `job-${Date.now()}` };
    jobbers.push(jobber);
    return delay(jobber as unknown as T);
  }

  if (method === 'GET' && path === '/sites') {
    return delay(sites.map(withComputedSummary) as unknown as T);
  }

  const siteMatch = path.match(/^\/sites\/([^/]+)(.*)$/);
  if (siteMatch) {
    const siteId = siteMatch[1];
    const subPath = siteMatch[2] || '';

    if (method === 'GET' && (subPath === '' || subPath === '/')) {
      const site = sites.find((s) => s.id === siteId);
      if (!site) throw new Error('Site not found');
      return delay(withComputedSummary(site) as unknown as T);
    }

    if (method === 'GET' && subPath === '/tanks') {
      const siteTanks = getPhysicalSiteTanks(siteId);
      const mid = deriveMidTank(siteId);
      const response = mid ? [...siteTanks, mid] : siteTanks;
      return delay(response as unknown as T);
    }

    if (method === 'GET' && subPath === '/overview') {
      const site = sites.find((s) => s.id === siteId);
      if (!site) throw new Error('Site not found');
      const siteTanks = getPhysicalSiteTanks(siteId);
      const mid = deriveMidTank(siteId);
      const allTanks = mid ? [...siteTanks, mid] : siteTanks;
      const siteAlerts = alerts.filter((a) => a.siteId === siteId);
      const siteDeliveries = deliveries.filter((d) => d.siteId === siteId);
      const preds = computeRunoutForSite(siteId);
      const siteEvents = varianceEvents.filter((v) => v.siteId === siteId);
      const todayGallons = siteEvents.reduce((sum, v) => sum + v.varianceGallons, 0);
      const todayValue = todayGallons * 3.5;
      const last7DaysGallons = todayGallons * 3;
      const last7DaysValue = last7DaysGallons * 3.5;
      const siteOrders = fuelOrders.filter((o) => o.siteId === siteId);
      return delay(
        {
          site: withComputedSummary(site),
          tanks: allTanks,
          alerts: siteAlerts,
          deliveries: siteDeliveries,
          runout: preds,
          variance: {
            today: { gallons: todayGallons, value: todayValue },
            last7Days: { gallons: last7DaysGallons, value: last7DaysValue },
            events: siteEvents,
          },
          orders: siteOrders,
        } as unknown as T
      );
    }

    if (method === 'GET' && subPath === '/alerts') {
      const siteAlerts = alerts.filter((a) => a.siteId === siteId);
      return delay(siteAlerts as unknown as T);
    }

    if (method === 'GET' && subPath === '/deliveries') {
      const siteDeliveries = deliveries.filter((d) => d.siteId === siteId);
      return delay(siteDeliveries as unknown as T);
    }

    if (method === 'GET' && subPath === '/order-suggestions') {
      const suggestion = buildOrderSuggestion(siteId);
      return delay(suggestion as unknown as T);
    }

    if (method === 'GET' && subPath === '/contacts') {
      const list = managerContacts.filter((c) => c.siteId === siteId);
      return delay(list as unknown as T);
    }

    if (method === 'POST' && subPath === '/contacts') {
      const payload = body as Omit<ManagerContact, 'id' | 'siteId'>;
      const contact: ManagerContact = { ...payload, siteId, id: `mgr-${Date.now()}` };
      managerContacts.push(contact);
      return delay(contact as unknown as T);
    }

    const contactMatch = subPath.match(/^\/contacts\/([^/]+)$/);
    if (contactMatch && method === 'PUT') {
      const contactId = contactMatch[1];
      const partial = body as Partial<ManagerContact>;
      const contact = managerContacts.find((c) => c.id === contactId && c.siteId === siteId);
      if (!contact) throw new Error('Contact not found');
      Object.assign(contact, partial);
      return delay(contact as unknown as T);
    }

    if (method === 'GET' && subPath === '/orders') {
      const siteOrders = fuelOrders.filter((o) => o.siteId === siteId);
      return delay(siteOrders as unknown as T);
    }

    if (method === 'POST' && subPath === '/orders') {
      const payload = body as {
        supplierId: string;
        requestedDeliveryWindowStart: string;
        requestedDeliveryWindowEnd: string;
        notes?: string;
        lines: { gradeCode: string; requestedGallons: number }[];
      };

      const newOrder: FuelOrder = {
        id: `ord-${Date.now()}`,
        siteId,
        supplierId: payload.supplierId,
        status: 'REQUESTED',
        createdAt: new Date().toISOString(),
        requestedDeliveryWindowStart: payload.requestedDeliveryWindowStart,
        requestedDeliveryWindowEnd: payload.requestedDeliveryWindowEnd,
        notes: payload.notes,
        lines: payload.lines.map((l, idx) => ({
          id: `line-${Date.now()}-${idx}`,
          gradeCode: l.gradeCode,
          requestedGallons: l.requestedGallons,
        })),
      };

      fuelOrders.push(newOrder);
      return delay(newOrder as unknown as T);
    }

    const orderMatch = subPath.match(/^\/orders\/([^/]+)$/);
    if (orderMatch && method === 'PUT') {
      const orderId = orderMatch[1];
      const partial = body as Partial<FuelOrder>;
      const order = fuelOrders.find((o) => o.id === orderId && o.siteId === siteId);
      if (!order) throw new Error('Order not found');
      Object.assign(order, partial);
      return delay(order as unknown as T);
    }

    if (method === 'GET' && subPath === '/service-companies') {
      const comps = serviceCompanies.filter((c) => c.siteId === siteId);
      return delay(comps as unknown as T);
    }

    if (method === 'POST' && subPath === '/service-companies') {
      const payload = body as Omit<ServiceCompany, 'id'>;
      const company: ServiceCompany = { ...payload, id: `svc-${Date.now()}` };
      serviceCompanies.push(company);
      return delay(company as unknown as T);
    }

    if (method === 'GET' && subPath === '/service-tickets') {
      const tickets = serviceTickets.filter((t) => t.siteId === siteId);
      return delay(tickets as unknown as T);
    }

    if (method === 'POST' && subPath === '/service-tickets') {
      const payload = body as {
        providerId: string;
        issue: string;
        contactName?: string;
        phone?: string;
        notes?: string;
      };
      const ticket: ServiceTicket = {
        id: `ticket-${Date.now()}`,
        siteId,
        providerId: payload.providerId,
        issue: payload.issue,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        contactName: payload.contactName,
        phone: payload.phone,
        notes: payload.notes,
      };
      serviceTickets.push(ticket);
      return delay(ticket as unknown as T);
    }

    const ticketMatch = subPath.match(/^\/service-tickets\/([^/]+)$/);
    if (ticketMatch && method === 'PUT') {
      const ticketId = ticketMatch[1];
      const partial = body as Partial<ServiceTicket>;
      const ticket = serviceTickets.find((t) => t.id === ticketId && t.siteId === siteId);
      if (!ticket) throw new Error('Ticket not found');
      Object.assign(ticket, partial);
      return delay(ticket as unknown as T);
    }

    if (method === 'GET' && subPath === '/variance') {
      const siteEvents = varianceEvents.filter((v) => v.siteId === siteId);
      const recentEvents = siteEvents.filter(
        (v) => Date.now() - new Date(v.timestamp).getTime() <= 1000 * 60 * 60 * 24 * 7
      );
      const todayEvents = recentEvents.filter(
        (v) => new Date(v.timestamp).toDateString() === new Date().toDateString()
      );
      const todayGallons = todayEvents.reduce((sum, v) => sum + v.varianceGallons, 0);
      const todayValue = todayGallons * 3.5;
      const last7DaysGallons = recentEvents.reduce((sum, v) => sum + v.varianceGallons, 0);
      const last7DaysValue = last7DaysGallons * 3.5;
      return delay(
        {
          today: { gallons: todayGallons, value: todayValue },
          last7Days: { gallons: last7DaysGallons, value: last7DaysValue },
          events: siteEvents,
        } as unknown as T
      );
    }

    if (method === 'GET' && subPath === '/runout') {
      const preds = computeRunoutForSite(siteId);
      return delay(preds as unknown as T);
    }

    if (method === 'POST' && subPath === '/backoffice-sync') {
      const s = settings.find((st) => st.siteId === siteId);
      const provider = s?.backOfficeProvider ?? 'MODISOFT';
      const providerLabel = provider === 'MODISOFT' ? 'Modisoft' : 'C-Store';
      const payload = (body || {}) as { tankId?: string; gradeCode?: string };
      const result: BackOfficeSyncResult = {
        siteId,
        provider,
        status: 'QUEUED',
        startedAt: new Date().toISOString(),
        message: `Sync queued with ${providerLabel} for ${payload.gradeCode || 'all grades'} (mock).`,
        ticketId: `bosync-${Date.now()}`,
      };
      return delay(result as unknown as T);
    }

    if (method === 'GET' && subPath === '/settings') {
      const s = settings.find((st) => st.siteId === siteId);
      if (!s) throw new Error('Settings not found');
      return delay(s as unknown as T);
    }

    if (method === 'PUT' && subPath === '/settings') {
      const partial = body as Partial<SiteSettings>;
      let s = settings.find((st) => st.siteId === siteId);
      if (!s) {
        s = {
          siteId,
          lowTankPercent: 20,
          criticalTankPercent: 10,
          dailyVarianceAlertGallons: 50,
          notifyByEmail: true,
          notifyBySms: false,
        preferredComm: 'EMAIL',
        alertFrequencyCritical: 'IMMEDIATE',
        alertFrequencyWarning: 'HOURLY',
        alertFrequencyInfo: 'DAILY',
        jobberId: jobbers[0]?.id,
        jobberContactName: jobbers[0]?.contactName,
        jobberPhone: jobbers[0]?.phone,
        jobberEmail: jobbers[0]?.email,
        serviceCompanyId: serviceCompanies.find((c) => c.siteId === siteId)?.id ?? serviceCompanies[0]?.id,
        serviceContactName: serviceCompanies.find((c) => c.siteId === siteId)?.contactName,
        servicePhone: serviceCompanies.find((c) => c.siteId === siteId)?.phone,
        serviceEmail: serviceCompanies.find((c) => c.siteId === siteId)?.email,
        serviceNotes: serviceCompanies.find((c) => c.siteId === siteId)?.notes,
        backOfficeProvider: 'MODISOFT',
        backOfficeUsername: '',
        backOfficePassword: '',
        };
        settings.push(s);
      }
      Object.assign(s, partial);
      return delay(s as unknown as T);
    }
  }

  if (method === 'GET' && path === '/alerts') {
    return delay(alerts as unknown as T);
  }

  throw new Error(`Mock route not implemented: ${method} ${path}`);
}

