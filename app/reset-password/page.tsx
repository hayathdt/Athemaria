// @/app/reset-password/page.tsx

// La directive "use client" est essentielle dans Next.js.
// Elle indique que ce composant doit s'exécuter côté client (dans le navigateur de l'utilisateur).
// C'est nécessaire car nous utilisons des "Hooks" React comme `useState` et que nous gérons des interactions utilisateur.
"use client";

// On importe les types et les composants nécessaires depuis React et nos bibliothèques de composants.
import type React from "react";
import { useState } from "react"; // Le Hook `useState` permet de gérer l'état local du composant.
import Link from "next/link"; // Le composant `Link` de Next.js permet de naviguer entre les pages sans recharger la page entière.
import { Button } from "@/components/ui/button"; // Importation du composant bouton personnalisé.
import { Input } from "@/components/ui/input"; // Importation du composant champ de saisie personnalisé.
import { Label } from "@/components/ui/label"; // Importation du composant label personnalisé.
import { AlertCircle, CheckCircle } from "lucide-react"; // Importation d'icônes pour les messages d'alerte.
import { Alert, AlertDescription } from "@/components/ui/alert"; // Importation des composants pour afficher des messages d'alerte.
import { sendPasswordResetEmail } from "@/lib/firebase/auth"; // Importation de la fonction qui communique avec Firebase pour envoyer l'e-mail.

// Définition du composant de la page de réinitialisation de mot de passe.
// C'est une fonction qui retourne du JSX (la structure HTML de la page).
export default function ResetPasswordPage() {
  // --- GESTION DE L'ÉTAT DU COMPOSANT ---
  // `useState` est un "Hook" de React qui permet d'ajouter un état local à un composant fonctionnel.
  // Il retourne une paire de valeurs : l'état actuel et une fonction pour le mettre à jour.

  // Stocke l'adresse e-mail saisie par l'utilisateur.
  const [email, setEmail] = useState("");
  // Stocke le message d'erreur à afficher s'il y en a un.
  const [error, setError] = useState("");
  // Stocke le message de succès à afficher après l'envoi de l'e-mail.
  const [successMessage, setSuccessMessage] = useState("");
  // Gère l'état de chargement pour désactiver le bouton et afficher un message pendant l'envoi.
  const [isLoading, setIsLoading] = useState(false);

  // --- LOGIQUE DE SOUMISSION DU FORMULAIRE ---
  // Cette fonction est appelée lorsque l'utilisateur clique sur le bouton "Envoyer le lien".
  // Le mot-clé `async` indique que la fonction contient des opérations asynchrones (comme un appel à une API).
  const handleSubmit = async (e: React.FormEvent) => {
    // `e.preventDefault()` empêche le comportement par défaut du navigateur, qui serait de recharger la page lors de la soumission d'un formulaire.
    e.preventDefault();

    // On réinitialise les messages d'erreur et de succès à chaque nouvelle tentative.
    setError("");
    setSuccessMessage("");
    // On active l'état de chargement.
    setIsLoading(true);

    // On appelle la fonction `sendPasswordResetEmail` (qui vient de `lib/firebase/auth.ts`).
    // `await` met en pause l'exécution de la fonction jusqu'à ce que la promesse soit résolue (c'est-à-dire que Firebase ait répondu).
    const result = await sendPasswordResetEmail(email);

    // On vérifie si l'envoi a réussi.
    if (result.success) {
      // Si c'est le cas, on affiche un message de succès générique.
      // C'est une bonne pratique de sécurité de ne pas confirmer si une adresse e-mail existe ou non dans la base de données.
      setSuccessMessage("Si un compte existe pour cette adresse e-mail, un lien de réinitialisation a été envoyé.");
      // On vide le champ e-mail pour que l'utilisateur ne puisse pas soumettre à nouveau par erreur.
      setEmail("");
    } else {
      // Si l'envoi a échoué, on gère l'erreur.
      // On vérifie si l'erreur est "auth/user-not-found".
      if (result.error?.includes("auth/user-not-found")) {
        // Même si l'utilisateur n'est pas trouvé, on affiche le message de succès.
        // Cela empêche des personnes malveillantes de deviner quelles adresses e-mail sont inscrites sur le site.
        setSuccessMessage("Si un compte existe pour cette adresse e-mail, un lien de réinitialisation a été envoyé.");
      } else {
        // Pour toutes les autres erreurs, on affiche un message d'erreur générique.
        setError(result.error || "Échec de l'envoi de l'e-mail de réinitialisation. Veuillez réessayer.");
      }
    }
    // Une fois l'opération terminée (succès ou échec), on désactive l'état de chargement.
    setIsLoading(false);
  };

  // --- STRUCTURE JSX DE LA PAGE ---
  // Le `return` contient le code JSX qui définit ce que le composant va afficher à l'écran.
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
            {/* --- AFFICHAGE CONDITIONNEL DES MESSAGES --- */}

            {/* Affiche le message d'erreur seulement si la variable d'état `error` n'est pas vide. */}
            {/* C'est une syntaxe courante en JSX appelée "rendu conditionnel". */}
            {error && (
              <Alert
                variant="destructive" // Variante de style pour une alerte d'erreur.
                className="mb-6 rounded-2xl border-red-500/20 bg-red-50/50 dark:bg-red-900/20 backdrop-blur-xl"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Affiche le message de succès seulement si `successMessage` n'est pas vide. */}
            {successMessage && (
              <Alert
                variant="default" // Variante de style pour une alerte de succès.
                className="mb-6 rounded-2xl border-green-500/20 bg-green-50/50 dark:bg-green-900/20 backdrop-blur-xl text-green-700 dark:text-green-300"
              >
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {/* --- AFFICHAGE CONDITIONNEL DU FORMULAIRE --- */}
            {/* Le formulaire n'est affiché que si aucun message de succès n'a été défini. */}
            {/* Une fois l'e-mail envoyé, le formulaire est masqué pour éviter les soumissions multiples. */}
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
                    // La valeur de l'input est liée à la variable d'état `email`.
                    value={email}
                    // À chaque changement dans le champ, on met à jour l'état `email`.
                    // C'est ce qu'on appelle un "controlled component" (composant contrôlé).
                    onChange={(e) => setEmail(e.target.value)}
                    required // Champ obligatoire pour la soumission du formulaire.
                    className="rounded-xl border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-blue-500/50 dark:focus:border-blue-500/50"
                  />
                </div>

                <Button
                  type="submit"
                  // Le bouton est désactivé si `isLoading` est `true` pour empêcher plusieurs clics.
                  disabled={isLoading}
                  className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 transition-colors"
                >
                  {/* Le texte du bouton change en fonction de l'état de chargement. */}
                  {isLoading ? "Envoi en cours..." : "Envoyer le lien"}
                </Button>
              </form>
            )}

            {/* --- LIEN DE RETOUR --- */}
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