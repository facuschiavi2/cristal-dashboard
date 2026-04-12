"use client";

import { useEffect, useState } from "react";
import { DashboardShell, Panel } from "../components";
import { postJson } from "../lib";
import type { User } from "../types";
import styles from "../page.module.css";

export default function UsersPage() {
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ username: "", password: "", role: "operator" as "admin" | "operator" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
    })
      .then((r) => r.json())
      .then((data: User) => setUser(data))
      .catch(() => setError("No se pudo cargar usuario"));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await postJson("/auth/register", {
        username: form.username,
        password: form.password,
        role: form.role,
      });
      setNotice("Usuario creado correctamente.");
      setForm({ username: "", password: "", role: "operator" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear usuario");
    }
  }

  if (user?.role !== "admin") {
    return (
      <DashboardShell
        styles={styles}
        title="Usuarios"
        subtitle="Gestión de usuarios del sistema."
        actions={<span className={styles.helperText}>Solo administradores pueden acceder</span>}
      >
        <div className={styles.error}>No tenés permisos para ver esta sección.</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      styles={styles}
      title="Usuarios"
      subtitle="Gestión de usuarios del sistema."
      actions={<span className={styles.helperText}>Panel de administración</span>}
    >
      {notice && <div className={styles.notice}>{notice}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.grid}>
        <Panel styles={styles} title="Usuario actual" description="Tu sesión activa.">
          <div className={styles.infoCard}>
            <h4>{user.username}</h4>
            <p>Rol: <strong style={{ textTransform: "capitalize" }}>{user.role}</strong></p>
          </div>
        </Panel>

        <Panel styles={styles} title="Crear nuevo usuario" description="Registrá un nuevo operador o administrador.">
          <form className={styles.formGrid} onSubmit={handleSubmit}>
            <label className={styles.field}>
              Usuario
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </label>
            <label className={styles.field}>
              Contraseña
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </label>
            <label className={styles.field}>
              Rol
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "operator" })}>
                <option value="operator">Operador</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
            <button className={styles.button} type="submit" style={{ gridColumn: "1 / -1" }}>Crear usuario</button>
          </form>
        </Panel>
      </section>
    </DashboardShell>
  );
}
