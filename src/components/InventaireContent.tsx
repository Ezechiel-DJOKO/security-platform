'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

interface Actif {
  id: string;
  nom: string;
  type: string;
  responsable: string;
  statut: 'Critique' | 'Élevé' | 'Moyen' | 'Faible';
  dernierScan: string;
  valeur: string;
}

const actifsData: Actif[] = [
  { id: "ASSET-001", nom: "Serveur Production", type: "Serveur", responsable: "Jean Dupont", statut: "Critique", dernierScan: "Il y a 2h", valeur: "450 000 FCFA" },
  { id: "ASSET-002", nom: "PC-ADMIN-045", type: "Poste de travail", responsable: "Marie Koto", statut: "Élevé", dernierScan: "Hier", valeur: "320 000 FCFA" },
  { id: "ASSET-003", nom: "Base de Données Centrale", type: "Base de données", responsable: "Admin Système", statut: "Moyen", dernierScan: "Il y a 3 jours", valeur: "1 200 000 FCFA" },
  { id: "ASSET-004", nom: "Routeur Principal", type: "Réseau", responsable: "Paul Akakpo", statut: "Faible", dernierScan: "Il y a 1 semaine", valeur: "180 000 FCFA" },
];

const statutColors = {
  Critique: "bg-red-500/10 text-red-500 border-red-500",
  Élevé: "bg-orange-500/10 text-orange-500 border-orange-500",
  Moyen: "bg-yellow-500/10 text-yellow-500 border-yellow-500",
  Faible: "bg-emerald-500/10 text-emerald-500 border-emerald-500",
};

export default function InventaireContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('Tous');

  const sessionContext = useSession();

  // Bloque l'exécution prématurée durant le build
  if (!sessionContext || sessionContext.status === "loading") {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-400">Chargement de l&apos;inventaire des actifs...</p>
      </div>
    );
  }

  const { data: session } = sessionContext;

  if (!session) {
    return (
      <div className="text-center py-12 text-amber-500">
        Vous devez être connecté pour accéder à l&apos;inventaire.
      </div>
    );
  }

  const filteredActifs = actifsData.filter((actif) => {
    const matchesSearch =
      actif.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      actif.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      actif.responsable.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatut === 'Tous' || actif.statut === filterStatut;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Inventaire des Actifs</h1>
          <p className="text-slate-400 mt-1">Gestion et suivi de tous les actifs informatiques</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-2xl font-medium transition-all text-white">
          <Plus className="w-5 h-5" />
          Nouvel Actif
        </button>
      </div>

      {/* Filtres et Recherche */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher un actif, ID ou responsable..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 py-3 focus:border-blue-600 outline-none text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 focus:border-blue-600 outline-none text-slate-300"
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
        >
          <option value="Tous">Tous les statuts</option>
          <option value="Critique">Critique</option>
          <option value="Élevé">Élevé</option>
          <option value="Moyen">Moyen</option>
          <option value="Faible">Faible</option>
        </select>
      </div>

      {/* Tableau des Actifs */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-sm">
                <th className="px-6 py-5 text-left font-medium">ID</th>
                <th className="px-6 py-5 text-left font-medium">Nom de l&apos;Actif</th>
                <th className="px-6 py-5 text-left font-medium">Type</th>
                <th className="px-6 py-5 text-left font-medium">Responsable</th>
                <th className="px-6 py-5 text-left font-medium">Statut de Risque</th>
                <th className="px-6 py-5 text-left font-medium">Dernier Scan</th>
                <th className="px-6 py-5 text-left font-medium">Valeur</th>
                <th className="px-6 py-5 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredActifs.map((actif) => (
                <tr key={actif.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="px-6 py-5 font-mono text-sm text-slate-400">{actif.id}</td>
                  <td className="px-6 py-5 font-medium text-white">{actif.nom}</td>
                  <td className="px-6 py-5 text-slate-400">{actif.type}</td>
                  <td className="px-6 py-5 text-slate-300">{actif.responsable}</td>
                  <td className="px-6 py-5">
                    <span className={`inline-block px-4 py-1 text-xs font-medium rounded-full border ${statutColors[actif.statut]}`}>
                      {actif.statut}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-400">{actif.dernierScan}</td>
                  <td className="px-6 py-5 text-emerald-400 font-medium">{actif.valeur}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-3">
                      <button className="p-2 hover:bg-slate-800 rounded-xl text-blue-400 hover:text-blue-500 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-slate-800 rounded-xl text-red-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredActifs.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            Aucun actif trouvé
          </div>
        )}
      </div>

      <div className="text-center text-xs text-slate-500">
        Total des actifs : <span className="text-slate-300">{filteredActifs.length}</span> sur {actifsData.length}
      </div>
    </div>
  );
}