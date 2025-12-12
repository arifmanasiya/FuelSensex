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
import type {
  Site as CanonSite,
  Tank as CanonTank,
  Order as CanonOrder,
  Jobber as CanonJobber,
  SiteSettings as CanonSiteSettings,
  Ticket as CanonTicket,
} from '../models/types';
import type { AtgEventType, AtgInventoryEvent } from '../models/atgEvents';
import { seedAtgEventsForLast30Days, getAtgEvents, latestInventoryByTank, alarmsForSite } from '../mock/mockAtgEventStore';

const PRODUCT_MAP: Record<string, CanonTank['productType']> = {
  REG: 'REGULAR',
  PREM: 'PREMIUM',
  DSL: 'DIESEL',
  MID: 'VIRTUAL_MIDGRADE',
};

function mapTankToCanon(t: Tank): CanonTank {
  const productType = PRODUCT_MAP[t.gradeCode] ?? 'REGULAR';
  return {
    id: t.id,
    siteId: t.siteId,
    name: t.name,
    productType,
    capacityGallons: t.capacityGallons,
    currentVolumeGallons: t.currentGallons,
    targetFillGallons: undefined,
    temperatureF: t.temperatureC ? t.temperatureC * 9 / 5 + 32 : undefined,
    waterLevel: t.waterLevelInches,
    statusFlags: t.status === 'CRITICAL' ? ['ALARM_ACTIVE'] : t.status === 'LOW' ? ['IN_TEST'] : [],
    isVirtual: productType === 'VIRTUAL_MIDGRADE',
  };
}

function mapMidTankToCanon(virtual: Tank | null, reg: Tank | undefined, prem: Tank | undefined): CanonTank | null {
  if (!virtual) return null;
  const base = mapTankToCanon(virtual);
  if (!reg || !prem) return base;
  return {
    ...base,
    isVirtual: true,
    blendSources: [
      { tankId: reg.id, ratio: 0.4 },
      { tankId: prem.id, ratio: 0.6 },
    ],
    computedVolumeGallons: base.currentVolumeGallons,
  };
}

function buildCanonicalTanks(siteId: string): CanonTank[] {
  const siteSetting = settings.find((st) => st.siteId === siteId);
  const siteTanks = tanks
    .filter((t) => t.siteId === siteId && t.gradeCode !== 'MID')
    .map((t) => {
      const canon = mapTankToCanon(t);
      const override = tankOverrides[t.id];
      const capacityGallons = override?.capacityGallons ?? canon.capacityGallons;
      const targetFillGallons = override?.targetFillGallons;
      const baseThresholds = {
        lowPercent: siteSetting?.lowTankPercent,
        criticalPercent: siteSetting?.criticalTankPercent,
      };
      return {
        ...canon,
        capacityGallons,
        targetFillGallons,
        alertThresholds: {
          ...baseThresholds,
          ...override?.alertThresholds,
        },
      };
    });
  const reg = tanks.find((t) => t.siteId === siteId && t.gradeCode === 'REG');
  const prem = tanks.find((t) => t.siteId === siteId && t.gradeCode === 'PREM');
  const mid = deriveMidTank(siteId);
  const virtual = mapMidTankToCanon(mid, reg, prem);
  return virtual ? [...siteTanks, virtual] : siteTanks;
}

function buildCanonicalSettings(siteId: string): CanonSiteSettings {
  const s = settings.find((st) => st.siteId === siteId);
  const siteJobbers: CanonJobber[] = jobbers.map((j) => ({
    id: j.id,
    name: j.name,
    contact: { name: j.contactName ?? j.name, phone: j.phone, email: j.email },
    communication: { preferredChannel: 'EMAIL', notes: '' },
    system: { externalId: j.id, integrationType: 'MANUAL' },
  }));
  const contacts = managerContacts.filter((c) => c.siteId === siteId);
  return {
    siteId,
    jobberId: s?.jobberId,
    jobbers: siteJobbers,
    backOffice: {
      systemName: s?.backOfficeProvider ?? 'BackOffice',
      syncScheduleCron: '0 */4 * * *',
      lastSyncAt: new Date().toISOString(),
      status: 'OK',
    },
    notifications: {
      contacts: contacts.map((c) => ({ name: c.name, role: c.role, phone: c.phone, email: c.email })),
      modes: { email: !!s?.notifyByEmail, sms: !!s?.notifyBySms, inApp: true },
      frequency: 'IMMEDIATE',
    },
    alertsEnabled: s?.alertsEnabled ?? true,
    defaultLoadRegGallons: s?.defaultLoadRegGallons,
    defaultLoadPremGallons: s?.defaultLoadPremGallons,
    defaultLoadDslGallons: s?.defaultLoadDslGallons,
    defaultLoadMidGallons: s?.defaultLoadMidGallons,
  };
}

