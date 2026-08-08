const fs = require('fs');
const ts = require('typescript');
const src = fs.readFileSync('src/components/club/pages/CoachTacticsPage.tsx', 'utf8');
const sf = ts.createSourceFile('CoachTacticsPage.tsx', src, ts.ScriptTarget.Latest, true);
sf.parseDiagnostics.forEach(d => {
  const pos = sf.getLineAndCharacterOfPosition(d.start);
  console.log('Line ' + (pos.line + 1) + ': ' + d.messageText);
});
