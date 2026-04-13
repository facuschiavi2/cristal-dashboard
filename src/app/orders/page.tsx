"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell, Panel, StatusBadge } from "../components";
import OrderDetailModal from "../components/OrderDetailModal";
import { fetchJson, formatDate, formatDateInput, money, postJson, putJson, deleteJson } from "../lib";
import type { Client, Order, OrderDetail, OrderItem, Product } from "../types";
import styles from "../page.module.css";

type OrderDraft = { productId: string; quantity: string; price: string };

const PAYMENT_METHODS = [
  { value: "mercadopago", label: "Mercado Pago" },
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
];

export default function OrdersPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drafts, setDrafts] = useState<OrderDraft[]>([{ productId: "", quantity: "1", price: "" }]);
  const [clientId, setClientId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transferencia");
  const [notes, setNotes] = useState("");
  const [filterMode, setFilterMode] = useState<"today"|"week"|"month"|"custom">("today");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updatePayment, setUpdatePayment] = useState("");

  const load = async () => {
    try {
      const [clientData, productData, orderData] = await Promise.all([
        fetchJson<Client[]>("/clients"),
        fetchJson<Product[]>("/products"),
        fetchJson<Order[]>("/orders"),
      ]);
      setClients(clientData);
      setProducts(productData);
      setOrders(orderData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar pedidos");
    }
  };

  useEffect(() => { load(); }, []);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((order) => {
      const d = new Date(order.created_at);
      if (filterMode === "today") return d.toDateString() === now.toDateString();
      if (filterMode === "week") { const start = new Date(now); start.setDate(now.getDate() - now.getDay()); return d >= start; }
      if (filterMode === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (filterMode === "custom") {
        if (!dateFrom && !dateTo) return true;
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
        return true;
      }
      return true;
    });
  }, [orders, filterMode, dateFrom, dateTo]);

  const total = useMemo(() => {
    return drafts.reduce((acc, draft) => acc + Number(draft.quantity || 0) * Number(draft.price || 0), 0);
  }, [drafts]);

  function updateDraft(index: number, next: Partial<OrderDraft>) {
    setDrafts((current) =>
      current.map((draft, currentIndex) => {
        if (currentIndex !== index) return draft;
        const product = products.find((item) => String(item.id) === (next.productId ?? draft.productId));
        return {
          ...draft,
          ...next,
          price: next.productId && product ? String(product.price) : next.price ?? draft.price,
        };
      }),
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await postJson<Order>("/orders", {
        client_id: Number(clientId),
        payment_method: paymentMethod,
        notes,
        delivery_address: deliveryAddress,
        delivery_fee: deliveryFee ? Number(deliveryFee) : undefined,
        scheduled_date: scheduledDate || undefined,
        scheduled_time: scheduledTime || undefined,
        items: drafts
          .filter((draft) => draft.productId)
          .map((draft) => ({
            product_id: Number(draft.productId),
            quantity: Number(draft.quantity),
            unit_price: Number(draft.price),
          })),
      });
      setDrafts([{ productId: "", quantity: "1", price: "" }]);
      setClientId("");
      setPaymentMethod("transferencia");
      setNotes("");
      setDeliveryAddress("");
      setDeliveryFee("");
      setScheduledDate("");
      setScheduledTime("");
      setNotice("Pedido creado correctamente.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el pedido");
    }
  }

  async function deleteOrder(id: number) {
    if (!confirm("Eliminar este pedido?")) return;
    try {
      await deleteJson(`/orders/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  }

  async function markPaid(id: number) {
    try {
      await putJson(`/orders/${id}`, { payment_status: "paid" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo marcar como pagado");
    }
  }

  async function cancelOrder(id: number) {
    if (!confirm("¿Cancelar este pedido? No se puede deshacer.")) return;
    try {
      await putJson(`/orders/${id}`, { status: "cancelled", payment_status: "pending" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar");
    }
  }

  async function openDetail(order: Order) {
    try {
      const detail = await fetchJson<OrderDetail>(`/orders/${order.id}`);
      setSelectedOrder(detail);
      setUpdateStatus(detail.status);
      setUpdatePayment(detail.payment || detail.payment_method || "");
    } catch {
      setError("No se pudo cargar detalle del pedido");
    }
  }

  async function saveStatusUpdate() {
    if (!selectedOrder) return;
    try {
      await putJson<Order>(`/orders/${selectedOrder.id}`, {
        status: updateStatus,
        payment: updatePayment,
      });
      setNotice("Pedido actualizado.");
      await load();
      setSelectedOrder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  }

  async function markDelivered(orderId: number) {
    try {
      await putJson<Order>(`/orders/${orderId}`, { status: "delivered" });
      setNotice("Pedido marcado como entregado.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  }

  function statusColor(s: string) {
    const m: Record<string, string> = { pending: "#f59e0b", confirmed: "#3b82f6", delivered: "#22c55e", cancelled: "#ef4444" };
    return m[s.toLowerCase()] || "#64748b";
  }

  return (
    <DashboardShell
      styles={styles}
      title="Pedidos"
      subtitle="Creación manual de pedidos y seguimiento del estado de cobro o entrega."
      actions={
        <>
          <span>Pedidos registrados</span>
          <strong>{orders.length}</strong>
          <span className={styles.helperText}>Click en una fila para ver detalle</span>
        </>
      }
    >
      {notice && <div className={styles.notice}>{notice}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.grid}>
        <Panel styles={styles} title="Nuevo pedido" description="Elegí cliente, agregá productos y definí el medio de pago.">
          <form className={styles.formGrid} onSubmit={handleSubmit}>
            <label className={styles.field}>
              Cliente
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                <option value="">Seleccionar cliente</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              Medio de pago
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>

            <div className={`${styles.fullWidth} ${styles.orderItems}`}>
              {drafts.map((draft, index) => (
                <div key={index} className={styles.orderItemRow}>
                  <label className={styles.field}>
                    Producto
                    <select value={draft.productId} onChange={(e) => updateDraft(index, { productId: e.target.value })}>
                      <option value="">Seleccionar</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                  <label className={styles.field}>
                    Cantidad
                    <input type="number" min="1" value={draft.quantity} onChange={(e) => updateDraft(index, { quantity: e.target.value })} />
                  </label>
                  <label className={styles.field}>
                    Precio
                    <input type="number" min="0" value={draft.price} onChange={(e) => updateDraft(index, { price: e.target.value })} />
                  </label>
                  <button className={styles.ghostButton} type="button" onClick={() => setDrafts((current) => current.filter((_, i) => i !== index))}>Quitar</button>
                </div>
              ))}
            </div>

            <div className={`${styles.fullWidth} ${styles.actionRow}`}>
              <button className={styles.secondaryButton} type="button" onClick={() => setDrafts((current) => [...current, { productId: "", quantity: "1", price: "" }])}>Agregar producto</button>
              <div className={styles.summaryBox}>
                <span>Total estimado</span>
                <strong>{money(total)}</strong>
              </div>
            </div>

            <div className={styles.sectionDivider} style={{ gridColumn: "1 / -1" }}>Entrega</div>

            <label className={`${styles.field} ${styles.fullWidth}`}>
              Dirección de entrega
              <input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Dirección o 'Retiro en local'" />
            </label>
            <label className={styles.field}>
              Fecha programada
              <input type="date" value={formatDateInput(scheduledDate)} onChange={(e) => setScheduledDate(e.target.value)} />
            </label>
            <label className={styles.field}>
              Hora programada
              <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
            </label>
            <label className={styles.field}>
              Costo de envío
              <input type="number" min="0" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} placeholder="0" />
            </label>

            <label className={`${styles.field} ${styles.fullWidth}`}>
              Notas
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            <button className={styles.button} type="submit" style={{ gridColumn: "1 / -1" }}>Crear pedido</button>
          </form>
        </Panel>

        <Panel styles={styles} title="Resumen" description="Atajos para operación diaria.">
          <div className={styles.cardList}>
            {["pending", "confirmed", "delivered", "cancelled"].map((s) => (
              <article key={s} className={styles.infoCard}>
                <h4 style={{ textTransform: "capitalize" }}>{s}</h4>
                <p>{orders.filter((o) => o.status === s).length} pedidos</p>
              </article>
            ))}
          </div>
        </Panel>
      </section>

      <Panel styles={styles} title="Listado de pedidos" description="Tabla de ventas con estado, fecha y forma de pago.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 16 }}>
          {(["today","week","month"] as const).map((m) => (
            <button key={m} className={filterMode === m ? styles.activeFilter : styles.filterButton} onClick={() => { setFilterMode(m); setDateFrom(""); setDateTo(""); }}>
              {m === "today" ? "Hoy" : m === "week" ? "Esta semana" : "Este mes"}
            </button>
          ))}
          <button className={filterMode === "custom" ? styles.activeFilter : styles.filterButton} onClick={() => setFilterMode("custom")}>Rango personalizado</button>
          {filterMode === "custom" && <><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={styles.dateInput} /><span>→</span><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={styles.dateInput} /></>}
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>N°</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Pago</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className={styles.tableRowInteractive} onClick={() => openDetail(order)}>
                  <td>{order.order_number || order.id}</td>
                  <td>{order.client_name}</td>
                  <td>{money(order.total)}</td>
                  <td>
                    <StatusBadge styles={styles} status={order.payment_status || "pending"} label={order.payment_status === "paid" ? "Pagado" : "Pendiente"} />
                  </td>
                  <td><StatusBadge styles={styles} status={order.status} /></td>
                  <td>{formatDate(order.created_at)}</td>
                  <td onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className={styles.ghostButton} type="button" onClick={() => openDetail(order)}>Editar</button>
                    {order.status !== "cancelled" && order.payment_status !== "paid" && (
                      <button className={styles.primaryButton} type="button" onClick={() => markPaid(order.id)}>Marcar pagado</button>
                    )}
                    {order.status !== "cancelled" && order.status === "pending" && (
                      <button className={styles.secondaryButton} type="button" onClick={() => markDelivered(order.id)}>Marcar entregado</button>
                    )}
                    {order.status !== "cancelled" && order.payment_status !== "paid" && order.status !== "delivered" && (
                      <button className={styles.dangerButton} type="button" onClick={() => cancelOrder(order.id)}>Cancelar</button>
                    )}
                    <button className={styles.deleteButton} type="button" onClick={() => deleteOrder(order.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {selectedOrder && (
        <OrderDetailModal
          orderId={selectedOrder.id}
          onClose={() => setSelectedOrder(null)}
          onUpdated={load}
        />
      )}
    </DashboardShell>
  );
}
