export type PageHeaderKey =
  | 'dashboard'
  | 'alerts'
  | 'settings'
  | 'ordersList'
  | 'createOrder'
  | 'deliveries'
  | 'issues';

type HeaderConfig = {
  title: string;
  subtitle?: string;
  infoTooltip?: string;
};

export const pageHeaderConfig: Record<PageHeaderKey, HeaderConfig> = {
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
