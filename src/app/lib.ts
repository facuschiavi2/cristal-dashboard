import type { Client, Order, Product } from "./types";

const API = "https://cristal-pg-production.up.railway.app/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export async function fetchJson<T>(path: string): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API}${path}`, {
    cache: "no-store",
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    if (typeof window !== "undefined") window.location.reload();
    throw new Error("Sesión expirada");
  }

  if (!response.ok) {
    throw new Error(`Error cargando ${path}`);
  }

  return response.json();
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    if (typeof window !== "undefined") window.location.reload();
    throw new Error("Sesión expirada");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Error enviando ${path}`);
  }

  return response.json();
}

export async function putJson<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    if (typeof window !== "undefined") window.location.reload();
    throw new Error("Sesión expirada");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Error actualizando ${path}`);
  }

  return response.json();
}

export async function deleteJson<T>(path: string): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API}${path}`, {
    method: "DELETE",
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    if (typeof window !== "undefined") window.location.reload();
    throw new Error("Sesión expirada");
  }

  if (!response.ok) {
    throw new Error(`Error eliminando ${path}`);
  }

  return response.json();
}

export function money(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}
