// "use client" indique à Next.js que ce composant est un "Client Component".
// Cela signifie qu'il peut utiliser des hooks React comme useState et useEffect,
// et qu'il sera exécuté dans le navigateur de l'utilisateur, le rendant interactif.
"use client";

// Importations des modules et composants nécessaires.
import type React from "react";
// useState est un hook pour gérer l'état local du composant. ChangeEvent est un type pour les événements de formulaire.
import { useState, ChangeEvent } from "react";
// useRouter est un hook de Next.js pour la navigation programmatique (changer de page).
import { useRouter } from "next/navigation";
// useAuth est un hook personnalisé pour accéder aux informations de l'utilisateur connecté.
import { useAuth } from "@/lib/auth-context";
// Importation des composants d'interface utilisateur (boutons, champs de saisie, etc.)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// Importation d'icônes pour l'interface.
import { AlertCircle, BookOpen, Upload } from "lucide-react";
// Composants pour afficher des messages d'alerte.
import { Alert, AlertDescription } from "@/components/ui/alert";
// AuthCheck est un composant qui vérifie si l'utilisateur est connecté avant d'afficher son contenu.
import AuthCheck from "@/components/auth-check";
// Fonctions pour obtenir l'URL de la couverture par défaut et pour téléverser une image de couverture sur Firebase Storage.
import { getDefaultCoverUrlSync } from "@/lib/hooks/use-default-cover";
import { uploadStoryCover } from "@/lib/firebase/storage";

