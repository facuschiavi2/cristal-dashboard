"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "./components";
import { fetchJson, postJson, money } from "./lib";
import type { DashboardSummary, User } from "./types";
import styles from "./page.module.css";

export default function HomePage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchJson<User>("/auth/me")
        .then(() => {
          setLoggedIn(true);
          setChecking(false);
        })
        .catch(() => {
          localStorage.removeItem("token");
          setChecking(false);
        });
    } else {
      setChecking(false);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    try {
      const data = await postJson<{ token: string; user: User }>("/auth/login", {
        username,
        password,
      });
      localStorage.setItem("token", data.token);
      setLoggedIn(true);
    } catch {
      setLoginError("Usuario o contraseña incorrectos");
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    window.location.reload();
  }

  if (checking) return null;

  if (!loggedIn) {
    return (
      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          <div className={styles.loginLogo}>
            <h1>🏊 Cristal Piscinas</h1>
            <p>Ingresá tu usuario y contraseña</p>
          </div>
          {loginError && <div className={styles.loginError}>{loginError}</div>}
          <form onSubmit={handleLogin}>
            <div className={styles.loginField}>
              <label>Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className={styles.loginField}>
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button className={styles.loginButton} type="submit">
              Iniciar sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <ResumenPage onLogout={handleLogout} />;
}

function ResumenPage({ onLogout }: { onLogout: () => void }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetchJson<DashboardSummary>("/dashboard/summary"),
      fetchJson<User>("/auth/me"),
    ])
      .then(([data, userData]) => {
        setSummary(data);
        setUser(userData);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error cargando datos")
      );
  }, []);
  return
  (
    <DashboardShell
      styles={styles}
      title="Resumen"
      subtitle="Resumen operativo del día"
      actions={
        <>
          <span>Pedidos hoy</span>
          <strong>{summary ? summary.ordersToday : "—"}</strong>
          <span className={styles.helperText}>Panel de comando</span>
        </>
      }
    >
      {error ? <div className={styles.error}>{error}</div> : null}

      {summary && (
        <>
          <section className={styles.dashboardGrid}>
            <article className={styles.dashboardCard}>
              <h3>📦 Pedidos</h3>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Total</span>
                <span className={styles.metricValue}>
                  {summary.ordersPending +
                    summary.ordersDelivered +
                    summary.ordersCancelled}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Nuevos hoy</span>
                <span className={`${styles.metricValue} ${styles.highlight}`}>
                  {summary.ordersToday}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Este mes</span>
                <span className={styles.metricValue}>{summary.ordersMonth}</span>
              </div>
            </article>

            <article className={styles.dashboardCard}>
              <h3>🏷️ Estados</h3>
              <div className={styles.metric}>
                <span className={styles.statusDot} style={{ background: "#f59e0b" }} />
                <span className={styles.metricLabel}>Pendientes</span>
                <span className={styles.metricValue}>{summary.ordersPending}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.statusDot} style={{ background: "#22c55e" }} />
                <span className={styles.metricLabel}>Entregados</span>
                <span className={styles.metricValue}>{summary.ordersDelivered}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.statusDot} style={{ background: "#ef4444" }} />
                <span className={styles.metricLabel}>Cancelados</span>
                <span className={styles.metricValue}>{summary.ordersCancelled}</span>
              </div>
            </article>

            <article className={styles.dashboardCard}>
              <h3>💰 Revenue</h3>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Hoy</span>
                <span className={`${styles.metricValue} ${styles.currency}`}>
                  {money(summary.revenueToday)}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Este mes</span>
                <span className={`${styles.metricValue} ${styles.currency}`}>
                  {money(summary.revenueMonth)}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Total</span>
                <span className={`${styles.metricValue} ${styles.currency}`}>
                  {money(summary.revenueTotal)}
                </span>
              </div>
            </article>
                        <article className={styles.dashboardCard}>
              <h3>⚙️ Operación</h3>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Entregas pendientes</span>
                <span className={styles.metricValue}>{summary.pendingDeliveries}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Leads sin atender</span>
                <span className={`${styles.metricValue} ${styles.highlight}`}>
                  {
                    summary.pendingLeads}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Reclamos abiertos</span>
                <span className={`${styles.metricValue} ${styles.highlight}`}>
                  {summary.openReclamos}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Stock bajo</span>
                <span className={`${styles.metricValue} ${styles.highlight}`}>
                  {summary.lowStock}
                </span>
              </div>
            </article>

            <article className={styles.dashboardCard}>
              <h3>👥 Clientes</h3>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Total</span>
                <span className={styles.metricValue}>{summary.totalClients}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Nuevos este mes</span>
                <span className={`${styles.metricValue} ${styles.highlight}`}>
                  {summary.newClientsThisMonth}
                </span>
              </div>
            </article>

            <article className={styles.dashboardCard}>
              <h3>🎟️ Ticket promedio</h3>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Promedio</span>
                <span className={`${styles.metricValue} ${styles.currency}`}>
                  {money(summary.averageOrderValue)}
                </span>
              </div>
            </article>
          </section>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button className={styles.logoutButton} onClick={onLogout}>
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
