import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, getSiteDetails, getVariance, getSalesSeries, getRunoutPredictions, getServiceTickets, post, put } from './apiClient';
import { qk } from './queryKeys';
import type { Site, Tank, Order, Jobber, Ticket } from '../models/types';
import type { Alert, PageHeaders, RunoutPrediction, ServiceCompany, DeliveryRecord, ManagerContact, SiteSettings } from '../types';

type LiveStatus = {
  site: Site;
  tanks: Tank[];
  runout: RunoutPrediction[];
  alerts: Alert[];
};

export function usePageHeaders() {
  return useQuery({ queryKey: qk.pageHeaders, queryFn: () => get<PageHeaders>('/api/content/page-headers') });
}

export function useSites() {
  return useQuery({ queryKey: qk.sites, queryFn: () => get<Site[]>('/api/sites') });
}

export function useSite(id: string) {
  return useQuery({ queryKey: qk.site(id), queryFn: () => get<Site>(`/api/sites/${id}`), enabled: !!id });
}

export function useSiteTanks(id: string) {
  return useQuery({
    queryKey: qk.siteTanks(id),
    queryFn: () => get<Tank[]>(`/api/sites/${id}/tanks`),
    enabled: !!id,
  });
}

export function useUpdateTank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      siteId,
      tankId,
      data,
    }: {
      siteId: string;
      tankId: string;
      data: Partial<Pick<Tank, 'capacityGallons' | 'alertThresholds' | 'targetFillGallons'>>;
    }) => put<Tank>(`/api/sites/${siteId}/tanks/${tankId}`, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.siteTanks(data.siteId) });
      qc.invalidateQueries({ queryKey: qk.site(data.siteId) });
      qc.invalidateQueries({ queryKey: qk.liveStatus(data.siteId) });
    },
  });
}

export function useLiveStatus(id: string) {
  return useQuery({
    queryKey: qk.liveStatus(id),
    queryFn: () => get<LiveStatus>(`/api/sites/${id}/live-status`),
    enabled: !!id,
  });
}

export function useOrders(siteId?: string) {
  return useQuery({
    queryKey: qk.orders(siteId),
    queryFn: () => get<Order[]>(`/api/orders${siteId ? `?siteId=${siteId}` : ''}`),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { siteId: string; jobberId: string; lines: { tankId: string; quantityGallonsRequested: number }[] }) =>
      post<Order>('/api/orders', payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.orders(variables.siteId) });
      qc.invalidateQueries({ queryKey: qk.site(variables.siteId) });
      qc.invalidateQueries({ queryKey: qk.siteTanks(variables.siteId) });
    },
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Order> }) => put<Order>(`/api/orders/${id}`, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.orders(data.siteId) });
      qc.invalidateQueries({ queryKey: qk.site(data.siteId) });
      qc.invalidateQueries({ queryKey: qk.siteTanks(data.siteId) });
      qc.invalidateQueries({ queryKey: qk.liveStatus(data.siteId) });
    },
  });
}

export function useOrderAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      data,
    }: { id: string; action: 'confirm' | 'dispatch' | 'deliver' | 'cancel'; data?: Record<string, unknown> }) =>
      post<Order>(`/api/orders/${id}/${action}`, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.orders(data.siteId) });
      qc.invalidateQueries({ queryKey: qk.site(data.siteId) });
      qc.invalidateQueries({ queryKey: qk.siteTanks(data.siteId) });
      qc.invalidateQueries({ queryKey: qk.liveStatus(data.siteId) });
    },
  });
}

export function useSyncBackoffice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (siteId: string) => post(`/api/sites/${siteId}/sync-backoffice`),
    onSuccess: (_d, siteId) => {
      qc.invalidateQueries({ queryKey: qk.site(siteId) });
      qc.invalidateQueries({ queryKey: qk.liveStatus(siteId) });
    },
  });
}

export function useJobbers() {
  return useQuery({ queryKey: qk.jobbers, queryFn: () => get<Jobber[]>('/api/jobbers') });
}

