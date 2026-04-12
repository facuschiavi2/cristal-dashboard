"use client";

import { useEffect, useState } from "react";
import { DashboardShell, Panel } from "../components";
import { fetchJson, formatDate, money, postJson, putJson } from "../lib";
import type { Client, Complaint, Order, Product } from "../types";
import styles from "./page.module.css";

export default function ReclamosPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    clientId: "",
    orderId: "",
    productId: "",
    reason: "",
    title: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    try {
      const [complaintData, clientData, orderData, productData] = await Promise.all([
        fetchJson<Complaint[]>("/reclamos"),
        fetchJson<Client[]>("/clients"),
        fetchJson<Order[]>("/orders"),
        fetchJson<Product[]>("/products/simple"),
      ]);
      setComplaints(complaintData);
      setClients(clientData);
      setOrders(orderData);
      setProducts(productData);
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
    } catch {
      setOrderItems([]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
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

  async function resolveComplaint(id: number) {
    try {
      await putJson(`/reclamos/${id}`, { status: "resolved" });
      setNotice("Reclamo marcado como resuelto.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo resolver");
    }
  }

  async function investigateComplaint(id: number) {
    try {
      await putJson(`/reclamos/${id}`, { status: "investigating" });
      setNotice("Reclamo en investigación.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  }

  async function resetComplaint(id: number) {
    if (!confirm("¿Volver a abrir este reclamo?")) return;
    try {
      await putJson(`/reclamos/${id}`, { status: "open" });
      setNotice("Reclamo vuelto a abrir.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo resetting");
    }
  }

  return (
    <DashboardShell
      styles={styles}
      title="Reclamos"
      subtitle="Gestión de quejas y problemas de clientes."
      actions={
        <div style={{ display: "flex", gap: 20, fontSize: 14, alignItems: "center" }}>
          <span>Total: <strong>{complaints.length}</strong></span>
          <span>Abiertos: <strong style={{ color: "#f59e0b" }}>{complaints.filter((c) => c.status === "open").length}</strong></span>
          <span>En investigación: <strong style={{ color: "#3b82f6" }}>{complaints.filter((c) => c.status === "investigating").length}</strong></span>
          <span>Resueltos: <strong style={{ color: "#10b981" }}>{complaints.filter((c) => c.status === "resolved").length}</strong></span>
        </div>
      }
    >
      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.notice}>{notice}</div>}

      {/* Resumen */}
      <section className={styles.grid}>
        <Panel styles={styles} title="Resumen" description="Estado actual de reclamos.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {[
              { label: "Total", count: complaints.length, color: "#334155" },
              { label: "Abiertos", count: complaints.filter((c) => c.status === "open").length, color: "#f59e0b" },
              { label: "En investigación", count: complaints.filter((c) => c.status === "investigating").length, color: "#3b82f6" },
              { label: "Resueltos", count: complaints.filter((c) => c.status === "resolved").length, color: "#10b981" },
            ].map((s) => (
              <div key={s.label} className={styles.infoCard}>
                <h4>{s.label}</h4>
                <p style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.count}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* Form */}
      <Panel styles={styles} title="Nuevo reclamo" description="Completá los datos del problema.">
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
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
              Producto (opcional)
              <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                <option value="">Sin producto específico</option>
                {(form.orderId ? orderItems : products).map((p: any) => <option key={p.id || p.product_id} value={p.id || p.product_id}>{p.name || p.product_name}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              Motivo
              <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required>
                <option value="">Seleccionar motivo</option>
                <option value="Producto dañado">Producto dañado</option>
                <option value="Producto equivocado">Producto equivocado</option>
                <option value="Falta de stock">Falta de stock</option>
                <option value="Demora en entrega">Demora en entrega</option>
                <option value="Problema con el pago">Problema con el pago</option>
                <option value="Otro">Otro</option>
              </select>
            </label>
          </div>
          <label className={styles.field} style={{ marginTop: 12 }}>
            Descripción del problema
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Contá qué pasó..."
              rows={3}
            />
          </label>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button className={styles.button} type="submit">Registrar reclamo</button>
            <button className={styles.secondaryButton} type="button" onClick={() => { setForm({ clientId: "", orderId: "", productId: "", reason: "", title: "", description: "" }); setOrderItems([]); }}>Limpiar</button>
          </div>
        </form>
      </Panel>

      {/* Listado */}
      <Panel styles={styles} title="Reclamos registrados" description="Hacé click en una fila para ver los detalles.">
        {complaints.length === 0 ? (
          <div className={styles.empty}>No hay reclamos registrados.</div>
        ) : (
          <div className={styles.list}>
            {complaints.map((c) => (
              <div key={c.id}>
                <div
                  className={styles.row}
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                >
                  <span style={{ flex: 1, fontWeight: 600 }}>{c.reason}</span>
                  <span style={{ color: "#64748b", fontSize: 13 }}>{c.client_name || "Sin cliente"}</span>
                  <span style={{ color: "#64748b", fontSize: 13 }}>{formatDate(c.created_at)}</span>
                  <span className={`${styles.badge} ${c.status === "resolved" ? styles.badgeGreen : c.status === "investigating" ? styles.badgeBlue : styles.badgeAmber}`}>
                    {c.status === "open" ? "Abierto" : c.status === "investigating" ? "En investigación" : "Resuelto"}
                  </span>
                </div>
                {expandedId === c.id && (
                  <div className={styles.detail}>
                    {c.description && <p><strong>Descripción:</strong> {c.description}</p>}
                    {c.product_name && <p><strong>Producto:</strong> {c.product_name}</p>}
                    {c.order_number && <p><strong>Pedido:</strong> #{c.order_number}</p>}
                    {c.client_phone && <p><strong>Teléfono:</strong> {c.client_phone}</p>}
                    <div className={styles.detailActions}>
                      {c.status === "open" && (
                        <button className={styles.button} type="button" onClick={(e) => { e.stopPropagation(); investigateComplaint(c.id); }}>Investigar</button>
                      )}
                      {(c.status === "open" || c.status === "investigating") && (
                        <button className={styles.button} type="button" onClick={(e) => { e.stopPropagation(); resolveComplaint(c.id); }}>Resolver</button>
                      )}
                      {c.status === "resolved" && (
                        <button className={styles.ghostButton} type="button" onClick={(e) => { e.stopPropagation(); resetComplaint(c.id); }}>Volver a abrir</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </DashboardShell>
  );
}
