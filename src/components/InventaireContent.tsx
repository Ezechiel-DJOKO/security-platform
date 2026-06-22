'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import ActifModal from './actifs/ActifModal';

interface Actif {
  id: string;
  nom: string;
  type: string;
  adresseIP?: string | null;
  criticite: string;
  dernierScan?: string | null;
  hostname?: string | null;
}

interface ActifFormData {
  nom: string;
  type: string;
  adresseIP?: string;
  criticite: string;
  localisation?: string;
}

export default function InventaireContent() {
  const { data: session, status } = useSession();
  
  const [actifs, setActifs] = useState<Actif[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCriticite, setFilterCriticite] = useState('Tous');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActif, setEditingActif] = useState<Actif | null>(null);

  // Fetch des actifs
  const fetchActifs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterCriticite !== 'Tous') params.append('criticite', filterCriticite);

      const res = await fetch(`/api/actifs?${params}`);
      const result = await res.json();

      if (result.success) {
        setActifs(result.data || []);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des actifs:", error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterCriticite]);

  // Use effect with proper mount/unmount handling
  useEffect(() => {
    let isMounted = true;
    
    const loadActifs = async () => {
      if (isMounted) {
        await fetchActifs();
      }
    };
    
    loadActifs();
    
    return () => {
      isMounted = false;
    };
  }, [fetchActifs]);

  const handleCreateOrUpdate = async (data: ActifFormData) => {
    try {
      const method = editingActif ? 'PUT' : 'POST';
      const payload = editingActif ? { ...data, id: editingActif.id } : data;

      const res = await fetch('/api/actifs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchActifs();
        alert(editingActif ? "Actif modifié avec succès !" : "Actif créé avec succès !");
        setIsModalOpen(false);
        setEditingActif(null);
      } else {
        const error = await res.json();
        alert(error.error || "Erreur lors de l'opération");
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'opération");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet actif ?")) return;

    try {
      const res = await fetch('/api/actifs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        await fetchActifs();
        alert("Actif supprimé avec succès");
      } else {
        alert("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la suppression");
    }
  };

  if (status === "loading" || loading) {
    return <div className="flex items-center justify-center h-96 text-slate-400">Chargement de l'inventaire...</div>;
  }

  if (!session) {
    return <div className="text-center py-12 text-amber-500">Vous devez être connecté pour accéder à l'inventaire.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Inventaire des Actifs</h1>
          <p className="text-slate-400 mt-1">Gestion et suivi de tous les actifs informatiques</p>
        </div>
        <button
          onClick={() => { setEditingActif(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-2xl font-medium text-white transition-all"
        >
          <Plus className="w-5 h-5" />
          Nouvel Actif
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher par nom, ID, IP..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 py-3 focus:border-blue-600 outline-none text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 focus:border-blue-600 outline-none text-slate-300"
          value={filterCriticite}
          onChange={(e) => setFilterCriticite(e.target.value)}
        >
          <option value="Tous">Toutes criticités</option>
          <option value="CRITIQUE">Critique</option>
          <option value="ELEVE">Élevé</option>
          <option value="MOYEN">Moyen</option>
          <option value="BAS">Faible</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden">
        <DataTable
          data={actifs}
          columns={[
            { accessor: 'id', header: 'ID' },
            { accessor: 'nom', header: "Nom de l'actif" },
            { accessor: 'type', header: 'Type' },
            { accessor: 'adresseIP', header: 'Adresse IP' },
            {
              accessor: (actif) => <StatusBadge status={actif.criticite} />,
              header: 'Criticité'
            },
            { accessor: 'dernierScan', header: 'Dernier Scan' },
            {
              accessor: (actif) => (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingActif(actif); setIsModalOpen(true); }}
                    className="p-2 hover:bg-slate-800 rounded-xl text-blue-400 hover:text-blue-500 transition-colors"
                    aria-label="Modifier l'actif"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(actif.id)}
                    className="p-2 hover:bg-slate-800 rounded-xl text-red-400 hover:text-red-500 transition-colors"
                    aria-label="Supprimer l'actif"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ),
              header: 'Actions'
            },
          ]}
        />
      </div>

      <div className="text-center text-xs text-slate-500">
        Total : <span className="text-slate-300">{actifs.length}</span> actifs
      </div>

      {/* Modal */}
      <ActifModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingActif(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingActif}
        mode={editingActif ? 'edit' : 'create'}
      />
    </div>
  );
}