function buildCanonicalSites(): CanonSite[] {
  return sites.map((site) => ({
    id: site.id,
    code: site.id,
    name: site.name,
    address: `${site.address} - ${site.city}`,
    timeZone: 'America/Chicago',
    status: site.status as CanonSite['status'],
    tanks: buildCanonicalTanks(site.id),
    settings: buildCanonicalSettings(site.id),
  }));
}

function mapOrderStatus(status: FuelOrder['status']): CanonOrder['status'] {
  if (status === 'REQUESTED') return 'PENDING';
  if (status === 'EN_ROUTE') return 'DISPATCHED';
  return status as CanonOrder['status'];
}

function getGradeCodeForTank(tankId: string, siteId: string): string {
  const tank = tanks.find((t) => t.id === tankId && t.siteId === siteId);
  return tank?.gradeCode ?? 'REG';
}

function applyOrderStatus(order: CanonOrder, status: CanonOrder['status'], poNumber?: string) {
  if (status === 'CONFIRMED' && !order.jobberPoNumber) {
    order.jobberPoNumber = poNumber || `PO-${Date.now()}`;
  }
  if (status === 'DELIVERED') {
    generateDeliveriesForOrder(order);
    return order;
  }
  order.status = status;
  order.updatedAt = new Date().toISOString();
  return order;
}

