import type { AtgEvent, AtgEventType, AtgInventoryEvent, AtgDeliveryEvent, AtgAlarmEvent } from '../models/atgEvents';
import type { Site, Tank } from '../models/types';

const store: AtgEvent[] = [];

// More realistic simulation constants
const REORDER_THRESHOLD_PERCENT = 0.25;
const DELIVERY_TRIGGER_PERCENT = 0.15;
const DAYS_TO_SIMULATE = 365;
const DELIVERY_COOLDOWN_HOURS = 24 * 3;
const LEAK_TEST_DURATION_HOURS = 3;
const LEAK_TEST_PROBABILITY_PER_HOUR = 0.0014;
const LEAK_TEST_COOLDOWN_HOURS = 48;
const INVALID_HEIGHT_DURATION_HOURS = 2;
const INVALID_HEIGHT_PROBABILITY_BASE = 0.001;
const INVALID_HEIGHT_POST_DELIVERY_BOOST = 0.003;
const INVALID_HEIGHT_COOLDOWN_HOURS = 24;
const TANK_TIMESTAMP_SPREAD_MS = 3 * 60 * 1000; // up to 3 minutes of jitter per scan window
const TANK_SCAN_INTERVAL_MS = 2 * 60 * 1000; // stagger scan order between tanks

// Diurnal sales pattern: heavier sales during morning/evening rush, lighter overnight
const salesMultiplierByHour: number[] = [
  0.1, 0.1, 0.1, 0.1, 0.2, 0.6, 0.9, 1.4, 1.7, 1.5, 1.2, 1.0, // 00:00 - 11:00
  1.1, 1.3, 1.5, 1.8, 2.0, 2.1, 1.8, 1.5, 1.1, 0.8, 0.4, 0.2, // 12:00 - 23:00
];

// Weekend/day modifiers to vary across week
const dayOfWeekMultiplier = [0.85, 1, 1, 1, 1, 1.1, 1.25];

const BASE_SALES_RATE = 0.00085;

function computeSalesDraw(capacity: number, hour: number, dayOfWeek: number) {
  const hourMultiplier = salesMultiplierByHour[hour] ?? 1;
  const dayMultiplier = dayOfWeekMultiplier[dayOfWeek] ?? 1;
  const noise = 0.9 + Math.random() * 0.2;
  const rate = (BASE_SALES_RATE + Math.random() * 0.0009) * hourMultiplier * dayMultiplier * noise;
  return capacity * rate;
}

