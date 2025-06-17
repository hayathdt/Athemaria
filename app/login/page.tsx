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

// Définit le composant de la page de connexion.
// Utilisation du hook "useState" pour gérer l'état des champs du formulaire (email, mot de passe),
  // ainsi que l'état d'erreur et de chargement.
// C'est ici que les utilisateurs existants peuvent se connecter à leur compte.
export default function LoginPage() {
  const [email, setEmail] = useState("");
// On récupère la fonction "login" de notre contexte d'authentification.
  // Le routeur de Next.js nous permettra de rediriger l'utilisateur après la connexion.
  const [password, setPassword] = useState("");
// Cette fonction asynchrone gère la soumission du formulaire de connexion.
  const [error, setError] = useState("");
// On empêche le rechargement de la page.
    // On s'assure qu'il n'y a pas de message d'erreur affiché et on montre un indicateur de chargement.
  const [isLoading, setIsLoading] = useState(false);

// On tente de connecter l'utilisateur avec l'email et le mot de passe fournis.
      // Si la connexion est réussie, l'utilisateur est redirigé vers la page d'accueil.
  const { login } = useAuth();
  const router = useRouter();
// En cas d'échec (par exemple, mot de passe incorrect), on capture l'erreur et on met à jour l'état "error" pour l'afficher.

// Quoi qu'il arrive, on désactive l'indicateur de chargement à la fin du processus.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to login");
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
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Enter your email and password to access your account
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
                  htmlFor="email"
                  className="text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-blue-500/50 dark:focus:border-blue-500/50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-900 dark:text-gray-100"
                  >
                    Password
                  </Label>
                  <Link
                    href="/reset-password"
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-xl border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-blue-500/50 dark:focus:border-blue-500/50"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 transition-colors"
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </div>

          <div className="px-6 py-4 border-t border-gray-200/50 dark:border-gray-800/50 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
