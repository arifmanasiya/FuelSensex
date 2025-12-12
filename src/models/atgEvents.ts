export type AtgEventType = 'INVENTORY' | 'DELIVERY' | 'ALARM';

export interface AtgEventBase {
  id: string;
  siteId: string;
  tankId: string | null;
  timestamp: string;
  type: AtgEventType;
  source: 'ATG';
  note?: string;
  rawMessage?: string;
}

export interface AtgInventoryEvent extends AtgEventBase {
  type: 'INVENTORY';
  productCode?: string;
  status: {
    deliveryInProgress: boolean;
    leakTestInProgress: boolean;
    invalidHeightAlarm: boolean;
  };
  volumeGallons: number;
  tcVolumeGallons?: number;
  ullageGallons?: number;
  productHeightInches?: number;
  waterHeightInches?: number;
  temperatureF?: number;
  fillPercent?: number;
}

export interface AtgDeliveryEvent extends AtgEventBase {
  type: 'DELIVERY';
  productCode?: string;
  startTime: string;
  endTime: string;
  startVolumeGallons: number;
  startTcVolumeGallons?: number;
  startWaterHeightInches?: number;
  startTemperatureF?: number;
  startHeightInches?: number;
  endVolumeGallons: number;
  endTcVolumeGallons?: number;
  endWaterHeightInches?: number;
  endTemperatureF?: number;
  endHeightInches?: number;
  deliveredVolumeGallons: number;
  linkedOrderId?: string;
  deliveryInProgressFlagAtStart?: boolean;
}

export type AtgAlarmSeverity = 'ALARM' | 'WARNING';

export interface AtgAlarmEvent extends AtgEventBase {
  type: 'ALARM';
  categoryCode: string;
  sensorCategory?: number;
  typeNumber: number;
  tankOrSensorNumber?: number;
  severity: AtgAlarmSeverity;
  activeAt: string;
  clearedAt?: string;
  humanReadable: string;
}

export type AtgEvent = AtgInventoryEvent | AtgDeliveryEvent | AtgAlarmEvent;
