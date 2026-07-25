const fs = require('fs');
const path = 'src/data/club/mock-data.ts';
let content = fs.readFileSync(path, 'utf8');

const categoriesMap = {
    'u8': 'U8',
    'u10': 'U10',
    'u12': 'U12',
    'u14': 'U14',
    'u16': 'U16',
    'u18': 'U18'
};

content = content.replace(/categorie:\s*"([^"]+)",/g, (match, categorie) => {
    const newCategorie = categoriesMap[categorie] || categorie;
    return `categorie: "${newCategorie}",`;
});

fs.writeFileSync(path, content);
console.log('Mock data categories uppercased');
