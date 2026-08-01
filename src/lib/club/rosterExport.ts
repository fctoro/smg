export function convertRostersToCSV(rosters: any[], playersMap: Record<string, any>) {
  const headers = ["Nom du Match", "Date", "PAcriode", "CatAcgorie", "Joueurs"];
  let csvContent = "\uFEFF" + headers.join(";") + "\n";
  
  rosters.forEach(r => {
    const playerNames = (r.joueurs || []).map((id: string) => {
      const p = playersMap[id];
      return p ? p.nom + " " + p.prenom : id;
    }).join(", ");
    
    const row = [r.nom, r.date_match, r.periode, r.categorie, playerNames];
    const csvRow = row.map(field => "");
    csvContent += csvRow.join(";") + "\n";
  });
  
  return csvContent;
}

export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
