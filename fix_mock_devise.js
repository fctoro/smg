const fs = require('fs');
const path = 'src/data/club/mock-data.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/cotisationMontant:\s*([0-9]+),/g, (match, amount) => {
    return `cotisationMontant: ${amount},\n    cotisationDevise: "US",`;
});

fs.writeFileSync(path, content);
console.log('Mock data devise added');
