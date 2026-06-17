'use client';
import { useEffect, useState } from 'react';

export default function StatsPlans() {
  const [stats, setStats] = useState({
    TOTAL: 0,
    EN_COURS: 0,
    A_VALIDER: 0,
    TERMINE: 0,
    EN_RETARD: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/plans-correction/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { label: "En cours", value: stats.EN_COURS, color: "blue", icon: "⏳" },
    { label: "À valider", value: stats.A_VALIDER, color: "yellow", icon: "⚠️" },
    { label: "Terminés", value: stats.TERMINE, color: "green", icon: "✅" },
    { label: "En retard", value: stats.EN_RETARD, color: "red", icon: "🚨" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">{card.label}</p>
              <p className="text-4xl font-bold text-white mt-2">
                {loading ? '...' : card.value}
              </p>
            </div>
            <div className="text-4xl opacity-80">{card.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}