const fs = require('fs');
const path = require('path');

function check(dir) {
    fs.readdirSync(dir).forEach(file => {
        const p = path.join(dir, file);
        if (fs.statSync(p).isDirectory()) {
            check(p);
        } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
            const content = fs.readFileSync(p, 'utf8');
            const regex = /import\s+.*?from\s+['"](.*?)['"]/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                const imp = match[1];
                if (imp.startsWith('@/')) {
                    const target = path.join('c:/Users/GUERRIER Ruben/Documents/SMG Toro/FCToro/src', imp.substring(2));
                    const dirName = path.dirname(target);
                    if (!fs.existsSync(dirName)) continue;
                    
                    const baseName = path.basename(target);
                    const files = fs.readdirSync(dirName);
                    
                    const exactMatches = files.filter(f => f === baseName || f === baseName + '.ts' || f === baseName + '.tsx' || f === baseName + '/index.ts' || f === baseName + '/index.tsx');
                    
                    if (exactMatches.length === 0) {
                        const caseMatches = files.filter(f => f.toLowerCase() === baseName.toLowerCase() || f.toLowerCase() === baseName.toLowerCase() + '.ts' || f.toLowerCase() === baseName.toLowerCase() + '.tsx');
                        if (caseMatches.length > 0) {
                            console.log(`Case mismatch in ${p}: imported '${imp}' but file is '${caseMatches[0]}'`);
                        }
                    }
                }
            }
        }
    });
}

check('c:/Users/GUERRIER Ruben/Documents/SMG Toro/FCToro/src');
console.log('Case check complete');
