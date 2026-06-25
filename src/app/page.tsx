// src/app/page.tsx
'use client';
import Link from 'next/link';
import { Shield, ArrowRight, Lock, Scan, FileText, Users, CheckCircle } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">SecuPlatform</h1>
              <p className="text-xs text-slate-400 -mt-1">Ministère du Numérique</p>
            </div>
          </div>

          <Link
            href="/auth/login"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all active:scale-95"
          >
            Connexion
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-5xl mx-auto text-center space-y-10">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-950/50 border border-blue-800 rounded-full text-blue-400 text-sm font-medium">
            <Lock className="w-4 h-4" />
            Plateforme de Sécurité Nationale
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-white leading-tight tracking-tight">
            Protégez l&apos;avenir numérique<br />
            <span className="text-blue-500">du Ministère</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Une solution complète de gestion des vulnérabilités, scans automatisés 
            et conformité réglementaire pour renforcer la cybersécurité de l&apos;État.
          </p>

          <div className="flex items-center justify-center gap-4 pt-6">
            <Link
              href="/auth/login"
              className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-blue-900/30"
            >
              Accéder à la plateforme
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-8 pt-8 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>Conforme ISO 27001</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>Sécurisé par l&apos;État</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>Support 24/7</span>
            </div>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold text-white">Fonctionnalités principales</h2>
          <p className="text-slate-400 mt-3">Une plateforme pensée pour la cybersécurité gouvernementale</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="group p-8 bg-slate-900 border border-slate-800 rounded-3xl hover:border-blue-600/50 transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Scan className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">Scans Automatisés</h3>
            <p className="text-slate-400 leading-relaxed">
              Détection continue des vulnérabilités avec les meilleurs outils open-source (Nuclei, OpenVAS, etc.).
            </p>
          </div>

          <div className="group p-8 bg-slate-900 border border-slate-800 rounded-3xl hover:border-emerald-600/50 transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <FileText className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">Conformité & Audit</h3>
            <p className="text-slate-400 leading-relaxed">
              Suivi en temps réel de la conformité réglementaire et génération automatique de rapports d&apos;audit.
            </p>
          </div>

          <div className="group p-8 bg-slate-900 border border-slate-800 rounded-3xl hover:border-purple-600/50 transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">Gestion Collaborative</h3>
            <p className="text-slate-400 leading-relaxed">
              Assignation intelligente des vulnérabilités et suivi des plans de correction par équipe.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-10 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-500">
            © {new Date().getFullYear()} Ministère du Numérique • SecuPlatform
          </p>
          <p className="text-xs text-slate-600 mt-2">
            Plateforme sécurisée - Accès strictement réservé
          </p>
        </div>
      </footer>
    </div>
  );
}