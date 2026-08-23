const fs = require('fs');
let code = fs.readFileSync('backend/src/controllers/boardingController.ts', 'utf8');
let append = fs.readFileSync('C:/Users/acer/.gemini/antigravity/brain/6f7bb393-d334-4fb0-a3f0-c0e104fb7d32/scratch/export.ts', 'utf8');
fs.writeFileSync('backend/src/controllers/boardingController.ts', code + '\n\n' + append);
console.log('Appended safely.');