export function useUpdateJobber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Jobber> }) => put<Jobber>(`/api/jobbers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.jobbers }),
  });
}

export function useSettings() {
  return useQuery({ queryKey: qk.settings, queryFn: () => get<SiteSettings[]>('/api/settings') });
}

export function useAlerts(siteId?: string) {
  return useQuery({
    queryKey: qk.alerts(siteId),
    queryFn: () => get<Alert[]>(`/api/sites/${siteId}/alerts`),
    enabled: !!siteId,
  });
}

export function useTickets(siteId?: string) {
  return useQuery({
    queryKey: qk.tickets(siteId),
    queryFn: () => get<Ticket[]>(`/api/tickets${siteId ? `?siteId=${siteId}` : ''}`),
  });
}

export function useTicket(id?: string) {
  return useQuery({ queryKey: id ? qk.ticket(id) : ['tickets', 'none'], queryFn: () => get<Ticket>(`/api/tickets/${id}`), enabled: !!id });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Ticket) => post<Ticket>('/api/tickets', payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.tickets(variables.siteId) });
      if (variables.orderId) {
        qc.invalidateQueries({ queryKey: qk.orders(variables.siteId) });
      }
    },
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Ticket> }) => put<Ticket>(`/api/tickets/${id}`, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.ticket(data.id) });
      qc.invalidateQueries({ queryKey: qk.tickets(data.siteId) });
    },
  });
}

export function useAddTicketComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      post<Ticket>(`/api/tickets/${id}/comments`, { text }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.ticket(data.id) });
      qc.invalidateQueries({ queryKey: qk.tickets(data.siteId) });
    },
  });
}

export function useServiceCompanies(siteId?: string) {
  return useQuery({
    queryKey: qk.serviceCompanies(siteId),
    queryFn: () => get<ServiceCompany[]>(`/api/sites/${siteId}/service-companies`),
    enabled: !!siteId,
  });
}

export function useUpdateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { isOpen: boolean; note?: string } }) =>
      put<Alert>(`/api/alerts/${id}`, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.alerts(data.siteId) });
    },
  });
}

export function useSiteSettings(siteId: string) {
  return useQuery({
    queryKey: qk.siteSettings(siteId),
    queryFn: () => get<SiteSettings>(`/api/sites/${siteId}/settings`),
    enabled: !!siteId,
  });
}

export function useDeliveries(siteId?: string) {
  return useQuery({
    queryKey: qk.deliveries(siteId),
    queryFn: () => get<DeliveryRecord[]>(`/api/sites/${siteId}/deliveries`),
    enabled: !!siteId,
  });
}

export function useContacts(siteId?: string) {
  return useQuery({
    queryKey: qk.contacts(siteId),
    queryFn: () => get<ManagerContact[]>(`/sites/${siteId}/contacts`),
    enabled: !!siteId,
  });
}

export function useUpdateSiteSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ siteId, data }: { siteId: string; data: Partial<SiteSettings> }) =>
      put<SiteSettings>(`/api/sites/${siteId}/settings`, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.siteSettings(data.siteId as string) });
      qc.invalidateQueries({ queryKey: qk.settings });
    },
  });
}

export function useSiteDetails(siteId: string) {
  return useQuery({
    queryKey: qk.siteDetails(siteId),
    queryFn: () => getSiteDetails(siteId),
    enabled: !!siteId,
  });
}

export function useVariance(siteId: string) {
  return useQuery({
    queryKey: qk.variance(siteId),
    queryFn: () => getVariance(siteId),
    enabled: !!siteId,
  });
}

export function useSalesSeries(siteId: string) {
  return useQuery({
    queryKey: qk.salesSeries(siteId),
    queryFn: () => getSalesSeries(siteId),
    enabled: !!siteId,
  });
}

export function useRunoutPredictions(siteId: string) {
  return useQuery({
    queryKey: qk.runoutPredictions(siteId),
    queryFn: () => getRunoutPredictions(siteId),
    enabled: !!siteId,
  });
}

export function useServiceTickets(siteId: string) {
  return useQuery({
    queryKey: qk.serviceTickets(siteId),
    queryFn: () => getServiceTickets(siteId),
    enabled: !!siteId,
  });
}
