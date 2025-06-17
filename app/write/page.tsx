"use client";

// --- IMPORTATIONS ---
// Ici, on importe toutes les "briques" nécessaires pour construire notre page.
// Par exemple, `useState` et `useEffect` sont des "Hooks" de React pour gérer l'état et les effets de bord.
// On importe aussi des composants d'interface (Button, Input) et des fonctions pour interagir avec la base de données (createStory, etc.).
import { useState, useEffect, ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createStory, updateStory, getStory } from "@/lib/firebase/firestore";
import { Chapter } from "@/lib/types"; 
import { v4 as uuidv4 } from "uuid"; 
import Editor from "../create-story/editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; 
import { AlertCircle, BookOpen, Save, PlusCircle, Trash2, ArrowUp, ArrowDown, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AuthCheck from "@/components/auth-check";
import { Label } from "@/components/ui/label";
import { uploadStoryCover, deleteFile } from "@/lib/firebase/storage";
import { getDefaultCoverUrlSync } from "@/lib/hooks/use-default-cover";
import { Textarea } from "@/components/ui/textarea";

// --- COMPOSANT PRINCIPAL : WritePage ---
// C'est le cœur de notre page d'écriture. Un "composant" en React est un morceau d'interface utilisateur
// indépendant et réutilisable. Celui-ci gère tout : les détails de l'histoire, les chapitres, la sauvegarde, etc.
export default function WritePage() {

  // --- ÉTATS DU COMPOSANT (States) ---
  // Les "états" sont des variables spéciales dans React. Quand leur valeur change,
  // le composant se met à jour automatiquement pour afficher les nouveautés.

  // Gère la liste de tous les chapitres de l'histoire.
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number | null>(
    null
  );
  // Gère le titre du chapitre en cours d'édition.
  const [currentChapterTitle, setCurrentChapterTitle] = useState<string>("");
  // Stocke les messages d'erreur à afficher à l'utilisateur.
  const [error, setError] = useState("");
  // Permet de savoir si une sauvegarde est en cours (pour désactiver les boutons par exemple).
  const [isSaving, setIsSaving] = useState(false);


  // États pour les détails généraux de l'histoire (titre, description, etc.).
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [coverImage, setCoverImage] = useState<string>("");
  const [initialCoverImage, setInitialCoverImage] = useState<string>("");
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [coverFilePreview, setCoverFilePreview] = useState<string | null>(null);
  const [storyGenres, setStoryGenres] = useState<string[]>([]);
  const [storyTags, setStoryTags] = useState<string[]>([]);
 
  const [genre1, setGenre1] = useState<string>("");
  const [genre2, setGenre2] = useState<string>("");
  const [genre3, setGenre3] = useState<string>("");
  const [tagsInput, setTagsInput] = useState<string>("");


  // --- HOOKS DE NEXT.JS ET D'AUTHENTIFICATION ---
  // Les "Hooks" sont des fonctions qui nous "accrochent" à des fonctionnalités de React ou de ses frameworks (comme Next.js).

  const { user } = useAuth(); // Récupère les informations de l'utilisateur connecté.
  const router = useRouter(); // Permet de naviguer entre les pages (redirection).
  const searchParams = useSearchParams(); // Permet de lire les paramètres dans l'URL (ex: ?id=123).
  const storyId = searchParams.get("id"); // On récupère l'ID de l'histoire depuis l'URL. S'il existe, on est en mode "édition".

  // --- EFFETS DE BORD (Side Effects) ---
  // Les `useEffect` permettent d'exécuter du code à des moments précis,
  // par exemple quand le composant s'affiche ou quand une variable d'état change.

  // Cet effet se déclenche si un `storyId` est trouvé dans l'URL.
  // Son but est de charger les données d'une histoire existante depuis la base de données (Firebase) pour l'éditer.
  useEffect(() => {
    if (storyId) {
      const loadStory = async () => {
        try {
          const loadedStory = await getStory(storyId);
          // On vérifie que l'histoire a bien été chargée et que l'utilisateur connecté en est bien l'auteur.
          if (loadedStory && loadedStory.authorId === user?.uid) {

            setTitle(loadedStory.title || "");
            setDescription(loadedStory.description || "");
            const loadedCover = loadedStory.coverImage || "";
            setCoverImage(loadedCover);
            setInitialCoverImage(loadedCover);
            const currentGenres = loadedStory.genres || [];
            setStoryGenres(currentGenres);
            setGenre1(currentGenres[0] || "");
            setGenre2(currentGenres[1] || "");
            setGenre3(currentGenres[2] || "");
            const currentTags = loadedStory.tags || [];
            setStoryTags(currentTags);
            setTagsInput(currentTags.join(", "));

            // Si l'histoire a des chapitres, on les charge.
            if (loadedStory.chapters && loadedStory.chapters.length > 0) {
              setChapters(loadedStory.chapters);
              setCurrentChapterIndex(0);
              setCurrentChapterTitle(loadedStory.chapters[0].title);
            } else {
              // Sinon, on crée un premier chapitre par défaut pour que l'éditeur ne soit pas vide.
              const defaultChapter: Chapter = {
                id: uuidv4(),
                title: "Chapter 1",
                content: "",
                order: 1,
              };
              setChapters([defaultChapter]);
              setCurrentChapterIndex(0);
              setCurrentChapterTitle(defaultChapter.title);
            }
          } else if (!loadedStory && storyId) {
             setError("Failed to load the story. It might not exist or you may not have permission.");
          }
        } catch (err: any) {
          setError("Failed to load the story: " + (err.message || "Unknown error"));
        }
      };
      loadStory();
    }
  }, [storyId, user?.uid]);


  // Cet effet s'occupe du cas où l'on crée une nouvelle histoire (pas de `storyId`).
  // Il s'assure qu'il y a toujours au moins un chapitre pour commencer.
  useEffect(() => {
    if (!storyId && user?.uid) {
      // Note : Le code pour restaurer une histoire non sauvegardée depuis le localStorage a été retiré
      // dans les versions plus récentes, mais s'il était là, il tenterait de charger
      // des données locales pour éviter à l'utilisateur de perdre son travail.
      const pendingStoryString = localStorage.getItem("pendingStory");
      if (pendingStoryString) {
        const pendingStoryData = JSON.parse(pendingStoryString);
        setTitle(pendingStoryData.title || "");
        setDescription(pendingStoryData.description || "");
        const pendingCover = pendingStoryData.coverImage || "";
        setCoverImage(pendingCover);
        setInitialCoverImage(pendingCover);
        const currentGenres = pendingStoryData.genres || [];
        setStoryGenres(currentGenres);
        setGenre1(currentGenres[0] || "");
        setGenre2(currentGenres[1] || "");
        setGenre3(currentGenres[2] || "");
        const currentTags = pendingStoryData.tags || [];
        setStoryTags(currentTags);
        setTagsInput(currentTags.join(", "));
      }


      // S'il n'y a aucun chapitre (par exemple, au premier chargement pour une nouvelle histoire),
      // on en crée un par défaut pour que l'utilisateur puisse commencer à écrire immédiatement.
      if (chapters.length === 0) {
      const defaultChapter: Chapter = {
        id: uuidv4(),
        title: "Chapter 1",
        content: "",
        order: 1,
      };
      setChapters([defaultChapter]);
      setCurrentChapterIndex(0);
      setCurrentChapterTitle(defaultChapter.title);
    }
    }
  }, [storyId, user?.uid, chapters.length]);

  // --- GESTIONNAIRES D'ÉVÉNEMENTS (Event Handlers) ---
  // Ce sont les fonctions qui sont appelées en réponse à une action de l'utilisateur (clic, saisie, etc.).

  // Cette fonction est appelée quand l'utilisateur choisit un fichier pour la couverture de son histoire.
  const handleCoverFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedCoverFile(file);
      setCoverImage("");
      // On utilise l'API FileReader du navigateur pour lire le fichier image
      // et créer une URL locale temporaire. Cela permet d'afficher un aperçu de l'image
      // avant même qu'elle ne soit envoyée sur le serveur.
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedCoverFile(null);
      setCoverFilePreview(null);
    }
  };

  // La fonction `handleSave` est la plus importante. Elle gère la sauvegarde de l'histoire,
  // que ce soit en tant que brouillon ('draft') ou publiée ('published').
  // Le mot-clé "async" indique que cette fonction contient des opérations qui peuvent prendre du temps (comme parler à une base de données).
  const handleSave = async (status: "draft" | "published") => {
    // Vérifications initiales : on s'assure que l'utilisateur est connecté
    // et que l'histoire a bien des chapitres avant de tenter de sauvegarder.
    if (!user) {
      setError("You must be logged in to save.");
      return;
    }
    if (chapters.length === 0 || currentChapterIndex === null) {
      setError("Cannot save: No chapters or no chapter selected.");
      return;
    }

    setIsSaving(true);
    setError("");

    // --- GESTION DE L'IMAGE DE COUVERTURE ---
    // Cette partie est un peu complexe car elle doit gérer plusieurs cas.
    let finalCoverImageUrl = initialCoverImage || getDefaultCoverUrlSync(); // On part du principe qu'on garde l'image actuelle ou une image par défaut.
    let newCoverPath: string | null = null;



    try {
      // Cas 1 : L'utilisateur a sélectionné un NOUVEAU fichier image.
      if (selectedCoverFile) {

        const uniquePathSegment = storyId || `${user.uid}-${Date.now()}`;

        // On envoie la nouvelle image sur le serveur (Firebase Storage).
        finalCoverImageUrl = await uploadStoryCover(selectedCoverFile, uniquePathSegment);

        // Si une ancienne image existait (et que ce n'était pas l'image par défaut), on la supprime
        // du serveur pour ne pas stocker de fichiers inutiles.
        if (initialCoverImage && initialCoverImage.includes("firebasestorage.googleapis.com") && initialCoverImage !== getDefaultCoverUrlSync()) {
            try {
                const url = new URL(initialCoverImage);
                const pathName = url.pathname;
                const encodedPath = pathName.substring(pathName.indexOf('/o/') + 3);
                const decodedPath = decodeURIComponent(encodedPath);
                if (decodedPath && !decodedPath.includes("placeholders/cover.png")) {
                    await deleteFile(decodedPath);
                }
            } catch (deleteError) {
                console.warn("Could not delete old cover image:", deleteError);

            }
        }

        // Cas 2 : L'utilisateur n'a pas envoyé de fichier, mais a peut-être collé une nouvelle URL d'image manuellement.
      } else if (coverImage !== initialCoverImage) {

        finalCoverImageUrl = coverImage || getDefaultCoverUrlSync();
      }


      // --- PRÉPARATION DES DONNÉES ---
      // Avant d'envoyer à la base de données, on s'assure que les données sont propres et bien formatées.

      // On s'assure que chaque chapitre a un titre et un ordre correct.
      const chaptersWithTitles = chapters.map((chap, index) => ({
        ...chap,
        title: chap.title || `Chapter ${index + 1}`,
        order: index + 1,
      }));
      setChapters(chaptersWithTitles);

      // On rassemble les genres sélectionnés dans un tableau.
      const finalGenres: string[] = [];
      if (genre1) finalGenres.push(genre1);
      if (genre2) finalGenres.push(genre2);
      if (genre3) finalGenres.push(genre3);

      // On transforme la chaîne de caractères des tags (ex: "magie, aventure") en un tableau propre (ex: ["magie", "aventure"]).
      const finalTags: string[] = tagsInput
        .split(",") // Sépare la chaîne par les virgules
        .map((tag) => tag.trim()) // Enlève les espaces avant/après chaque tag
        .filter((tag) => tag !== ""); // Retire les tags vides

      if (!title.trim()) {
        setError("Story title cannot be empty.");
        setIsSaving(false);
        return;
      }
      if (finalGenres.length === 0) {
        setError("Please select at least one genre.");
        setIsSaving(false);
        return;
      }

      let currentStoryId = storyId;

      // --- CRÉATION OU MISE À JOUR DE L'HISTOIRE ---
      // On vérifie si on est en train d'éditer une histoire existante ou d'en créer une nouvelle.

      // Si un `currentStoryId` existe, cela veut dire qu'on modifie une histoire.
      if (currentStoryId) {
        const storyUpdateData: any = {
          title: title.trim(),
          description: description.trim(),
          genres: finalGenres,
          tags: finalTags,
          chapters: chaptersWithTitles,
          status,
          updatedAt: new Date().toISOString(),
          coverImage: finalCoverImageUrl,

        };
        // On appelle la fonction `updateStory` pour mettre à jour les données dans Firebase.
        await updateStory(currentStoryId, storyUpdateData);
      } else {
        // Sinon, c'est une nouvelle histoire.
        const newStoryData: any = {
          title: title.trim(),
          description: description.trim(),
          genres: finalGenres,
          tags: finalTags,
          chapters: chaptersWithTitles,
          status,
          authorId: user.uid,
          authorName: user.displayName || "Anonymous",
          createdAt: new Date().toISOString(),
          coverImage: finalCoverImageUrl,

        };
        // On appelle `createStory` qui va créer l'histoire dans Firebase et nous retourner le nouvel ID.
        currentStoryId = await createStory(newStoryData);
      }

      // --- FINALISATION ---
      localStorage.removeItem("pendingStory"); // On nettoie les données temporaires s'il y en avait.
      // On redirige l'utilisateur : soit vers la page de l'histoire si elle est publiée,
      // soit vers la liste de ses histoires si elle est sauvegardée en brouillon.
      router.push(status === "published" ? `/story/${currentStoryId}` : "/my-stories");
    } catch (err: any) {
      setError(err.message || "Failed to save the story.");
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // --- AFFICHAGE DU COMPOSANT (JSX) ---
  // La partie `return` contient tout le code pour afficher la page.
  // Ce n'est pas du HTML, mais du JSX : un mélange de JavaScript et de HTML qui décrit l'interface.
  return (
    // Ce composant spécial `AuthCheck` agit comme un garde. Il vérifie si l'utilisateur est connecté.
    // Si ce n'est pas le cas, il peut le rediriger vers la page de connexion au lieu d'afficher le contenu.
    <AuthCheck>
      <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-white dark:from-amber-950/30 dark:via-gray-900 dark:to-gray-900">
        <div className="relative">

          <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute left-0 top-1/4 h-[300px] w-[400px] rounded-full bg-gradient-to-br from-amber-200/20 to-orange-100/10 blur-3xl dark:from-amber-900/10 dark:to-orange-900/5" />
            <div className="absolute right-0 bottom-1/4 h-[250px] w-[350px] rounded-full bg-gradient-to-br from-orange-100/20 to-amber-200/10 blur-3xl dark:from-orange-900/10 dark:to-amber-900/5" />
          </div>


          {/* L'en-tête de la page, qui reste visible en haut de l'écran (`sticky top-0`).
              Il contient le titre ("Edit Story" ou "Write Your Story") et les boutons de sauvegarde. */}
          <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-amber-200/30 dark:border-amber-800/30">
            <div className="container mx-auto px-4 py-4">
              <div className="flex justify-between items-center">
                <h1 className="font-serif text-2xl font-medium text-amber-900 dark:text-amber-100">
                  {storyId ? "Edit Story" : "Write Your Story"}
                </h1>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => handleSave("draft")}
                    variant="outline"
                    className="border-amber-200/50 dark:border-amber-800/50 text-amber-900 dark:text-amber-100 hover:bg-amber-100/50 dark:hover:bg-amber-900/50"
                    disabled={isSaving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </Button>
                  <Button
                    onClick={() => handleSave("published")}
                    className="bg-amber-800 hover:bg-amber-700 text-amber-50 dark:bg-amber-700 dark:hover:bg-amber-600 shadow-lg shadow-amber-900/20 dark:shadow-amber-900/10"
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Publish"}
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              {error && (
                <Alert
                  variant="destructive"
                  className="mb-6 rounded-2xl border-red-500/20 bg-red-50/50 dark:bg-red-900/20 backdrop-blur-xl"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}


              {/* Section pour les détails de l'histoire : titre, description, genres, tags et image de couverture. */}
              <div className="mb-8 p-6 rounded-3xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg border border-amber-200/40 dark:border-amber-800/40 shadow-xl space-y-6">
                <h2 className="text-xl font-semibold text-amber-800 dark:text-amber-200 font-serif">Story Details</h2>
                
                <div className="space-y-2">
                  <Label htmlFor="storyTitle" className="text-sm font-medium text-amber-900 dark:text-amber-100">Title</Label>
                  <Input
                    id="storyTitle"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter your story title"
                    required
                    className="rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storyDescription" className="text-sm font-medium text-amber-900 dark:text-amber-100">Description</Label>
                  <Textarea
                    id="storyDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter a brief summary of your story..."
                    className="min-h-[100px] rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl text-foreground"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="genre1" className="text-sm font-medium text-amber-900 dark:text-amber-100">Genre 1</Label>
                    <select
                      id="genre1"
                      value={genre1}
                      onChange={(e) => setGenre1(e.target.value)}
                      required
                      className="w-full rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl p-2 text-sm text-foreground"
                    >
                      <option value="" className="text-muted-foreground">Select a genre</option>
                      {["Fantasy", "Sci-Fi", "Romance", "Mystery", "Thriller", "Horror", "Historical", "Contemporary", "Young Adult", "Adventure", "Literary Fiction"].map(g => <option key={g} value={g} className="text-foreground">{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="genre2" className="text-sm font-medium text-amber-900 dark:text-amber-100">Genre 2 (Optional)</Label>
                    <select
                      id="genre2"
                      value={genre2}
                      onChange={(e) => setGenre2(e.target.value)}
                      className="w-full rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl p-2 text-sm text-foreground"
                    >
                      <option value="" className="text-muted-foreground">Select a genre</option>
                      {["Fantasy", "Sci-Fi", "Romance", "Mystery", "Thriller", "Horror", "Historical", "Contemporary", "Young Adult", "Adventure", "Literary Fiction"].map(g => <option key={g} value={g} className="text-foreground">{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="genre3" className="text-sm font-medium text-amber-900 dark:text-amber-100">Genre 3 (Optional)</Label>
                    <select
                      id="genre3"
                      value={genre3}
                      onChange={(e) => setGenre3(e.target.value)}
                      className="w-full rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl p-2 text-sm text-foreground"
                    >
                      <option value="" className="text-muted-foreground">Select a genre</option>
                      {["Fantasy", "Sci-Fi", "Romance", "Mystery", "Thriller", "Horror", "Historical", "Contemporary", "Young Adult", "Adventure", "Literary Fiction"].map(g => <option key={g} value={g} className="text-foreground">{g}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagsInput" className="text-sm font-medium text-amber-900 dark:text-amber-100">Tags (comma-separated)</Label>
                  <Input
                    id="tagsInput"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g., magic, space opera, high school"
                    className="rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coverImageFile" className="text-sm font-medium text-amber-900 dark:text-amber-100">Cover Image</Label>
                  <Input
                    id="coverImageFile"
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFileChange}
                    className="h-14 p-3 rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200"
                    disabled={isSaving}
                  />
                  {coverFilePreview && (
                    <div className="mt-2">
                      <img src={coverFilePreview} alt="New cover preview" className="max-h-40 w-auto rounded-lg object-cover border dark:border-gray-700" />
                    </div>
                  )}
                  {!selectedCoverFile && coverImage && (
                    <>
                      <p className="text-xs text-center text-amber-700/70 dark:text-amber-300/70 my-1">OR Current / Manual URL:</p>
                      <Input
                        id="coverImageUrlInput"
                        type="url"
                        value={coverImage}
                        onChange={(e) => {
                            setCoverImage(e.target.value);
                            setSelectedCoverFile(null);
                            setCoverFilePreview(null);
                        }}
                        placeholder="Enter image URL"
                        className="rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl text-foreground"
                        disabled={isSaving}
                      />
                    </>
                  )}
                   {!selectedCoverFile && !coverImage && (
                     <>
                        <p className="text-xs text-center text-amber-700/70 dark:text-amber-300/70 my-1">OR</p>
                        <Input
                            id="coverImageUrlInputManual"
                            type="url"
                            onChange={(e) => setCoverImage(e.target.value)}
                            placeholder="Enter image URL"
                            className="rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl text-foreground"
                            disabled={isSaving}
                        />
                     </>
                   )}
                  <p className="text-xs text-amber-700/70 dark:text-amber-300/70 mt-1">
                    Upload a new image or provide/edit the URL. If left empty, the default or existing cover will be used.
                  </p>
                  {initialCoverImage && !coverFilePreview && !selectedCoverFile && (
                    <div className="mt-2">
                      <p className="text-xs text-amber-700/70 dark:text-amber-300/70">Current cover:</p>
                      <img src={initialCoverImage} alt="Current cover" className="max-h-40 w-auto rounded-lg object-cover border dark:border-gray-700" />
                    </div>
                  )}
                </div>
              </div>


              {/* La mise en page principale est une grille qui se divise en deux colonnes sur les grands écrans. */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                  {/* Colonne de gauche : La liste des chapitres. */}
                  <h2 className="text-xl font-semibold text-amber-800 dark:text-amber-200 font-serif">Chapters</h2>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {/* On utilise `.map()` pour transformer la liste des chapitres (données) en une liste d'éléments cliquables (interface). */}
                    {chapters.map((chapter, index) => (
                      <div
                        key={chapter.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all
                                  ${currentChapterIndex === index
                                    ? "bg-amber-100 dark:bg-amber-800 shadow-md"
                                    : "bg-white/50 dark:bg-gray-800/50 hover:bg-amber-50 dark:hover:bg-amber-900"
                                  }`}
                        onClick={() => {
                          setCurrentChapterIndex(index);
                          setCurrentChapterTitle(chapter.title);
                        }}
                      >
                        <p className="font-medium text-sm text-amber-900 dark:text-amber-100 truncate">
                          {chapter.title || `Chapter ${index + 1}`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {chapter.content?.substring(0,30) || "Empty"}...
                        </p>
                      </div>
                    ))}
                  </div>
                  {/* Bouton pour ajouter un nouveau chapitre à la liste. */}
                  <Button
                    onClick={() => {
                      // Crée un objet représentant le nouveau chapitre.
                      const newChapter: Chapter = {
                        id: uuidv4(), // `uuidv4` génère un identifiant unique pour chaque chapitre.
                        title: `Chapter ${chapters.length + 1}`,
                        content: "",
                        order: chapters.length + 1,
                      };
                      // Met à jour l'état `chapters` en ajoutant le nouveau.
                      setChapters([...chapters, newChapter]);
                      // Sélectionne automatiquement le chapitre qui vient d'être créé.
                      setCurrentChapterIndex(chapters.length);
                      setCurrentChapterTitle(newChapter.title);
                    }}
                    variant="outline"
                    className="w-full border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" /> Add New Chapter
                  </Button>
                </div>

                {/* Colonne de droite : L'éditeur pour le chapitre actuellement sélectionné. */}
                <div className="md:col-span-2 space-y-4">
                  {/* On affiche cette partie seulement si un chapitre est bien sélectionné. */}
                  {currentChapterIndex !== null && chapters[currentChapterIndex] && (
                    <>
                      <Input
                        placeholder="Chapter Title"
                        value={currentChapterTitle}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const newTitle = e.target.value;
                          setCurrentChapterTitle(newTitle);
                          const updatedChapters = chapters.map((chap, index) =>
                            index === currentChapterIndex
                              ? { ...chap, title: newTitle }
                              : chap
                          );
                          setChapters(updatedChapters);
                        }}
                        className="text-lg font-semibold text-foreground"
                      />
                       <div className="flex space-x-2 mb-2">
                        <Button
                          onClick={() => {
                            if (chapters.length > 1 && currentChapterIndex !== null) {
                              const updatedChapters = chapters.filter((_, index) => index !== currentChapterIndex)
                                .map((chap, idx) => ({ ...chap, order: idx + 1 }));
                              setChapters(updatedChapters);
                              if (updatedChapters.length > 0) {
                                const newIndex = Math.max(0, currentChapterIndex -1);
                                setCurrentChapterIndex(newIndex);
                                setCurrentChapterTitle(updatedChapters[newIndex].title);
                              } else {

                                const defaultChapter: Chapter = { id: uuidv4(), title: "Chapter 1", content: "", order: 1 };
                                setChapters([defaultChapter]);
                                setCurrentChapterIndex(0);
                                setCurrentChapterTitle(defaultChapter.title);
                              }
                            }
                          }}
                          variant="destructive"
                          size="sm"
                          disabled={chapters.length <= 1 || currentChapterIndex === null}
                        >
                          <Trash2 className="w-4 h-4 mr-1 text-foreground" />
                          <span className="text-foreground">Delete</span>
                        </Button>
                         <Button
                            onClick={() => {
                                if (currentChapterIndex !== null && currentChapterIndex > 0) {
                                    const newChapters = [...chapters];
                                    const temp = newChapters[currentChapterIndex];
                                    newChapters[currentChapterIndex] = newChapters[currentChapterIndex - 1];
                                    newChapters[currentChapterIndex - 1] = temp;

                                    newChapters[currentChapterIndex].order = currentChapterIndex + 1;
                                    newChapters[currentChapterIndex - 1].order = currentChapterIndex;
                                    setChapters(newChapters);
                                    setCurrentChapterIndex(currentChapterIndex - 1);
                                }
                            }}
                            variant="outline"
                            size="sm"
                            disabled={currentChapterIndex === null || currentChapterIndex === 0}
                        >
                            <ArrowUp className="w-4 h-4 mr-1 text-foreground" />
                            <span className="text-foreground">Up</span>
                        </Button>
                        <Button
                            onClick={() => {
                                if (currentChapterIndex !== null && currentChapterIndex < chapters.length - 1) {
                                    const newChapters = [...chapters];
                                    const temp = newChapters[currentChapterIndex];
                                    newChapters[currentChapterIndex] = newChapters[currentChapterIndex + 1];
                                    newChapters[currentChapterIndex + 1] = temp;

                                    newChapters[currentChapterIndex].order = currentChapterIndex + 1;
                                    newChapters[currentChapterIndex + 1].order = currentChapterIndex + 2;

                                    const reorderedChapters = newChapters.map((chap, idx) => ({ ...chap, order: idx + 1 }));
                                    setChapters(reorderedChapters);
                                    setCurrentChapterIndex(currentChapterIndex + 1);
                                }
                            }}
                            variant="outline"
                            size="sm"
                            disabled={currentChapterIndex === null || currentChapterIndex === chapters.length - 1}
                        >
                            <ArrowDown className="w-4 h-4 mr-1 text-foreground" />
                            <span className="text-foreground">Down</span>
                        </Button>
                      </div>
                    </>
                  )}
                  <div className="rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-amber-200/30 dark:border-amber-800/30 shadow-2xl">
                    {/* C'est ici qu'on insère le composant `Editor` qui fournit l'éditeur de texte riche (avec options de mise en forme). */}
                    <Editor
                      value={
                        currentChapterIndex !== null && chapters[currentChapterIndex]
                          ? chapters[currentChapterIndex].content
                          : ""
                      }
                      onChange={(newContent) => {
                        if (currentChapterIndex !== null) {
                          const updatedChapters = chapters.map((chap, index) =>
                            index === currentChapterIndex
                              ? { ...chap, content: newContent }
                              : chap
                          );
                          setChapters(updatedChapters);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-center opacity-60">
                <BookOpen className="h-8 w-8 text-amber-800/30 dark:text-amber-200/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthCheck>
  );
}
