const fs = require("fs");
const f = "C:\\Users\\general\\cristal-dashboard\\src\\app\\page.tsx";
let c = fs.readFileSync(f, "utf8");

// Find and replace the leads table section
const startMarker = `rows={leads.map((l) => [`;
const startIdx = c.indexOf(startMarker);
if (startIdx === -1) {
  console.log("Could not find leads map start");
  process.exit(1);
}

const endMarker = `empty="No hay leads registrados." />`;
const endIdx = c.indexOf(endMarker, startIdx);
if (endIdx === -1) {
  console.log("Could not find leads table end");
  process.exit(1);
}

const newLeadsSection = `rows={leads.map((l) => (
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

const replaceEnd = endIdx + endMarker.length;
c = c.slice(0, startIdx) + newLeadsSection + c.slice(replaceEnd);

fs.writeFileSync(f, c, "utf8");
console.log("Leads table updated");
