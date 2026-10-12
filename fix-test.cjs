const fs = require('fs');
let code = fs.readFileSync('src/tests/core/race/engine/trackGeometryModifiers.test.ts', 'utf8');

// import TrackSection
code = "import type { TrackSection } from '@/core/data/tracksAccessor';\n" + code;
code = code.replace(/as any/g, 'as unknown as TrackSection');

fs.writeFileSync('src/tests/core/race/engine/trackGeometryModifiers.test.ts', code);
