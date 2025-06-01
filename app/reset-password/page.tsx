"use client";

import type React from "react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sendPasswordResetEmail } from "@/lib/firebase/auth"; // Importer la fonction

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    const result = await sendPasswordResetEmail(email);

    if (result.success) {
      setSuccessMessage("Si un compte existe pour cette adresse e-mail, un lien de réinitialisation a été envoyé.");
      setEmail(""); // Vider le champ email après succès
    } else {
      // Gérer les erreurs spécifiques de Firebase si nécessaire, sinon message générique
      if (result.error?.includes("auth/user-not-found")) {
        // On peut choisir d'afficher le même message de succès pour ne pas révéler si un email existe ou non
        setSuccessMessage("Si un compte existe pour cette adresse e-mail, un lien de réinitialisation a été envoyé.");
      } else {
        setError(result.error || "Échec de l'envoi de l'e-mail de réinitialisation. Veuillez réessayer.");
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
          <div className="px-6 py-6 border-b border-gray-200/50 dark:border-gray-800/50">
            <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100">
              Réinitialiser le mot de passe
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.
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
            {successMessage && (
              <Alert
                variant="default" // Ou une variante "success" si disponible/créée
                className="mb-6 rounded-2xl border-green-500/20 bg-green-50/50 dark:bg-green-900/20 backdrop-blur-xl text-green-700 dark:text-green-300"
              >
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {!successMessage && ( // N'afficher le formulaire que si aucun message de succès n'est affiché
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-900 dark:text-gray-100"
                  >
                    Adresse e-mail
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

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 transition-colors"
                >
                  {isLoading ? "Envoi en cours..." : "Envoyer le lien"}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
              >
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}