import type { Ticket } from '../models/types';
import { mockRequest } from './mockServer';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown
): Promise<T> {
  return mockRequest<T>(method, path, body);
}

export function get<T>(path: string): Promise<T> {
  return request<T>('GET', path);
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body);
}

export function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PUT', path, body);
}

export function del<T>(path: string): Promise<T> {
  return request<T>('DELETE', path);
}

export function getPageHeaders<T>(): Promise<T> {
  return get<T>('/api/content/page-headers');
}

export function getAlerts<T>(siteId?: string): Promise<T> {
  return get<T>(`/api/alerts${siteId ? `?siteId=${siteId}` : ''}`);
}

export function updateAlert<T>(alertId: string, payload: { isOpen: boolean; note?: string }): Promise<T> {
  return put<T>(`/api/alerts/${alertId}`, payload);
}

export function getSiteSettings<T>(siteId: string): Promise<T> {
  return get<T>(`/api/sites/${siteId}/settings`);
}

export function getDeliveries<T>(siteId?: string): Promise<T> {
  return get<T>(`/api/deliveries${siteId ? `?siteId=${siteId}` : ''}`);
}

export function getContacts<T>(siteId?: string): Promise<T> {
  return get<T>(`/api/contacts${siteId ? `?siteId=${siteId}` : ''}`);
}

export function updateSiteSettings<T>(siteId: string, payload: unknown): Promise<T> {
  return put<T>(`/api/sites/${siteId}/settings`, payload);
}

export function getSiteDetails<T>(siteId: string): Promise<T> {
  return get<T>(`/api/sites/${siteId}`);
}

export function getVariance<T>(siteId: string): Promise<T> {
  return get<T>(`/api/sites/${siteId}/variance`);
}

export function getSalesSeries<T>(siteId: string): Promise<T> {
  return get<T>(`/api/sites/${siteId}/sales-series`);
}

export function getRunoutPredictions<T>(siteId: string): Promise<T> {
  return get<T>(`/api/sites/${siteId}/runout`);
}

export function getServiceCompanies<T>(siteId?: string): Promise<T> {
  return get<T>(`/api/sites/${siteId}/service-companies`);
}

export function getServiceTickets(siteId?: string): Promise<Ticket[]> {
  return get<Ticket[]>(`/api/sites/${siteId}/service-tickets`);
}