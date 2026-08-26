const fs = require('fs');
let file = fs.readFileSync('C:/Users/RK_Piton/Documents/smg/src/components/club/forms/PlayerForm.tsx', 'utf8');

const target =     if (!formValues.sourceDetection) {
      requiredSelects.push({ field: formValues.planPaiement, name: "Plan de Paiement" });
      requiredSelects.push({ field: formValues.modePaiementChoisi, name: "Mode de règlement" });
    };

const replacement =     if (!formValues.sourceDetection) {
      requiredSelects.push({ field: formValues.planPaiement, name: "Plan de Paiement" });
      requiredSelects.push({ field: formValues.modePaiementChoisi, name: "Mode de règlement" });

      if (!formValues.acteNaissanceUrl) {
        alert("L'Acte de naissance est obligatoire.");
        return;
      }
      if (!formValues.carteIdentiteParentUrl) {
        alert("La Pièce d'identité du parent/tuteur est obligatoire.");
        return;
      }
    };

file = file.replace(target, replacement);

// Also remove "(Facultatif)" and "Optionnel" from UI
file = file.replace("Documents administratifs (Facultatif)", "Documents administratifs");
file = file.replace("Optionnel", "Obligatoire");
file = file.replace("bg-blue-50", "bg-red-50");
file = file.replace("text-blue-700", "text-red-700");
file = file.replace("dark:bg-blue-900/30", "dark:bg-red-900/30");
file = file.replace("dark:text-blue-400", "dark:text-red-400");

fs.writeFileSync('C:/Users/RK_Piton/Documents/smg/src/components/club/forms/PlayerForm.tsx', file);
console.log('done');
