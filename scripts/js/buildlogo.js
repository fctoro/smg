const fs = require('fs');
const img = fs.readFileSync('public/images/logo/fc-toro.png');
const b64 = img.toString('base64');
fs.writeFileSync('src/lib/club/pdfAssets.ts', 'export const FC_TORO_LOGO = "data:image/png;base64,' + b64 + '";\n');
console.log('Done!');
