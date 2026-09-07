import React, { useState, useEffect } from 'react';
import { AquaSpaceMember, AquaSpaceNiveau, Player } from '@/types/club';
import { useClubData } from '@/context/ClubDataContext';
import { generateNextAquaMatricule } from '@/lib/club/aqua-space';

interface AquaSpaceMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberData: Omit<AquaSpaceMember, 'id'>) => Promise<void>;
  initialData?: AquaSpaceMember | null;
  existingMembers: AquaSpaceMember[];
}

export const AquaSpaceMemberModal: React.FC<AquaSpaceMemberModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingMembers,
}) => {
  const { players } = useClubData();
  const [activeTab, setActiveTab] = useState<'profil' | 'parent' | 'medical' | 'reglement'>('profil');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Search existing club player
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [isSearchingPlayer, setIsSearchingPlayer] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<AquaSpaceMember, 'id'>>({
    matricule: '',
    etudiantId: null,
    nom: '',
    prenom: '',
    dateNaissance: '',
    sexe: 'Masculin',
    adresse: '',
    photoUrl: '/images/user/silhouette.svg',
    niveau: 'Apprentissage',
    statut: 'actif',
    dateInscription: new Date().toISOString().split('T')[0],
    parentNom: '',
    parentPrenom: '',
    parentEmail: '',
    parentTelephone: '',
    parentAdresse: '',
    urgenceLien: 'Parent',
    urgenceNom: '',
    urgencePrenom: '',
    urgenceTelephone: '',
    urgenceEmail: '',
    maladies: [],
    autreMaladie: '',
    allergies: '',
    priseMedicaments: false,
    medicamentsDetails: '',
    autoAdministrationMedicaments: false,
    blessuresAnterieures: '',
    modePaiementSouhaite: 'Cash/chèque',
    autorisationPhotos: true,
    absenceContreIndication: true,
    autorisationUrgence: true,
    notes: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        matricule: initialData.matricule || '',
        etudiantId: initialData.etudiantId || null,
        nom: initialData.nom || '',
        prenom: initialData.prenom || '',
        dateNaissance: initialData.dateNaissance || '',
        sexe: initialData.sexe || 'Masculin',
        adresse: initialData.adresse || '',
        photoUrl: initialData.photoUrl || '/images/user/silhouette.svg',
        niveau: initialData.niveau || 'Apprentissage',
        statut: initialData.statut || 'actif',
        dateInscription: initialData.dateInscription || new Date().toISOString().split('T')[0],
        parentNom: initialData.parentNom || '',
        parentPrenom: initialData.parentPrenom || '',
        parentEmail: initialData.parentEmail || '',
        parentTelephone: initialData.parentTelephone || '',
        parentAdresse: initialData.parentAdresse || '',
        urgenceLien: initialData.urgenceLien || 'Parent',
        urgenceNom: initialData.urgenceNom || '',
        urgencePrenom: initialData.urgencePrenom || '',
        urgenceTelephone: initialData.urgenceTelephone || '',
        urgenceEmail: initialData.urgenceEmail || '',
        maladies: Array.isArray(initialData.maladies) ? initialData.maladies : [],
        autreMaladie: initialData.autreMaladie || '',
        allergies: initialData.allergies || '',
        priseMedicaments: Boolean(initialData.priseMedicaments),
        medicamentsDetails: initialData.medicamentsDetails || '',
        autoAdministrationMedicaments: Boolean(initialData.autoAdministrationMedicaments),
        blessuresAnterieures: initialData.blessuresAnterieures || '',
        modePaiementSouhaite: initialData.modePaiementSouhaite || 'Cash/chèque',
        autorisationPhotos: initialData.autorisationPhotos !== false,
        absenceContreIndication: initialData.absenceContreIndication !== false,
        autorisationUrgence: initialData.autorisationUrgence !== false,
        notes: initialData.notes || '',
      });
      if (initialData.etudiantId) {
        const found = players.find(p => String(p.id) === String(initialData.etudiantId));
        setSelectedPlayer(found || null);
      } else {
        setSelectedPlayer(null);
      }
    } else {
      const nextMat = generateNextAquaMatricule(existingMembers);
      setFormData({
        matricule: nextMat,
        etudiantId: null,
        nom: '',
        prenom: '',
        dateNaissance: '',
        sexe: 'Masculin',
        adresse: '',
        photoUrl: '/images/user/silhouette.svg',
        niveau: 'Apprentissage',
        statut: 'actif',
        dateInscription: new Date().toISOString().split('T')[0],
        parentNom: '',
        parentPrenom: '',
        parentEmail: '',
        parentTelephone: '',
        parentAdresse: '',
        urgenceLien: 'Parent',
        urgenceNom: '',
        urgencePrenom: '',
        urgenceTelephone: '',
        urgenceEmail: '',
        maladies: [],
        autreMaladie: '',
        allergies: '',
        priseMedicaments: false,
        medicamentsDetails: '',
        autoAdministrationMedicaments: false,
        blessuresAnterieures: '',
        modePaiementSouhaite: 'Cash/chèque',
        autorisationPhotos: true,
        absenceContreIndication: true,
        autorisationUrgence: true,
        notes: '',
      });
      setSelectedPlayer(null);
    }
    setActiveTab('profil');
    setErrorMsg('');
    setPlayerSearchQuery('');
  }, [isOpen, initialData, existingMembers, players]);

  if (!isOpen) return null;

  const filteredPlayers = playerSearchQuery.trim()
    ? players.filter(p => {
        const q = playerSearchQuery.toLowerCase();
        const full = `${p.prenom} ${p.nom} ${p.matricule || ''}`.toLowerCase();
        return full.includes(q);
      }).slice(0, 6)
    : [];

  const handleSelectClubPlayer = (p: Player) => {
    setSelectedPlayer(p);
    setIsSearchingPlayer(false);
    setPlayerSearchQuery('');

    const parentParts = (p.parentNomPrenom || '').trim().split(' ');
    const pNom = parentParts[0] || '';
    const pPrenom = parentParts.slice(1).join(' ') || '';

    const urgParts = (p.urgenceNomPrenom || '').trim().split(' ');
    const uNom = urgParts[0] || '';
    const uPrenom = urgParts.slice(1).join(' ') || '';

    setFormData(prev => ({
      ...prev,
      matricule: p.matricule || prev.matricule,
      etudiantId: p.id,
      nom: p.nom || prev.nom,
      prenom: p.prenom || prev.prenom,
      dateNaissance: p.dateNaissance ? p.dateNaissance.split('T')[0] : prev.dateNaissance,
      sexe: p.sexe || prev.sexe,
      adresse: p.adresse || prev.adresse,
      photoUrl: p.photoUrl || prev.photoUrl,
      parentNom: pNom || prev.parentNom,
      parentPrenom: pPrenom || prev.parentPrenom,
      parentEmail: p.parentEmail || prev.parentEmail,
      parentTelephone: p.parentTelephone || prev.parentTelephone,
      parentAdresse: p.parentAdresse || p.adresse || prev.parentAdresse,
      urgenceLien: p.urgenceLien || 'Parent',
      urgenceNom: uNom || prev.urgenceNom,
      urgencePrenom: uPrenom || prev.urgencePrenom,
      urgenceTelephone: p.urgenceTelephone || prev.urgenceTelephone,
      urgenceEmail: p.urgenceEmail || prev.urgenceEmail,
    }));
  };

  const handleRemoveSelectedPlayer = () => {
    setSelectedPlayer(null);
    setFormData(prev => ({
      ...prev,
      etudiantId: null,
      matricule: generateNextAquaMatricule(existingMembers),
    }));
  };

  const toggleMaladie = (m: string) => {
    setFormData(prev => {
      const current = prev.maladies || [];
      if (current.includes(m)) {
        return { ...prev, maladies: current.filter(x => x !== m) };
      } else {
        return { ...prev, maladies: [...current, m] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim() || !formData.prenom.trim()) {
      setErrorMsg('Veuillez renseigner le nom et le prénom du nageur.');
      setActiveTab('profil');
      return;
    }
    if (!formData.matricule.trim()) {
      setErrorMsg('Le matricule est obligatoire.');
      setActiveTab('profil');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l’enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const niveaux: { value: AquaSpaceNiveau; label: string; desc: string; color: string }[] = [
    { value: 'Apprentissage', label: 'Apprentissage', desc: 'Débutant, accoutumance à l’eau et bases', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
    { value: 'Perfectionnement', label: 'Perfectionnement', desc: 'Maîtrise des 4 nages et endurance', color: 'bg-blue-50 text-blue-700 border-blue-300' },
    { value: 'Nage libre', label: 'Nage libre', desc: 'Pratique libre encadrée et loisir', color: 'bg-amber-50 text-amber-700 border-amber-300' },
    { value: 'Aqua gym', label: 'Aqua gym', desc: 'Gymnastique aquatique et remise en forme', color: 'bg-purple-50 text-purple-700 border-purple-300' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-600/10 via-cyan-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M2 12c1.5 0 2.5-1 4-1s2.5 1 4 1 2.5-1 4-1 2.5 1 4 1 2.5-1 4-1v2c-1.5 0-2.5 1-4 1s-2.5-1-4-1-2.5 1-4 1-2.5-1-4-1-2.5 1-4 1V12zm0 5c1.5 0 2.5-1 4-1s2.5 1 4 1 2.5-1 4-1 2.5 1 4 1 2.5-1 4-1v2c-1.5 0-2.5 1-4 1s-2.5-1-4-1-2.5 1-4 1-2.5-1-4-1-2.5 1-4 1v-2zm0-10c1.5 0 2.5-1 4-1s2.5 1 4 1 2.5-1 4-1 2.5 1 4 1 2.5-1 4-1v2c-1.5 0-2.5 1-4 1s-2.5-1-4-1-2.5 1-4 1-2.5-1-4-1-2.5 1-4 1V7z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {initialData ? 'Modifier l’inscription Aqua Space' : 'Inscrire un nageur à Aqua Space'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Programme officiel de natation FC TORO · Formulaire d’inscription
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 px-6 bg-gray-50/50 dark:bg-gray-800/30 text-xs font-semibold text-gray-600 dark:text-gray-300">
          <button
            type="button"
            onClick={() => setActiveTab('profil')}
            className={`py-3 px-4 border-b-2 font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'profil'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent hover:text-gray-900'
            }`}
          >
            <span>1. Nageur & Niveau</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parent')}
            className={`py-3 px-4 border-b-2 font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'parent'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent hover:text-gray-900'
            }`}
          >
            <span>2. Parent & Urgence</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('medical')}
            className={`py-3 px-4 border-b-2 font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'medical'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent hover:text-gray-900'
            }`}
          >
            <span>3. Fiche Médicale</span>
            {(formData.maladies?.length > 0 || formData.priseMedicaments || formData.allergies) && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reglement')}
            className={`py-3 px-4 border-b-2 font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'reglement'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent hover:text-gray-900'
            }`}
          >
            <span>4. Paiement & Accord</span>
          </button>
        </div>

        {/* Error notification banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-rose-500 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
          
          {/* TAB 1: PROFIL NAGEUR */}
          {activeTab === 'profil' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-blue-900 dark:text-blue-300">
                      Ce nageur est-il déjà joueur au club FC TORO ?
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      Conservation du matricule
                    </span>
                  </div>
                  {selectedPlayer && (
                    <button
                      type="button"
                      onClick={handleRemoveSelectedPlayer}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Délier ce joueur
                    </button>
                  )}
                </div>

                {selectedPlayer ? (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-sm">
                        {selectedPlayer.prenom?.[0]}{selectedPlayer.nom?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">
                          {selectedPlayer.prenom} {selectedPlayer.nom}
                        </p>
                        <p className="text-xs text-gray-500">
                          Matricule FC Toro : <strong className="text-blue-600">{selectedPlayer.matricule || 'N/A'}</strong> · Catégorie : {selectedPlayer.categorie || '—'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                      ✓ Données synchronisées
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={playerSearchQuery}
                      onChange={e => {
                        setPlayerSearchQuery(e.target.value);
                        setIsSearchingPlayer(true);
                      }}
                      onFocus={() => setIsSearchingPlayer(true)}
                      placeholder="🔍 Rechercher un joueur FC Toro par nom ou matricule..."
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:text-white outline-none"
                    />
                    {isSearchingPlayer && filteredPlayers.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 max-h-56 overflow-y-auto">
                        {filteredPlayers.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectClubPlayer(p)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/40 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {p.prenom} {p.nom}
                            </span>
                            <span className="font-mono font-bold text-blue-600">{p.matricule || 'Sans matricule'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Matricule & Date inscription */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Matricule Aqua Space *
                  </label>
                  <input
                    type="text"
                    value={formData.matricule}
                    onChange={e => setFormData({ ...formData, matricule: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    {formData.etudiantId ? 'Matricule officiel du joueur conservé.' : 'Attribué automatiquement selon la série en cours.'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Date d’inscription *
                  </label>
                  <input
                    type="date"
                    value={formData.dateInscription}
                    onChange={e => setFormData({ ...formData, dateInscription: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Nom & Prénom */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Nom de l’enfant *
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={e => setFormData({ ...formData, nom: e.target.value.toUpperCase() })}
                    required
                    placeholder="Ex: THEOLUS"
                    className="w-full px-3.5 py-2 text-xs uppercase rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Prénom de l’enfant *
                  </label>
                  <input
                    type="text"
                    value={formData.prenom}
                    onChange={e => setFormData({ ...formData, prenom: e.target.value })}
                    required
                    placeholder="Ex: Richard"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Date de naissance & Sexe */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={formData.dateNaissance}
                    onChange={e => setFormData({ ...formData, dateNaissance: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Sexe
                  </label>
                  <div className="flex gap-4 mt-1.5">
                    {['Masculin', 'Féminin'].map(s => (
                      <label key={s} className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer text-gray-700 dark:text-gray-300">
                        <input
                          type="radio"
                          name="sexe"
                          value={s}
                          checked={formData.sexe === s}
                          onChange={() => setFormData({ ...formData, sexe: s as any })}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Adresse de résidence
                </label>
                <input
                  type="text"
                  value={formData.adresse}
                  onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                  placeholder="Ex: Pétion-Ville, Morne Calvaire..."
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* NIVEAU AQUA SPACE */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Niveau / Programme de Natation *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {niveaux.map(n => (
                    <div
                      key={n.value}
                      onClick={() => setFormData({ ...formData, niveau: n.value })}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        formData.niveau === n.value
                          ? `${n.color} font-bold shadow-sm ring-2 ring-blue-500/20`
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{n.label}</span>
                        <input
                          type="radio"
                          name="niveau"
                          checked={formData.niveau === n.value}
                          onChange={() => setFormData({ ...formData, niveau: n.value })}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{n.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PARENT & URGENCE */}
          {activeTab === 'parent' && (
            <div className="space-y-6">
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/40 dark:bg-gray-800/30">
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <span>👤 Parent / Personne Responsable</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nom du responsable</label>
                    <input
                      type="text"
                      value={formData.parentNom}
                      onChange={e => setFormData({ ...formData, parentNom: e.target.value.toUpperCase() })}
                      placeholder="Ex: THEOLUS"
                      className="w-full px-3 py-2 text-xs uppercase rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Prénom du responsable</label>
                    <input
                      type="text"
                      value={formData.parentPrenom}
                      onChange={e => setFormData({ ...formData, parentPrenom: e.target.value })}
                      placeholder="Ex: Jean-Marie"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Téléphone / WhatsApp *</label>
                    <input
                      type="tel"
                      value={formData.parentTelephone}
                      onChange={e => setFormData({ ...formData, parentTelephone: e.target.value })}
                      placeholder="Ex: +509 3700-0000"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.parentEmail}
                      onChange={e => setFormData({ ...formData, parentEmail: e.target.value })}
                      placeholder="Ex: parent@gmail.com"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Adresse du responsable</label>
                    <input
                      type="text"
                      value={formData.parentAdresse}
                      onChange={e => setFormData({ ...formData, parentAdresse: e.target.value })}
                      placeholder="Adresse si différente de l’enfant..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section Contact Urgence */}
              <div className="border border-rose-200 dark:border-rose-900/40 rounded-xl p-4 bg-rose-50/20 dark:bg-rose-950/10">
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-3 flex items-center gap-2">
                  <span>🚨 Contact en cas d’urgence (Requis pour la piscine)</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Lien de parenté avec l’enfant</label>
                    <select
                      value={formData.urgenceLien}
                      onChange={e => setFormData({ ...formData, urgenceLien: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Mère">Mère</option>
                      <option value="Père">Père</option>
                      <option value="Tuteur">Tuteur / Tutrice</option>
                      <option value="Grand-parent">Grand-parent</option>
                      <option value="Oncle/Tante">Oncle / Tante</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Téléphone d’urgence *</label>
                    <input
                      type="tel"
                      value={formData.urgenceTelephone}
                      onChange={e => setFormData({ ...formData, urgenceTelephone: e.target.value })}
                      placeholder="Ex: +509 3800-0000"
                      className="w-full px-3 py-2 text-xs font-bold text-rose-600 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                    <input
                      type="text"
                      value={formData.urgenceNom}
                      onChange={e => setFormData({ ...formData, urgenceNom: e.target.value.toUpperCase() })}
                      placeholder="Nom du contact d’urgence"
                      className="w-full px-3 py-2 text-xs uppercase rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Prénom</label>
                    <input
                      type="text"
                      value={formData.urgencePrenom}
                      onChange={e => setFormData({ ...formData, urgencePrenom: e.target.value })}
                      placeholder="Prénom du contact d’urgence"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Email d’urgence</label>
                    <input
                      type="email"
                      value={formData.urgenceEmail}
                      onChange={e => setFormData({ ...formData, urgenceEmail: e.target.value })}
                      placeholder="contact.urgence@gmail.com"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FICHE MÉDICALE */}
          {activeTab === 'medical' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs italic">
                ℹ️ Ces données médicales sont strictement confidentielles et ne sont recueillies qu&apos;à des fins préventives pour la sécurité des nageurs au bassin.
              </div>

              {/* 1. Affections */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800 space-y-3">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                  1. Le nageur souffre-t-il de :
                </label>
                <div className="flex flex-wrap gap-4 text-xs">
                  {['Asthme', 'Diabète', 'Épilepsie'].map(m => (
                    <label key={m} className="inline-flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={formData.maladies?.includes(m)}
                        onChange={() => toggleMaladie(m)}
                        className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                      />
                      <span className="font-medium">{m}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Autre maladie importante :
                  </label>
                  <input
                    type="text"
                    value={formData.autreMaladie}
                    onChange={e => setFormData({ ...formData, autreMaladie: e.target.value })}
                    placeholder="Précisez si applicable..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 2. Allergies */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                  2. Indiquez les allergies importantes, s’il y a lieu :
                </label>
                <textarea
                  rows={2}
                  value={formData.allergies}
                  onChange={e => setFormData({ ...formData, allergies: e.target.value })}
                  placeholder="Allergies au chlore, piqûres, aliments, etc."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* 3. Médicaments */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    3. Le nageur doit-il prendre des médicaments régulièrement ?
                  </label>
                  <div className="flex gap-3 text-xs">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="priseMedicaments"
                        checked={formData.priseMedicaments === true}
                        onChange={() => setFormData({ ...formData, priseMedicaments: true })}
                        className="text-blue-600"
                      />
                      <span>Oui</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="priseMedicaments"
                        checked={formData.priseMedicaments === false}
                        onChange={() => setFormData({ ...formData, priseMedicaments: false, medicamentsDetails: '' })}
                        className="text-blue-600"
                      />
                      <span>Non</span>
                    </label>
                  </div>
                </div>

                {formData.priseMedicaments && (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      Si oui, indiquez lesquels :
                    </label>
                    <input
                      type="text"
                      value={formData.medicamentsDetails}
                      onChange={e => setFormData({ ...formData, medicamentsDetails: e.target.value })}
                      placeholder="Ex: Ventoline, Insuline..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700 text-xs">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    Peut-il s’administrer ses propres médicaments ?
                  </span>
                  <div className="flex gap-3">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="autoAdmin"
                        checked={formData.autoAdministrationMedicaments === true}
                        onChange={() => setFormData({ ...formData, autoAdministrationMedicaments: true })}
                        className="text-blue-600"
                      />
                      <span>Oui</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="autoAdmin"
                        checked={formData.autoAdministrationMedicaments === false}
                        onChange={() => setFormData({ ...formData, autoAdministrationMedicaments: false })}
                        className="text-blue-600"
                      />
                      <span>Non</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 4. Blessures antérieures */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                  4. Donnez une description des blessures antérieures sérieuses :
                </label>
                <textarea
                  rows={2}
                  value={formData.blessuresAnterieures}
                  onChange={e => setFormData({ ...formData, blessuresAnterieures: e.target.value })}
                  placeholder="Fractures, entorses, opérations récentes..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 4: PAIEMENT & AUTORISATIONS */}
          {activeTab === 'reglement' && (
            <div className="space-y-6">
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800 space-y-3">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                  💳 Mode de paiement souhaité par le parent
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['Cash/chèque', 'Carte bancaire', 'Transfert bancaire'].map(m => (
                    <div
                      key={m}
                      onClick={() => setFormData({ ...formData, modePaiementSouhaite: m as any })}
                      className={`p-3 rounded-xl border-2 text-center cursor-pointer text-xs font-bold transition-all ${
                        formData.modePaiementSouhaite === m
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800 space-y-3">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-2">
                  📜 Autorisations parentales obligatoires
                </label>
                <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autorisationPhotos}
                      onChange={e => setFormData({ ...formData, autorisationPhotos: e.target.checked })}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>J’autorise l’utilisation des photos de mon enfant sur les réseaux sociaux et sur tout matériel relatif à FC TORO.</span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.absenceContreIndication}
                      onChange={e => setFormData({ ...formData, absenceContreIndication: e.target.checked })}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Je certifie que mon enfant n’a pas de contre-indication médicale à la pratique du sport / natation.</span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autorisationUrgence}
                      onChange={e => setFormData({ ...formData, autorisationUrgence: e.target.checked })}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>J’autorise les responsables de prendre toutes les dispositions nécessaires en cas d’urgence.</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Notes / Instructions spécifiques du club
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Commentaires administratifs ou techniques du maître-nageur..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              {activeTab !== 'profil' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'reglement') setActiveTab('medical');
                    else if (activeTab === 'medical') setActiveTab('parent');
                    else if (activeTab === 'parent') setActiveTab('profil');
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 transition"
                >
                  ← Précédent
                </button>
              )}
              {activeTab !== 'reglement' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'profil') setActiveTab('parent');
                    else if (activeTab === 'parent') setActiveTab('medical');
                    else if (activeTab === 'medical') setActiveTab('reglement');
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition"
                >
                  Suivant →
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Enregistrement...' : (initialData ? 'Mettre à jour' : 'Enregistrer l’inscription')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
