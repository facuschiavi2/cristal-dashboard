const fs = require("fs");
const f = "C:\\cristal-backend\\server.js";
const c = fs.readFileSync(f, "utf8");

// Line 285 (1-indexed: 285, 0-indexed: 284) is the garbled RECLAMOS line
const lines = c.split("\n");
lines[284] = "// RECLAMOS ───────────────────────────────────────────────────────────────";

fs.writeFileSync(f, lines.join("\n"), "utf8");
console.log("Fixed");
