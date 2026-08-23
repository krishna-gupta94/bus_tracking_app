const fs = require('fs');
let code = fs.readFileSync('backend/src/controllers/boardingController.ts', 'utf8');
code = code.replace(/\\x00/g, '');
fs.writeFileSync('backend/src/controllers/boardingController.ts', code);

