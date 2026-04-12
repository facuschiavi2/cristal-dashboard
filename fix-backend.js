const fs = require("fs");
const f = "C:\\cristal-backend\\server.js";
let c = fs.readFileSync(f, "utf8");

// Find the problematic line - line 284 (0-indexed: 283) which is an empty string line followed by the RECLAMOS line
const lines = c.split("\n");
let fixed = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].length === 0 && i > 0 && lines[i+1] && lines[i+1].startsWith("// ") && lines[i+1].includes("RECLAMOS")) {
    // Skip the empty line and replace the garbled RECLAMOS comment
    fixed.push("");
    fixed.push("// RECLAMOS ───────────────────────────────────────────────────────────────");
    i++; // skip the next line (the garbled one)
  } else if (lines[i].startsWith("// ") && lines[i].includes("RECLAMOS") && lines[i].length > 50) {
    // Replace garbled with clean version
    fixed.push("// RECLAMOS ───────────────────────────────────────────────────────────────");
  } else {
    fixed.push(lines[i]);
  }
}

fs.writeFileSync(f, fixed.join("\n"), "utf8");
console.log("Done, lines:", fixed.length);
