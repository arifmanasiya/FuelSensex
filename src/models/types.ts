export type SiteStatus = 'HEALTHY' | 'ATTENTION' | 'CRITICAL';

export interface Tank {
  id: string;
  siteId: string;
  name: string;
  productType: 'REGULAR' | 'PREMIUM' | 'DIESEL' | 'VIRTUAL_MIDGRADE';
  capacityGallons: number;
  currentVolumeGallons: number;
  targetFillGallons?: number;
  temperatureF?: number;
  waterLevel?: number;
  statusFlags?: ('IN_DELIVERY' | 'IN_TEST' | 'ALARM_ACTIVE')[];
  isVirtual?: boolean;
  blendSources?: { tankId: string; ratio: number }[];
  computedVolumeGallons?: number;
  alertThresholds?: {
    lowPercent?: number;
    criticalPercent?: number;
  };
}

export interface BackOfficeConfig {
  systemName: string;
  syncScheduleCron?: string;
  lastSyncAt?: string;
  status: 'OK' | 'ERROR';
}

export interface NotificationSettings {
  contacts: { name: string; role: string; phone?: string; email?: string }[];
  modes: { email: boolean; sms: boolean; inApp: boolean };
  frequency: 'IMMEDIATE' | 'HOURLY_DIGEST' | 'DAILY_DIGEST';
}

export interface Jobber {
  id: string;
  name: string;
  contact: { name: string; phone?: string; email?: string };
  communication?: { preferredChannel?: 'EMAIL' | 'SMS' | 'CALL' | 'PORTAL'; notes?: string };
  system?: { externalId?: string; integrationType?: string };
  portal?: { url?: string; username?: string; password?: string }; // url used as website
}

export interface ServiceCompany {
  id: string;
  siteId: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  portal?: { url?: string; username?: string; password?: string }; // url used as website
  communication?: { preferredChannel?: 'EMAIL' | 'SMS' | 'CALL' | 'PORTAL'; notes?: string };
}

export interface SiteSettings {
  siteId?: string;
  jobberId?: string;
  jobbers: Jobber[];
  backOffice: BackOfficeConfig;
  notifications: NotificationSettings;
  alertsEnabled?: boolean;
  defaultLoadRegGallons?: number;
  defaultLoadPremGallons?: number;
  defaultLoadDslGallons?: number;
  defaultLoadMidGallons?: number;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  address: string;
  timeZone: string;
  status: SiteStatus;
  tanks: Tank[];
  settings: SiteSettings;
}

export interface Order {
  id: string;
  siteId: string;
  tankId?: string;
  jobberId: string;
  status:
    | 'DRAFT'
    | 'PENDING'
    | 'CONFIRMED'
    | 'DISPATCHED'
    | 'DELIVERED'
    | 'DELIVERED_SHORT'
    | 'DELIVERED_OVER'
    | 'CANCELLED';
  quantityGallonsRequested: number;
  quantityGallonsDelivered?: number;
  ruleTriggered?: boolean;
  createdAt: string;
  updatedAt: string;
  orderNumber?: string;
  jobberPoNumber?: string;
  lines?: { tankId: string; quantityGallonsRequested: number; quantityGallonsDelivered?: number }[];
}

export interface Ticket {
  id: string;
  orderId?: string;
  orderNumber?: string;
  siteId: string;
  jobberId?: string;
  serviceCompanyId?: string;
  type: 'SHORT_DELIVERY' | 'QUALITY_ISSUE' | 'OTHER';
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
  comments?: { id: string; author?: string; text: string; createdAt: string }[];
}
