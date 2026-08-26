const fs = require('fs');
const path = 'C:/Users/RK_Piton/Documents/smg/src/app/(admin)/joueurs/nouveau/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const translationHelper = "function translatePaymentMethod(val) { if (!val) return ''; const s = String(val).toLowerCase().trim(); if (s === 'transfert') return 'Transfert bancaire'; if (s === 'cash_cheque') return 'Cash/chèque'; if (s === 'carte') return 'Carte bancaire'; return val; }\n";

if (!content.includes('translatePaymentMethod(')) {
  content = content.replace('function NewPlayerFormContent() {', translationHelper + '\nfunction NewPlayerFormContent() {');
  content = content.replace(/modePaiementChoisi:\s*reg\.payment_method\s*\|\|\s*p\.payment_method\s*\|\|\s*p\.modePaiementChoisi\s*\|\|\s*""/g, 'modePaiementChoisi: translatePaymentMethod(reg.payment_method || p.payment_method || p.modePaiementChoisi)');
  content = content.replace(/modePaiementChoisi:\s*p\.payment_method\s*\|\|\s*p\.modePaiementChoisi\s*\|\|\s*""/g, 'modePaiementChoisi: translatePaymentMethod(p.payment_method || p.modePaiementChoisi)');
  fs.writeFileSync(path, content);
  console.log('Patched');
} else {
  console.log('Already patched');
}
