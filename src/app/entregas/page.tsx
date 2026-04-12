"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell, Panel, StatusBadge } from "../components";
import { fetchJson, findClient, formatDate, money, putJson } from "../lib";
import type { Client, Order } from "../types";
import OrderDetailModal from "../components/OrderDetailModal";
import styles from "./page.module.css";

type FilterMode = "today" | "week" | "month" | "custom";

function matchesFilter(dateStr: string | null | undefined, mode: FilterMode, from?: string, to?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  if (mode === "today") return d.toDateString() === now.toDateString();
  if (mode === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return d >= start;
  }
  if (mode === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (mode === "custom") {
    if (!from && !to) return true;
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to + "T23:59:59") : null;
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  }
  return true;
}

export default function EntregasPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("today");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchJson<Client[]>("/clients"), fetchJson<Order[]>("/orders")])
      .then(([clientData, orderData]) => {
        setClients(clientData);
        setOrders(orderData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"));
  }, []);

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status === "pending"),
    [orders],
  );

  const deliveredOrders = useMemo(
    () => orders.filter((order) => order.status === "delivered" && matchesFilter((order as any).delivered_date, filterMode, dateFrom, dateTo)),
    [orders, filterMode, dateFrom, dateTo],
  );

  async function markDelivered(id: number) {
    try {
      await putJson(`/orders/${id}`, { status: "delivered" });
      await fetchJson<Order[]>("/orders").then(setOrders);
    } catch {
      setError("No se pudo marcar como entregado");
    }
  }

  const filterLabel = filterMode === "today" ? "Hoy" : filterMode === "week" ? "Esta semana" : filterMode === "month" ? "Este mes" : `${dateFrom || "..."} → ${dateTo || "..."}`;

  return (
    <DashboardShell
      styles={styles}
      title="Entregas"
      subtitle="Pedidos pendientes listos para logística."
      actions={<><span>Pendientes</span><strong>{pendingOrders.length}</strong></>}
    >
      {error ? <div style={{ padding: 12, color: "red" }}>{error}</div> : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 16 }}>
        {(["today", "week", "month"] as FilterMode[]).map((m) => (
          <button
            key={m}
            className={filterMode === m ? styles.activeFilter : styles.filterButton}
            onClick={() => { setFilterMode(m); setDateFrom(""); setDateTo(""); }}
          >
            {m === "today" ? "Hoy" : m === "week" ? "Esta semana" : "Este mes"}
          </button>
        ))}
        <button
          className={filterMode === "custom" ? styles.activeFilter : styles.filterButton}
          onClick={() => setFilterMode("custom")}
        >
          Rango personalizado
        </button>
        {filterMode === "custom" && (
          <>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={styles.dateInput} />
            <span>→</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={styles.dateInput} />
          </>
        )}
      </div>

      <section className={styles.grid}>
        <Panel styles={styles} title="Para entregar" description="Hacé click o usá el botón directo.">
          {pendingOrders.length === 0 ? (
            <div className={styles.empty}>No hay pedidos pendientes.</div>
          ) : (
            <div className={styles.cardList}>
              {pendingOrders.map((order) => {
                const client = findClient(clients, order);
                return (
                  <article key={order.id} className={styles.infoCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setSelectedOrderId(order.id)}>
                        <h4>{order.client_name}</h4>
                        <p>Dirección: {(order as any).delivery_address || client?.address || "Dirección a confirmar"}</p>
                        <p>Teléfono: {client?.phone || "Sin teléfono"}</p>
                        <p>Total: {money(order.total)}</p>
                        {order.scheduled_time && <p>Hora: {order.scheduled_time}</p>}
                        <p>Pago: {order.payment || order.payment_method}</p>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                        <StatusBadge styles={styles} status={order.status} />
                        <button className={styles.button} type="button" onClick={() => markDelivered(order.id)}>Marcar entregado</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel styles={styles} title={`Entregados — ${filterLabel}`} description="Pedidos entregados del período.">
          {deliveredOrders.length === 0 ? (
            <div className={styles.empty}>No hay entregas en este período.</div>
          ) : (
            <div className={styles.cardList}>
              {deliveredOrders.map((order) => (
                <article key={order.id} className={styles.infoCard} style={{ cursor: "pointer" }} onClick={() => setSelectedOrderId(order.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h4>{order.client_name}</h4>
                      <p>Total: {money(order.total)}</p>
                      <p>Entregado: {formatDate((order as any).delivered_date || order.created_at)}</p>
                    </div>
                    <StatusBadge styles={styles} status="delivered" />
                  </div>
                </article>
              ))}
            </div>
          )}
        </Panel>
      </section>

      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onUpdated={() => { fetchJson<Order[]>("/orders").then(setOrders); }}
        />
      )}
    </DashboardShell>
  );
}
