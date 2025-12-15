import type {
  Alert,
  DeliveryRecord,
  Jobber,
  FuelOrder,
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
  PageHeaders,
} from '../types';
import type {
  Site as CanonSite,
  Tank as CanonTank,
  Order as CanonOrder,
  Jobber as CanonJobber,
  SiteSettings as CanonSiteSettings,
  Ticket as CanonTicket,
} from '../models/types';
import type { AtgEventType, AtgInventoryEvent, AtgDeliveryEvent } from '../models/atgEvents';
import { seedAtgEventsForLast30Days, getAtgEvents, latestInventoryByTank, alarmsForSite, findDeliveryById } from '../mock/mockAtgEventStore';

const PRODUCT_MAP: Record<string, CanonTank['productType']> = {
  REG: 'REGULAR',
  SUP: 'PREMIUM',
  DSL: 'DIESEL',
  MID: 'VIRTUAL_MIDGRADE',
  PREM: 'PREMIUM', // Add PREM to map to PREMIUM
};

type MockData = {
    pageHeadersData: PageHeaders;
    mockUser: User;
    userProfile: UserProfile;
    sites: SiteSummary[];
    tanks: Tank[];
    alerts: Alert[];
    deliveryLinks: Record<string, { orderNumber?: string; bolGallons?: number; poNumber?: string; updatedAt?: string; updatedBy?: string }>;
    settings: SiteSettings[];
    serviceCompanies: ServiceCompany[];
    serviceTickets: ServiceTicket[];
    jobbers: Jobber[];
    managerContacts: ManagerContact[];
    suppliers: Supplier[];
    fuelOrders: FuelOrder[];
    canonicalOrders: CanonOrder[];
    canonicalTickets: CanonTicket[];
    tankOverrides: Record<
      string,
      {
        capacityGallons?: number;
        targetFillGallons?: number;
        alertThresholds?: { lowPercent?: number; criticalPercent?: number };
      }
    >;
}

let mockData: MockData | null = null;
let atgSeeded = false;

