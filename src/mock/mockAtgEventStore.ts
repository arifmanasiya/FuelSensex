import type { AtgEvent, AtgEventType, AtgInventoryEvent, AtgDeliveryEvent, AtgAlarmEvent } from '../models/atgEvents';
import type { Site, Tank } from '../models/types';

const store: AtgEvent[] = [];

export function seedAtgEventsForLast30Days(sites: Site[], tanks: Tank[]) {
  if (store.length) return;
  const now = Date.now();
  const hours = 24 * 30;
  sites.forEach((site) => {
    const siteTanks = tanks.filter((t) => t.siteId === site.id && !t.isVirtual);
    siteTanks.forEach((tank) => {
      let currentVol = Math.max(tank.currentVolumeGallons ?? tank.capacityGallons * 0.6, tank.capacityGallons * 0.4);
      const capacity = tank.capacityGallons || 10000;
      for (let h = hours; h >= 0; h--) {
        const ts = new Date(now - h * 60 * 60 * 1000).toISOString();
        // occasional delivery every ~5-7 days
        if (Math.random() < 0.0025) {
          const delivered = capacity * (0.3 + Math.random() * 0.4);
          const startVol = currentVol;
          currentVol = Math.min(capacity, currentVol + delivered);
          const endVol = currentVol;
          const delivery: AtgDeliveryEvent = {
            id: `del-${site.id}-${tank.id}-${h}`,
            siteId: site.id,
            tankId: tank.id,
            timestamp: ts,
            type: 'DELIVERY',
            source: 'ATG',
            productCode: tank.productType,
            startTime: new Date(Date.parse(ts) - 30 * 60 * 1000).toISOString(),
            endTime: ts,
            startVolumeGallons: startVol,
            endVolumeGallons: endVol,
            deliveredVolumeGallons: endVol - startVol,
          };
          store.push(delivery);
        } else {
          // sales drawdown
          const draw = capacity * (0.002 + Math.random() * 0.004);
          currentVol = Math.max(0, currentVol - draw);
        }
        const water = Math.random() < 0.01 ? Math.random() * 2.5 : Math.random() * 0.2;
        const tempF = 55 + Math.random() * 20;
        const fillPercent = (currentVol / capacity) * 100;
        const inv: AtgInventoryEvent = {
          id: `inv-${site.id}-${tank.id}-${h}`,
          siteId: site.id,
          tankId: tank.id,
          timestamp: ts,
          type: 'INVENTORY',
          source: 'ATG',
          productCode: tank.productType,
          status: { deliveryInProgress: false, leakTestInProgress: false, invalidHeightAlarm: false },
          volumeGallons: currentVol,
          ullageGallons: Math.max(0, capacity - currentVol),
          waterHeightInches: water,
          temperatureF: tempF,
          fillPercent,
        };
        store.push(inv);
        // occasional alarm on high water
        if (water > 1.5 && Math.random() < 0.3) {
          const alarm: AtgAlarmEvent = {
            id: `alm-${site.id}-${tank.id}-${h}`,
            siteId: site.id,
            tankId: tank.id,
            timestamp: ts,
            type: 'ALARM',
            source: 'ATG',
            categoryCode: 'HW',
            typeNumber: 1,
            severity: 'ALARM',
            activeAt: ts,
            humanReadable: `High water in ${tank.name}`,
          };
          store.push(alarm);
        }
      }
    });
  });
  store.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

export function getAtgEvents(params: {
  siteId: string;
  tankId?: string;
  from?: string;
  to?: string;
  type?: AtgEventType;
  limit?: number;
  offset?: number;
}): { events: AtgEvent[]; total: number; nextOffset?: number } {
  const { siteId, tankId, from, to, type, limit = 200, offset = 0 } = params;
  let events = store.filter((e) => e.siteId === siteId);
  if (tankId) events = events.filter((e) => e.tankId === tankId);
  if (type) events = events.filter((e) => e.type === type);
  if (from) {
    const f = Date.parse(from);
    events = events.filter((e) => Date.parse(e.timestamp) >= f);
  }
  if (to) {
    const t = Date.parse(to);
    events = events.filter((e) => Date.parse(e.timestamp) <= t);
  }
  const total = events.length;
  const slice = events.slice(offset, offset + limit);
  const nextOffset = offset + limit < total ? offset + limit : undefined;
  return { events: slice, total, nextOffset };
}

export function latestInventoryByTank(siteId: string) {
  const map = new Map<string, AtgInventoryEvent>();
  const events = store.filter((e) => e.siteId === siteId && e.type === 'INVENTORY') as AtgInventoryEvent[];
  events.forEach((e) => {
    const prev = map.get(e.tankId || '');
    if (!prev || Date.parse(e.timestamp) > Date.parse(prev.timestamp)) {
      map.set(e.tankId || '', e);
    }
  });
  return map;
}

export function alarmsForSite(siteId: string) {
  return store.filter((e) => e.siteId === siteId && e.type === 'ALARM') as AtgAlarmEvent[];
}

export function deliveriesForSite(siteId: string) {
  return store.filter((e) => e.siteId === siteId && e.type === 'DELIVERY') as AtgDeliveryEvent[];
}
