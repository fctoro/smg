import codecs

file_path = 'C:/Users/RK_Piton/Documents/smg/src/components/club/forms/PlayerForm.tsx'
content = codecs.open(file_path, 'r', 'utf-8').read()

target = '''        ) : (
          <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-6 shadow-xs dark:border-blue-900/30 dark:bg-blue-900/10">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-100 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                5
              </span>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-blue-900 dark:text-blue-300">Dossier Financier</h4>
              </div>
            </div>
            <div className="mt-2 text-sm text-blue-800 dark:text-blue-200">
              Ce joueur bAcnAcficie d'un statut financier particulier : <strong>{formValues.statutJoueur || (formValues.sourceDetection ? "DActection / SponsorisAc" : "SpAccial")}</strong>. 
              Les champs de facturation standards sont dAcsactivAcs pour ce profil.
            </div>
          </div>
        )}'''
target = target.replace("bAcnAcficie", "bénéficie").replace("DActection / SponsorisAc", "Détection / Sponsorisé").replace("SpAccial", "Spécial").replace("dAcsactivAcs", "désactivés")

if target not in content:
    target = target.replace('\r\n', '\n')

replacement = '''        ) : (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900/50">
            <div className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 shadow-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                5
              </span>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">Dossier Financier</h4>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Informations sur le statut financier particulier du joueur.</p>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              Ce joueur bénéficie d'un statut financier particulier : <strong>{formValues.statutJoueur || (formValues.sourceDetection ? "Détection / Sponsorisé" : "Spécial")}</strong>. 
              Les champs de facturation standards sont désactivés pour ce profil.
            </div>
          </div>
        )}'''

content = content.replace(target, replacement)
codecs.open(file_path, 'w', 'utf-8').write(content)
