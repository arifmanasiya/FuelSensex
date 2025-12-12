export const qk = {
  sites: ['sites'] as const,
  site: (id: string) => ['sites', id] as const,
  siteTanks: (id: string) => ['sites', id, 'tanks'] as const,
  liveStatus: (id: string) => ['sites', id, 'live-status'] as const,
  orders: (siteId?: string) => ['orders', { siteId }] as const,
  jobbers: ['jobbers'] as const,
  settings: ['settings'] as const,
  tickets: (siteId?: string) => ['tickets', { siteId }] as const,
  ticket: (id: string) => ['tickets', id] as const,
};
