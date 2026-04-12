const fs = require("fs");
const f = "C:\\Users\\general\\cristal-dashboard\\src\\app\\page.tsx";
let c = fs.readFileSync(f, "utf8");

const newFunctions = `

  const convertLead = async (lead: Lead) => {
    if (!confirm("Convertir este lead a cliente?")) return;
    try {
      setSaving(true);
      const res = await fetch(\`\${API}/leads/\${lead.id}/convert\`, { method: "PUT" });
      if (!res.ok) throw new Error("No pude convertir el lead");
      await loadAll();
      showMessage("Lead convertido a cliente.");
    } catch (err) { setError(err instanceof Error ? err.message : "Error convirtiendo lead"); }
    finally { setSaving(false); }
  };

  const discardLead = async (lead: Lead) => {
    if (!confirm("Descartar este lead?")) return;
    try {
      setSaving(true);
      const res = await fetch(\`\${API}/leads/\${lead.id}\`, { method: "DELETE" });
      if (!res.ok) throw new Error("No pude descartar el lead");
      await loadAll();
      showMessage("Lead descartado.");
    } catch (err) { setError(err instanceof Error ? err.message : "Error descartando lead"); }
    finally { setSaving(false); }
  };
`;

const insertAfter = "showMessage(\"Lead registrado.\");";
c = c.replace(insertAfter + "\n    } catch", insertAfter + "\n    } catch");

const idx = c.indexOf("  const createReclamo = async");
c = c.slice(0, idx) + newFunctions + "\n" + c.slice(idx);

fs.writeFileSync(f, c, "utf8");
console.log("Functions added");
