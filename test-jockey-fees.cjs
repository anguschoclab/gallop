const fs = require('fs');

if (!fs.existsSync('src/tests/core/race/impacts/jockeyFees.test.ts')) {
    console.log("no test file for jockey fees yet");
}
