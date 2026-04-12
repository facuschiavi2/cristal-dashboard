"use client";

import { useEffect, useState } from "react";
import { DashboardShell, Panel } from "../components";
import { fetchJson, formatDate, postJson, putJson } from "../lib";
import type { Client, Complaint, Order, Product } from "../types";
import ComplaintDetailModal from "../components/ComplaintDetailModal";
import styles from "./page.module.css";

export default function ReclamosPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({ clientId: "", orderId: "", productId: "", reason: "", title: "", description: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    try {
      const [cd, cld, od, pd] = await Promise.all([
        fetchJson<Complaint[]>("/reclamos"),
        fetchJson<Client[]>("/clients"),
        fetchJson<Order[]>("/orders"),
        fetchJson<Product[]>("/products/simple"),
      ]);
      setComplaints(cd);
      setClients(cld);
      setOrders(od);
      setProducts(pd);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar");
    }
  };

  useEffect(() => { load(); }, []);

  const clientOrders = form.clientId
    ? orders.filter((o) => {
        const cid = Number(form.clientId);
        const client = clients.find((c) => c.id === cid);
        return o.client_id === cid || (client && o.client_name === client.name);
      })
    : [];

  async function loadOrderItems(orderId: number) {
    try {
      const items = await fetchJson<any[]>(`/orders/${orderId}/items`);
      setOrderItems(items);
    } catch { setOrderItems([]); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setNotice("");
    if (!form.reason) { setError("Motivo requerido"); return; }
    try {
      await postJson("/reclamos", {
        client_id: form.clientId ? Number(form.clientId) : undefined,
        order_id: form.orderId ? Number(form.orderId) : undefined,
        product_id: form.productId ? Number(form.productId) : undefined,
        reason: form.reason,
        title: form.title || form.reason,
        description: form.description,
      });
      setNotice("Reclamo registrado.");
      setForm({ clientId: "", orderId: "", productId: "", reason: "", title: "", description: "" });
      setOrderItems([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear");
    }
  }

  return (
    <DashboardShell
      styles={styles}
      title="Reclamos"
      subtitle="Gestión de quejas y problemas de clientes."
      actions={
        <div style={{ display: "flex", gap: 20, fontSize: 14 }}>
          <span>Total: <strong>{complaints.length}</strong></span>
          <span>Abiertos: <strong style={{ color: "#f59e0b" }}>{complaints.filter(c => c.status === "open").length}</strong></span>
          <span>Investigando: <strong style={{ color: "#3b82f6" }}>{complaints.filter(c => c.status === "investigating").length}</strong></span>
          <span>Resueltos: <strong style={{ color: "#10b981" }}>{complaints.filter(c => c.status === "resolved").length}</strong></span>
        </div>
      }
    >
      {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 16px", borderRadius: 8, marginBottom: 16 }}>{error}</div>}
      {notice && <div style={{ background: "#d1fae5", color: "#065f46", padding: "10px 16px", borderRadius: 8, marginBottom: 16 }}>{notice}</div>}

      {/* Nuevo reclamo + Resumen lado a lado */}
      <section className={styles.grid}>
        {/* Nuevo reclamo */}
        <Panel styles={styles} title="Nuevo reclamo" description="Completá los datos del problema.">
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
                Título del reclamo
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Cloro llegó abierto" required />
              </label>
              <label className={styles.field}>
                Cliente (opcional)
                <select value={form.clientId} onChange={(e) => { setForm({ ...form, clientId: e.target.value, orderId: "", productId: "" }); setOrderItems([]); }}>
                  <option value="">Sin cliente</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                Pedido (opcional)
                <select value={form.orderId} onChange={(e) => { setForm({ ...form, orderId: e.target.value, productId: "" }); if (e.target.value) loadOrderItems(Number(e.target.value)); else setOrderItems([]); }} disabled={!form.clientId}>
                  <option value="">Sin pedido</option>
                  {clientOrders.map((o) => <option key={o.id} value={o.id}>#{o.order_number || o.id} — {formatDate(o.created_at)}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                Motivo
                <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required>
                  <option value="">Seleccionar</option>
                  <option value="Producto dañado">Producto dañado</option>
                  <option value="Producto equivocado">Producto equivocado</option>
                  <option value="Falta de stock">Falta de stock</option>
                  <option value="Demora en entrega">Demora en entrega</option>
                  <option value="Problema con el pago">Problema con el pago</option>
                  <option value="Otro">Otro</option>
                </select>
              </label>
              <label className={styles.field}>
                Producto (opcional)
                <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                  <option value="">Sin producto</option>
                  {(form.orderId ? orderItems : products).map((p: any) => <option key={p.id || p.product_id} value={p.id || p.product_id}>{p.name || p.product_name}</option>)}
                </select>
              </label>
              <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
                Descripción
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Contá qué pasó..." rows={3} />
              </label>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button className={styles.button} type="submit">Registrar</button>
              <button className={styles.secondaryButton} type="button" onClick={() => { setForm({ clientId: "", orderId: "", productId: "", reason: "", title: "", description: "" }); setOrderItems([]); }}>Limpiar</button>
            </div>
          </form>
        </Panel>

        {/* Resumen */}
        <Panel styles={styles} title="Resumen" description="Estado actual de reclamos.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { label: "Total", count: complaints.length, color: "#334155" },
              { label: "Abiertos", count: complaints.filter(c => c.status === "open").length, color: "#f59e0b" },
              { label: "Investigando", count: complaints.filter(c => c.status === "investigating").length, color: "#3b82f6" },
              { label: "Resueltos", count: complaints.filter(c => c.status === "resolved").length, color: "#10b981" },
            ].map((s) => (
              <div key={s.label} className={styles.infoCard}>
                <h4>{s.label}</h4>
                <p style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.count}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* Tabla de reclamos */}
      <Panel styles={styles} title="Reclamos registrados" description="Hacé click en una fila para ver el detalle.">
        {complaints.length === 0 ? (
          <div className={styles.empty}>No hay reclamos registrados.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#64748b", fontSize: 13 }}>Título</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#64748b", fontSize: 13 }}>Cliente</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#64748b", fontSize: 13 }}>Fecha</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#64748b", fontSize: 13 }}>Estado</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "#64748b", fontSize: 13 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }} onClick={() => setSelectedId(c.id)}>
                    <td style={{ padding: "12px 12px", fontWeight: 600, color: "#1e293b" }}>{c.title || c.reason}</td>
                    <td style={{ padding: "12px 12px", color: "#64748b" }}>{c.client_name || "—"}</td>
                    <td style={{ padding: "12px 12px", color: "#64748b", fontSize: 13 }}>{formatDate(c.created_at)}</td>
                    <td style={{ padding: "12px 12px" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                        background: c.status === "resolved" ? "#d1fae5" : c.status === "investigating" ? "#dbeafe" : "#fef3c7",
                        color: c.status === "resolved" ? "#065f46" : c.status === "investigating" ? "#1e40af" : "#92400e",
                      }}>
                        {c.status === "open" ? "Abierto" : c.status === "investigating" ? "Investigando" : "Resuelto"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 12px" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {c.status !== "resolved" && (
                          <button className={styles.secondaryButton} type="button" style={{ fontSize: 12, padding: "4px 10px" }}
                            onClick={() => { putJson(`/reclamos/${c.id}`, { status: "investigating" }); load(); }}>Investigar</button>
                        )}
                        {(c.status === "open" || c.status === "investigating") && (
                          <button className={styles.button} type="button" style={{ fontSize: 12, padding: "4px 10px" }}
                            onClick={() => { putJson(`/reclamos/${c.id}`, { status: "resolved" }); load(); }}>Resolver</button>
                        )}
                        {c.status === "resolved" && (
                          <button className={styles.ghostButton} type="button" style={{ fontSize: 12, padding: "4px 10px" }}
                            onClick={() => { putJson(`/reclamos/${c.id}`, { status: "open" }); load(); }}>Reabrir</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {selectedId && (
        <ComplaintDetailModal
          complaintId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={load}
        />
      )}
    </DashboardShell>
  );
}
