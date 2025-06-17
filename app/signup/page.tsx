"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Définit le composant de la page d'inscription.
// Utilisation du hook "useState" de React pour gérer l'état du formulaire.
  // Chaque "useState" crée une variable d'état et une fonction pour la mettre à jour.
// C'est ici que les nouveaux utilisateurs peuvent créer un compte.
export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
// "useAuth" est un hook personnalisé qui nous donne accès aux fonctions d'authentification (comme signup).
  // "useRouter" est un hook de Next.js pour la navigation entre les pages.
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
// Cette fonction est appelée lorsque l'utilisateur soumet le formulaire.
// e.preventDefault() empêche le rechargement de la page, comportement par défaut des formulaires.
    // On réinitialise les erreurs et on active l'indicateur de chargement.
  const [isLoading, setIsLoading] = useState(false);

  const { signup } = useAuth();
// On essaie de créer un compte avec l'email, le mot de passe et le nom d'utilisateur.
      // La fonction "signup" vient de notre "auth-context".
      // Si la création réussit, on redirige l'utilisateur vers la page d'accueil.
  const router = useRouter();
// Si une erreur se produit (par exemple, email déjà utilisé), on l'affiche à l'utilisateur.

// Le bloc "finally" s'exécute toujours, que la création ait réussi ou échoué.
      // On désactive l'indicateur de chargement pour que l'utilisateur puisse interagir à nouveau.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signup(email, password, displayName);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
          <div className="px-6 py-6 border-b border-gray-200/50 dark:border-gray-800/50">
            <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100">
              Create your account
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Join Athemaria and start sharing your stories
            </p>
          </div>

          <div className="p-6">
            {error && (
              <Alert
                variant="destructive"
                className="mb-6 rounded-2xl border-red-500/20 bg-red-50/50 dark:bg-red-900/20 backdrop-blur-xl"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="displayName"
                  className="text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="rounded-xl border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-blue-500/50 dark:focus:border-blue-500/50"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-blue-500/50 dark:focus:border-blue-500/50"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="rounded-xl border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-blue-500/50 dark:focus:border-blue-500/50"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Password must be at least 6 characters long
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 transition-colors"
              >
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </div>

          <div className="px-6 py-4 border-t border-gray-200/50 dark:border-gray-800/50 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
