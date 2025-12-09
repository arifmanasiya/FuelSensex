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
  | 'ATG_POS_MISMATCH';

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
  status: 'OK' | 'SHORT' | 'CHECK';
  preDeliveryGallons?: number;
  expectedReadingGallons?: number;
  issueNote?: string;
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
  serviceCompanyId?: string;
  serviceContactName?: string;
  servicePhone?: string;
  serviceEmail?: string;
  serviceNotes?: string;
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
