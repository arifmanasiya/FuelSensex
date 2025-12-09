import { mockRequest } from './mockServer';

type HttpMethod = 'GET' | 'POST' | 'PUT';

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