function generateDeliveriesForOrder(order: CanonOrder) {
  // remove existing deliveries for this orderNumber
  if (order.orderNumber) {
    deliveries = deliveries.filter((d) => d.orderNumber !== order.orderNumber);
  }
  if (!order.lines || !order.lines.length) return;
  order.lines.forEach((line) => {
    const gradeCode = getGradeCodeForTank(line.tankId, order.siteId);
    const supplierName = jobbers.find((j) => j.id === order.jobberId)?.name || 'Jobber';
    const varianceFactor = 1 + (Math.random() * 0.06 - 0.03); // +/-3%
    const delivered = Math.max(0, Math.round(line.quantityGallonsRequested * varianceFactor));
    const status =
      delivered < line.quantityGallonsRequested * 0.99
        ? 'SHORT'
        : delivered > line.quantityGallonsRequested * 1.01
        ? 'OVER'
        : 'OK';
    deliveries.unshift({
      id: `del-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      siteId: order.siteId,
      timestamp: new Date().toISOString(),
      supplier: supplierName,
      gradeCode,
      bolGallons: line.quantityGallonsRequested,
      atgReceivedGallons: delivered,
      status,
      orderNumber: order.orderNumber,
    });
    line.quantityGallonsDelivered = delivered;
  });
    const totalDelivered = order.lines.reduce((sum, l) => sum + (l.quantityGallonsDelivered ?? 0), 0);
    order.quantityGallonsDelivered = totalDelivered;
    const short = totalDelivered < order.quantityGallonsRequested * 0.99;
    const over = totalDelivered > order.quantityGallonsRequested * 1.01;
    order.status = over ? 'DELIVERED_OVER' : short ? 'DELIVERED_SHORT' : 'DELIVERED';
    order.updatedAt = new Date().toISOString();
  }

function buildCanonicalOrders(): CanonOrder[] {
  return fuelOrders.map((o) => {
    const lines = o.lines.map((line) => {
      const siteTanks = tanks.filter((t) => t.siteId === o.siteId && t.gradeCode === line.gradeCode);
      const tankId = siteTanks[0]?.id ?? line.gradeCode;
      return { tankId, quantityGallonsRequested: line.requestedGallons };
    });
    const firstTank = lines[0]?.tankId;
    return {
      id: o.id,
      orderNumber: o.id,
      siteId: o.siteId,
      tankId: firstTank,
      jobberId: o.supplierId,
      status: mapOrderStatus(o.status),
      quantityGallonsRequested: lines.reduce((sum, l) => sum + l.quantityGallonsRequested, 0),
      createdAt: o.createdAt,
      updatedAt: o.createdAt,
      ruleTriggered: false,
      jobberPoNumber: o.lines.length ? `PO-${o.id}` : undefined,
      lines,
    };
  });
}

let canonicalOrders: CanonOrder[] = [];
let canonicalTickets: CanonTicket[] = [];
let tankOverrides: Record<
  string,
  {
    capacityGallons?: number;
    targetFillGallons?: number;
    alertThresholds?: { lowPercent?: number; criticalPercent?: number };
  }
> = {};

let atgSeeded = false;
function ensureAtgSeeded() {
  if (atgSeeded) return;
  const seededSites = buildCanonicalSites();
  const seededTanks = seededSites.flatMap((s) => s.tanks || []);
  seedAtgEventsForLast30Days(seededSites, seededTanks);
  atgSeeded = true;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

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
    status: 'OVER',
    orderNumber: 'ORD-seed-101',
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
    orderNumber: 'ORD-seed-101',
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
    orderNumber: 'ORD-seed-202',
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
    orderNumber: 'ORD-seed-202',
  },
  {
    id: 'del-4b',
    siteId: 'site-202',
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    supplier: 'Shell',
    gradeCode: 'PREM',
    bolGallons: 4500,
    atgReceivedGallons: 4420,
    status: 'OVER',
    orderNumber: 'ORD-seed-202',
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
    orderNumber: 'ORD-seed-202',
  },
  {
    id: 'del-5',
    siteId: 'site-303',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    supplier: 'BP',
    gradeCode: 'REG',
    bolGallons: 6500,
    atgReceivedGallons: 6320,
    status: 'SHORT',
    orderNumber: 'ORD-seed-303',
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
    status: 'SHORT',
  },
  {
    id: 'del-8',
    siteId: 'site-303',
    timestamp: new Date(Date.now() - 1000 * 60 * 410).toISOString(),
    supplier: 'Chevron',
    gradeCode: 'MID',
    bolGallons: 3600,
    atgReceivedGallons: 3500,
    status: 'SHORT',
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
    alertsEnabled: true,
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
    defaultLoadRegGallons: 8000,
    defaultLoadPremGallons: 4500,
    defaultLoadDslGallons: 6000,
    defaultLoadMidGallons: 5000,
    capacityNotes: 'Reg 12k, Prem 8k, Diesel 10k',
    tankTypePolicy: 'ALLOW_VIRTUAL',
    virtualBlendRatio: '60/40 (Prem/Reg)',
  },
  {
    siteId: 'site-202',
    lowTankPercent: 18,
    criticalTankPercent: 8,
    dailyVarianceAlertGallons: 50,
    alertsEnabled: true,
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
    defaultLoadRegGallons: 7000,
    defaultLoadPremGallons: 4500,
    defaultLoadDslGallons: 5500,
    defaultLoadMidGallons: 5000,
    capacityNotes: 'Virtual mid auto-calculated',
    tankTypePolicy: 'ALLOW_VIRTUAL',
    virtualBlendRatio: '60/40 (Prem/Reg)',
  },
  {
    siteId: 'site-303',
    lowTankPercent: 25,
    criticalTankPercent: 12,
    dailyVarianceAlertGallons: 75,
    alertsEnabled: true,
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
    defaultLoadRegGallons: 7500,
    defaultLoadPremGallons: 4200,
    defaultLoadDslGallons: 6000,
    defaultLoadMidGallons: 4800,
    capacityNotes: 'Prem 8k, Diesel 9k',
    tankTypePolicy: 'ALLOW_VIRTUAL',
    virtualBlendRatio: '60/40 (Prem/Reg)',
  },
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
  const live = deriveLiveStatus(site.id);
  const openCount = live.alerts.filter((a) => a.isOpen).length;
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
  const preds = siteTanks.map((t) => {
    const { events } = getAtgEvents({ siteId, tankId: t.id, type: 'INVENTORY', limit: 12 });
    const invs = (events as AtgInventoryEvent[]).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    const latest = invs[invs.length - 1];
    const earliest = invs[0];
    const hours =
      invs.length > 1 ? (Date.parse(latest.timestamp) - Date.parse(earliest.timestamp)) / (1000 * 60 * 60) : 0;
    const delta = invs.length > 1 ? latest.volumeGallons - earliest.volumeGallons : 0;
    const burnPerHour = hours > 0 ? -(delta / hours) : 0;
    const cap = t.capacityGallons || 1;
    const tenPercentLevel = 0.1 * cap;
    const latestVol = latest?.volumeGallons ?? t.currentGallons ?? t.capacityGallons * 0.5;
    const hoursToTen = burnPerHour > 0 ? Math.max(Math.floor((latestVol - tenPercentLevel) / burnPerHour), 0) : Infinity;
    const hoursToEmpty = burnPerHour > 0 ? Math.max(Math.floor(latestVol / burnPerHour), 0) : Infinity;
    return {
      siteId,
      tankId: t.id,
      gradeCode: t.gradeCode,
      hoursToTenPercent: hoursToTen,
      hoursToEmpty,
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

function deriveLiveStatus(siteId: string) {
  const site = buildCanonicalSites().find((s) => s.id === siteId);
  if (!site) throw new Error('Site not found');
  const invMap = latestInventoryByTank(siteId);
  const alarms = alarmsForSite(siteId);
  const preds = computeRunoutForSite(siteId);
  const tanksLive = buildCanonicalTanks(siteId).map((t) => {
    const latest = invMap.get(t.id);
    const fillPercent =
      latest?.fillPercent ??
      Math.round(((latest?.volumeGallons ?? t.currentVolumeGallons ?? t.capacityGallons * 0.5) / (t.capacityGallons || 1)) * 100);
    const water = latest?.waterHeightInches;
    let status: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
    if (typeof water === 'number' && water > 3) status = 'CRITICAL';
    else if (typeof water === 'number' && water > 1) status = 'WARNING';
    const activeAlarms = alarms.filter((a) => a.tankId === t.id && a.severity === 'ALARM');
    return {
      ...t,
      currentVolumeGallons: latest?.volumeGallons ?? t.currentVolumeGallons,
      fillPercent,
      waterHeightInches: water,
      temperatureF: latest?.temperatureF,
      status,
      activeAlarms,
    };
  });

  const alertsDerived: Alert[] = [];
  tanksLive.forEach((t) => {
    const runout = preds.find((p) => p.tankId === t.id);
    if (runout && runout.hoursToTenPercent < 12) {
      alertsDerived.push({
        id: `runout-${t.id}`,
        siteId,
        severity: 'WARNING',
        type: 'RUNOUT_RISK',
        message: `${t.name} projected to hit 10% in ${runout.hoursToTenPercent}h`,
        isOpen: true,
        timestamp: new Date().toISOString(),
      });
    }
    if (typeof t.waterHeightInches === 'number' && t.waterHeightInches > 1.5) {
      alertsDerived.push({
        id: `water-${t.id}`,
        siteId,
        severity: t.waterHeightInches > 3 ? 'CRITICAL' : 'WARNING',
        type: 'WATER_DETECTED',
        message: `Water detected in ${t.name}`,
        isOpen: true,
        timestamp: new Date().toISOString(),
      });
    }
    const tankAlarms = alarms.filter((a) => a.tankId === t.id && a.severity === 'ALARM');
    tankAlarms.forEach((al) =>
      alertsDerived.push({
        id: `alarm-${al.id}`,
        siteId,
        severity: 'CRITICAL',
        type: 'ATG_ALARM' as any,
        message: al.humanReadable,
        isOpen: true,
        timestamp: al.timestamp,
      })
    );
  });

  return {
    site,
    tanks: tanksLive,
    runout: preds,
    alerts: alertsDerived,
  };
}

let serviceCompanies: ServiceCompany[] = [
  {
    id: 'svc-1',
    siteId: 'site-101',
    name: 'BlueTech Services',
    contactName: 'Ana Patel',
    phone: '+1 (555) 200-1111',
    email: 'dispatch@bluetech.com',
    notes: '24/7 dispatch',
    portal: { url: 'https://portal.bluetech.com', username: 'bluetech-user', password: 'pass123' },
    communication: { preferredChannel: 'PORTAL' },
  },
  {
    id: 'svc-2',
    siteId: 'site-202',
    name: 'PumpCare Pros',
    contactName: 'Luis Gomez',
    phone: '+1 (555) 333-4444',
    email: 'support@pumpcare.com',
    notes: 'Prefers morning visits',
    portal: { url: 'https://portal.pumpcare.com', username: 'pump-user', password: 'welcome123' },
    communication: { preferredChannel: 'CALL' },
  },
  {
    id: 'svc-3',
    siteId: 'site-303',
    name: 'FuelSafe Technicians',
    contactName: 'Kayla Chen',
    phone: '+1 (555) 888-9999',
    email: 'service@fuelsafe.io',
    notes: 'Water remediation specialists',
    portal: { url: 'https://portal.fuelsafe.io', username: 'fuelsafe-user', password: 'fs-safe' },
    communication: { preferredChannel: 'EMAIL' },
  },
];

let serviceTickets: ServiceTicket[] = [];

let jobbers: Jobber[] = [
  {
    id: 'job-1',
    name: 'Marathon Jobber',
    contactName: 'T. Reeves',
    phone: '+1 (555) 201-0101',
    email: 'orders@marathonjobber.com',
    portal: { url: 'https://portal.marathonjobber.com', username: 'marathon-user', password: 'pass123' },
    communication: { preferredChannel: 'PORTAL' },
  },
  {
    id: 'job-2',
    name: 'Shell Jobber',
    contactName: 'L. Parker',
    phone: '+1 (555) 202-0202',
    email: 'dispatch@shelljobber.com',
    portal: { url: 'https://portal.shelljobber.com', username: 'shell-user', password: 'welcome123' },
    communication: { preferredChannel: 'CALL' },
  },
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

canonicalOrders = buildCanonicalOrders();

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
  ensureAtgSeeded();
  if (path.startsWith('/api/')) {
    // Canonical API surface
    if (method === 'GET' && path === '/api/sites') {
      return delay(buildCanonicalSites() as unknown as T);
    }
    const siteMatchApi = path.match(/^\/api\/sites\/([^/]+)(.*)$/);
    if (siteMatchApi) {
      const siteId = siteMatchApi[1];
      const subPath = siteMatchApi[2] || '';
      if (method === 'GET' && (subPath === '' || subPath === '/')) {
        const site = buildCanonicalSites().find((s) => s.id === siteId);
        if (!site) throw new Error('Site not found');
        return delay(site as unknown as T);
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
      if (method === 'GET' && subPath === '/live-status') {
        const live = deriveLiveStatus(siteId);
        return delay(live as unknown as T);
      }
      if (method === 'GET' && subPath === '/events') {
        const url = new URL(`http://dummy${path}`);
        const from = url.searchParams.get('from') || undefined;
        const to = url.searchParams.get('to') || undefined;
        const type = (url.searchParams.get('type') as AtgEventType) || undefined;
        const tankId = url.searchParams.get('tankId') || undefined;
        const limit = Number(url.searchParams.get('limit') || 200);
        const offset = Number(url.searchParams.get('offset') || 0);
        const result = getAtgEvents({ siteId, tankId, from, to, type, limit, offset });
        return delay(result as unknown as T);
      }
      if (method === 'GET' && subPath === '/tanks') {
        return delay(buildCanonicalTanks(siteId) as unknown as T);
      }
      const tankMatchApi = subPath.match(/^\/tanks\/([^/]+)$/);
        if (tankMatchApi && method === 'PUT') {
          const tankId = tankMatchApi[1];
          const partial = body as {
            capacityGallons?: number;
            targetFillGallons?: number;
            alertThresholds?: { lowPercent?: number; criticalPercent?: number };
          };
          const baseTank = tanks.find((t) => t.id === tankId && t.siteId === siteId);
          if (!baseTank) throw new Error('Tank not found');
          if (!tankOverrides[tankId]) tankOverrides[tankId] = {};
          if (typeof partial.capacityGallons === 'number') {
            baseTank.capacityGallons = partial.capacityGallons;
            tankOverrides[tankId].capacityGallons = partial.capacityGallons;
          }
          if (typeof partial.targetFillGallons === 'number') {
            tankOverrides[tankId].targetFillGallons = partial.targetFillGallons;
          }
          if (partial.alertThresholds) {
            tankOverrides[tankId].alertThresholds = {
              ...tankOverrides[tankId].alertThresholds,
              ...partial.alertThresholds,
            };
        }
        const updated = buildCanonicalTanks(siteId).find((t) => t.id === tankId);
        return delay(updated as unknown as T);
      }
      if (method === 'POST' && subPath === '/sync-backoffice') {
        const provider = settings.find((s) => s.siteId === siteId)?.backOfficeProvider ?? 'MODISOFT';
        const payload = {
          siteId,
          provider: provider as 'MODISOFT' | 'C_STORE',
          status: 'SUCCESS' as const,
          startedAt: new Date().toISOString(),
          message: 'Back office sync completed (mock)',
        };
        return delay(payload as unknown as T);
      }
      if (method === 'GET' && subPath === '/deliveries') {
        const siteDeliveries = deliveries.filter((d) => d.siteId === siteId);
        return delay(siteDeliveries as unknown as T);
      }
      if (method === 'GET' && subPath === '/order-suggestions') {
        const suggestion = buildOrderSuggestion(siteId);
        return delay(suggestion as unknown as T);
      }
      if (method === 'GET' && subPath === '/service-companies') {
        const list = serviceCompanies.filter((c) => c.siteId === siteId);
        return delay(list as unknown as T);
      }
      if (method === 'GET' && subPath === '/service-tickets') {
        const list = serviceTickets.filter((t) => t.siteId === siteId);
        return delay(list as unknown as T);
      }
      if (method === 'POST' && subPath === '/service-tickets') {
        const payload = body as Omit<ServiceTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>;
        const ticket: ServiceTicket = {
          ...payload,
          siteId,
          id: `svc-${Date.now()}`,
          createdAt: new Date().toISOString(),
          status: 'OPEN',
        };
        serviceTickets = [ticket, ...serviceTickets];
        return delay(ticket as unknown as T);
      }
      const svcTicketMatchApi = subPath.match(/^\/service-tickets\/([^/]+)$/);
      if (svcTicketMatchApi && method === 'PUT') {
        const ticketId = svcTicketMatchApi[1];
        const partial = body as Partial<ServiceTicket>;
        const ticket = serviceTickets.find((t) => t.id === ticketId && t.siteId === siteId);
        if (!ticket) throw new Error('Ticket not found');
        Object.assign(ticket, partial, { updatedAt: new Date().toISOString() });
        return delay(ticket as unknown as T);
      }
    }
    if (method === 'GET' && path.startsWith('/api/orders')) {
      const url = new URL(`http://dummy${path}`);
      const siteId = url.searchParams.get('siteId') || undefined;
      const list = siteId ? canonicalOrders.filter((o) => o.siteId === siteId) : canonicalOrders;
      return delay(list as unknown as T);
    }
    const orderActionMatch = path.match(/^\/api\/orders\/([^/]+)\/(confirm|dispatch|deliver|cancel)$/);
    if (orderActionMatch && method === 'POST') {
      const orderId = orderActionMatch[1];
      const action = orderActionMatch[2];
      const po = (body as { jobberPoNumber?: string } | undefined)?.jobberPoNumber;
      const order = canonicalOrders.find((o) => o.id === orderId);
      if (!order) throw new Error('Order not found');
      if (action === 'confirm') {
        applyOrderStatus(order, 'CONFIRMED', po);
      } else if (action === 'dispatch') {
        applyOrderStatus(order, 'DISPATCHED');
      } else if (action === 'deliver') {
        applyOrderStatus(order, 'DELIVERED');
      } else if (action === 'cancel') {
        applyOrderStatus(order, 'CANCELLED');
      }
      return delay(order as unknown as T);
    }
    if (method === 'POST' && path === '/api/orders') {
      const payload = body as { siteId: string; jobberId: string; lines: { tankId: string; quantityGallonsRequested: number }[] };
      const now = Date.now();
      const orderNumber = `ORD-${now}`;
      const total = payload.lines.reduce((sum, l) => sum + l.quantityGallonsRequested, 0);
      const newOrder: CanonOrder = {
        id: orderNumber,
        orderNumber,
        siteId: payload.siteId,
        tankId: payload.lines[0]?.tankId,
        jobberId: payload.jobberId,
        status: 'PENDING',
        quantityGallonsRequested: total,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ruleTriggered: false,
        jobberPoNumber: undefined,
        lines: payload.lines,
      };
      canonicalOrders = [newOrder, ...canonicalOrders];
      return delay(newOrder as unknown as T);
    }
    const orderMatchApi = path.match(/^\/api\/orders\/([^/]+)$/);
    if (orderMatchApi && method === 'PUT') {
      const orderId = orderMatchApi[1];
      const partial = body as Partial<CanonOrder>;
      const order = canonicalOrders.find((o) => o.id === orderId);
      if (!order) throw new Error('Order not found');

      // Handle status transitions and jobber PO number generation
      if (partial.status === 'CONFIRMED' && !order.jobberPoNumber) {
        order.jobberPoNumber = partial.jobberPoNumber || `PO-${Date.now()}`;
      }
      if (partial.status && ['DELIVERED', 'DELIVERED_SHORT', 'DELIVERED_OVER'].includes(partial.status)) {
        generateDeliveriesForOrder(order);
      } else {
        Object.assign(order, partial);
        order.updatedAt = new Date().toISOString();
      }
      return delay(order as unknown as T);
    }
  if (method === 'GET' && path === '/api/jobbers') {
    const canonJobbers: CanonJobber[] = jobbers.map((j) => ({
      id: j.id,
      name: j.name,
      contact: { name: j.contactName ?? j.name, phone: j.phone, email: j.email },
      communication: { preferredChannel: j.communication?.preferredChannel ?? 'EMAIL', notes: j.communication?.notes ?? '' },
      system: { externalId: j.id, integrationType: 'MANUAL' },
    }));
    return delay(canonJobbers as unknown as T);
  }
    if (method === 'GET' && path === '/api/settings') {
      const payload: CanonSiteSettings[] = sites.map((s) => buildCanonicalSettings(s.id));
      return delay(payload as unknown as T);
    }
    if (method === 'GET' && path === '/api/suppliers') {
      return delay(suppliers as unknown as T);
    }
    if (method === 'GET' && path.startsWith('/api/tickets')) {
      const url = new URL(`http://dummy${path}`);
      const idMatch = path.match(/^\/api\/tickets\/([^/]+)$/);
      if (idMatch) {
        const ticket = canonicalTickets.find((t) => t.id === idMatch[1]);
        if (!ticket) throw new Error('Ticket not found');
        return delay(ticket as unknown as T);
      }
      const siteId = url.searchParams.get('siteId') || undefined;
      const list = siteId ? canonicalTickets.filter((t) => t.siteId === siteId) : canonicalTickets;
      return delay(list as unknown as T);
    }
    if (method === 'POST' && path === '/api/tickets') {
      const payload = body as CanonTicket;
      const ticket: CanonTicket = {
        ...payload,
        id: payload.id || `tkt-${Date.now()}`,
        createdAt: payload.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: payload.status || 'OPEN',
        comments: [],
        orderNumber: (payload as any).orderNumber,
      };
      canonicalTickets = [ticket, ...canonicalTickets];
      return delay(ticket as unknown as T);
    }
      const ticketMatchPut = path.match(/^\/api\/tickets\/([^/]+)$/);
      if (ticketMatchPut && method === 'PUT') {
        const ticketId = ticketMatchPut[1];
        const partial = body as Partial<CanonTicket>;
      const ticket = canonicalTickets.find((t) => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found');
      Object.assign(ticket, partial, { updatedAt: new Date().toISOString() });
      return delay(ticket as unknown as T);
    }
    const ticketCommentMatch = path.match(/^\/api\/tickets\/([^/]+)\/comments$/);
      if (ticketCommentMatch && method === 'POST') {
        const ticketId = ticketCommentMatch[1];
        const ticket = canonicalTickets.find((t) => t.id === ticketId);
        if (!ticket) throw new Error('Ticket not found');
        const payload = (body || {}) as { text: string; author?: string };
        if (!ticket.comments) ticket.comments = [];
        const comment = {
          id: `cmt-${Date.now()}`,
          author: payload.author || 'You',
          text: payload.text,
          createdAt: new Date().toISOString(),
        };
        ticket.comments.push(comment);
        ticket.updatedAt = new Date().toISOString();
        return delay(ticket as unknown as T);
      }
    throw new Error(`Mock route not implemented: ${method} ${path}`);
  }
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
  const jobberMatch = path.match(/^\/jobbers\/([^/]+)$/);
  if (jobberMatch) {
    const jobberId = jobberMatch[1];
    if (method === 'PUT') {
      const partial = body as Partial<Jobber>;
      const jobber = jobbers.find((j) => j.id === jobberId);
      if (!jobber) throw new Error('Jobber not found');
      Object.assign(jobber, partial);
      return delay(jobber as unknown as T);
    }
    if (method === 'DELETE') {
      const idx = jobbers.findIndex((j) => j.id === jobberId);
      if (idx === -1) throw new Error('Jobber not found');
      const removed = jobbers.splice(idx, 1)[0];
      return delay(removed as unknown as T);
    }
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
    if (contactMatch && (method === 'PUT' || method === 'DELETE')) {
      const contactId = contactMatch[1];
      const contactIndex = managerContacts.findIndex((c) => c.id === contactId && c.siteId === siteId);
      if (contactIndex === -1) throw new Error('Contact not found');
      if (method === 'PUT') {
        const partial = body as Partial<ManagerContact>;
        Object.assign(managerContacts[contactIndex], partial);
        return delay(managerContacts[contactIndex] as unknown as T);
      }
      if (method === 'DELETE') {
        const removed = managerContacts.splice(contactIndex, 1)[0];
        return delay(removed as unknown as T);
      }
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

    const svcMatch = subPath.match(/^\/service-companies\/([^/]+)$/);
    if (svcMatch && method === 'PUT') {
      const svcId = svcMatch[1];
      const company = serviceCompanies.find((c) => c.id === svcId && c.siteId === siteId);
      if (!company) throw new Error('Service company not found');
      Object.assign(company, body as Partial<ServiceCompany>);
      return delay(company as unknown as T);
    }

    if (svcMatch && method === 'DELETE') {
      const svcId = svcMatch[1];
      const idx = serviceCompanies.findIndex((c) => c.id === svcId && c.siteId === siteId);
      if (idx === -1) throw new Error('Service company not found');
      const removed = serviceCompanies.splice(idx, 1)[0];
      return delay(removed as unknown as T);
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
        jobberPortalUsername: '',
        jobberPortalPassword: '',
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
    ensureAtgSeeded();
    const url = new URL(`http://dummy${path}`);
    const siteId = url.searchParams.get('siteId') || undefined;
    if (siteId) {
      const derived = deriveLiveStatus(siteId).alerts;
      return delay(derived as unknown as T);
    }
    const all = buildCanonicalSites().flatMap((s) => deriveLiveStatus(s.id).alerts);
    return delay(all as unknown as T);
  }

  throw new Error(`Mock route not implemented: ${method} ${path}`);
}

