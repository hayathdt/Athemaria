"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  getUserStories, 
} from "@/lib/firebase/firestore";
import { uploadAvatar, deleteFile } from "@/lib/firebase/storage"; 
import type { UserProfile, UserStory } from "@/lib/types"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AuthCheck from "@/components/auth-check";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"; 
import UserStoryCard from "@/components/cards/user-story-card";
import PageHeader from "@/components/layout/page-header";

export default function ProfilePage() {
  // On récupère l'utilisateur actuellement connecté grâce au contexte d'authentification.
  const { user } = useAuth();
  // Hook pour afficher des notifications (toasts) à l'utilisateur.
  const { toast } = useToast();
  // "State" pour stocker les informations du profil de l'utilisateur une fois chargées.
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // "State" pour savoir si l'utilisateur est en train de modifier son profil.
  const [isEditing, setIsEditing] = useState(false);
  // "State" pour gérer l'affichage d'un indicateur de chargement pendant que les données sont récupérées.
  const [loading, setLoading] = useState(true);
  // "State" pour désactiver le bouton de sauvegarde pendant l'enregistrement des données.
  const [isSaving, setIsSaving] = useState(false);
  // "State" pour gérer l'onglet actif ('profile' ou 'stories').
  const [activeTab, setActiveTab] = useState<'profile' | 'stories'>('profile');
  // "State" pour stocker la liste des histoires écrites par l'utilisateur.
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  // "States" pour la pagination de la liste des histoires.
  const [currentPage, setCurrentPage] = useState(1);
  const [storiesPerPage] = useState(6);

  // États pour l'upload d'avatar
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [formData, setFormData] = useState({
    displayName: "",
    bio: "",
    x: "",
    instagram: "",
    tiktok: "",
    website: "",
  });

  // Ce "useEffect" s'exécute une seule fois au chargement du composant ou si l'utilisateur change.
  // Son rôle est de charger les données du profil de l'utilisateur depuis la base de données (Firestore).
  useEffect(() => {
    const loadProfile = async () => {
      // On vérifie si un utilisateur est bien connecté.
      if (user) {
        // On récupère le profil utilisateur avec son identifiant unique (uid).
        const userProfile = await getUserProfile(user.uid);
        // Si un profil existe, on met à jour les "states" du composant.
        if (userProfile) {
          setProfile(userProfile); // Stocke les données du profil pour l'affichage.
          // Pré-remplit le formulaire d'édition avec les données existantes.
          setFormData({
            displayName: userProfile.displayName,
            bio: userProfile.bio || "",
            x: userProfile.socialLinks?.x || "",
            instagram: userProfile.socialLinks?.instagram || "",
            tiktok: userProfile.socialLinks?.tiktok || "",
            website: userProfile.website || "",
          });
        }
      }
      // Une fois le chargement terminé (même si aucun profil n'a été trouvé), on cache l'indicateur de chargement.
      setLoading(false);
    };
    loadProfile();
  }, [user]); // La dépendance [user] signifie que ce code se ré-exécutera si l'objet 'user' change.

  // Ce "useEffect" s'exécute lorsque l'utilisateur change ou lorsqu'il clique sur l'onglet "My Stories".
  useEffect(() => {
    const loadUserStories = async () => {
      console.log(`[ProfilePage] loadUserStories called. user: ${user?.uid}, activeTab: ${activeTab}`);
      // On charge les histoires uniquement si l'utilisateur est connecté ET que l'onglet "stories" est actif.
      if (user && activeTab === 'stories') {
        setLoading(true); // Affiche l'indicateur de chargement.
        try {
          // Appelle la fonction pour récupérer les histoires de l'utilisateur depuis Firestore.
          const stories = await getUserStories(user.uid);
          console.log("[ProfilePage] Fetched stories:", stories);
          setUserStories(stories); // Met à jour le "state" avec les histoires récupérées.
        } catch (error) {
          // En cas d'erreur, on affiche un message à l'utilisateur.
          console.error("Error loading user stories:", error);
          toast({
            title: "Error",
            description: "Failed to load your stories. Please try again.",
            variant: "destructive",
          });
        } finally {
          // Dans tous les cas (succès ou erreur), on cache l'indicateur de chargement.
          setLoading(false);
        }
      }
    };

    loadUserStories();
  }, [user, activeTab, toast]); // Dépendances: se ré-exécute si l'une de ces valeurs change.

  // Pendant que `loading` est vrai, on affiche un simple message de chargement
  // au lieu du contenu complet de la page. C'est une pratique courante pour améliorer l'expérience utilisateur.
  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-gray-500 dark:text-gray-400">Loading profile...</p>
      </div>
    );
  }

  // Cette fonction est appelée lorsque l'utilisateur soumet le formulaire de modification de profil.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Empêche la page de se recharger, comportement par défaut des formulaires.
    if (!user) return; // Sécurité : on s'assure que l'utilisateur est toujours connecté.

    setIsSaving(true); // On indique que la sauvegarde est en cours (pour le feedback visuel, ex: "Saving...").
    try {
      // On rassemble les données du formulaire dans un objet `profileData` qui correspond au type `UserProfile`.
      const profileData: UserProfile = {
        id: user.uid,
        displayName: formData.displayName || user.displayName || "User",
        email: user.email || "",
        bio: formData.bio,
        avatar: profile?.avatar || "",
        socialLinks: {
          x: formData.x,
          instagram: formData.instagram,
          tiktok: formData.tiktok,
        },
        website: formData.website,
      };

      // On essaie de mettre à jour le profil.
      try {
        await updateUserProfile(user.uid, profileData);
      } catch (error) {
        // Si la mise à jour échoue (par exemple, le document n'existe pas encore pour un nouvel utilisateur),
        // on essaie de créer le profil.
        await createUserProfile(user.uid, profileData);
      }

      // Après la sauvegarde, on recharge le profil pour afficher les données à jour.
      const newProfile = await getUserProfile(user.uid);
      setProfile(newProfile);
      setIsEditing(false); // On quitte le mode édition.
      // On notifie l'utilisateur que tout s'est bien passé.
      toast({
        title: "Success",
        description: "Your profile has been updated",
      });
    } catch (error) {
      // En cas d'erreur lors de la sauvegarde, on affiche un message d'erreur.
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Qu'il y ait eu succès ou erreur, on termine l'état de sauvegarde.
      setIsSaving(false);
    }
  };

  // Cette fonction est appelée à chaque fois que l'utilisateur tape quelque chose dans un champ du formulaire.
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target; // On récupère le nom et la valeur du champ modifié.
    // On met à jour le "state" `formData` avec la nouvelle valeur.
    setFormData((prev) => ({
      ...prev, // On garde toutes les anciennes valeurs...
      [name]: value, // ...et on met à jour seulement celle qui a changé.
    }));
  };

  // Gère la logique de téléversement d'un nouvel avatar.
  const handleAvatarUpload = async (file: File) => {
    if (!user || !profile) return;

    setIsUploadingAvatar(true);
    try {
      // 1. On envoie le nouveau fichier image vers Firebase Storage. La fonction retourne l'URL publique de l'image.
      const newAvatarUrl = await uploadAvatar(file, user.uid);

      // 2. Pour ne pas stocker d'images inutiles, on supprime l'ancien avatar.
      // On vérifie qu'il y a un ancien avatar, qu'il ne s'agit pas de l'image par défaut, et qu'il vient bien de Firebase.
      if (profile.avatar && profile.avatar !== "/placeholder-user.jpg" && profile.avatar.includes("firebasestorage.googleapis.com")) {
        try {
          // L'URL de Firebase est complexe. On doit en extraire le chemin du fichier pour pouvoir le supprimer.
          const url = new URL(profile.avatar);
          const pathName = url.pathname;
          const encodedPath = pathName.substring(pathName.indexOf('/o/') + 3);
          // Le chemin dans l'URL est "encodé" (ex: les espaces sont remplacés par %20), on le décode.
          const decodedPath = decodeURIComponent(encodedPath);
          
          // On supprime le fichier en utilisant le chemin décodé.
          if (decodedPath && !decodedPath.includes("placeholders/")) {
            await deleteFile(decodedPath);
          }
        } catch (error) {
          console.error("Failed to delete old avatar:", error);
          // Si la suppression échoue, ce n'est pas grave, on continue la mise à jour du profil.
        }
      }

      // 3. On met à jour le document de l'utilisateur dans Firestore avec l'URL du nouvel avatar.
      const updatedProfileData = { ...profile, avatar: newAvatarUrl };
      await updateUserProfile(user.uid, updatedProfileData);
      
      // 4. On met à jour le "state" local pour que l'interface affiche immédiatement le nouvel avatar.
      setProfile(updatedProfileData);
      
      toast({
        title: "Succès",
        description: "Votre photo de profil a été mise à jour.",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Erreur",
        description: "Échec de la mise à jour de l'avatar. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      // 5. On réinitialise les "states" liés au téléversement.
      setIsUploadingAvatar(false);
      setSelectedAvatarFile(null);
      setAvatarPreview(null);
      // On réinitialise le champ <input type="file"> pour que l'utilisateur puisse sélectionner le même fichier à nouveau si besoin.
      const avatarUploadInput = document.getElementById('avatarUpload') as HTMLInputElement;
      if (avatarUploadInput) {
        avatarUploadInput.value = "";
      }
    }
  };

  // Logique de pagination pour l'onglet "My Stories".
  // On calcule quelles histoires afficher sur la page actuelle.
  const indexOfLastStory = currentPage * storiesPerPage;
  const indexOfFirstStory = indexOfLastStory - storiesPerPage;
  // On extrait la tranche d'histoires correspondant à la page actuelle.
  const currentStories = userStories.slice(indexOfFirstStory, indexOfLastStory);
  // On calcule le nombre total de pages nécessaires.
  const totalPages = Math.ceil(userStories.length / storiesPerPage);

  return (
    <AuthCheck>
      <div className="max-w-7xl mx-auto">
        <PageHeader title="Profile" />
        <div className="container mx-auto px-4 py-6 max-w-2xl font-sans">
        <div className="rounded-3xl bg-slate-50 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-md">
          <div className="bg-gradient-to-r from-blue-100 to-purple-200 rounded-t-3xl p-6 pt-16 pb-12">
            <div className="absolute top-6 right-6">
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </Button>
            </div>
            <div className="flex flex-col items-center">
              <div className="group rounded-full border-2 border-white shadow-lg w-24 h-24 overflow-hidden mb-4 relative cursor-pointer" onClick={() => !isUploadingAvatar && document.getElementById('avatarUpload')?.click()}>
                {isUploadingAvatar ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200/50 dark:bg-gray-700/50">
                    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : (
                  <>
                    <img
                      src={avatarPreview || profile?.avatar || "/placeholder-user.jpg"}
                      alt="Profile"
                      className="w-full h-full object-cover transition-opacity group-hover:opacity-50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 opacity-0 group-hover:opacity-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6z" />
                      </svg>
                    </div>
                  </>
                )}
              </div>
              <input
                id="avatarUpload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    const file = e.target.files[0];
                    // Vérification de la taille du fichier
                    if (file.size > 5 * 1024 * 1024) {
                        toast({
                            title: "Fichier trop volumineux",
                            description: "Veuillez sélectionner une image de moins de 5MB.",
                            variant: "destructive",
                        });
                        // Réinitialiser l'input file
                        e.target.value = "";
                        return;
                    }
                    setSelectedAvatarFile(file);
                    const reader = new FileReader();
                    reader.onloadend = () => setAvatarPreview(reader.result as string);
                    reader.readAsDataURL(file);
                    handleAvatarUpload(file);
                  }
                }}
                className="hidden"
              />
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                {profile?.displayName}
              </h1>
            </div>
          </div>

          <div className="p-6">
            <Tabs defaultValue="profile" value={activeTab} onValueChange={(value) => setActiveTab(value as 'profile' | 'stories')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="stories">My Stories</TabsTrigger>
              </TabsList>
              <TabsContent value="profile">
                {/* Affichage conditionnel : on affiche soit le formulaire d'édition, soit les informations du profil. */}
                {isEditing ? (
                  // Si `isEditing` est vrai, on affiche le formulaire.
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="rounded-2xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl p-4 space-y-2">
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        Display Name
                      </label>
                      <Input
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleChange}
                        required
                        className="rounded-xl border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50"
                      />
                    </div>

                    <div className="rounded-2xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl p-4 space-y-2">
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                        Bio
                      </label>
                      <Textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        rows={4}
                        className="rounded-xl border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50"
                      />
                    </div>

                    <div className="rounded-2xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl p-4 space-y-4">
                      <h3 className="text-base font-medium text-gray-500 dark:text-gray-400">
                        Social Links
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                            X (Twitter) Username
                          </label>
                          <Input
                            name="x"
                            value={formData.x}
                            onChange={handleChange}
                            className="rounded-xl border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Instagram Username
                          </label>
                          <Input
                            name="instagram"
                            value={formData.instagram}
                            onChange={handleChange}
                            className="rounded-xl border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                            TikTok Username
                          </label>
                          <Input
                            name="tiktok"
                            value={formData.tiktok}
                            onChange={handleChange}
                            className="rounded-xl border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Website
                          </label>
                          <Input
                            name="website"
                            value={formData.website}
                            onChange={handleChange}
                            className="rounded-xl border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        className="flex-1 rounded-xl py-2.5"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 rounded-xl bg-blue-500 hover:bg-blue-600 text-white py-2.5"
                      >
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  // Si `isEditing` est faux, on affiche les informations du profil en mode "lecture seule".
                  <div className="space-y-6">
                    <div className="text-center my-6">
                      <p className="text-gray-700 dark:text-gray-300 max-w-lg mx-auto" style={{ maxWidth: '120ch' }}>
                        {profile?.bio || "No bio yet"}
                      </p>
                    </div>

                    <div className="flex justify-center gap-4 my-8">
                      {profile?.socialLinks?.x && (
                        <a
                          href={`https://x.com/${profile.socialLinks.x}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-transform hover:scale-110 flex items-center justify-center p-2 rounded-full bg-black dark:bg-white"
                        >
                          <svg className="w-5 h-5 text-white dark:text-black" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                        </a>
                      )}
                      {profile?.socialLinks?.instagram && (
                        <a
                          href={`https://instagram.com/${profile.socialLinks.instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-transform hover:scale-110 flex items-center justify-center p-2 rounded-full bg-gradient-to-br from-purple-400 to-pink-500"
                        >
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                          </svg>
                        </a>
                      )}
                      {profile?.socialLinks?.tiktok && (
                        <a
                          href={`https://tiktok.com/@${profile.socialLinks.tiktok}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-transform hover:scale-110 flex items-center justify-center p-2 rounded-full bg-black dark:bg-white"
                        >
                          <svg className="w-5 h-5 text-white dark:text-black" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.36-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.33 6.33 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.04-.1z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="stories">
                <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-4">
                  {currentStories.map(story => (
                    <UserStoryCard
                      key={story.id}
                      id={story.id}
                      title={story.title}
                      imageUrl={story.imageUrl}
                      commentCount={story.commentCount}
                      averageRating={story.averageRating}
                    />
                  ))}
                </div>
                <div className="flex justify-center gap-4 mt-8">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <span className="flex items-center text-gray-700 dark:text-gray-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      </div>
    </AuthCheck>
  );
}
