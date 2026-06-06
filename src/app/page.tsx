// src/app/page.tsx
import Link from 'next/link';
import { Shield, ArrowRight, Lock, Scan, FileText, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">SecuPlatform</h1>
              <p className="text-xs text-slate-400">Ministère du Numérique</p>
            </div>
          </div>
          <Link
            href="/auth/login"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Connexion
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900/30 border border-blue-800/50 rounded-full text-blue-400 text-sm">
            <Lock className="w-4 h-4" />
            Plateforme d&apos;audit de sécurité
          </div>

          <h2 className="text-5xl font-bold text-white leading-tight">
            Sécurisez votre infrastructure{' '}
            <span className="text-blue-500">numérique</span>
          </h2>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Gestion centralisée des vulnérabilités, scans automatisés et conformité réglementaire pour le Ministère du Numérique.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Link
              href="/auth/login"
              className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-blue-900/20"
            >
              Accéder à la plateforme
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
              <div className="w-12 h-12 bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                <Scan className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Scans Automatisés</h3>
              <p className="text-sm text-slate-400">Nuclei, OpenVAS, Grype et plus pour détecter les vulnérabilités en temps réel.</p>
            </div>

            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
              <div className="w-12 h-12 bg-emerald-900/30 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Conformité</h3>
              <p className="text-sm text-slate-400">Suivi des contrôles de conformité et génération de rapports d&apos;audit.</p>
            </div>

            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
              <div className="w-12 h-12 bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Gestion d&apos;Équipe</h3>
              <p className="text-sm text-slate-400">Assignation des vulnérabilités et suivi des plans de correction.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center">
        <p className="text-sm text-slate-500">
          © 2026 Ministère du Numérique. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}