import React, { useState, useEffect } from 'react';
import { AquaSpaceMember, AquaSpaceNiveau, Player } from '@/types/club';
import { useClubData } from '@/context/ClubDataContext';
import { generateNextAquaMatricule } from '@/lib/club/aqua-space';
import {
  User,
  PhoneCall,
  HeartPulse,
  CreditCard,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Waves,
  ArrowRight,
  ArrowLeft,
  Wallet,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';

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

      if (initialData.etudiantId && players) {
        const found = players.find(p => String(p.id) === String(initialData.etudiantId));
        if (found) setSelectedPlayer(found);
      }
    } else {
      const nextMatricule = generateNextAquaMatricule(existingMembers);
      setFormData(prev => ({
        ...prev,
        matricule: nextMatricule,
      }));
    }
  }, [initialData, existingMembers, players]);

  const filteredPlayers = (players || []).filter(p => {
    if (!playerSearchQuery.trim()) return false;
    const q = playerSearchQuery.toLowerCase();
    const fullName = `${p.prenom} ${p.nom}`.toLowerCase();
    const mat = (p.matricule || '').toLowerCase();
    return fullName.includes(q) || mat.includes(q);
  }).slice(0, 8);

  const handleSelectClubPlayer = (p: Player) => {
    setSelectedPlayer(p);
    setIsSearchingPlayer(false);
    setPlayerSearchQuery('');

    const parentNom = (p as any).parentNom || (p as any).parentNomPrenom || '';
    const parentTel = (p as any).parentTelephone || (p as any).telephoneParent || p.telephone || '';
    const parentMail = (p as any).parentEmail || (p as any).emailParent || p.email || '';
    const adresse = p.adresse || (p as any).parentAdresse || '';

    setFormData(prev => ({
      ...prev,
      etudiantId: p.id,
      matricule: p.matricule || prev.matricule,
      nom: p.nom || prev.nom,
      prenom: p.prenom || prev.prenom,
      dateNaissance: p.dateNaissance || prev.dateNaissance,
      sexe: p.sexe || prev.sexe,
      photoUrl: p.photoUrl || prev.photoUrl,
      adresse: adresse || prev.adresse,
      parentNom: parentNom || prev.parentNom,
      parentPrenom: '',
      parentTelephone: parentTel || prev.parentTelephone,
      parentEmail: parentMail || prev.parentEmail,
      parentAdresse: adresse || prev.parentAdresse,
      urgenceLien: 'Parent',
      urgenceNom: parentNom || prev.urgenceNom,
      urgencePrenom: '',
      urgenceTelephone: parentTel || prev.urgenceTelephone,
      urgenceEmail: parentMail || prev.urgenceEmail,
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
      setErrorMsg(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const niveaux: { value: AquaSpaceNiveau; label: string; desc: string; color: string }[] = [
    { value: 'Apprentissage', label: 'Apprentissage', desc: 'Débutant, accoutumance à l’eau et bases motrices', color: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800' },
    { value: 'Perfectionnement', label: 'Perfectionnement', desc: 'Maîtrise des 4 nages, respiration et endurance', color: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800' },
    { value: 'Nage libre', label: 'Nage libre', desc: 'Pratique sportive encadrée et natation bien-être', color: 'bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-800' },
    { value: 'Aqua gym', label: 'Aqua gym', desc: 'Gymnastique aquatique, renforcement et tonicité', color: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-t-2xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-500 border border-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20 flex items-center justify-center">
              <Waves className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {initialData ? "Modifier l'inscription · Aqua Space" : "Inscrire un nageur · Aqua Space"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Section natation FC TORO · Formulaire officiel d'adhésion
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 bg-gray-50/60 dark:bg-gray-800/40 text-xs font-semibold text-gray-600 dark:text-gray-300 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profil')}
            className={`py-3 px-4 border-b-2 font-bold transition-all flex items-center gap-2 ${
              activeTab === 'profil'
                ? 'border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>1. Nageur & Niveau</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parent')}
            className={`py-3 px-4 border-b-2 font-bold transition-all flex items-center gap-2 ${
              activeTab === 'parent'
                ? 'border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>2. Parent & Urgence</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('medical')}
            className={`py-3 px-4 border-b-2 font-bold transition-all flex items-center gap-2 ${
              activeTab === 'medical'
                ? 'border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>3. Fiche Médicale</span>
            {(formData.maladies?.length > 0 || formData.priseMedicaments || formData.allergies) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reglement')}
            className={`py-3 px-4 border-b-2 font-bold transition-all flex items-center gap-2 ${
              activeTab === 'reglement'
                ? 'border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>4. Paiement & Accord</span>
          </button>
        </div>

        {/* Error notification banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
          
          {/* TAB 1: PROFIL NAGEUR */}
          {activeTab === 'profil' && (
            <div className="space-y-5">
              {/* Association Club Player */}
              <div className="p-4 rounded-2xl border border-sky-100 dark:border-sky-900/40 bg-sky-50/40 dark:bg-sky-950/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-300">
                      Ce nageur est-il déjà joueur au club FC TORO ?
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
                      <ShieldCheck className="w-3 h-3 text-sky-600" />
                      <span>Conservation du matricule</span>
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
                  <div className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-sky-200 dark:border-sky-800/60 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-600 text-white font-bold flex items-center justify-center text-xs">
                        {selectedPlayer.prenom?.[0]}{selectedPlayer.nom?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-xs">
                          {selectedPlayer.prenom} {selectedPlayer.nom}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          Matricule FC Toro : <strong className="font-mono text-cyan-600 dark:text-cyan-400">{selectedPlayer.matricule || 'N/A'}</strong> · Catégorie : {selectedPlayer.categorie || '—'}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Données synchronisées</span>
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={playerSearchQuery}
                      onChange={e => {
                        setPlayerSearchQuery(e.target.value);
                        setIsSearchingPlayer(true);
                      }}
                      onFocus={() => setIsSearchingPlayer(true)}
                      placeholder="Rechercher un joueur FC Toro par nom ou matricule..."
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 dark:text-white outline-none shadow-2xs"
                    />
                    {isSearchingPlayer && filteredPlayers.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto">
                        {filteredPlayers.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectClubPlayer(p)}
                            className="w-full text-left px-3.5 py-2 text-xs hover:bg-cyan-50 dark:hover:bg-cyan-950/40 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {p.prenom} {p.nom}
                            </span>
                            <span className="font-mono font-bold text-cyan-600">{p.matricule || 'Sans matricule'}</span>
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Matricule Aqua Space <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.matricule}
                    onChange={e => setFormData({ ...formData, matricule: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    {formData.etudiantId ? 'Matricule officiel du joueur conservé.' : 'Attribué automatiquement selon la série en cours.'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Date d’inscription <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dateInscription}
                    onChange={e => setFormData({ ...formData, dateInscription: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>

              {/* Nom & Prénom */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Nom du nageur <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={e => setFormData({ ...formData, nom: e.target.value.toUpperCase() })}
                    required
                    placeholder="Ex: THEOLUS"
                    className="w-full px-3.5 py-2 text-xs uppercase rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Prénom du nageur <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.prenom}
                    onChange={e => setFormData({ ...formData, prenom: e.target.value })}
                    required
                    placeholder="Ex: Richard"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>

              {/* Date de naissance & Sexe */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={formData.dateNaissance}
                    onChange={e => setFormData({ ...formData, dateNaissance: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                    Sexe
                  </label>
                  <div className="flex gap-4 mt-2">
                    {['Masculin', 'Féminin'].map(s => (
                      <label key={s} className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer text-gray-700 dark:text-gray-300">
                        <input
                          type="radio"
                          name="sexe"
                          value={s}
                          checked={formData.sexe === s}
                          onChange={() => setFormData({ ...formData, sexe: s as any })}
                          className="text-cyan-600 focus:ring-cyan-500"
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  Adresse de résidence
                </label>
                <input
                  type="text"
                  value={formData.adresse}
                  onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                  placeholder="Ex: Pétion-Ville, Morne Calvaire..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                />
              </div>

              {/* NIVEAU AQUA SPACE */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                  Programme / Niveau de natation <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {niveaux.map(n => (
                    <div
                      key={n.value}
                      onClick={() => setFormData({ ...formData, niveau: n.value })}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                        formData.niveau === n.value
                          ? `${n.color} font-bold shadow-xs ring-2 ring-cyan-500/20`
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
                          className="text-cyan-600 focus:ring-cyan-500"
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
              <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4.5 bg-gray-50/40 dark:bg-gray-800/30">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3.5 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>Parent / Personne Responsable</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Nom du responsable</label>
                    <input
                      type="text"
                      value={formData.parentNom}
                      onChange={e => setFormData({ ...formData, parentNom: e.target.value.toUpperCase() })}
                      placeholder="Ex: THEOLUS"
                      className="w-full px-3.5 py-2 text-xs uppercase rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Prénom du responsable</label>
                    <input
                      type="text"
                      value={formData.parentPrenom}
                      onChange={e => setFormData({ ...formData, parentPrenom: e.target.value })}
                      placeholder="Ex: Jean-Marie"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Téléphone / WhatsApp <span className="text-rose-500">*</span></label>
                    <input
                      type="tel"
                      value={formData.parentTelephone}
                      onChange={e => setFormData({ ...formData, parentTelephone: e.target.value })}
                      placeholder="Ex: +509 3700-0000"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.parentEmail}
                      onChange={e => setFormData({ ...formData, parentEmail: e.target.value })}
                      placeholder="Ex: parent@gmail.com"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Adresse du responsable</label>
                    <input
                      type="text"
                      value={formData.parentAdresse}
                      onChange={e => setFormData({ ...formData, parentAdresse: e.target.value })}
                      placeholder="Adresse si différente de l’enfant..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section Contact Urgence */}
              <div className="border border-rose-200/80 dark:border-rose-900/40 rounded-2xl p-4.5 bg-rose-50/20 dark:bg-rose-950/10">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-3.5 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Contact en cas d’urgence (Requis en bassin)</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Lien de parenté</label>
                    <select
                      value={formData.urgenceLien}
                      onChange={e => setFormData({ ...formData, urgenceLien: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Téléphone d’urgence <span className="text-rose-500">*</span></label>
                    <input
                      type="tel"
                      value={formData.urgenceTelephone}
                      onChange={e => setFormData({ ...formData, urgenceTelephone: e.target.value })}
                      placeholder="Ex: +509 3800-0000"
                      className="w-full px-3.5 py-2 text-xs font-bold text-rose-700 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                    <input
                      type="text"
                      value={formData.urgenceNom}
                      onChange={e => setFormData({ ...formData, urgenceNom: e.target.value.toUpperCase() })}
                      placeholder="Nom du contact d’urgence"
                      className="w-full px-3.5 py-2 text-xs uppercase rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Prénom</label>
                    <input
                      type="text"
                      value={formData.urgencePrenom}
                      onChange={e => setFormData({ ...formData, urgencePrenom: e.target.value })}
                      placeholder="Prénom du contact d’urgence"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Email d’urgence</label>
                    <input
                      type="email"
                      value={formData.urgenceEmail}
                      onChange={e => setFormData({ ...formData, urgenceEmail: e.target.value })}
                      placeholder="contact.urgence@gmail.com"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FICHE MÉDICALE */}
          {activeTab === 'medical' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Ces données médicales sont strictement confidentielles et réservées aux encadrants d'Aqua Space pour la sécurité du nageur.</span>
              </div>

              {/* 1. Affections */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4.5 bg-white dark:bg-gray-800 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                  1. Affections signalées :
                </label>
                <div className="flex flex-wrap gap-4 text-xs">
                  {['Asthme', 'Diabète', 'Épilepsie'].map(m => (
                    <label key={m} className="inline-flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300 font-semibold">
                      <input
                        type="checkbox"
                        checked={formData.maladies?.includes(m)}
                        onChange={() => toggleMaladie(m)}
                        className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                      />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Autre condition médicale notable :
                  </label>
                  <input
                    type="text"
                    value={formData.autreMaladie}
                    onChange={e => setFormData({ ...formData, autreMaladie: e.target.value })}
                    placeholder="Précisez si applicable..."
                    className="w-full px-3.5 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* 2. Allergies */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4.5 bg-white dark:bg-gray-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 mb-1">
                  2. Allergies importantes :
                </label>
                <textarea
                  rows={2}
                  value={formData.allergies}
                  onChange={e => setFormData({ ...formData, allergies: e.target.value })}
                  placeholder="Allergies au chlore, piqûres, aliments, etc."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none"
                />
              </div>

              {/* 3. Médicaments */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4.5 bg-white dark:bg-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                    3. Traitement médicamenteux régulier ?
                  </label>
                  <div className="flex gap-4 text-xs font-semibold">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="priseMedicaments"
                        checked={formData.priseMedicaments === true}
                        onChange={() => setFormData({ ...formData, priseMedicaments: true })}
                        className="text-cyan-600 focus:ring-cyan-500"
                      />
                      <span>Oui</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="priseMedicaments"
                        checked={formData.priseMedicaments === false}
                        onChange={() => setFormData({ ...formData, priseMedicaments: false, medicamentsDetails: '' })}
                        className="text-cyan-600 focus:ring-cyan-500"
                      />
                      <span>Non</span>
                    </label>
                  </div>
                </div>

                {formData.priseMedicaments && (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      Si oui, détaillez les médicaments :
                    </label>
                    <input
                      type="text"
                      value={formData.medicamentsDetails}
                      onChange={e => setFormData({ ...formData, medicamentsDetails: e.target.value })}
                      placeholder="Ex: Ventoline, Insuline..."
                      className="w-full px-3.5 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700 text-xs">
                  <span className="text-gray-700 dark:text-gray-300 font-semibold">
                    Le nageur est-il autonome pour s'auto-administrer son traitement ?
                  </span>
                  <div className="flex gap-4 font-semibold">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="autoAdmin"
                        checked={formData.autoAdministrationMedicaments === true}
                        onChange={() => setFormData({ ...formData, autoAdministrationMedicaments: true })}
                        className="text-cyan-600 focus:ring-cyan-500"
                      />
                      <span>Oui</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="autoAdmin"
                        checked={formData.autoAdministrationMedicaments === false}
                        onChange={() => setFormData({ ...formData, autoAdministrationMedicaments: false })}
                        className="text-cyan-600 focus:ring-cyan-500"
                      />
                      <span>Non</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 4. Blessures antérieures */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4.5 bg-white dark:bg-gray-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 mb-1">
                  4. Antécédents de blessures ou chirurgies :
                </label>
                <textarea
                  rows={2}
                  value={formData.blessuresAnterieures}
                  onChange={e => setFormData({ ...formData, blessuresAnterieures: e.target.value })}
                  placeholder="Fractures, entorses, opérations récentes..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 4: PAIEMENT & AUTORISATIONS */}
          {activeTab === 'reglement' && (
            <div className="space-y-6">
              <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4.5 bg-white dark:bg-gray-800 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>Mode de règlement souhaité par le responsable</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['Cash/chèque', 'Carte bancaire', 'Transfert bancaire'].map(m => (
                    <div
                      key={m}
                      onClick={() => setFormData({ ...formData, modePaiementSouhaite: m as any })}
                      className={`p-3 rounded-xl border-2 text-center cursor-pointer text-xs font-bold transition-all ${
                        formData.modePaiementSouhaite === m
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4.5 bg-white dark:bg-gray-800 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Autorisations et déclarations réglementaires</span>
                </label>
                <div className="space-y-3 text-xs text-gray-700 dark:text-gray-300">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autorisationPhotos}
                      onChange={e => setFormData({ ...formData, autorisationPhotos: e.target.checked })}
                      className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    <span>J’autorise l’utilisation des photos et vidéos du nageur dans le cadre des communications officielles du FC TORO.</span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.absenceContreIndication}
                      onChange={e => setFormData({ ...formData, absenceContreIndication: e.target.checked })}
                      className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    <span>Je certifie sur l’honneur que le nageur ne présente aucune contre-indication médicale connue à la pratique des activités aquatiques.</span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autorisationUrgence}
                      onChange={e => setFormData({ ...formData, autorisationUrgence: e.target.checked })}
                      className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    <span>J’autorise expressément la direction du club à prendre toute mesure médicale ou chirurgicale requise en cas d’urgence.</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  Notes administratives ou pédagogiques
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Instructions spécifiques du maître-nageur..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none"
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Précédent</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
              >
                Annuler
              </button>

              {activeTab !== 'reglement' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'profil') setActiveTab('parent');
                    else if (activeTab === 'parent') setActiveTab('medical');
                    else if (activeTab === 'medical') setActiveTab('reglement');
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium rounded-xl bg-brand-500 text-white hover:bg-brand-600 shadow-theme-xs transition"
                >
                  <span>Suivant</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2 text-xs font-medium rounded-xl bg-brand-500 text-white hover:bg-brand-600 shadow-theme-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{initialData ? 'Enregistrer les modifications' : 'Confirmer l’inscription'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
