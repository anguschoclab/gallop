const fs = require('fs');
let content = fs.readFileSync('src/tests/core/race/beyerProjections.test.ts', 'utf-8');

const target1 = `    horse.raceHistory = [
      { id: "1", date: 1, type: "race", rank: 1, beyer: 120, purse: 0, day: 1, distance: 1600 },
      { id: "2", date: 2, type: "race", rank: 1, beyer: 130, purse: 0, day: 2, distance: 1600 },
    ] as any;`;

const replacement1 = `    horse.raceHistory = [
      { id: "1", date: 1, type: "race", rank: 1, beyer: 120, purse: 0, day: 1, distance: 1600 },
      { id: "2", date: 2, type: "race", rank: 1, beyer: 130, purse: 0, day: 2, distance: 1600 },
    ] as any;`;

const target2 = `    horse.raceHistory = [
      {
        id: "1",
        date: 1,
        type: "race",
        rank: 1,
        beyer: undefined,
        purse: 0,
        day: 1,
        distance: 1600,
      },
      { id: "2", date: 2, type: "race", rank: 1, beyer: 130, purse: 0, day: 2, distance: 1600 },
    ] as any;`;

content = content.replace(/horse\.raceHistory = \[.*\n.*\] as any;/gm, ''); // delete broken ones
// wait it didn't match.

fs.writeFileSync('src/tests/core/race/beyerProjections.test.ts', content);
