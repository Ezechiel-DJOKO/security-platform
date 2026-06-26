"use client";
import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { Shield, Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Nettoyage de l'erreur quand l'utilisateur tape
  useEffect(() => {
    if (error) setError("");
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Identifiants incorrects. Veuillez réessayer.");
      } else if (result?.ok) {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-900/20 rounded-full mix-blend-screen filter blur-xl opacity-70 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-900/20 rounded-full mix-blend-screen filter blur-xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute top-40 left-40 w-80 h-80 bg-cyan-900/20 rounded-full mix-blend-screen filter blur-xl opacity-70 animate-blob animation-delay-4000" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-8 pt-10 pb-16">
            <div className="relative flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/5 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 border border-white/10 shadow-lg">
                <Shield className="w-8 h-8 text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Plateforme Sécurité
              </h1>
              <p className="text-blue-300 text-sm mt-1 font-medium">
                Ministère du Numérique
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="px-8 pb-8 pt-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-100">Connexion sécurisée</h2>
              <p className="text-sm text-slate-400 mt-1">
                Accédez à votre espace d&apos;audit de sécurité
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 p-4 bg-red-950/50 border border-red-900/50 rounded-xl text-red-400 text-sm animate-shake">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-300 ml-1">Adresse email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className={`w-5 h-5 transition-colors ${focusedField === 'email' ? 'text-blue-400' : 'text-slate-500'}`} />
                  </div>
                  <input
                    type="email"
                    placeholder="prenom.nom@numerique.gouv.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    required
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border-2 border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-sm font-semibold text-slate-300">Mot de passe</label>
                  <a href="#" className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                    Mot de passe oublié ?
                  </a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className={`w-5 h-5 transition-colors ${focusedField === 'password' ? 'text-blue-400' : 'text-slate-500'}`} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    required
                    disabled={isLoading}
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-800/50 border-2 border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit button - Version anti-hydratation */}
<button
  type="submit"
  disabled={Boolean(isLoading || email.trim() === "" || password.trim() === "")}
  className="w-full group relative py-3.5 px-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:via-indigo-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 overflow-hidden"
>
  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
  <span className="relative flex items-center justify-center gap-2">
    {isLoading ? (
      <>
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Connexion en cours...
      </>
    ) : (
      <>
        Se connecter
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </>
    )}
  </span>
</button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <Lock className="w-3.5 h-3.5" />
                <span>Connexion sécurisée • Chiffrement AES-256</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © 2026 Ministère du Numérique. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}