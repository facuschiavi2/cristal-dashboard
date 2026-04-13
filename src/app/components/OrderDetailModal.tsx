"use client";

import { useEffect, useState } from "react";
import { fetchJson, formatDate, formatDateInput, money, putJson } from "../lib";
import type { Client, Order, OrderDetail, OrderItem, Product } from "../types";
import styles from "../page.module.css";

type OrderItemDraft = { productId: string; quantity: string; price: string };

type Props = {
  orderId: number;
  onClose: () => void;
  onUpdated: () => void;
};

const PAYMENT_METHODS = [
  { value: "mercadopago", label: "Mercado Pago" },
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
];

export default function OrderDetailModal({ orderId, onClose, onUpdated }: Props) {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  // Edit fields
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [itemDrafts, setItemDrafts] = useState<OrderItemDraft[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchJson<OrderDetail>(`/orders/${orderId}`),
      fetchJson<Product[]>("/products"),
    ]).then(([d, productData]) => {
      setDetail(d);
      setProducts(productData);
      setOrderStatus(d.status || "");
      setPaymentMethod(d.payment_method || d.payment || "");
      setNotes(d.notes || "");
      setDeliveryAddress(d.delivery?.address || d.delivery_address || "");
      setScheduledDate(d.delivery?.scheduled_date || "");
      setScheduledTime(d.delivery?.scheduled_time || d.scheduled_time || "");
      setDeliveryFee(d.delivery?.delivery_fee != null ? String(d.delivery.delivery_fee) : d.delivery_fee != null ? String(d.delivery_fee) : "");
      setItemDrafts(
        d.items.map((item: OrderItem) => ({
          productId: String(item.product_id),
          quantity: String(item.quantity),
          price: String(item.unit_price),
        }))
      );
    }).catch(() => setError("No se pudo cargar el pedido"));
  }, [orderId]);

  function updateItem(index: number, next: Partial<OrderItemDraft>) {
    setItemDrafts((current) =>
      current.map((item, i) => {
        if (i !== index) return item;
        const product = products.find((p) => String(p.id) === (next.productId ?? item.productId));
        return {
          ...item,
          ...next,
          price: next.productId && product ? String(product.price) : next.price ?? item.price,
        };
      })
    );
  }

  async function handleSave() {
    if (!detail) return;
    setError("");
    setSaving(true);
    try {
      const items = itemDrafts
        .filter((d) => d.productId)
        .map((d) => ({
          product_id: Number(d.productId),
          quantity: Number(d.quantity),
          unit_price: Number(d.price),
        }));

      const payload: Record<string, unknown> = {
        payment_method: paymentMethod,
        status: orderStatus,
        notes,
        delivery: {
          address: deliveryAddress,
          scheduled_date: scheduledDate || null,
          scheduled_time: scheduledTime || null,
          delivery_fee: deliveryFee ? Number(deliveryFee) : 0,
        },
        items,
      };

      await putJson<OrderDetail>(`/orders/${orderId}`, payload);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!detail) return null;

  const total = itemDrafts.reduce((acc, d) => acc + Number(d.quantity || 0) * Number(d.price || 0), 0);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className={styles.modalHeader}>
          <h2>Editar Pedido #{detail.order_number || detail.id}</h2>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>

        {detail.client && (
          <div className={styles.infoCard} style={{ marginBottom: 12 }}>
            <h4>Cliente</h4>
            <p><strong>{detail.client.name}</strong> — {detail.client.phone}</p>
            <p>{detail.client.address || "Sin dirección"}</p>
          </div>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          <label className={styles.field}>
            Medio de pago
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="">Seleccionar</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            Estado del pedido
            <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmado</option>
              <option value="delivered">Entregado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </label>

          <div className={styles.sectionDivider} style={{ margin: "8px 0 6px" }}>Productos</div>

          {itemDrafts.map((draft, index) => (
            <div key={index} style={{ display: "grid", gridTemplateColumns: "1.6fr 0.7fr 0.8fr auto", gap: 8, alignItems: "end" }}>
              <label className={styles.field}>
                Producto
                <select value={draft.productId} onChange={(e) => updateItem(index, { productId: e.target.value })}>
                  <option value="">Seleccionar</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                Cantidad
                <input type="number" min="1" value={draft.quantity} onChange={(e) => updateItem(index, { quantity: e.target.value })} />
              </label>
              <label className={styles.field}>
                Precio
                <input type="number" min="0" value={draft.price} onChange={(e) => updateItem(index, { price: e.target.value })} />
              </label>
              <button className={styles.ghostButton} type="button" onClick={() => setItemDrafts((c) => c.filter((_, i) => i !== index))}>Quitar</button>
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button className={styles.secondaryButton} type="button" onClick={() => setItemDrafts((c) => [...c, { productId: "", quantity: "1", price: "" }])}>
              + Agregar producto
            </button>
            <div className={styles.summaryBox}>
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
          </div>

          <div className={styles.sectionDivider} style={{ margin: "8px 0 6px" }}>Entrega</div>

          <label className={styles.field}>
            Dirección
            <input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Dirección o 'Retiro en local'" />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.8fr", gap: 10 }}>
            <label className={styles.field}>
              Fecha
              <input type="date" value={formatDateInput(scheduledDate)} onChange={(e) => setScheduledDate(e.target.value)} />
            </label>
            <label className={styles.field}>
              Hora
              <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
            </label>
            <label className={styles.field}>
              Costo envío
              <input type="number" min="0" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} placeholder="0" />
            </label>
          </div>

          <label className={styles.field}>
            Notas
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        {error && <p style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</p>}
        {detail.payment_status === "paid" && (
          <p style={{ color: "#92400e", background: "#fef3c7", padding: "8px 12px", borderRadius: 8, fontSize: 13 }}>
            ⚠️ Si modificás productos, el pedido volverá a estado <strong>Pendiente</strong> de pago.
          </p>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className={styles.button} type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          <button className={styles.secondaryButton} type="button" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
