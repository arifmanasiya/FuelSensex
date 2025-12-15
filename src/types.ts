export type SiteStatus = 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertFrequency = 'IMMEDIATE' | 'HOURLY' | 'DAILY';

export interface Tank {
  id: string;
  siteId: string;
  name: string;
  gradeCode: string;
  capacityGallons: number;
  currentGallons: number;
  waterLevelInches: number;
  temperatureC: number;
  status: 'OK' | 'LOW' | 'CRITICAL' | 'WATER';
}

export interface SiteSummary {
  id: string;
  name: string;
  address: string;
  city: string;
  status: SiteStatus;
  currentDailyVarianceGallons: number;
  currentDailyVarianceValue: number;
  openAlertCount: number;
  lowestTankPercent: number;
}

export interface VarianceEvent {
  id: string;
  siteId: string;
  timestamp: string;
  gradeCode: string;
  expectedGallons: number;
  actualGallons: number;
  varianceGallons: number;
  severity: Severity;
  note?: string;
}

export type AlertType =
  | 'POSSIBLE_THEFT'
  | 'SHORT_DELIVERY'
  | 'RUNOUT_RISK'
  | 'WATER_DETECTED'
  | 'ATG_POS_MISMATCH'
  | 'ATG_ALARM';

export interface Alert {
  id: string;
  siteId: string;
  timestamp: string;
  severity: Severity;
  type: AlertType;
  message: string;
  isOpen: boolean;
}

export interface DeliveryRecord {
  id: string;
  siteId: string;
  timestamp: string;
  supplier: string;
  gradeCode: string;
  bolGallons: number;
  atgReceivedGallons: number;
  status: 'OK' | 'SHORT' | 'OVER' | 'MISSING';
  preDeliveryGallons?: number;
  expectedReadingGallons?: number;
  issueNote?: string;
  orderNumber?: string;
  poNumber?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface JobberPortalCredentials {
  username?: string;
  password?: string;
}

export interface RunoutPrediction {
  siteId: string;
  tankId: string;
  gradeCode: string;
  hoursToTenPercent: number;
  hoursToEmpty: number;
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

export interface ServiceTicket {
  id: string;
  siteId: string;
  providerId: string;
  issue: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  contactName?: string;
  phone?: string;
  notes?: string;
}

export type FuelOrderStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'EN_ROUTE'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
}

export interface FuelOrderLine {
  id: string;
  gradeCode: string;
  requestedGallons: number;
}

export interface FuelOrder {
  id: string;
  siteId: string;
  supplierId: string;
  status: FuelOrderStatus;
  createdAt: string;
  requestedDeliveryWindowStart: string;
  requestedDeliveryWindowEnd: string;
  notes?: string;
  lines: FuelOrderLine[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface OrderSuggestion {
  siteId: string;
  generatedAt: string;
  suggestedLines: {
    gradeCode: string;
    currentGallons: number;
    capacityGallons: number;
    percentFull: number;
    estHoursToTenPercent: number;
    suggestedOrderGallons: number;
  }[];
}

export interface SiteSettings {
  siteId: string;
  lowTankPercent: number;
  criticalTankPercent: number;
  dailyVarianceAlertGallons: number;
  alertsEnabled?: boolean;
  notifyByEmail: boolean;
  notifyBySms: boolean;
  preferredComm?: 'EMAIL' | 'SMS' | 'CALL';
  alertFrequencyCritical?: AlertFrequency;
  alertFrequencyWarning?: AlertFrequency;
  alertFrequencyInfo?: AlertFrequency;
  jobberId?: string;
  jobberContactName?: string;
  jobberPhone?: string;
  jobberEmail?: string;
  jobberPortalUsername?: string;
  jobberPortalPassword?: string;
  serviceCompanyId?: string;
  serviceContactName?: string;
  servicePhone?: string;
  serviceEmail?: string;
  serviceNotes?: string;
  backOfficeProvider?: 'MODISOFT' | 'C_STORE';
  backOfficeUsername?: string;
  backOfficePassword?: string;
  defaultLoadRegGallons?: number;
  defaultLoadPremGallons?: number;
  defaultLoadDslGallons?: number;
  defaultLoadMidGallons?: number;
  capacityNotes?: string;
  tankTypePolicy?: 'PHYSICAL_ONLY' | 'ALLOW_VIRTUAL';
  virtualBlendRatio?: string;
}

export interface BackOfficeSyncResult {
  siteId: string;
  provider: 'MODISOFT' | 'C_STORE';
  status: 'QUEUED' | 'SUCCESS' | 'FAILED';
  startedAt: string;
  message: string;
  ticketId?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface UserProfile {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  notes?: string;
}

export interface Jobber {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  portal?: { url?: string; username?: string; password?: string };
  communication?: { preferredChannel?: 'EMAIL' | 'SMS' | 'CALL' | 'PORTAL'; notes?: string };
}

export interface ManagerContact {
  id: string;
  siteId: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  notifyCritical: AlertFrequency;
  notifyWarning: AlertFrequency;
  notifyInfo: AlertFrequency;
  notifyEmail?: boolean;
  notifySms?: boolean;
  notifyCall?: boolean;
}

export interface PageHeader {
  title: string;
  subtitle?: string;
  infoTooltip?: string;
}

export type PageHeaderKey =
  | 'dashboard'
  | 'alerts'
  | 'settings'
  | 'ordersList'
  | 'createOrder'
  | 'deliveries'
  | 'issues';

export type PageHeaders = Record<PageHeaderKey, PageHeader>;

export interface SalesSeriesPoint {
  timestamp: string;
  gallons: number;
  middle?: number;
  upper?: number;
  lower?: number;
}

export interface SalesSeriesEntry {
  gradeCode: string;
  points: SalesSeriesPoint[];
}

export interface SalesSeriesResponse {
  updatedAt?: string;
  windowDays: number;
  series: SalesSeriesEntry[];
}
