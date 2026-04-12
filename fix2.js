const fs = require("fs");
const f = "C:\\cristal-backend\\server.js";
const c = fs.readFileSync(f, "utf8");

// Find line 285 and replace it entirely
const lines = c.split("\n");
console.log("Line 284:", JSON.stringify(lines[283]));
console.log("Line 285:", JSON.stringify(lines[284]));
console.log("Line 286:", JSON.stringify(lines[285]));

// Replace lines 284-285 (0-indexed: 283-284) - the empty line + garbled comment
lines[283] = "";
lines[284] = "// RECLAMOS ───────────────────────────────────────────────────────────────";

const cleaned = lines.join("\n");
// Remove trailing empty line if created
const final = cleaned.endsWith("\n") ? cleaned.slice(0, -1) : cleaned;
fs.writeFileSync(f, final, "utf8");
console.log("Fixed. Total lines:", lines.length);