export function seedAtgEventsForLast30Days(sites: Site[], tanks: Tank[]) {
  if (store.length > 0) return;

  const now = Date.now();
  const hoursToSimulate = 24 * DAYS_TO_SIMULATE;

  sites.forEach((site) => {
    const siteTanks = tanks.filter((t) => t.siteId === site.id && !t.isVirtual);
    if (siteTanks.length === 0) return;

    const currentVolumes: Record<string, number> = {};
    const recentlyDelivered: Record<string, number> = {};
    const lowFuelAlarmActive: Record<string, boolean> = {};
    const leakTestTimers: Record<string, number> = {};
    const leakTestCooldown: Record<string, number> = {};
    const invalidHeightTimers: Record<string, number> = {};
    const invalidHeightCooldown: Record<string, number> = {};

    // Initialize tank volumes
    siteTanks.forEach((t) => {
      const capacity = t.capacityGallons || 10000;
      currentVolumes[t.id] = capacity * (0.4 + Math.random() * 0.3); // Start with 40-70% full
    });

    for (let h = hoursToSimulate; h >= 0; h--) {
      const baseTimestamp = now - h * 60 * 60 * 1000;
      const currentHour = new Date(baseTimestamp).getHours();
      const dayOfWeek = new Date(baseTimestamp).getDay();

      // Decrement delivery cooldown timer
      Object.keys(recentlyDelivered).forEach((tankId) => {
        if (recentlyDelivered[tankId] > 0) {
          recentlyDelivered[tankId]--;
        }
      });
      
      for (const [tankIndex, tank] of siteTanks.entries()) {
        const capacity = tank.capacityGallons || 10000;
        let currentVol = currentVolumes[tank.id];

        if (leakTestTimers[tank.id] > 0) {
          leakTestTimers[tank.id]--;
        }
        if (leakTestCooldown[tank.id] > 0) {
          leakTestCooldown[tank.id]--;
        }
        if (invalidHeightTimers[tank.id] > 0) {
          invalidHeightTimers[tank.id]--;
        }
        if (invalidHeightCooldown[tank.id] > 0) {
          invalidHeightCooldown[tank.id]--;
        }

        // 1. Simulate Sales Drawdown
        const hourlySalesDraw = computeSalesDraw(capacity, currentHour, dayOfWeek);
        currentVol = Math.max(0, currentVol - hourlySalesDraw);

        const tankScanOffset = (tankIndex % siteTanks.length) * TANK_SCAN_INTERVAL_MS;
        const timestampMs = baseTimestamp + tankScanOffset + Math.floor(Math.random() * TANK_TIMESTAMP_SPREAD_MS);
        const timestamp = new Date(timestampMs).toISOString();

        // 2. Check for and trigger deliveries if needed
        if (currentVol / capacity < DELIVERY_TRIGGER_PERCENT && (!recentlyDelivered[tank.id] || recentlyDelivered[tank.id] <= 0)) {
          const startVol = currentVol;
          const deliveredQty = capacity * (0.6 + Math.random() * 0.2); // Refill to 75-95%
          const endVol = Math.min(capacity, startVol + deliveredQty);
          currentVol = endVol;
          
          const delivery: AtgDeliveryEvent = {
            id: `del-${site.id}-${tank.id}-${h}`,
            siteId: site.id,
            tankId: tank.id,
            timestamp,
            type: 'DELIVERY',
            source: 'ATG',
            productCode: tank.productType,
            startTime: new Date(Date.parse(timestamp) - (20 + Math.random() * 25) * 60 * 1000).toISOString(),
            endTime: timestamp,
            startVolumeGallons: startVol,
            endVolumeGallons: endVol,
            deliveredVolumeGallons: endVol - startVol,
          };
          store.push(delivery);
          recentlyDelivered[tank.id] = DELIVERY_COOLDOWN_HOURS; // Cooldown to prevent re-delivery
          lowFuelAlarmActive[tank.id] = false; // Reset low fuel alarm
        }

        const postDeliveryWindow = (recentlyDelivered[tank.id] ?? 0) > DELIVERY_COOLDOWN_HOURS - 6;
        if (leakTestTimers[tank.id] <= 0 && leakTestCooldown[tank.id] <= 0 && Math.random() < LEAK_TEST_PROBABILITY_PER_HOUR) {
          leakTestTimers[tank.id] = LEAK_TEST_DURATION_HOURS;
          leakTestCooldown[tank.id] = LEAK_TEST_COOLDOWN_HOURS;
          store.push({
            id: `alm-lt-${site.id}-${tank.id}-${h}`,
            siteId: site.id,
            tankId: tank.id,
            timestamp,
            type: 'ALARM',
            source: 'ATG',
            categoryCode: 'LT', // Leak Test
            typeNumber: 4,
            severity: 'WARNING',
            activeAt: timestamp,
            humanReadable: 'Leak Test in progress',
          } as AtgAlarmEvent);
        }

        // 3. Simulate Alarms
        // 3a. Water Alarm (higher chance after delivery)
        const isPostDelivery = (recentlyDelivered[tank.id] ?? 0) > DELIVERY_COOLDOWN_HOURS - 6; // 6 hours post-delivery
        const waterChance = isPostDelivery ? 0.15 : 0.01;
        const water = Math.random() < waterChance ? 1.5 + Math.random() * 1.5 : Math.random() * 0.2;

        if (water > 1.5) {
          store.push({
            id: `alm-hw-${site.id}-${tank.id}-${h}`,
            siteId: site.id,
            tankId: tank.id,
            timestamp,
            type: 'ALARM',
            source: 'ATG',
            categoryCode: 'HW', // High Water
            typeNumber: 1,
            severity: 'ALARM',
            activeAt: timestamp,
            humanReadable: 'High Water Alarm',
          } as AtgAlarmEvent);
        }

        const invalidHeightActive = invalidHeightTimers[tank.id] > 0;
        if (!invalidHeightActive && invalidHeightCooldown[tank.id] <= 0) {
          const invalidHeightChance =
            INVALID_HEIGHT_PROBABILITY_BASE + (postDeliveryWindow ? INVALID_HEIGHT_POST_DELIVERY_BOOST : 0);
          if (Math.random() < invalidHeightChance) {
            invalidHeightTimers[tank.id] = INVALID_HEIGHT_DURATION_HOURS;
            invalidHeightCooldown[tank.id] = INVALID_HEIGHT_COOLDOWN_HOURS;
            store.push({
              id: `alm-ih-${site.id}-${tank.id}-${h}`,
              siteId: site.id,
              tankId: tank.id,
              timestamp,
              type: 'ALARM',
              source: 'ATG',
              categoryCode: 'IH', // Invalid Height
              typeNumber: 6,
              severity: 'WARNING',
              activeAt: timestamp,
              humanReadable: 'Invalid Height Alarm',
            } as AtgAlarmEvent);
          }
        }

        // 3b. Low Inventory Alarm
        if (currentVol / capacity < REORDER_THRESHOLD_PERCENT && !lowFuelAlarmActive[tank.id]) {
          store.push({
            id: `alm-li-${site.id}-${tank.id}-${h}`,
            siteId: site.id,
            tankId: tank.id,
            timestamp,
            type: 'ALARM',
            source: 'ATG',
            categoryCode: 'L', // Low Inventory / Delivery Needed
            typeNumber: 2,
            severity: 'WARNING',
            activeAt: timestamp,
            humanReadable: 'Delivery Needed Warning',
          } as AtgAlarmEvent);
          lowFuelAlarmActive[tank.id] = true;
        } else if (currentVol / capacity > REORDER_THRESHOLD_PERCENT) {
          lowFuelAlarmActive[tank.id] = false;
        }

        // 3c. Potential Theft Alarm (very rare)
        if (Math.random() < 0.0001) {
          const theftAmount = capacity * (0.05 + Math.random() * 0.05);
          currentVol = Math.max(0, currentVol - theftAmount);
          store.push({
            id: `alm-th-${site.id}-${tank.id}-${h}`,
            siteId: site.id,
            tankId: tank.id,
            timestamp,
            type: 'ALARM',
            source: 'ATG',
            categoryCode: 'SL', // Sudden Loss
            typeNumber: 3,
            severity: 'ALARM',
            activeAt: timestamp,
            humanReadable: 'Sudden Loss Alarm',
          } as AtgAlarmEvent);
        }

        // 4. Create regular inventory event
        const inv: AtgInventoryEvent = {
          id: `inv-${site.id}-${tank.id}-${h}`,
          siteId: site.id,
          tankId: tank.id,
          timestamp,
          type: 'INVENTORY',
          source: 'ATG',
          productCode: tank.productType,
          status: {
            deliveryInProgress: false,
            leakTestInProgress: leakTestTimers[tank.id] > 0,
            invalidHeightAlarm: invalidHeightTimers[tank.id] > 0,
          },
          volumeGallons: currentVol,
          ullageGallons: Math.max(0, capacity - currentVol),
          waterHeightInches: water,
          temperatureF: 55 + Math.random() * 20, // Simple temp for now
          fillPercent: (currentVol / capacity) * 100,
        };
        store.push(inv);

        currentVolumes[tank.id] = currentVol;
      }
    }
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

export function findDeliveryById(id: string) {
  const evt = store.find((e) => e.id === id && e.type === 'DELIVERY') as AtgDeliveryEvent | undefined;
  return evt;
}
