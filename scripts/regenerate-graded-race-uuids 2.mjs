#!/usr/bin/env node

/**
 * regenerate-graded-race-uuids.mjs
 *
 * This script regenerates all UUIDs in gradedRaces.ts using cryptographically secure methods.
 * It replaces the insecure Math.random() based generator with imports from the new centralized utility.
 */

import fs from "fs";
import crypto from "crypto";

// Read the gradedRaces.ts file
const filePath = "./src/core/data/gradedRaces.ts";
let content = fs.readFileSync(filePath, "utf8");

// Replace the insecure generateUUID function with an import
content = content.replace(
  /\/\/ UUID v4 generator for race UUIDs\nconst generateUUID = \(\) => \{\n  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"\.replace\/\[xy\]\/g, \(c\) => \{\n    const r = \(Math\.random\(\) \* 16\) \| 0;\n    const v = c === "x" \? r : \(r & 0x3\) \| 0x8;\n    return v\.toString\(16\);\n  \}\);\};\n\n/,
  `import { generateUUID } from "@/core/uuid";\n\n`,
);

// Function to generate a cryptographically secure UUID
function generateSecureUUID() {
  return crypto.randomUUID();
}

// Replace all existing UUIDs with new secure ones
const uuidRegex =
  /uuid:\s*"([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})"/gi;
let match;
const replacedUUIDs = new Map();
let replacementCount = 0;

// First pass: collect all existing UUIDs
const existingUUIDs = [];
while ((match = uuidRegex.exec(content)) !== null) {
  existingUUIDs.push(match[1]);
}

// Reset regex for second pass
uuidRegex.lastIndex = 0;

// Second pass: replace with new UUIDs
content = content.replace(uuidRegex, (match) => {
  const oldUUID = match.match(/"([^"]+)"/)[1];
  const newUUID = generateSecureUUID();
  replacedUUIDs.set(oldUUID, newUUID);
  replacementCount++;
  return `uuid: "${newUUID}"`;
});

console.log(`Replaced ${replacementCount} UUIDs with cryptographically secure versions`);

// Write the updated content back to the file
fs.writeFileSync(filePath, content, "utf8");

console.log("Successfully updated gradedRaces.ts with secure UUIDs");
console.log("Updated import statement to use centralized UUID utility");