// Définition du composant de la page de création d'histoire.
export default function CreateStoryPage() {
  // Utilisation du hook useState pour déclarer les variables d'état du formulaire.
  // Chaque `useState` crée une variable (ex: `title`) et une fonction pour la mettre à jour (ex: `setTitle`).
  const [title, setTitle] = useState(""); // Pour le titre de l'histoire
  const [description, setDescription] = useState(""); // Pour la description
  const [genre1, setGenre1] = useState(""); // Pour le premier genre
  const [genre2, setGenre2] = useState(""); // Pour le deuxième genre (optionnel)
  const [genre3, setGenre3] = useState(""); // Pour le troisième genre (optionnel)
  const [tags, setTags] = useState(""); // Pour les tags (mots-clés)
  const [coverImageUrl, setCoverImageUrl] = useState(""); // Pour l'URL de l'image de couverture si saisie manuellement
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // Pour le fichier image de couverture si téléversé
  const [filePreview, setFilePreview] = useState<string | null>(null); // Pour l'aperçu de l'image téléversée
  const [error, setError] = useState(""); // Pour stocker les messages d'erreur
  const [isLoading, setIsLoading] = useState(false); // Pour savoir si une opération (ex: envoi) est en cours

  // Utilisation des hooks personnalisés et de Next.js
  const { user } = useAuth(); // Récupère l'objet `user` si l'utilisateur est connecté.
  const router = useRouter(); // Permet de rediriger l'utilisateur vers d'autres pages.

  // Fonction appelée lorsqu'un utilisateur sélectionne un fichier image.
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    // On vérifie s'il y a bien un fichier sélectionné.
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file); // On stocke le fichier dans l'état.
      setCoverImageUrl(""); // On vide l'URL manuelle, car le fichier a la priorité.
      
      // FileReader est un objet JavaScript natif pour lire le contenu des fichiers.
      const reader = new FileReader();
      // `onloadend` est appelé quand la lecture du fichier est terminée.
      reader.onloadend = () => {
        // On met à jour l'état `filePreview` avec le résultat de la lecture (une URL de données base64),
        // ce qui permet d'afficher une prévisualisation de l'image.
        setFilePreview(reader.result as string);
      };
      // Lance la lecture du fichier pour le convertir en une URL de données.
      reader.readAsDataURL(file);
    } else {
      // S'il n'y a pas de fichier, on réinitialise les états correspondants.
      setSelectedFile(null);
      setFilePreview(null);
    }
  };

  // Fonction appelée lors de la soumission du formulaire.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Empêche le rechargement de la page, comportement par défaut des formulaires.
    setError(""); // Réinitialise les erreurs précédentes.

    // Vérification de sécurité : l'utilisateur doit être connecté.
    if (!user) {
      setError("You must be logged in to create a story");
      return; // Arrête l'exécution de la fonction.
    }

    // Validation simple : les champs principaux doivent être remplis.
    if (!title || !description || !genre1) {
      setError("Please fill out title, description, and select at least one genre.");
      return;
    }

    setIsLoading(true); // On passe en mode "chargement" pour désactiver le bouton et informer l'utilisateur.
    let finalCoverImageUrl = getDefaultCoverUrlSync(); // On prend l'URL par défaut au cas où aucune image n'est fournie.

    try {
      // Si un fichier a été sélectionné, on le téléverse.
      if (selectedFile) {
        // On crée un identifiant unique pour l'histoire pour éviter les conflits de noms de fichiers.
        const uniqueStoryIdentifier = `${user.uid}-${Date.now()}`;
        // On appelle la fonction qui gère le téléversement sur Firebase Storage.
        finalCoverImageUrl = await uploadStoryCover(selectedFile, uniqueStoryIdentifier);
      } else if (coverImageUrl) {
        // Sinon, si une URL a été entrée manuellement, on l'utilise.
        finalCoverImageUrl = coverImageUrl;
      }

      // On rassemble les genres sélectionnés dans un tableau.
      const selectedGenres: string[] = [];
      if (genre1) selectedGenres.push(genre1);
      if (genre2) selectedGenres.push(genre2);
      if (genre3) selectedGenres.push(genre3);

      // On traite la chaîne de tags pour en faire un tableau de tags propres.
      const processedTags: string[] = tags
        .split(",") // Sépare la chaîne par les virgules.
        .map((tag) => tag.trim()) // Enlève les espaces avant/après chaque tag.
        .filter((tag) => tag !== ""); // Retire les tags vides.

      // Au lieu de créer l'histoire directement dans la base de données,
      // on sauvegarde les informations dans le `localStorage` du navigateur.
      // C'est une étape intermédiaire avant de passer à l'éditeur de texte.
      localStorage.setItem(
        "pendingStory", // La clé sous laquelle les données sont sauvegardées.
        JSON.stringify({ // Les données de l'histoire, converties en chaîne JSON.
          title,
          description,
          genres: selectedGenres,
          tags: processedTags,
          status: "draft" as const, // Le statut initial est "brouillon".
          coverImage: finalCoverImageUrl,
        })
      );
      // Une fois les données sauvegardées, on redirige l'utilisateur vers la page d'écriture.
      router.push("/write");

    } catch (err: any) {
      // En cas d'erreur (ex: échec du téléversement de l'image), on l'affiche.
      console.error("Failed to upload cover image or create story:", err);
      setError(err.message || "Failed to process story creation. Please try again.");
    } finally {
      // `finally` s'exécute toujours, que `try` ait réussi ou échoué.
      // On désactive le mode "chargement".
      setIsLoading(false);
    }
  };

  // Le JSX qui définit la structure visuelle de la page.
  return (
    // Le composant AuthCheck s'assure que l'utilisateur est connecté.
    // S'il ne l'est pas, il affichera un message ou le redirigera.
    <AuthCheck>
      {/* Structure principale de la page avec des styles pour le fond. */}
      <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-white dark:from-amber-950/30 dark:via-gray-900 dark:to-gray-900">
        <div className="container relative mx-auto px-4 py-12">
          {/* Éléments purement décoratifs pour l'arrière-plan. */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
          >
            <div className="absolute left-0 top-1/4 h-[300px] w-[400px] rounded-full bg-gradient-to-br from-amber-200/20 to-orange-100/10 blur-3xl dark:from-amber-900/10 dark:to-orange-900/5" />
            <div className="absolute right-0 bottom-1/4 h-[250px] w-[350px] rounded-full bg-gradient-to-br from-orange-100/20 to-amber-200/10 blur-3xl dark:from-orange-900/10 dark:to-amber-900/5" />
          </div>

          {/* Conteneur principal du formulaire. */}
          <div className="relative max-w-2xl mx-auto">
            <div className="rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-amber-200/30 dark:border-amber-800/30 shadow-2xl">
              {/* En-tête du formulaire */}
              <div className="px-6 py-6 border-b border-amber-200/30 dark:border-amber-800/30">
                <h1 className="font-serif text-3xl font-medium text-amber-900 dark:text-amber-100">
                  Create a New Story
                </h1>
                <p className="mt-1.5 text-sm text-amber-800/80 dark:text-amber-200/80">
                  Share your creativity with the world
                </p>
              </div>

              {/* Corps du formulaire */}
              <div className="p-6">
                {/* Affichage conditionnel du message d'erreur. `error && ...` signifie : "si `error` n'est pas vide, alors affiche ce qui suit". */}
                {error && (
                  <Alert
                    variant="destructive"
                    className="mb-6 rounded-2xl border-red-500/20 bg-red-50/50 dark:bg-red-900/20 backdrop-blur-xl"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* La balise <form> avec le gestionnaire d'événement `onSubmit`. */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Champ pour le titre */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="title"
                      className="text-sm font-medium text-amber-900 dark:text-amber-100"
                    >
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={title} // La valeur du champ est liée à l'état `title`.
                      onChange={(e) => setTitle(e.target.value)} // Met à jour l'état à chaque frappe.
                      placeholder="Enter your story title"
                      required // Champ obligatoire.
                      className="rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50"
                    />
                  </div>

                  {/* Champ pour le Genre 1 (liste déroulante) */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="genre1"
                      className="text-sm font-medium text-amber-900 dark:text-amber-100"
                    >
                      Genre 1
                    </Label>
                    <select
                      id="genre1"
                      value={genre1}
                      onChange={(e) => setGenre1(e.target.value)}
                      required
                      className="w-full rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50 p-2 text-sm text-foreground"
                    >
                      <option value="" className="text-muted-foreground">Select a genre</option>
                      {/* On génère dynamiquement les options de la liste à partir d'un tableau de genres. */}
                      {[
                        "Fantasy", "Sci-Fi", "Romance", "Mystery", "Thriller",
                        "Horror", "Historical", "Contemporary", "Young Adult",
                        "Adventure", "Literary Fiction"
                      ].map(g => <option key={g} value={g} className="text-foreground">{g}</option>)}
                    </select>
                  </div>

                  {/* Champ pour le Genre 2 (optionnel) */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="genre2"
                      className="text-sm font-medium text-amber-900 dark:text-amber-100"
                    >
                      Genre 2 (Optional)
                    </Label>
                    <select
                      id="genre2"
                      value={genre2}
                      onChange={(e) => setGenre2(e.target.value)}
                      className="w-full rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50 p-2 text-sm text-foreground"
                    >
                      <option value="" className="text-muted-foreground">Select a genre</option>
                      {[
                        "Fantasy", "Sci-Fi", "Romance", "Mystery", "Thriller",
                        "Horror", "Historical", "Contemporary", "Young Adult",
                        "Adventure", "Literary Fiction"
                      ].map(g => <option key={g} value={g} className="text-foreground">{g}</option>)}
                    </select>
                  </div>

                  {/* Champ pour le Genre 3 (optionnel) */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="genre3"
                      className="text-sm font-medium text-amber-900 dark:text-amber-100"
                    >
                      Genre 3 (Optional)
                    </Label>
                    <select
                      id="genre3"
                      value={genre3}
                      onChange={(e) => setGenre3(e.target.value)}
                      className="w-full rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50 p-2 text-sm text-foreground"
                    >
                      <option value="" className="text-muted-foreground">Select a genre</option>
                      {[
                        "Fantasy", "Sci-Fi", "Romance", "Mystery", "Thriller",
                        "Horror", "Historical", "Contemporary", "Young Adult",
                        "Adventure", "Literary Fiction"
                      ].map(g => <option key={g} value={g} className="text-foreground">{g}</option>)}
                    </select>
                  </div>
                  
                  {/* Champ pour les tags */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="tags"
                      className="text-sm font-medium text-amber-900 dark:text-amber-100"
                    >
                      Tags (comma-separated)
                    </Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="e.g., magic, space opera, high school"
                      className="rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50"
                    />
                  </div>

                  {/* Champ pour la description */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium text-amber-900 dark:text-amber-100"
                    >
                      Story Description
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter a brief summary of your story..."
                      className="min-h-[100px] rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50"
                      required
                    />
                  </div>

                  {/* Section pour l'image de couverture */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="coverImageFile"
                      className="text-sm font-medium text-amber-900 dark:text-amber-100"
                    >
                      Cover Image (Optional)
                    </Label>
                    {/* Champ de type "file" pour téléverser une image */}
                    <Input
                      id="coverImageFile"
                      type="file"
                      accept="image/*" // N'accepte que les fichiers de type image.
                      onChange={handleFileChange} // Appelle notre fonction de gestion de fichier.
                      className="h-14 p-3 rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200"
                      disabled={isLoading} // Désactivé pendant le chargement.
                    />
                    {/* Affiche la prévisualisation si une image a été sélectionnée. */}
                    {filePreview && (
                      <div className="mt-2">
                        <img src={filePreview} alt="Cover preview" className="max-h-40 rounded-lg object-cover" />
                      </div>
                    )}
                    {/* Si aucun fichier n'est sélectionné, on affiche l'option pour entrer une URL. */}
                    {!selectedFile && (
                        <>
                            <p className="text-xs text-center text-amber-700/70 dark:text-amber-300/70 my-1">OR</p>
                            <Input
                              id="coverImageUrlInput"
                              type="url"
                              value={coverImageUrl}
                              onChange={(e) => {
                                setCoverImageUrl(e.target.value);
                                setSelectedFile(null); // On s'assure que l'état du fichier est vide.
                                setFilePreview(null);
                              }}
                              placeholder="Enter image URL"
                              className="rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50"
                              disabled={isLoading}
                            />
                        </>
                    )}
                    <p className="text-xs text-amber-700/70 dark:text-amber-300/70 mt-1">
                      Upload an image or provide a URL. If neither, a default cover will be used.
                    </p>
                  </div>

                  {/* Bouton de soumission du formulaire */}
                  <Button
                    type="submit"
                    disabled={isLoading} // Désactivé si `isLoading` est vrai.
                    className="w-full rounded-xl bg-amber-800 hover:bg-amber-700 text-amber-50 dark:bg-amber-700 dark:hover:bg-amber-600 font-medium py-2.5 transition-colors shadow-lg shadow-amber-900/20 dark:shadow-amber-900/10"
                  >
                    {/* Le texte du bouton change si on est en mode chargement. */}
                    {isLoading ? "Processing..." : "Start Writing"}
                  </Button>
                </form>
              </div>
            </div>

            {/* Icône de livre décorative sous le formulaire. */}
            <div className="mt-8 flex justify-center opacity-60">
              <BookOpen className="h-8 w-8 text-amber-800/30 dark:text-amber-200/30" />
            </div>
          </div>
        </div>
      </div>
    </AuthCheck>
  );
}
