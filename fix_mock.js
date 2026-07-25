const fs = require('fs');
const path = 'src/data/club/mock-data.ts';
let content = fs.readFileSync(path, 'utf8');

const feminineNames = ['Fatou', 'Emma', 'Linh', 'Aminata', 'Elena', 'Chloe', 'Sarah', 'Mila'];
const categoriesMap = {
    'U15': 'u14',
    'U17': 'u16',
    'Senior': 'u18'
};

content = content.replace(/prenom:\s*"([^"]+)",\s*photoUrl:([^,]+),\s*poste:\s*"([^"]+)",\s*categorie:\s*"([^"]+)",/g, (match, prenom, photoUrl, poste, categorie) => {
    const sexe = feminineNames.includes(prenom) ? 'Féminin' : 'Masculin';
    let newCategorie = categoriesMap[categorie] || 'u10';
    
    if (prenom === 'Lucas') newCategorie = 'u8';
    if (prenom === 'Noa') newCategorie = 'u10';
    if (prenom === 'Leo') newCategorie = 'u12';
    if (prenom === 'Samir') newCategorie = 'ti toro';
    if (prenom === 'Fatou') newCategorie = 'ti toro';
    
    return `prenom: "${prenom}",\n    photoUrl:${photoUrl},\n    poste: "${poste}",\n    sexe: "${sexe}",\n    categorie: "${newCategorie}",`;
});

fs.writeFileSync(path, content);
console.log('Mock data updated');
