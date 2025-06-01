"use client";

import type React from "react";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { confirmPasswordReset } from "@/lib/firebase/auth";

function ResetPasswordConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (!oobCode) {
      setError("Lien de réinitialisation invalide ou manquant. Veuillez réessayer depuis votre e-mail.");
      setIsVerifying(false);
    } else {
      // Potentiellement, vérifier la validité du oobCode ici avec une fonction Firebase `verifyPasswordResetCode`
      // Pour l'instant, on suppose qu'il est valide s'il est présent.
      // La vraie vérification se fera lors de la soumission du nouveau mot de passe.
      setIsVerifying(false);
    }
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (newPassword !== confirmNewPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (!oobCode) {
      setError("Code de réinitialisation manquant. Impossible de continuer.");
      return;
    }

    setIsLoading(true);
    const result = await confirmPasswordReset(oobCode, newPassword);

    if (result.success) {
      setSuccessMessage("Votre mot de passe a été réinitialisé avec succès ! Vous pouvez maintenant vous connecter.");
      // Optionnel: rediriger automatiquement après quelques secondes
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } else {
      if (result.error?.includes("auth/invalid-action-code")) {
        setError("Le lien de réinitialisation est invalide ou a expiré. Veuillez refaire une demande.");
      } else if (result.error?.includes("auth/weak-password")) {
        setError("Le mot de passe est trop faible. Veuillez en choisir un plus sécurisé (minimum 6 caractères).");
      }
      else {
        setError(result.error || "Échec de la réinitialisation du mot de passe. Veuillez réessayer.");
      }
    }
    setIsLoading(false);
  };

  if (isVerifying) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] px-4 py-10">
        <p>Vérification du lien...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
          <div className="px-6 py-6 border-b border-gray-200/50 dark:border-gray-800/50">
            <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100">
              Choisir un nouveau mot de passe
            </h1>
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
                variant="default"
                className="mb-6 rounded-2xl border-green-500/20 bg-green-50/50 dark:bg-green-900/20 backdrop-blur-xl text-green-700 dark:text-green-300"
              >
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {!successMessage && oobCode && ( // N'afficher le formulaire que si pas de succès et oobCode présent
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="newPassword"
                    className="text-sm font-medium text-gray-900 dark:text-gray-100"
                  >
                    Nouveau mot de passe
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="rounded-xl border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-blue-500/50 dark:focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmNewPassword"
                    className="text-sm font-medium text-gray-900 dark:text-gray-100"
                  >
                    Confirmer le nouveau mot de passe
                  </Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    className="rounded-xl border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-blue-500/50 dark:focus:border-blue-500/50"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !oobCode}
                  className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 transition-colors"
                >
                  {isLoading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
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

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <ResetPasswordConfirmContent />
    </Suspense>
  );
}