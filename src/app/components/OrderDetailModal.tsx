"use client";

import { useEffect, useState } from "react";
import { fetchJson, formatDate, money, putJson } from "../lib";
import type { OrderDetail, OrderItem } from "../types";
import styles from "../page.module.css";

type Props = {
  orderId: number;
  onClose: () => void;
  onUpdated: () => void;
};

export default function OrderDetailModal({ orderId, onClose, onUpdated }: Props) {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchJson<OrderDetail>(`/orders/${orderId}`)
      .then((d) => {
        setDetail(d);
        setStatus(d.status || "");
        setPayment(d.payment_status || d.payment_method || "");
      })
      .catch(() => setError("No se pudo cargar el pedido"));
  }, [orderId]);

  if (!detail) return null;

  async function save() {
    try {
      await putJson(`/orders/${orderId}`, { status, payment_status: payment });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Pedido #{detail.order_number || detail.id}</h2>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>

        {detail.client && (
          <div className={styles.infoCard} style={{ marginBottom: 16 }}>
            <h4>Cliente</h4>
            <p><strong>{detail.client.name}</strong> — {detail.client.phone}</p>
            <p>{detail.client.address || "Sin dirección"}</p>
            {detail.client.email && <p>{detail.client.email}</p>}
          </div>
        )}

        <div className={styles.infoCard} style={{ marginBottom: 16 }}>
          <h4>Items</h4>
          {detail.items.map((item: OrderItem, i: number) => (
            <p key={i}>{item.quantity}x {item.product_name} ({money(item.unit_price)} c/u) — {money(item.unit_price * item.quantity)}</p>
          ))}
          <p style={{ marginTop: 8 }}><strong>Total: {money(detail.total)}</strong></p>
        </div>

        {detail.delivery && (
          <div className={styles.infoCard} style={{ marginBottom: 16 }}>
            <h4>Entrega</h4>
            {detail.delivery.address && <p>Dirección: {detail.delivery.address}</p>}
            {detail.delivery.scheduled_date && <p>Fecha: {formatDate(detail.delivery.scheduled_date)} {detail.delivery.scheduled_time || ""}</p>}
            {detail.delivery.delivery_fee != null && <p>Envío: {money(detail.delivery.delivery_fee)}</p>}
            {detail.delivery.notes && <p>Notas: {detail.delivery.notes}</p>}
            <p>Estado: <span style={{ textTransform: "capitalize" }}>{detail.delivery.status}</span></p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <label className={styles.field}>
            Estado
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmado</option>
              <option value="delivered">Entregado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </label>
          <label className={styles.field}>
            Pago
            <select value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
            </select>
          </label>
        </div>

        {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8 }}>
          <button className={styles.button} type="button" onClick={save}>Guardar cambios</button>
          <button className={styles.secondaryButton} type="button" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
