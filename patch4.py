import codecs

file_path = 'C:/Users/RK_Piton/Documents/smg/src/components/club/forms/PlayerForm.tsx'
content = codecs.open(file_path, 'r', 'utf-8').read()

target = '''          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="sm:col-span-2 md:col-span-3">'''

if target not in content:
    target = target.replace('\r\n', '\n')

replacement = '''          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="sm:col-span-2 md:col-span-3">
              <label className="mb-3 block text-xs font-medium text-gray-700 dark:text-gray-300">PIED DOMINANT</label>
              <div className="flex gap-4">
                {["Droit", "Gauche", "Les deux"].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="piedDominant"
                      checked={formValues.piedDominant === option}
                      onChange={() => updateField("piedDominant", option)}
                      className="w-4 h-4 text-brand-500 bg-gray-100 border-gray-300 focus:ring-brand-500 dark:focus:ring-brand-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">CLUB / ACADA%MIE ACTUELLE</label>
              <input 
                type="text" 
                value={formValues.clubActuel || ""} 
                onChange={(e) => updateField("clubActuel", e.target.value)} 
                placeholder="Renseignez le club ou l'acadAcmie actuelle..." 
                className={inputClassName} 
              />
            </div>
            <div className="sm:col-span-2 md:col-span-3">'''
replacement = replacement.replace("A%MIE", "ÉMIE").replace("Acmie", "émie")

content = content.replace(target, replacement)
codecs.open(file_path, 'w', 'utf-8').write(content)
