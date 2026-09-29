const fs = require("fs");
let code = fs.readFileSync("src/core/horse/insightMetrics.ts", "utf8");
if (!code.includes("export function buildRealCareerInsightRow")) {
  console.log("NOT FOUND");
}
