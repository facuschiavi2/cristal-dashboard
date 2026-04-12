"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell, Panel, StatusBadge } from "../components";
import { fetchJson, formatDate, postJson, putJson } from "../lib";
import type { Client, Order } from "../types";
import styles from "../page.module.css";

const initialForm = { name: "", phone: "", location: "", address: "", notes: "", email: "", lat: "", lng: "" };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [clientData, orderData] = await Promise.all([
        fetchJson<Client[]>("/clients"),
        fetchJson<Order[]>("/orders"),
      ]);
      setClients(clientData);
      setOrders(orderData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar clientes");
    }
  };

  useEffect(() => { load(); }, []);

  const selectedClientOrders = useMemo(
    () => orders.filter((order) => order.client_id === selectedClientId),
    [orders, selectedClientId],
  );

  function openEdit(client: Client) {
    setEditingId(client.id);
    setForm({
      name: client.name,
      phone: client.phone,
      location: client.location || "",
      address: client.address || "",
      notes: client.notes || "",
      email: client.email || "",
      lat: client.lat != null ? String(client.lat) : "",
      lng: client.lng != null ? String(client.lng) : "",
    });
  }

  function closeEdit() {
    setEditingId(null);
    setForm(initialForm);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      if (editingId !== null) {
        await putJson<Client>(`/clients/${editingId}`, {
          name: form.name,
          phone: form.phone,
          location: form.location,
          address: form.address,
          notes: form.notes,
          email: form.email,
          lat: form.lat ? Number(form.lat) : undefined,
          lng: form.lng ? Number(form.lng) : undefined,
        });
        setNotice("Cliente actualizado.");
        closeEdit();
      } else {
        await postJson<Client>("/clients", {
          name: form.name,
          phone: form.phone,
          location: form.location,
          address: form.address,
          notes: form.notes,
        });
        setForm(initialForm);
        setNotice("Cliente creado correctamente.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando cliente");
    }
  }

  return (
    <DashboardShell
      styles={styles}
      title="Clientes"
      subtitle="Base de clientes, alta rápida y acceso al historial de pedidos."
      actions={
        <>
          <span>Clientes registrados</span>
          <strong>{clients.length}</strong>
          <span className={styles.helperText}>Click en una fila para ver historial</span>
        </>
      }
    >
      {notice && <div className={styles.notice}>{notice}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.grid}>
        <Panel
          styles={styles}
          title={editingId !== null ? "Editar cliente" : "Agregar cliente"}
          description="Alta manual para nuevas ventas o seguimiento."
        >
          <form className={styles.formGrid} onSubmit={handleSubmit}>
            <label className={styles.field}>
              Nombre
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className={styles.field}>
              Teléfono
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </label>
            <label className={styles.field}>
              Email
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className={styles.field}>
              Ubicación
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ciudad / Barrio" />
            </label>
            <label className={`${styles.field} ${styles.fullWidth}`}>
              Dirección
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>
            <label className={styles.field}>
              Latitud
              <input type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
            </label>
            <label className={styles.field}>
              Longitud
              <input type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
            </label>
            <label className={`${styles.field} ${styles.fullWidth}`}>
              Notas
              <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
            <div className={`${styles.fullWidth} ${styles.actionRow}`}>
              <button className={styles.button} type="submit">{editingId !== null ? "Actualizar cliente" : "Guardar cliente"}</button>
              {editingId !== null && (
                <button className={styles.secondaryButton} type="button" onClick={closeEdit}>Cancelar</button>
              )}
            </div>
          </form>
        </Panel>

        <Panel
          styles={styles}
          title={selectedClientId ? "Historial del cliente" : "Seleccioná un cliente"}
          description={selectedClientId ? "Pedidos asociados al cliente elegido." : "Elegí una fila de la tabla para ver compras anteriores."}
        >
          {!selectedClientId ? (
            <div className={styles.empty}>Todavía no seleccionaste ningún cliente.</div>
          ) : selectedClientOrders.length === 0 ? (
            <div className={styles.empty}>Este cliente todavía no tiene pedidos cargados.</div>
          ) : (
            <div className={styles.cardList}>
              {selectedClientOrders.map((order) => (
                <article key={order.id} className={styles.infoCard}>
                  <h4>{order.items}</h4>
                  <p>Total: {order.total}</p>
                  <p>Fecha: {formatDate(order.created_at)}</p>
                  <StatusBadge styles={styles} status={order.status} />
                </article>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <Panel styles={styles} title="Listado de clientes" description="Datos básicos, contacto y fecha de alta.">
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Ubicación</th>
                <th>Dirección</th>
                <th>Alta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className={styles.tableRowInteractive}
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <td>{client.name}</td>
                  <td>{client.phone}</td>
                  <td>{client.email || "—"}</td>
                  <td>{client.location || "—"}</td>
                  <td>{client.address || "—"}</td>
                  <td>{formatDate(client.created_at)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className={styles.secondaryButton} type="button" onClick={() => openEdit(client)}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </DashboardShell>
  );
}
