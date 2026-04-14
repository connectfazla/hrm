import { apiFetch } from './api';

export type Role = 'ADMIN' | 'EMPLOYEE';

export type SessionUser = {
  userId: string;
  role: Role;
  employeeId?: string | null;
  email?: string;
  fullName?: string | null;
  profilePhotoDocumentId?: string | null;
};

export async function login(email: string, password: string) {
  return apiFetch<{ user: SessionUser }>('/auth/login', { method: 'POST', json: { email, password } });
}

export async function refresh() {
  return apiFetch<{ user: SessionUser | null }>('/auth/refresh', { method: 'POST', json: {} });
}

export async function logout() {
  return apiFetch<{ ok: true }>('/auth/logout', { method: 'POST', json: {} });
}

export async function forgotPassword(email: string) {
  return apiFetch<{ ok: true }>('/auth/forgot-password', { method: 'POST', json: { email } });
}

export async function resetPassword(token: string, newPassword: string) {
  return apiFetch<{ ok: true }>('/auth/reset-password', { method: 'POST', json: { token, newPassword } });
}

