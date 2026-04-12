const fs = require("fs");
const f = "C:\\Users\\general\\cristal-dashboard\\src\\app\\page.tsx";
let c = fs.readFileSync(f, "utf8");

const badStart = `rows={leads.map((l) => (
                      <tr key={l.id}>
                        <td>{new Date(l.created_at).toLocaleDateString("es-AR")}</td>
                        <td>{l.name || "-"}</td>
                        <td>{l.phone}</td>
                        <td>{l.products_interested || "-"}</td>
                        <td><span className={\`\${styles.badge} \${l.status === "new" ? styles.badge_pending : l.status === "contacted" ? styles.badge_confirmed : l.status === "converted" ? styles.badge_delivered : l.status === "discarded" ? styles.badge_cancelled : styles.badge_pending}\`}>{l.status}</span></td>
                        <td>
                          {l.status !== "converted" && l.status !== "discarded" && (
                            <div className={styles.actionRow}>
                              <button className={styles.convertButton} onClick={() => convertLead(l)} disabled={saving}>Cliente</button>
                              <button className={styles.discardButton} onClick={() => discardLead(l)} disabled={saving}>Descartar</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))} empty="No hay leads registrados." />`;

const goodStart = `rows={leads.map((l) => [
                      new Date(l.created_at).toLocaleDateString("es-AR"),
                      l.name || "-",
                      l.phone,
                      l.products_interested || "-",
                      l.status,
                      l.status !== "converted" && l.status !== "discarded"
                        ? <div className={styles.actionRow}>
                            <button className={styles.convertButton} onClick={() => convertLead(l)} disabled={saving}>Cliente</button>
                            <button className={styles.discardButton} onClick={() => discardLead(l)} disabled={saving}>Descartar</button>
                          </div>
                        : l.status,
                    ])} empty="No hay leads registrados." />`;

c = c.replace(badStart, goodStart);
fs.writeFileSync(f, c, "utf8");
console.log("Fixed");
