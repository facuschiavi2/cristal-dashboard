const fs = require("fs");
const f = "C:\\cristal-backend\\server.js";
let c = fs.readFileSync(f, "utf8");

const leadsEndpoints = `
// Convert lead → client
app.put("/api/leads/:id/convert", (req, res) => {
  const { id } = req.params;
  const lead = db.prepare("SELECT * FROM leads WHERE id=?").get(id);
  if (!lead) return res.status(404).json({ error: "Lead no encontrado" });
  try {
    const r = db.prepare("INSERT INTO clients (name,phone,location,address) VALUES (?,?,?,?)")
      .run(lead.name || "", lead.phone, lead.location || "", lead.address || "");
    db.prepare("UPDATE leads SET status='converted' WHERE id=?").run(id);
    res.json({ client_id: r.lastInsertRowid, name: lead.name, phone: lead.phone });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Discard lead
app.delete("/api/leads/:id", (req, res) => {
  const { id } = req.params;
  try {
    db.prepare("UPDATE leads SET status='discarded' WHERE id=?").run(id);
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
`;

// Find the reclamos section and insert before it
const insertIdx = c.indexOf("// ?'?'?'? RECLAMOS");
if (insertIdx === -1) {
  // Try alternate marker
  const idx2 = c.indexOf("RECLAMOS");
  if (idx2 !== -1) {
    c = c.slice(0, idx2) + leadsEndpoints + "\n\n" + c.slice(idx2);
  } else {
    console.log("Could not find insert point for leads endpoints");
    process.exit(1);
  }
} else {
  c = c.slice(0, insertIdx) + leadsEndpoints + "\n\n" + c.slice(insertIdx);
}

fs.writeFileSync(f, c, "utf8");
console.log("Done");
