"use client";

import { useEffect, useState } from "react";
import { DashboardShell, Panel } from "../components";
import { deleteJson, fetchJson, formatDate, postJson, putJson } from "../lib";
import type { Client, Lead } from "../types";
import styles from "../page.module.css";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await fetchJson<Lead[]>("/leads");
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar leads");
    }
  };

  useEffect(() => { load(); }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await postJson<Lead>("/leads", form);
      setForm({ name: "", phone: "", address: "" });
      setNotice("Lead creado correctamente.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear lead");
    }
  }

  async function moveToClient(lead: Lead) {
    try {
      await postJson<Client>("/clients", {
        name: lead.name,
        phone: lead.phone,
        address: lead.address || "Lead convertido",
      });
      await putJson<Lead>(`/leads/${lead.id}/convert`, {});
      setNotice(`Lead ${lead.name || lead.phone} convertido a cliente.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo convertir el lead");
    }
  }

  async function discardLead(leadId: number) {
    if (!confirm("¿Descartar este lead?")) return;
    try {
      await deleteJson(`/leads/${leadId}`);
      setNotice("Lead descartado.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descartar lead");
    }
  }

  async function contactLead(lead: Lead) {
    try {
      await putJson(`/leads/${lead.id}`, { status: "contacted" });
      setNotice(`Lead ${lead.name || lead.phone} marcado como contactado.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  }

  async function resetLead(lead: Lead) {
    if (!confirm("¿Volver a marcar como nuevo?")) return;
    try {
      await putJson(`/leads/${lead.id}`, { status: "new" });
      setNotice("Lead vuelto a nuevo.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  }

  return (
    <DashboardShell
      styles={styles}
      title="Leads"
      subtitle="Captura simple de prospectos y conversión directa a cliente cuando avanza la venta."
      actions={
        <div style={{ display: "flex", gap: 20, fontSize: 14, alignItems: "center" }}>
          <span>Nuevos: <strong style={{ color: "#f59e0b" }}>{leads.filter((l) => l.status === "new").length}</strong></span>
          <span>Contactados: <strong style={{ color: "#3b82f6" }}>{leads.filter((l) => l.status === "contacted").length}</strong></span>
          <span>Clientes: <strong style={{ color: "#10b981" }}>{leads.filter((l) => l.status === "converted").length}</strong></span>
          <span>Descartados: <strong style={{ color: "#94a3b8" }}>{leads.filter((l) => l.status === "discarded").length}</strong></span>
        </div>
      }
    >
      {notice && <div className={styles.notice}>{notice}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.grid}>
        <Panel styles={styles} title="Nuevo prospecto" description="Registrá nombre, teléfono y dirección del lead.">
          <form className={styles.formGrid} onSubmit={handleSubmit}>
            <label className={styles.field}>
              Nombre
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className={styles.field}>
              Teléfono
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </label>
            <label className={`${styles.field} ${styles.fullWidth}`}>
              Dirección
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Dirección del lead" />
            </label>
            <button className={styles.button} type="submit" style={{ gridColumn: "1 / -1" }}>Guardar lead</button>
          </form>
        </Panel>

        <Panel styles={styles} title="Resumen" description="Seguimiento de pipeline de prospectos.">
          <div className={styles.cardList} style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <article className={styles.infoCard}>
              <h4>Total leads</h4>
              <p style={{ fontSize: 24, fontWeight: 700 }}>{leads.length}</p>
            </article>
            <article className={styles.infoCard}>
              <h4>Nuevos</h4>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>{leads.filter((l) => l.status === "new").length}</p>
            </article>
            <article className={styles.infoCard}>
              <h4>Contactados</h4>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6" }}>{leads.filter((l) => l.status === "contacted").length}</p>
            </article>
            <article className={styles.infoCard}>
              <h4>Convertidos</h4>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}>{leads.filter((l) => l.status === "converted").length}</p>
            </article>
            <article className={styles.infoCard}>
              <h4>Descartados</h4>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#94a3b8" }}>{leads.filter((l) => l.status === "discarded").length}</p>
            </article>
          </div>
        </Panel>
      </section>

      <Panel styles={styles} title="Listado de leads" description="Prospectos capturados.">
        {leads.length === 0 ? (
          <div className={styles.empty}>Todavía no hay leads cargados.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>WhatsApp</th>
                  <th>Dirección</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.name}</td>
                    <td>
                      <a
                        href={`https://wa.me/${lead.phone.replace(/\+/g,"").replace(/ /g,"")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.whatsappLink}
                      >
                        {lead.phone}
                      </a>
                    </td>
                    <td>{lead.address || "—"}</td>
                    <td>{formatDate(lead.created_at)}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${lead.status === "converted" || lead.status === "descartado" ? styles.statusCancelled : lead.status === "contacted" ? styles.statusConfirmed : styles.statusPending}`}>
                        {lead.status === "new" ? "Nuevo" : lead.status === "contacted" ? "Contactado" : lead.status === "converted" ? "Cliente" : "Descartado"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        {lead.status === "new" && (
                          <button className={styles.secondaryButton} type="button" onClick={() => contactLead(lead)}>Contactar</button>
                        )}
                        {(lead.status === "new" || lead.status === "contacted") && (
                          <button className={styles.primaryButton} type="button" onClick={() => moveToClient(lead)}>Cliente</button>
                        )}
                        {lead.status === "contacted" && (
                          <button className={styles.ghostButton} type="button" onClick={() => discardLead(lead.id)}>Descartar</button>
                        )}
                        {(lead.status === "contacted" || lead.status === "converted" || lead.status === "discarded") && (
                          <button className={styles.ghostButton} type="button" onClick={() => resetLead(lead)}>Volver a nuevo</button>
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
    </DashboardShell>
  );
}
