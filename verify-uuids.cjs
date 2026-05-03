const fs = require('fs');
const path = require('path');

// Find all TypeScript files
const files = [];
function findFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      findFiles(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }
}
findFiles('src');

console.log(`Scanning ${files.length} TypeScript files...`);

// Collect all UUID-like strings
const uuidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;
const allUuids = new Map(); // uuid -> [{file, line}]

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    const matches = line.matchAll(uuidPattern);
    for (const match of matches) {
      const uuid = match[0];
      if (!allUuids.has(uuid)) {
        allUuids.set(uuid, []);
      }
      allUuids.get(uuid).push({ file: path.relative(process.cwd(), file), line: index + 1 });
    }
  });
}

console.log(`Found ${allUuids.size} unique UUIDs`);

// Find duplicates
const duplicates = [];
for (const [uuid, locations] of allUuids.entries()) {
  if (locations.length > 1) {
    duplicates.push({ uuid, locations });
  }
}

if (duplicates.length > 0) {
  console.log(`\n❌ Found ${duplicates.length} duplicate UUIDs:`);
  for (const { uuid, locations } of duplicates) {
    console.log(`\n  UUID: ${uuid}`);
    for (const loc of locations) {
      console.log(`    ${loc.file}:${loc.line}`);
    }
  }
  process.exit(1);
} else {
  console.log('\n✅ No duplicate UUIDs found!');
}

// Check for non-hex characters in UUIDs (invalid format)
const invalidUuids = [];
for (const [uuid, locations] of allUuids.entries()) {
  if (!/^[a-f0-9-]+$/.test(uuid)) {
    invalidUuids.push({ uuid, locations });
  }
}

if (invalidUuids.length > 0) {
  console.log(`\n❌ Found ${invalidUuids.length} invalid UUIDs (non-hex characters):`);
  for (const { uuid, locations } of invalidUuids) {
    console.log(`\n  UUID: ${uuid}`);
    for (const loc of locations) {
      console.log(`    ${loc.file}:${loc.line}`);
    }
  }
  process.exit(1);
} else {
  console.log('✅ All UUIDs have valid hex format!');
}

// Check UUID v4 format (13th character should be '4')
const invalidV4 = [];
for (const [uuid, locations] of allUuids.entries()) {
  if (uuid[14] !== '4') {
    invalidV4.push({ uuid, locations });
  }
}

if (invalidV4.length > 0) {
  console.log(`\n❌ Found ${invalidV4.length} UUIDs that are not v4 format (13th char should be '4'):`);
  for (const { uuid, locations } of invalidV4) {
    console.log(`\n  UUID: ${uuid}`);
    for (const loc of locations) {
      console.log(`    ${loc.file}:${loc.line}`);
    }
  }
  process.exit(1);
} else {
  console.log('✅ All UUIDs are v4 format!');
}

console.log('\n✅ All UUIDs are unique and properly formatted!');