// Utility function to simulate network delay
const delay = <T>(ms: number, value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

function getInitialMockData(): MockData {
  if (mockData) return mockData;

  const pageHeadersData: PageHeaders = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Multi-site view',
      infoTooltip: 'Filter by site to see totals, issues, and at-risk tanks.',
    },
    alerts: {
      title: 'Notifications',
      subtitle: 'Notifications by site',
      infoTooltip: 'Switch sites and tabs to review open or closed alerts.',
    },
    settings: {
      title: 'Settings',
      subtitle: 'Per-site configuration',
      infoTooltip: 'Pick a site to review and adjust its settings.',
    },
    ordersList: {
      title: 'Recent orders',
      subtitle: 'Track pending, dispatched, and delivered loads.',
      infoTooltip: 'Filter by site to review open orders and progress through each state.',
    },
    createOrder: {
      title: 'Create order',
      subtitle: 'Enter gallons per tank.',
      infoTooltip:
        'Pick the correct site in the Site dropdown at the top, then for each physical tank enter the desired gallons in its “Gallons” field and finally hit Submit order.',
    },
    deliveries: {
      title: 'Deliveries',
      subtitle: 'Track recent deliveries and variance status.',
      infoTooltip: 'Filter by site to review delivered loads and any short/over/missing statuses.',
    },
    issues: {
      title: 'Issues',
      subtitle: 'Track delivery/service issues across jobbers and service companies.',
      infoTooltip: 'Filter by site and status; open or review tickets tied to deliveries and partners.',
    },
  };

  const mockUser: User = {
    id: 'user-1',
    email: 'owner@example.com',
    name: 'Station Owner',
  };

  const userProfile: UserProfile = {
    id: 'user-1',
    companyName: 'FuelSensex Pilot Stores',
    contactName: 'Station Owner',
    email: 'owner@example.com',
    phone: '+1 (555) 222-7777',
    notes: 'Prefers email first; SMS for critical issues.',
  };

  const sites: SiteSummary[] = [
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

  const tanks: Tank[] = [
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
      name: 'Super 93',
      gradeCode: 'SUP',
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
      name: 'Super 93',
      gradeCode: 'SUP',
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
      name: 'Super 93',
      gradeCode: 'SUP',
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

  const alerts: Alert[] = [
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

  // Manual links from ATG delivery events to orders (user-created)
  const deliveryLinks: Record<string, { orderNumber?: string; bolGallons?: number; poNumber?: string; updatedAt?: string; updatedBy?: string }> =
    {};

  const settings: SiteSettings[] = [
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
      serviceEmail: 'dispatch@bluetech.com', // Corrected property name
      backOfficeProvider: 'MODISOFT',
      backOfficeUsername: 'quickstop-owner',
      backOfficePassword: 'password123',
      defaultLoadRegGallons: 8000,
      defaultLoadPremGallons: 4500,
      defaultLoadDslGallons: 6000,
      defaultLoadMidGallons: 5000,
      capacityNotes: 'Reg 12k, SUP 8k, Diesel 10k',
      tankTypePolicy: 'ALLOW_VIRTUAL',
      virtualBlendRatio: '60/40 (SUP/Reg)',
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
      jobberPhone: '+1 (555) 202-0202', // Corrected property name
      jobberEmail: 'dispatch@shelljobber.com', // Corrected property name
      serviceCompanyId: 'svc-2',
      serviceContactName: 'Luis Gomez',
      servicePhone: '+1 (555) 333-4444', // Corrected property name
      serviceEmail: 'support@pumpcare.com', // Corrected property name
      backOfficeProvider: 'C_STORE',
      backOfficeUsername: 'lakeside-admin',
      backOfficePassword: 'welcome!',
      defaultLoadRegGallons: 7000,
      defaultLoadPremGallons: 4500,
      defaultLoadDslGallons: 5500,
      defaultLoadMidGallons: 5000,
      capacityNotes: 'Virtual mid auto-calculated',
      tankTypePolicy: 'ALLOW_VIRTUAL',
      virtualBlendRatio: '60/40 (SUP/Reg)',
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
      jobberPhone: '+1 (555) 201-0101', // Corrected property name
      jobberEmail: 'orders@marathonjobber.com', // Corrected property name
      serviceCompanyId: 'svc-3',
      serviceContactName: 'Kayla Chen',
      servicePhone: '+1 (555) 888-9999', // Corrected property name
      serviceEmail: 'service@fuelsafe.io', // Corrected property name
      backOfficeProvider: 'MODISOFT',
      backOfficeUsername: 'ridgeview-manager',
      backOfficePassword: 'fuel-safe-303',
      defaultLoadRegGallons: 7500,
      defaultLoadPremGallons: 4200,
      defaultLoadDslGallons: 6000,
      defaultLoadMidGallons: 4800,
      capacityNotes: 'SUP 8k, Diesel 9k',
      tankTypePolicy: 'ALLOW_VIRTUAL',
      virtualBlendRatio: '60/40 (SUP/Reg)',
    },
  ];

  const serviceCompanies: ServiceCompany[] = [
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

  const serviceTickets: ServiceTicket[] = [];

  const jobbers: Jobber[] = [
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
      email: 'dispatch@shelljobber.com', // Corrected property name
      portal: { url: 'https://portal.shelljobber.com', username: 'shell-user', password: 'welcome123' },
      communication: { preferredChannel: 'CALL' },
    },
  ];

  const managerContacts: ManagerContact[] = [
    { id: 'mgr-101-1', siteId: 'site-101', name: 'Jamie Flores', role: 'Store Manager', email: 'jamie@quickstop.com', phone: '+1 (555) 410-1122', notifyCritical: 'IMMEDIATE', notifyWarning: 'HOURLY', notifyInfo: 'DAILY', notifyEmail: true, notifySms: true, notifyCall: false },
    { id: 'mgr-101-2', siteId: 'site-101', name: 'Arun Shah', role: 'Owner', email: 'arun@quickstop.com', phone: '+1 (555) 410-7788', notifyCritical: 'IMMEDIATE', notifyWarning: 'DAILY', notifyInfo: 'DAILY', notifyEmail: true, notifySms: false, notifyCall: true },
    { id: 'mgr-202-1', siteId: 'site-202', name: 'Kelly Wu', role: 'Store Manager', email: 'kelly@lakesidefuel.com', phone: '+1 (555) 620-3344', notifyCritical: 'IMMEDIATE', notifyWarning: 'HOURLY', notifyInfo: 'DAILY', notifyEmail: true, notifySms: true, notifyCall: false },
    { id: 'mgr-303-1', siteId: 'site-303', name: 'Samir Patel', role: 'Store Manager', email: 'samir@ridgeviewgas.com', phone: '+1 (555) 920-4455', notifyCritical: 'IMMEDIATE', notifyWarning: 'HOURLY', notifyInfo: 'DAILY', notifyEmail: true, notifySms: true, notifyCall: true },
  ];

  const suppliers: Supplier[] = [
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

  const fuelOrders: FuelOrder[] = [
    {
      id: 'ord-1',
      siteId: 'site-101',
      supplierId: 'sup-1',
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      requestedDeliveryWindowStart: new Date().toISOString(),
      requestedDeliveryWindowEnd: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      notes: 'Night delivery preferred',
      lines: [
        { id: 'line-1', gradeCode: 'REG', requestedGallons: 6000 },
        { id: 'line-2', gradeCode: 'DSL', requestedGallons: 3000 },
      ],
    },
  ];

  let canonicalOrders: CanonOrder[] = [];
  const canonicalTickets: CanonTicket[] = [];
  const tankOverrides: Record<
    string,
    {
      capacityGallons?: number;
      targetFillGallons?: number;
      alertThresholds?: { lowPercent?: number; criticalPercent?: number };
    }
  > = {};

  // Build canonical orders after all other data is initialized
  canonicalOrders = buildCanonicalOrders(sites, tanks, fuelOrders);
  
  return mockData = {
    pageHeadersData, mockUser, userProfile, sites, tanks, alerts, deliveryLinks, settings,
    serviceCompanies, serviceTickets, jobbers, managerContacts, suppliers, fuelOrders,
    canonicalOrders, canonicalTickets, tankOverrides
  };
}


function ensureAtgSeeded() {
  if (atgSeeded) return;

  const seededSites = buildCanonicalSites();
  const seededTanks = seededSites.flatMap((s) => s.tanks || []);
  seedAtgEventsForLast30Days(seededSites, seededTanks);
  // canonicalOrders is now initialized inside getInitialMockData
  atgSeeded = true;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

function normalizeGradeCode(code: string | undefined, tankId?: string, siteId?: string) {
  if (!code) return tankId && siteId ? getGradeCodeForTank(tankId, siteId) : 'REG';
  const upper = code.toUpperCase();
  if (upper.startsWith('REG')) return 'REG';
  if (upper.startsWith('SUP') || upper.startsWith('PRM') || upper.startsWith('PREM')) return 'SUP';
  if (upper.startsWith('DSL') || upper.startsWith('DIESEL')) return 'DSL';
  if (upper.startsWith('MID')) return 'MID';
  return upper.slice(0, 3);
}

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

function mapMidTankToCanon(virtual: Tank | null, reg: Tank | undefined, sup: Tank | undefined): CanonTank | null {
  if (!virtual) return null;
  const base = mapTankToCanon(virtual);
  if (!reg || !sup) return base;
  return {
    ...base,
    isVirtual: true,
    blendSources: [
      { tankId: reg.id, ratio: 0.4 },
      { tankId: sup.id, ratio: 0.6 },
    ],
    computedVolumeGallons: base.currentVolumeGallons,
  };
}

function buildCanonicalTanks(siteId: string): CanonTank[] {
  const data = getInitialMockData();
  const siteSetting = data.settings.find((st) => st.siteId === siteId);
  const siteTanks = data.tanks
    .filter((t) => t.siteId === siteId && t.gradeCode !== 'MID')
    .map((t) => {
      const canon = mapTankToCanon(t);
      const override = data.tankOverrides[t.id];
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
  const reg = data.tanks.find((t) => t.siteId === siteId && t.gradeCode === 'REG');
  const sup = data.tanks.find((t) => t.siteId === siteId && t.gradeCode === 'SUP');
  const mid = deriveMidTank(siteId);
  const virtual = mapMidTankToCanon(mid, reg, sup);
  return virtual ? [...siteTanks, virtual] : siteTanks;
}

export function buildCanonicalSettings(siteId: string): CanonSiteSettings {
  const data = getInitialMockData();
  const s = data.settings.find((st) => st.siteId === siteId);
  const siteJobbers: CanonJobber[] = data.jobbers.map((j) => ({
    id: j.id,
    name: j.name,
    contact: { name: j.contactName ?? j.name, phone: j.phone, email: j.email },
    communication: { preferredChannel: 'EMAIL', notes: '' },
    system: { externalId: j.id, integrationType: 'MANUAL' },
  }));
  const contacts = data.managerContacts.filter((c) => c.siteId === siteId);
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
  const data = getInitialMockData();
  return data.sites.map((site) => ({
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
  const data = getInitialMockData();
  const tank = data.tanks.find((t) => t.id === tankId && t.siteId === siteId);
  return tank?.gradeCode ?? 'REG';
}

function applyOrderStatus(order: CanonOrder, status: CanonOrder['status'], poNumber?: string, updatedBy = 'System') {
  if (status === 'CONFIRMED' && !order.jobberPoNumber) {
    order.jobberPoNumber = poNumber || `PO-${Date.now()}`;
  }
  if (status === 'DELIVERED') {
    // derive delivered volumes from latest ATG delivery events per tank line
    if (order.lines && order.lines.length) {
      let matched = 0;
      order.lines.forEach((line) => {
        const deliveries = getAtgEvents({
          siteId: order.siteId,
          tankId: line.tankId,
          type: 'DELIVERY',
          from: order.createdAt,
          limit: 1,
          offset: 0,
        }).events as AtgDeliveryEvent[];
        const firstAfterOrder = deliveries[0];
        if (firstAfterOrder) {
          matched += 1;
          line.quantityGallonsDelivered = firstAfterOrder.deliveredVolumeGallons;
        }
      });
      if (matched === 0) {
        throw new Error('No delivery event found after order creation time. Cannot mark delivered.');
      }
      const totalDelivered = order.lines.reduce((sum, l) => sum + (l.quantityGallonsDelivered ?? 0), 0);
      order.quantityGallonsDelivered = totalDelivered;
      const requested = order.lines.reduce((sum, l) => sum + l.quantityGallonsRequested, 0);
      const short = totalDelivered < requested * 0.99;
      const over = totalDelivered > requested * 1.01;
      order.status = over ? 'DELIVERED_OVER' : short ? 'DELIVERED_SHORT' : 'DELIVERED';
    } else {
      order.status = 'DELIVERED';
    }
    order.updatedAt = new Date().toISOString();
    order.updatedBy = updatedBy;
    return order;
  }
  order.status = status;
  order.updatedAt = new Date().toISOString();
  order.updatedBy = updatedBy;
  return order;
}

function buildDeliveryRecords(siteId?: string): DeliveryRecord[] {
  const data = getInitialMockData();
  const siteIds = siteId ? [siteId] : data.sites.map((s) => s.id);
  const events: AtgDeliveryEvent[] = [];
  siteIds.forEach((id) => {
    const res = getAtgEvents({ siteId: id, type: 'DELIVERY', limit: 5000, offset: 0 });
    events.push(...(res.events as AtgDeliveryEvent[]));
  });
  return events
    .sort((a, b) => Date.parse(b.endTime || b.timestamp) - Date.parse(a.endTime || a.timestamp))
    .map((evt) => {
      const link = data.deliveryLinks[evt.id];
      const linkedOrder = link?.orderNumber ? data.canonicalOrders.find((o) => o.orderNumber === link.orderNumber || o.id === link.orderNumber) : undefined;
      const bolGallons = link?.bolGallons ?? (linkedOrder ? linkedOrder.quantityGallonsRequested : 0); // no BOL/ticket for unsolicited drops unless linked
      const delivered = evt.deliveredVolumeGallons;
      const status: DeliveryRecord['status'] =
        bolGallons > 0
          ? delivered < bolGallons * 0.99
            ? 'SHORT'
            : delivered > bolGallons * 1.01
            ? 'OVER'
            : 'OK'
          : 'MISSING';
      const supplier = linkedOrder ? data.jobbers.find((j) => j.id === linkedOrder.jobberId)?.name ?? 'Jobber' : 'Unsolicited delivery';
      const gradeCode = normalizeGradeCode(evt.productCode, evt.tankId || undefined, evt.siteId);
      const bundleOrderNumber = `DROP-${evt.siteId}-${evt.endTime || evt.timestamp}`;
      const updatedAt = link?.updatedAt || evt.endTime || evt.timestamp;
      const updatedBy = link?.updatedBy || 'ATG feed';
      const poNumber = link?.poNumber ?? linkedOrder?.jobberPoNumber;
      return {
        id: evt.id,
        siteId: evt.siteId,
        timestamp: evt.endTime || evt.timestamp,
        supplier,
        gradeCode,
        bolGallons,
        atgReceivedGallons: delivered,
        status,
        preDeliveryGallons: evt.startVolumeGallons,
        expectedReadingGallons: evt.endVolumeGallons,
        orderNumber: link?.orderNumber || bundleOrderNumber, // same key groups multi-product drop into one delivery
        poNumber,
        issueNote: link?.orderNumber
          ? link?.poNumber
            ? `Linked to order ${link.orderNumber} (PO ${link.poNumber})`
            : `Linked to order ${link.orderNumber}`
          : 'No order linked (ATG-only delivery)',
        updatedAt,
        updatedBy,
      };
    });
}

function createUnsolicitedOrderFromDelivery(evt: AtgDeliveryEvent, jobberId: string, bolGallons?: number, poNumber?: string, existingOrderNumber?: string) {
  const data = getInitialMockData();
  const siteTanks = data.tanks.filter((t) => t.siteId === evt.siteId);
  const grade = normalizeGradeCode(evt.productCode, evt.tankId || undefined, evt.siteId);
  const tankMatch = siteTanks.find((t) => normalizeGradeCode(t.gradeCode, t.id, t.siteId) === grade) || siteTanks[0];
  const lineRequested = bolGallons ?? evt.deliveredVolumeGallons;
  const orderNumber = existingOrderNumber || `ORD-UNSOL-${evt.id}`;
  const createdAt = evt.endTime || evt.timestamp;
  let order = data.canonicalOrders.find((o) => o.orderNumber === orderNumber);
  if (!order) {
    order = {
      id: orderNumber,
      orderNumber,
      siteId: evt.siteId,
      tankId: tankMatch?.id || evt.tankId || grade,
      jobberId: jobberId,
      status: 'DELIVERED',
      quantityGallonsRequested: 0,
      quantityGallonsDelivered: 0,
      createdAt,
      updatedAt: createdAt,
      ruleTriggered: false,
      jobberPoNumber: poNumber,
      lines: [],
    };
    data.canonicalOrders = [order, ...data.canonicalOrders]; // Update global canonicalOrders
  }

  order.lines = order.lines || [];
  const existingLine = order.lines.find((l) => l.tankId === (tankMatch?.id || evt.tankId || grade));
  if (existingLine) {
    existingLine.quantityGallonsRequested += lineRequested;
    existingLine.quantityGallonsDelivered = (existingLine.quantityGallonsDelivered || 0) + evt.deliveredVolumeGallons;
  } else {
    order.lines.push({
      tankId: tankMatch?.id || evt.tankId || grade,
      quantityGallonsRequested: lineRequested,
      quantityGallonsDelivered: evt.deliveredVolumeGallons,
    });
  }

  order.quantityGallonsRequested = order.lines.reduce((sum, l) => sum + l.quantityGallonsRequested, 0);
  order.quantityGallonsDelivered = order.lines.reduce((sum, l) => sum + (l.quantityGallonsDelivered ?? 0), 0);
  order.updatedAt = createdAt;
  if (poNumber && !order.jobberPoNumber) order.jobberPoNumber = poNumber;
  return order;
}

function buildCanonicalOrders(_sites: SiteSummary[], tanks: Tank[], fuelOrders: FuelOrder[]): CanonOrder[] { // _sites is unused
  return fuelOrders.map((o) => {
    const lines = o.lines.map((line) => {
      const siteTanks = tanks.filter((t) => t.siteId === o.siteId && t.gradeCode === line.gradeCode);
      const tankId = siteTanks[0]?.id ?? line.gradeCode;
      return { tankId, quantityGallonsRequested: line.requestedGallons };
    });
    const firstTank = lines[0]?.tankId;
    const created = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    return {
      id: o.id,
      orderNumber: o.id,
      siteId: o.siteId,
      tankId: firstTank,
      jobberId: o.supplierId,
      status: mapOrderStatus(o.status),
      quantityGallonsRequested: lines.reduce((sum, l) => sum + l.quantityGallonsRequested, 0),
      createdAt: created,
      updatedAt: created,
      updatedBy: 'System',
      ruleTriggered: false,
      jobberPoNumber: o.lines.length ? `PO-${o.id}` : undefined,
      lines,
    };
  });
}

function deriveMidTank(siteId: string): Tank | null {
  const data = getInitialMockData();
  const reg = data.tanks.find((t) => t.siteId === siteId && t.gradeCode === 'REG');
  const sup = data.tanks.find((t) => t.siteId === siteId && t.gradeCode === 'SUP');
  if (!reg || !sup) return null;
  const capacityGallons = computeBlendedGallons(reg.capacityGallons, sup.capacityGallons);
  const currentGallons = computeBlendedGallons(reg.currentGallons, sup.currentGallons);
  const temperatureC = Math.round(((reg.temperatureC + sup.temperatureC) / 2) * 10) / 10;
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

function computeBlendedGallons(regGallons: number, SUPGallons: number): number {
  const MID_SUP_RATIO = 0.6;
  const MID_REG_RATIO = 0.4;
  const potentialFromReg = regGallons / MID_REG_RATIO;
  const potentialFromSUP = SUPGallons / MID_SUP_RATIO;
  return Math.round(Math.min(potentialFromReg, potentialFromSUP));
}

function getPhysicalSiteTanks(siteId: string): Tank[] {
  const data = getInitialMockData();
  return data.tanks.filter((t) => t.siteId === siteId && t.gradeCode !== 'MID');
}

function withComputedSummary(site: SiteSummary): SiteSummary {
  const live = deriveLiveStatus(site.id);
  const openCount = live.alerts.filter((a) => a.isOpen).length;
  return { ...site, lowestTankPercent: computeLowestTankPercent(site.id), openAlertCount: openCount };
}

function computeLowestTankPercent(siteId: string): number {
  const data = getInitialMockData();
  const siteTanks = data.tanks.filter((t) => t.siteId === siteId && t.gradeCode !== 'MID');
  if (!siteTanks.length) return 0;
  const percents = siteTanks.map((t) => (t.currentGallons / t.capacityGallons) * 100);
  return Math.round(Math.min(...percents));
}

function deriveSalesVariance(siteId: string) {
  const invEvents = getAtgEvents({ siteId, type: 'INVENTORY', limit: 50000 }).events as AtgInventoryEvent[];
  const grouped = new Map<string, AtgInventoryEvent[]>();
  invEvents.forEach((evt) => {
    if (!evt.tankId) return;
    if (!grouped.has(evt.tankId)) grouped.set(evt.tankId, []);
    grouped.get(evt.tankId)!.push(evt);
  });
  grouped.forEach((list) => list.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)));

  const salesEvents: VarianceEvent[] = [];
  grouped.forEach((list, tankId) => {
    const gradeCode = normalizeGradeCode(getGradeCodeForTank(tankId, siteId));
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const curr = list[i];
      const delta = curr.volumeGallons - prev.volumeGallons;
      if (delta < 0) {
        salesEvents.push({
          id: `sale-${tankId}-${i}`,
          siteId,
          timestamp: curr.timestamp,
          gradeCode,
          expectedGallons: prev.volumeGallons,
          actualGallons: curr.volumeGallons,
          varianceGallons: delta,
          severity: 'INFO',
          note: 'ATG volume decrease (sale) detected',
        });
      }
    }
  });

  salesEvents.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  // const now = Date.now(); // Unused
  const todayStr = new Date().toDateString();
  const todayGallons = salesEvents
    .filter((e) => new Date(e.timestamp).toDateString() === todayStr)
    .reduce((sum, e) => sum + e.varianceGallons, 0);
  const last7Gallons = salesEvents
    .filter((e) => Date.now() - Date.parse(e.timestamp) <= 7 * 24 * 60 * 60 * 1000)
    .reduce((sum, e) => sum + e.varianceGallons, 0);

  return {
    today: { gallons: todayGallons, value: Math.abs(todayGallons) * 3.5 },
    last7Days: { gallons: last7Gallons, value: Math.abs(last7Gallons) * 3.5 },
    events: salesEvents,
  };
}

function deriveSalesSeries(siteId: string) {
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - ninetyDaysMs;
  const invEvents = getAtgEvents({ siteId, type: 'INVENTORY', limit: 200000 }).events as AtgInventoryEvent[];
  const grouped = new Map<string, AtgInventoryEvent[]>();
  invEvents.forEach((evt) => {
    if (!evt.tankId) return;
    if (Date.parse(evt.timestamp) < cutoff) return;
    if (!grouped.has(evt.tankId)) grouped.set(evt.tankId, []);
    grouped.get(evt.tankId)!.push(evt);
  });
  grouped.forEach((list) => list.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)));

  const byGrade = new Map<
    string,
    {
      gradeCode: string;
      buckets: Map<string, number>;
      lastReadingAt?: string;
    }
  >();

  grouped.forEach((list, tankId) => {
    const gradeCode = normalizeGradeCode(getGradeCodeForTank(tankId, siteId));
    if (!byGrade.has(gradeCode)) byGrade.set(gradeCode, { gradeCode, buckets: new Map(), lastReadingAt: undefined });
    const target = byGrade.get(gradeCode)!;
    list.forEach((evt) => {
      const ts = evt.timestamp;
      if (!target.lastReadingAt || Date.parse(ts) > Date.parse(target.lastReadingAt)) {
        target.lastReadingAt = ts;
      }
    });
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const curr = list[i];
      const delta = prev.volumeGallons - curr.volumeGallons;
      if (delta > 0) {
        const bucketMs = Math.floor(Date.parse(curr.timestamp) / (60 * 60 * 1000)) * 60 * 60 * 1000;
        const bucketKey = new Date(bucketMs).toISOString();
        target.buckets.set(bucketKey, (target.buckets.get(bucketKey) || 0) + delta);
      }
    }
  });

  const series = Array.from(byGrade.values()).map((g) => {
    const points = Array.from(g.buckets.entries())
      .map(([timestamp, gallons]) => ({ timestamp, gallons }))
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

    // Bollinger bands (14-period) per point
    const window = 14;
    const withBands = points.map((pt, idx) => {
      const start = Math.max(0, idx - window + 1);
      const windowSlice = points.slice(start, idx + 1);
      if (windowSlice.length < window) {
        return { ...pt, middle: undefined, upper: undefined, lower: undefined };
      }
      const mean = windowSlice.reduce((sum, p) => sum + p.gallons, 0) / windowSlice.length;
      const variance =
        windowSlice.reduce((sum, p) => sum + Math.pow(p.gallons - mean, 2), 0) / windowSlice.length;
      const std = Math.sqrt(variance);
      return {
        ...pt,
        middle: mean,
        upper: mean + 2 * std,
        lower: Math.max(0, mean - 2 * std),
      };
    });

    return {
      gradeCode: g.gradeCode,
      points: withBands,
      lastReadingAt: g.lastReadingAt,
    };
  });

  return { updatedAt: new Date().toISOString(), windowDays: 90, series };
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
  const SUPRunout = preds.find((p) => p.gradeCode === 'SUP');
  const midTank = deriveMidTank(siteId);
  if (midTank && regRunout && SUPRunout) {
    preds.push({
      siteId,
      tankId: midTank.id,
      gradeCode: 'MID',
      hoursToTenPercent: Math.round(regRunout.hoursToTenPercent * 0.4 + SUPRunout.hoursToTenPercent * 0.6),
      hoursToEmpty: Math.round(regRunout.hoursToEmpty * 0.4 + SUPRunout.hoursToEmpty * 0.6),
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
        type: 'ATG_ALARM', // Corrected type
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

function buildOrderSuggestion(siteId: string) {
  const siteTanks = buildCanonicalTanks(siteId);

  const suggestedLines = siteTanks.filter(t => !t.isVirtual).map(t => {
    const currentGallons = t.currentVolumeGallons ?? 0;
    const capacityGallons = t.capacityGallons ?? 0;
    const percentFull = (currentGallons / capacityGallons) * 100;

    // Simple runout prediction (for demo purposes)
    const runoutPred = computeRunoutForSite(siteId).find(p => p.tankId === t.id);
    const estHoursToTenPercent = runoutPred?.hoursToTenPercent ?? Infinity;

    // Suggest ordering if below a certain threshold (e.g., 50%) or if runout is imminent
    let suggestedOrderGallons = 0;
    if (percentFull < 50 || estHoursToTenPercent < 48) {
        // Suggest filling to 90% capacity as an example
        suggestedOrderGallons = Math.max(0, Math.floor(capacityGallons * 0.9 - currentGallons));
    }

    return {
      gradeCode: t.productType, // Using productType as gradeCode for suggestion
      currentGallons,
      capacityGallons,
      percentFull: parseFloat(percentFull.toFixed(1)),
      estHoursToTenPercent,
      suggestedOrderGallons,
    };
  });

  return {
    siteId,
    generatedAt: new Date().toISOString(),
    suggestedLines,
  };
}

export async function mockRequest<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  ensureAtgSeeded();
  const data = getInitialMockData();
    if (path.startsWith('/api/')) {
      // Canonical API surface
      if (method === 'POST' && path === '/api/deliveries/link') {
        const payload = body as { deliveryId: string; orderNumber?: string; bolGallons?: number; poNumber?: string; jobberId?: string };
        if (!payload.deliveryId) throw new Error('deliveryId is required');
        const evt = findDeliveryById(payload.deliveryId);
        if (!evt) throw new Error('Delivery event not found');
        const gradeForLink = normalizeGradeCode(evt.productCode, evt.tankId || undefined, evt.siteId);
        const poForLink = payload.poNumber;
        if (poForLink) {
          for (const [otherId, link] of Object.entries(data.deliveryLinks)) {
            if (otherId === payload.deliveryId) continue;
            if (link.poNumber !== poForLink) continue;
            const otherEvt = findDeliveryById(otherId);
            if (!otherEvt) continue;
            const otherGrade = normalizeGradeCode(otherEvt.productCode, otherEvt.tankId || undefined, otherEvt.siteId);
            if (otherGrade === gradeForLink) {
              throw new Error('This PO is already used for another delivery of the same product. Use a different PO or unlink first.');
            }
          }
        }
        let orderNumber = payload.orderNumber;
        if (!orderNumber) {
          const jobberId = payload.jobberId || data.jobbers[0]?.id || 'jobber-1';
          const newOrder = createUnsolicitedOrderFromDelivery(
            evt,
            jobberId,
            payload.bolGallons ?? evt.deliveredVolumeGallons,
            payload.poNumber,
            orderNumber
          );
          orderNumber = newOrder.orderNumber;
        } else {
          const jobberId = payload.jobberId || data.jobbers[0]?.id || 'jobber-1';
        createUnsolicitedOrderFromDelivery(evt, jobberId, payload.bolGallons ?? evt.deliveredVolumeGallons, payload.poNumber, orderNumber);
      }
      data.deliveryLinks[payload.deliveryId] = {
        orderNumber,
        bolGallons: payload.bolGallons,
        poNumber: payload.poNumber,
        updatedAt: new Date().toISOString(),
        updatedBy: 'User',
      };
      return delay(500, { ok: true, orderNumber } as unknown as T);
      }
      if (method === 'POST' && path === '/api/deliveries/update-bol') {
        const payload = body as { deliveryId: string; bolGallons: number };
        if (!payload.deliveryId) throw new Error('deliveryId is required');
        const existing = data.deliveryLinks[payload.deliveryId] || {};
        data.deliveryLinks[payload.deliveryId] = {
          ...existing,
          bolGallons: payload.bolGallons,
          updatedAt: new Date().toISOString(),
          updatedBy: 'User',
        };
        return delay(500, { ok: true } as unknown as T);
      }
      if (method === 'GET' && path === '/api/content/page-headers') {
        return delay(500, data.pageHeadersData as unknown as T);
      }
      if (method === 'GET' && path === '/api/sites') {
        return delay(500, buildCanonicalSites() as unknown as T);
      }
    const siteMatchApi = path.match(/^\/api\/sites\/([^/]+)(.*)$/);
    if (siteMatchApi) {
      const siteId = siteMatchApi[1];
      const subPath = siteMatchApi[2] || '';
      if (method === 'GET' && (subPath === '' || subPath === '/')) {
        const site = buildCanonicalSites().find((s) => s.id === siteId);
        if (!site) throw new Error('Site not found');
        return delay(500, site as unknown as T);
      }
      if (method === 'GET' && subPath === '/variance') {
        const sales = deriveSalesVariance(siteId);
        return delay(500, sales as unknown as T);
      }
      if (method === 'GET' && subPath === '/live-status') {
        const live = deriveLiveStatus(siteId);
        return delay(500, live as unknown as T);
      }
      if (method === 'GET' && subPath === '/sales-series') {
        const sales = deriveSalesSeries(siteId);
        return delay(500, sales as unknown as T);
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
        return delay(500, result as unknown as T);
      }
      if (method === 'GET' && subPath === '/tanks') {
        return delay(500, buildCanonicalTanks(siteId) as unknown as T);
      }
      if (method === 'GET' && subPath === '/alerts') {
        const siteAlerts = data.alerts.filter((a) => a.siteId === siteId);
        return delay(500, siteAlerts as unknown as T);
      }
      const tankMatchApi = subPath.match(/^\/tanks\/([^/]+)$/);
        if (tankMatchApi && method === 'PUT') {
          const tankId = tankMatchApi[1];
          const partial = body as {
            capacityGallons?: number;
            targetFillGallons?: number;
            alertThresholds?: { lowPercent?: number; criticalPercent?: number };
          };
          const baseTank = data.tanks.find((t) => t.id === tankId && t.siteId === siteId);
          if (!baseTank) throw new Error('Tank not found');
          if (!data.tankOverrides[tankId]) data.tankOverrides[tankId] = {};
          if (typeof partial.capacityGallons === 'number') {
            baseTank.capacityGallons = partial.capacityGallons;
            data.tankOverrides[tankId].capacityGallons = partial.capacityGallons;
          }
          if (typeof partial.targetFillGallons === 'number') {
            data.tankOverrides[tankId].targetFillGallons = partial.targetFillGallons;
          }
          if (partial.alertThresholds) {
            data.tankOverrides[tankId].alertThresholds = {
              ...data.tankOverrides[tankId].alertThresholds,
              ...partial.alertThresholds,
            };
        }
        const updated = buildCanonicalTanks(siteId).find((t) => t.id === tankId);
        return delay(500, updated as unknown as T);
      }
      if (method === 'POST' && subPath === '/sync-backoffice') {
        const provider = data.settings.find((s) => s.siteId === siteId)?.backOfficeProvider ?? 'MODISOFT';
        const payload = {
          siteId,
          provider: provider as 'MODISOFT' | 'C_STORE',
          status: 'QUEUED' as const,
          startedAt: new Date().toISOString(),
          message: 'Back office sync completed (mock)',
        };
        return delay(500, payload as unknown as T);
      }
      if (method === 'GET' && subPath === '/deliveries') {
        const siteDeliveries = buildDeliveryRecords(siteId);
        return delay(500, siteDeliveries as unknown as T);
      }
      if (method === 'GET' && subPath === '/order-suggestions') {
        const suggestion = buildOrderSuggestion(siteId);
        return delay(500, suggestion as unknown as T);
      }
      if (method === 'GET' && subPath === '/settings') {
        const existing = data.settings.find((s) => s.siteId === siteId);
        if (!existing) throw new Error('Site settings not found');
        return delay(500, { ...existing } as unknown as T);
      }
      if (method === 'PUT' && subPath === '/settings') {
        const payload = body as Partial<SiteSettings>;
        const existing = data.settings.find((s) => s.siteId === siteId);
        if (!existing) throw new Error('Site settings not found');
        Object.assign(existing, payload);
        return delay(500, { ...existing } as unknown as T);
      }
      if (method === 'GET' && subPath === '/service-companies') {
        const list = data.serviceCompanies.filter((c) => c.siteId === siteId);
        return delay(500, list as unknown as T);
      }
      if (method === 'GET' && subPath === '/service-tickets') {
        const list = data.serviceTickets.filter((t) => t.siteId === siteId);
        return delay(500, list as unknown as T);
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
        data.serviceTickets.push(ticket); // Update global data
        return delay(500, ticket as unknown as T);
      }
      const svcTicketMatchApi = subPath.match(/^\/service-tickets\/([^/]+)$/);
      if (svcTicketMatchApi && method === 'PUT') {
        const ticketId = svcTicketMatchApi[1];
        const partial = body as Partial<ServiceTicket>;
        const ticket = data.serviceTickets.find((t) => t.id === ticketId && t.siteId === siteId);
        if (!ticket) throw new Error('Ticket not found');
        Object.assign(ticket, partial, { updatedAt: new Date().toISOString() });
        return delay(500, ticket as unknown as T);
      }
    }
    if (method === 'GET' && path.startsWith('/api/orders')) {
      const url = new URL(`http://dummy${path}`);
      const siteId = url.searchParams.get('siteId') || undefined;
      const list = siteId ? data.canonicalOrders.filter((o) => o.siteId === siteId) : data.canonicalOrders;
      return delay(500, list as unknown as T);
    }
    if (method === 'PUT' && path.startsWith('/api/alerts/')) {
      const alertIdMatch = path.match(/^\/api\/alerts\/([^/]+)$/);
      if (!alertIdMatch) throw new Error('Alert ID is required');
      const alertId = alertIdMatch[1];
      const alert = data.alerts.find((a) => a.id === alertId);
      if (!alert) throw new Error('Alert not found');
      const payload = body as Partial<Alert>;
      Object.assign(alert, payload);
      return delay(500, alert as unknown as T);
    }
    const orderPoMatch = path.match(/^\/api\/orders\/([^/]+)\/update-po$/);
    if (orderPoMatch && method === 'POST') {
      const orderId = orderPoMatch[1];
      const order = data.canonicalOrders.find((o) => o.id === orderId);
      if (!order) throw new Error('Order not found');
      const po = (body as { poNumber?: string }).poNumber;
      order.jobberPoNumber = po || order.jobberPoNumber;
      order.updatedAt = new Date().toISOString();
      order.updatedBy = 'User';
      return delay(500, order as unknown as T);
    }
    const orderActionMatch = path.match(/^\/api\/orders\/([^/]+)\/(confirm|dispatch|deliver|cancel)$/);
    if (orderActionMatch && method === 'POST') {
      const orderId = orderActionMatch[1];
      const action = orderActionMatch[2];
      const po = (body as { jobberPoNumber?: string } | undefined)?.jobberPoNumber;
      const order = data.canonicalOrders.find((o) => o.id === orderId);
      if (!order) throw new Error('Order not found');
      if (action === 'confirm') {
        applyOrderStatus(order, 'CONFIRMED', po, 'User');
      } else if (action === 'dispatch') {
        throw new Error('Dispatch step is disabled in this mock. Please mark delivered directly.');
      } else if (action === 'deliver') {
        applyOrderStatus(order, 'DELIVERED', undefined, 'User');
      } else if (action === 'cancel') {
        applyOrderStatus(order, 'CANCELLED', undefined, 'User');
      }
      return delay(500, order as unknown as T);
    }
    if (method === 'POST' && path === '/api/orders') {
      const payload = body as { siteId: string; jobberId: string; lines: { tankId: string; quantityGallonsRequested: number }[] };
      const now = Date.now();
      const orderNumber = `ORD-${now}`;
      const total = payload.lines.reduce((sum, l) => sum + l.quantityGallonsRequested, 0);
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const newOrder: CanonOrder = {
        id: orderNumber,
        orderNumber,
        siteId: payload.siteId,
        tankId: payload.lines[0]?.tankId,
        jobberId: payload.jobberId,
        status: 'PENDING',
        quantityGallonsRequested: total,
        createdAt: twoDaysAgo,
        updatedAt: twoDaysAgo,
        updatedBy: 'User',
        ruleTriggered: false,
        jobberPoNumber: undefined,
        lines: payload.lines,
      };
      data.canonicalOrders = [newOrder, ...data.canonicalOrders]; // Update global data
      return delay(500, newOrder as unknown as T);
    }
    const orderMatchApi = path.match(/^\/api\/orders\/([^/]+)$/);
    if (orderMatchApi && method === 'PUT') {
      const orderId = orderMatchApi[1];
      const partial = body as Partial<CanonOrder>;
      const order = data.canonicalOrders.find((o) => o.id === orderId);
      if (!order) throw new Error('Order not found');

      if (partial.status === 'DISPATCHED') {
        throw new Error('Dispatch step is disabled in this mock. Please mark delivered directly.');
      }
      if (partial.status && ['CONFIRMED', 'DELIVERED', 'DELIVERED_SHORT', 'DELIVERED_OVER', 'CANCELLED'].includes(partial.status)) {
        applyOrderStatus(order, partial.status as CanonOrder['status'], partial.jobberPoNumber, 'User');
      } else {
        Object.assign(order, partial);
        order.updatedAt = new Date().toISOString();
        order.updatedBy = 'User';
      }
      return delay(500, order as unknown as T);
    }
  if (method === 'GET' && path === '/api/jobbers') {
    const canonJobbers: CanonJobber[] = data.jobbers.map((j) => ({
      id: j.id,
      name: j.name,
      contact: { name: j.contactName ?? j.name, phone: j.phone, email: j.email },
      communication: { preferredChannel: j.communication?.preferredChannel ?? 'EMAIL', notes: j.communication?.notes ?? '' },
      system: { externalId: j.id, integrationType: 'MANUAL' },
    }));
    return delay(500, canonJobbers as unknown as T);
  }
    if (method === 'GET' && path === '/api/settings') {
      const payload: CanonSiteSettings[] = data.sites.map((s) => buildCanonicalSettings(s.id));
      return delay(500, payload as unknown as T);
    }
    if (method === 'GET' && path === '/api/suppliers') {
      return delay(500, data.suppliers as unknown as T);
    }
    if (method === 'GET' && path.startsWith('/api/tickets')) {
      const url = new URL(`http://dummy${path}`);
      const idMatch = path.match(/^\/api\/tickets\/([^/]+)$/);
      if (idMatch) {
        const ticket = data.canonicalTickets.find((t) => t.id === idMatch[1]);
        if (!ticket) throw new Error('Ticket not found');
        return delay(500, ticket as unknown as T);
      }
      const siteId = url.searchParams.get('siteId') || undefined;
      const list = siteId ? data.canonicalTickets.filter((t) => t.siteId === siteId) : data.canonicalTickets;
      return delay(500, list as unknown as T);
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
          orderNumber: payload.orderNumber,
      };
      data.canonicalTickets = [ticket, ...data.canonicalTickets]; // Update global data
      return delay(500, ticket as unknown as T);
    }
      const ticketMatchPut = path.match(/^\/api\/tickets\/([^/]+)$/);
      if (ticketMatchPut && method === 'PUT') {
        const ticketId = ticketMatchPut[1];
        const partial = body as Partial<CanonTicket>;
      const ticket = data.canonicalTickets.find((t) => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found');
      Object.assign(ticket, partial, { updatedAt: new Date().toISOString() });
      return delay(500, ticket as unknown as T);
    }
    const ticketCommentMatch = path.match(/^\/api\/tickets\/([^/]+)\/comments$/);
      if (ticketCommentMatch && method === 'POST') {
        const ticketId = ticketCommentMatch[1];
        const ticket = data.canonicalTickets.find((t) => t.id === ticketId);
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
        return delay(500, ticket as unknown as T);
      }
    throw new Error(`Mock route not implemented: ${method} ${path}`);
  }
  if (method === 'POST' && path === '/auth/login') {
    return delay(500, {
      user: data.mockUser,
      token: 'mock-token',
    } as unknown as T);
  }

  if (method === 'GET' && path === '/user/profile') {
    return delay(500, data.userProfile as unknown as T);
  }

  if (method === 'PUT' && path === '/user/profile') {
    const partial = body as Partial<UserProfile>;
    data.userProfile = { ...data.userProfile, ...partial }; // Update global data
    return delay(500, data.userProfile as unknown as T);
  }

  if (method === 'GET' && path === '/suppliers') {
    return delay(500, data.suppliers as unknown as T);
  }

  if (method === 'GET' && path === '/service-companies') {
    return delay(500, data.serviceCompanies as unknown as T);
  }

  if (method === 'GET' && path === '/jobbers') {
    return delay(500, data.jobbers as unknown as T);
  }
  if (method === 'POST' && path === '/jobbers') {
    const payload = body as Omit<Jobber, 'id'>;
    const jobber: Jobber = { ...payload, id: `job-${Date.now()}` };
    data.jobbers.push(jobber); // Update global data
    return delay(500, jobber as unknown as T);
  }
  const jobberMatch = path.match(/^\/jobbers\/([^/]+)$/);
  if (jobberMatch) {
    const jobberId = jobberMatch[1];
    if (method === 'PUT') {
      const partial = body as Partial<Jobber>;
      const jobber = data.jobbers.find((j) => j.id === jobberId);
      if (!jobber) throw new Error('Jobber not found');
      Object.assign(jobber, partial);
      return delay(500, jobber as unknown as T);
    }
    if (method === 'DELETE') {
      const idx = data.jobbers.findIndex((j) => j.id === jobberId);
      if (idx === -1) throw new Error('Jobber not found');
      const removed = data.jobbers.splice(idx, 1)[0];
      return delay(500, removed as unknown as T);
    }
  }

  if (method === 'GET' && path === '/sites') {
    return delay(500, data.sites.map(withComputedSummary) as unknown as T);
  }

  const siteMatch = path.match(/^\/sites\/([^/]+)(.*)$/);
  if (siteMatch) {
    const siteId = siteMatch[1];
    const subPath = siteMatch[2] || '';

    if (method === 'GET' && (subPath === '' || subPath === '/')) {
      const site = data.sites.find((s) => s.id === siteId);
      if (!site) throw new Error('Site not found');
      return delay(500, withComputedSummary(site) as unknown as T);
    }

    if (method === 'GET' && subPath === '/tanks') {
      const siteTanks = getPhysicalSiteTanks(siteId);
      const mid = deriveMidTank(siteId);
      const response = mid ? [...siteTanks, mid] : siteTanks;
      return delay(500, response as unknown as T);
    }

    if (method === 'GET' && subPath === '/overview') {
      const site = data.sites.find((s) => s.id === siteId);
      if (!site) throw new Error('Site not found');
      const siteTanks = getPhysicalSiteTanks(siteId);
      const mid = deriveMidTank(siteId);
      const allTanks = mid ? [...siteTanks, mid] : siteTanks;
      const siteAlerts = data.alerts.filter((a) => a.siteId === siteId);
      const siteDeliveries = buildDeliveryRecords(siteId);
      const preds = computeRunoutForSite(siteId);
      const salesVariance = deriveSalesVariance(siteId);
      const siteOrders = data.fuelOrders.filter((o) => o.siteId === siteId);
      return delay(
        500,
        {
          site: withComputedSummary(site),
          tanks: allTanks,
          alerts: siteAlerts,
          deliveries: siteDeliveries,
          runout: preds,
          variance: salesVariance,
          orders: siteOrders,
        } as unknown as T
      );
    }

    if (method === 'GET' && subPath === '/alerts') {
      const siteAlerts = data.alerts.filter((a) => a.siteId === siteId);
      return delay(500, siteAlerts as unknown as T);
    }

    if (method === 'GET' && subPath === '/deliveries') {
      const siteDeliveries = buildDeliveryRecords(siteId);
      return delay(500, siteDeliveries as unknown as T);
    }

    if (method === 'GET' && subPath === '/order-suggestions') {
      const suggestion = buildOrderSuggestion(siteId);
      return delay(500, suggestion as unknown as T);
    }

    if (method === 'GET' && subPath === '/sales-series') {
      const sales = deriveSalesSeries(siteId);
      return delay(500, sales as unknown as T);
    }

    if (method === 'GET' && subPath === '/contacts') {
      const list = data.managerContacts.filter((c) => c.siteId === siteId);
      return delay(500, list as unknown as T);
    }

    if (method === 'POST' && subPath === '/contacts') {
      const payload = body as Omit<ManagerContact, 'id' | 'siteId'>;
      const contact: ManagerContact = { ...payload, siteId, id: `mgr-${Date.now()}` };
      data.managerContacts.push(contact); // Update global data
      return delay(500, contact as unknown as T);
    }

    const contactMatch = subPath.match(/^\/contacts\/([^/]+)$/);
    if (contactMatch && (method === 'PUT' || method === 'DELETE')) {
      const contactId = contactMatch[1];
      const contactIndex = data.managerContacts.findIndex((c) => c.id === contactId && c.siteId === siteId);
      if (contactIndex === -1) throw new Error('Contact not found');
      if (method === 'PUT') {
        const partial = body as Partial<ManagerContact>;
        Object.assign(data.managerContacts[contactIndex], partial); // Update global data
        return delay(500, data.managerContacts[contactIndex] as unknown as T);
      }
      if (method === 'DELETE') {
        const removed = data.managerContacts.splice(contactIndex, 1)[0]; // Update global data
        return delay(500, removed as unknown as T);
      }
    }

    if (method === 'GET' && subPath === '/orders') {
      const siteOrders = data.fuelOrders.filter((o) => o.siteId === siteId);
      return delay(500, siteOrders as unknown as T);
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
        lines: payload.lines.map((l, idx) => ({
          id: `line-${Date.now()}-${idx}`,
          ...l,
        })),
      };
      data.fuelOrders.push(newOrder);
      data.canonicalOrders = buildCanonicalOrders(data.sites, data.tanks, data.fuelOrders); // Rebuild canonical orders
      return delay(500, newOrder as unknown as T);
    }
  }
  // This return makes sure that when a new endpoint is added, a message is returned to the user instead of returning an unknown error.
  return delay(500, { message: `Mock route not implemented: ${method} ${path}` } as unknown as T);
}
