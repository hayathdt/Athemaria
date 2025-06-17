import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  setDoc,
  type DocumentData,
  Timestamp,
  where,
} from "firebase/firestore";
import type {
  Story,
  StoryInput,
  StoryUpdate,
  UserProfile,
  Comment,
  CommentInput,
  Rating,
  RatingInput,
  RatingStats as ImportedRatingStats,
  UserStory,
  ReadingProgress,
} from "../types";

/**
 * Crée une nouvelle histoire dans la base de données Firestore.
 * @param storyData - Un objet contenant toutes les informations de l'histoire (titre, description, chapitres, etc.).
 * @returns L'ID unique de l'histoire nouvellement créée.
 */
export async function createStory(storyData: StoryInput): Promise<string> {
  try {
    // On s'assure que les champs essentiels ont des valeurs par défaut pour éviter les erreurs.
    const dataToSave = {
      ...storyData,
      chapters: storyData.chapters || [],
      coverImage: storyData.coverImage || "/assets/cover.png", // Image de couverture par défaut
    };
    // On ajoute un nouveau document à la collection "stories". Firestore génère automatiquement un ID unique.
    const docRef = await addDoc(collection(db, "stories"), dataToSave);
    // On retourne cet ID pour pouvoir l'utiliser, par exemple pour rediriger l'utilisateur vers la page de la nouvelle histoire.
    return docRef.id;
  } catch (error) {
    console.error("Error adding story: ", error);
    throw new Error("Failed to create story");
  }
}

/**
 * Met à jour le texte d'un commentaire existant.
 * @param commentId - L'ID du commentaire à modifier.
 * @param newText - Le nouveau contenu du commentaire.
 * @param userId - L'ID de l'utilisateur qui effectue l'action, pour vérifier les permissions.
 */
export async function updateComment(
  commentId: string,
  newText: string,
  userId: string
): Promise<void> {
  // On cible le document spécifique du commentaire.
  const commentRef = doc(db, "comments", commentId);
  try {
    // Avant de modifier, on récupère le commentaire pour vérifier qu'il existe et que l'utilisateur a le droit de le modifier.
    const commentSnap = await getDoc(commentRef);

    if (!commentSnap.exists()) {
      throw new Error("Comment not found.");
    }

    const commentData = commentSnap.data();
    // C'est une vérification de sécurité cruciale : seul l'auteur original du commentaire peut le modifier.
    if (commentData.userId !== userId) {
      throw new Error("You do not have permission to update this comment.");
    }

    // Si tout est en ordre, on met à jour le document avec le nouveau texte et une nouvelle date de mise à jour.
    await updateDoc(commentRef, {
      text: newText,
      updatedAt: Timestamp.now().toMillis().toString(),
    });
  } catch (error) {
    console.error(`[firestore.ts] Error updating comment ${commentId}:`, error);
    // On propage l'erreur pour que l'interface utilisateur puisse réagir (par exemple, afficher un message à l'utilisateur).
    if (error instanceof Error && (error.message === "Comment not found." || error.message === "You do not have permission to update this comment.")) {
        throw error;
    }
    throw new Error(`Failed to update comment. Firestore error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Supprime un commentaire de la base de données.
 * @param commentId - L'ID du commentaire à supprimer.
 * @param userId - L'ID de l'utilisateur qui demande la suppression, pour la vérification des droits.
 */
export async function deleteComment(
  commentId: string,
  userId: string
): Promise<void> {
  const commentRef = doc(db, "comments", commentId);
  try {
    // Comme pour la mise à jour, on vérifie d'abord les permissions.
    const commentSnap = await getDoc(commentRef);

    // Si le commentaire n'existe pas, on ne fait rien. C'est peut-être qu'il a déjà été supprimé.
    if (!commentSnap.exists()) {
      console.warn(`[firestore.ts] Comment ${commentId} not found for delete. Might have already been deleted.`);
      return;
    }

    const commentData = commentSnap.data();
    // Vérification de sécurité : seul l'auteur peut supprimer son commentaire.
    if (commentData.userId !== userId) {
      throw new Error("You do not have permission to delete this comment.");
    }

    // Si les vérifications passent, on supprime le document.
    await deleteDoc(commentRef);
  } catch (error) {
    console.error(`[firestore.ts] Error deleting comment ${commentId}:`, error);
     if (error instanceof Error && error.message === "You do not have permission to delete this comment.") {
        throw error;
    }
    throw new Error(`Failed to delete comment. Firestore error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Ajoute ou met à jour la note d'un utilisateur pour une histoire.
 * Un utilisateur ne peut donner qu'une seule note par histoire.
 * @param ratingData - Contient l'ID de l'histoire, l'ID de l'utilisateur et la valeur de la note.
 */
export async function setRating(ratingData: RatingInput): Promise<void> {
  const { storyId, userId, value } = ratingData;
  try {
    // On cherche d'abord si cet utilisateur a déjà noté cette histoire.
    const ratingsQuery = query(
      collection(db, "ratings"),
      where("storyId", "==", storyId),
      where("userId", "==", userId),
      limit(1) // On n'a besoin que d'un seul résultat au maximum.
    );

    const querySnapshot = await getDocs(ratingsQuery);
    const now = Timestamp.now().toMillis().toString();

    // Si la requête retourne un document, cela signifie que l'utilisateur a déjà noté.
    if (!querySnapshot.empty) {
      // On met donc à jour la note existante.
      const docId = querySnapshot.docs[0].id;
      await updateDoc(doc(db, "ratings", docId), {
        value, // Nouvelle valeur de la note
        updatedAt: now,
      });
    } else {
      // Sinon, c'est la première fois que l'utilisateur note cette histoire.
      // On crée donc un nouveau document de note.
      await addDoc(collection(db, "ratings"), {
        ...ratingData,
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch (error) {
    console.error("Error setting rating: ", error);
    throw new Error("Failed to set rating");
  }
}

/**
 * Récupère la note spécifique qu'un utilisateur a donnée à une histoire.
 * @param storyId - L'ID de l'histoire.
 * @param userId - L'ID de l'utilisateur.
 * @returns Un objet Rating si une note existe, sinon null.
 */
export async function getRating(
  storyId: string,
  userId: string
): Promise<Rating | null> {
  try {
    // Requête très similaire à setRating pour trouver la note spécifique.
    const ratingsQuery = query(
      collection(db, "ratings"),
      where("storyId", "==", storyId),
      where("userId", "==", userId),
      limit(1)
    );

    const querySnapshot = await getDocs(ratingsQuery);

    if (!querySnapshot.empty) {
      // Si on trouve une note, on la formate et on la retourne.
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data() as DocumentData;
      return {
        id: docSnap.id,
        storyId: data.storyId,
        userId: data.userId,
        value: data.value,
      } as Rating;
    }
    // Si aucune note n'est trouvée, on retourne null.
    return null;
  } catch (error) {
    console.error("Error getting rating: ", error);
    return null;
  }
}

/**
 * Calcule la note moyenne et le nombre total de notes pour une histoire.
 * @param storyId - L'ID de l'histoire concernée.
 * @returns Un objet contenant la moyenne (`average`) et le nombre de notes (`count`).
 */
export async function getAverageRating(storyId: string): Promise<ImportedRatingStats> {
  try {
    // On récupère TOUTES les notes pour une histoire donnée.
    const ratingsQuery = query(
      collection(db, "ratings"),
      where("storyId", "==", storyId)
    );

    const querySnapshot = await getDocs(ratingsQuery);
    const count = querySnapshot.size; // Le nombre de documents est le nombre de notes.

    if (count === 0) {
      return { average: 0, count: 0 };
    }

    // On calcule la somme de toutes les notes.
    let totalValue = 0;
    querySnapshot.forEach((doc) => {
      const ratingValue = doc.data().value;
      // On s'assure que la valeur est bien un nombre avant de l'ajouter.
      if (typeof ratingValue === 'number') {
        totalValue += ratingValue;
      } else {
        console.warn(`[firestore.ts] Invalid rating value found for story ${storyId}, comment doc ID ${doc.id}:`, ratingValue);
      }
    });
    
    // La moyenne est simplement la somme divisée par le nombre de notes.
    const average = totalValue / count;
    return { average, count };
  } catch (error) {
    console.error(`[firestore.ts] Error getting average rating stats for story ${storyId}:`, error);
    // En cas d'erreur, on retourne des valeurs neutres.
    return { average: 0, count: 0 };
  }
}

/**
 * Compte le nombre de commentaires pour une histoire donnée.
 * C'est plus efficace que de récupérer tous les commentaires avec `getComments` si on n'a besoin que du nombre.
 * @param storyId - L'ID de l'histoire.
 * @returns Le nombre de commentaires.
 */
export async function getCommentCountForStory(storyId: string): Promise<number> {
  try {
    const commentsQuery = query(
      collection(db, "comments"),
      where("storyId", "==", storyId)
    );
    const querySnapshot = await getDocs(commentsQuery);
    // La propriété .size d'un snapshot est optimisée pour compter les documents sans avoir à les télécharger entièrement.
    return querySnapshot.size;
  } catch (error) {
    console.error(`[firestore.ts] Error getting comment count for story ${storyId}:`, error);
    return 0;
  }
}

/**
 * Récupère toutes les histoires écrites par un utilisateur spécifique.
 * @param userId - L'ID de l'auteur.
 * @returns Une liste d'histoires formatées pour l'affichage dans le profil de l'utilisateur.
 */
export async function getUserStories(userId: string): Promise<UserStory[]> {
  try {
    const storiesRef = collection(db, 'stories');
    // On requête les histoires où le champ 'authorId' correspond à l'ID de l'utilisateur.
    const q = query(storiesRef, where('authorId', '==', userId));
    const snapshot = await getDocs(q);
    
    const userStories: UserStory[] = [];
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as DocumentData;
      
      // On ne veut pas afficher les histoires qui ont été "supprimées doucement" (soft-deleted).
      if (data.deleted === true) {
        continue; // On passe à l'histoire suivante.
      }
      
      // Pour chaque histoire, on récupère des informations supplémentaires comme le nombre de commentaires et la note moyenne.
      const commentCount = await getCommentCountForStory(docSnap.id);
      const { average: averageRating } = await getAverageRating(docSnap.id);

      userStories.push({
        id: docSnap.id,
        title: data.title,
        imageUrl: data.coverImage || "/assets/cover.png",
        commentCount: commentCount,
        averageRating: averageRating,
      });
    }
    
    return userStories;
  } catch (error) {
    console.error("[firestore.ts] Error getting user stories:", error);
    return [];
  }
}

/**
 * Crée un nouveau commentaire pour une histoire.
 * @param commentData - Les données du commentaire (texte, ID de l'histoire, infos de l'utilisateur).
 * @returns L'ID du nouveau commentaire.
 */
export async function createComment(
  commentData: CommentInput
): Promise<string> {
  const dataToSave: Partial<CommentInput> & { userAvatar?: string | null } = { ...commentData };

  // Petite sécurité pour s'assurer que le champ userAvatar n'est jamais "undefined", ce qui peut causer des problèmes avec Firestore.
  // On préfère "null" qui est une valeur valide.
  if (dataToSave.userAvatar === undefined) {
    dataToSave.userAvatar = null;
  }

  const now = Timestamp.now().toMillis().toString();
  // On enrichit les données du commentaire avec les dates de création et de mise à jour.
  const docDataWithTimestamp = {
    ...dataToSave,
    createdAt: now,
    updatedAt: now,
  };

  try {
    // On ajoute le nouveau document à la collection "comments".
    const docRef = await addDoc(collection(db, "comments"), docDataWithTimestamp);
    return docRef.id;
  } catch (error) {
    console.error("[firestore.ts] Error adding comment to Firestore:", error);
    if (error instanceof Error) {
      console.error("[firestore.ts] Error name:", error.name);
      console.error("[firestore.ts] Error message:", error.message);
      if (error.stack) {
        console.error("[firestore.ts] Error stack:", error.stack);
      }
    }
    const originalErrorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create comment. Firestore error: ${originalErrorMessage}`);
  }
}

/**
 * Récupère tous les commentaires pour une histoire donnée.
 * @param storyId - L'ID de l'histoire dont on veut les commentaires.
 * @returns Une liste d'objets Comment.
 */
export async function getComments(storyId: string): Promise<Comment[]> {
  try {
    // On construit une requête pour trouver tous les commentaires
    // qui correspondent à l'ID de l'histoire, triés du plus récent au plus ancien.
    const commentsQuery = query(
      collection(db, "comments"),
      where("storyId", "==", storyId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(commentsQuery);
    const comments: Comment[] = [];

    // On transforme chaque document Firestore en un objet Comment propre.
    querySnapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      comments.push({
        id: doc.id,
        storyId: data.storyId,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        text: data.text,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Comment);
    });

    return comments;
  } catch (error) {
    console.error("Error getting comments: ", error);
    return []; // On retourne un tableau vide en cas d'erreur.
  }
}

/**
 * Récupère une liste d'histoires depuis Firestore.
 * @param limitCount - Le nombre maximum d'histoires à récupérer (par défaut 50).
 * @returns Une liste d'objets Story.
 */
export async function getStories(limitCount = 50): Promise<Story[]> {
  try {
    // On construit une requête pour récupérer les histoires :
    // - On cible la collection "stories".
    // - On les trie par date de création, de la plus récente à la plus ancienne ("desc").
    // - On limite le nombre de résultats.
    const storiesQuery = query(
      collection(db, "stories"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    // On exécute la requête.
    const querySnapshot = await getDocs(storiesQuery);
    const stories: Story[] = [];

    // On boucle sur chaque document retourné par la requête.
    querySnapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      
      // --- Logique de compatibilité ascendante ---
      // Le code ci-dessous gère les anciennes et nouvelles manières de stocker les données.
      // C'est une bonne pratique pour faire évoluer une application sans casser les données existantes.

      // Gère les anciens chapitres qui étaient peut-être un simple champ "content".
      let chapters = data.chapters || [];
      if (!data.chapters && data.content) {
        chapters = [{ id: 'default', title: 'Chapter 1', content: data.content, order: 1 }];
      }
      
      // Gère les anciens "genre" (une seule chaîne de caractères) et les nouveaux "genres" (un tableau).
      let genres: string[] = [];
      if (data.genres && Array.isArray(data.genres)) {
        genres = data.genres;
      } else if (data.genre && typeof data.genre === 'string') {
        // Si on trouve un ancien champ "genre", on le transforme en tableau pour être cohérent.
        genres = [data.genre];
      }

      // S'assure que les "tags" sont toujours un tableau.
      const tags: string[] = (data.tags && Array.isArray(data.tags)) ? data.tags : [];

      // On ajoute l'histoire formatée à notre liste de résultats.
      stories.push({
        id: doc.id,
        title: data.title,
        chapters: chapters,
        description: data.description,
        genres: genres,
        tags: tags,
        authorId: data.authorId,
        authorName: data.authorName,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt || data.createdAt,
        status: data.status || "published",
        coverImage: data.coverImage || "/placeholder.jpg",
        readCount: data.readCount || 0,
      });
    });

    return stories;
  } catch (error) {
    console.error("Error getting stories: ", error);
    return []; // En cas d'erreur, on retourne un tableau vide pour éviter de faire planter l'application.
  }
}

/**
 * Récupère une seule histoire par son ID.
 * @param id - L'ID du document de l'histoire dans Firestore.
 * @returns Un objet Story si l'histoire est trouvée, sinon null.
 */
export async function getStory(id: string): Promise<Story | null> {
  try {
    // On crée une référence directe au document de l'histoire en utilisant son ID.
    const docRef = doc(db, "stories", id);
    // On récupère les données de ce document.
    const docSnap = await getDoc(docRef);

    // On vérifie si le document existe.
    if (docSnap.exists()) {
      const data = docSnap.data() as DocumentData;
      
      // La même logique de compatibilité que dans getStories est appliquée ici
      // pour garantir que les données de l'histoire sont toujours dans le bon format.
      let chapters = data.chapters || [];
      if (data.chapters === undefined && data.content !== undefined) {
        chapters = [{ id: 'default', title: 'Chapter 1', content: data.content, order: 1 }];
      } else if (data.chapters === undefined && data.content === undefined) {
        chapters = [];
      }
      
      let genres: string[] = [];
      if (data.genres && Array.isArray(data.genres)) {
        genres = data.genres;
      } else if (data.genre && typeof data.genre === 'string') {
        genres = [data.genre];
      }

      const tags: string[] = (data.tags && Array.isArray(data.tags)) ? data.tags : [];

      // On construit l'objet Story final avec toutes les données formatées.
      const story: Story = {
        id: docSnap.id,
        title: data.title,
        chapters: chapters,
        genres: genres,
        tags: tags,
        authorId: data.authorId,
        authorName: data.authorName,
        createdAt: data.createdAt,
        description: data.description,
        status: data.status || "published",
        updatedAt: data.updatedAt || data.createdAt,
        coverImage: data.coverImage || "/placeholder.jpg",
        readCount: data.readCount || 0,
      };
      return story;
    } else {
      // Si docSnap.exists() est faux, cela signifie qu'aucune histoire avec cet ID n'a été trouvée.
      return null;
    }
  } catch (error) {
    console.error("Error getting story: ", error);
    return null; // On retourne null aussi en cas d'erreur.
  }
}

/**
 * Met à jour les données d'une histoire existante.
 * C'est une fonction flexible qui peut mettre à jour n'importe quelle partie de l'histoire (titre, genres, chapitres, etc.).
 * @param id - L'ID de l'histoire à mettre à jour.
 * @param updateData - Un objet contenant les champs à modifier.
 */
export async function updateStory(
  id: string,
  updateData: StoryUpdate
): Promise<void> {
  try {
    const docRef = doc(db, "stories", id);
    const dataToUpdate: Partial<StoryUpdate> = { ...updateData };

    // updateDoc ne met à jour que les champs spécifiés dans dataToUpdate,
    // laissant les autres champs du document intacts.
    await updateDoc(docRef, dataToUpdate as DocumentData);
  } catch (error) {
    console.error("Error updating story: ", error);
    throw new Error("Failed to update story");
  }
}

/**
 * Supprime DÉFINITIVEMENT une histoire de la base de données.
 * C'est une action destructrice. Pour une suppression "douce", voir `softDeleteStory`.
 * @param id - L'ID de l'histoire à supprimer.
 */
export async function deleteStory(id: string): Promise<void> {
  try {
    const docRef = doc(db, "stories", id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting story: ", error);
    throw new Error("Failed to delete story");
  }
}

/**
 * Crée le profil d'un nouvel utilisateur dans la collection "users".
 * Cette fonction est généralement appelée juste après la création d'un compte.
 * @param userId - L'ID de l'utilisateur (qui vient de Firebase Auth).
 * @param profileData - Les données initiales du profil (email, nom d'affichage).
 */
export async function createUserProfile(
  userId: string,
  profileData: UserProfile
): Promise<void> {
  try {
    // La référence au document est créée avec l'ID de l'utilisateur, garantissant un profil unique par utilisateur.
    const userRef = doc(db, "users", userId);
    // On s'assure que les listes (favoris, etc.) sont initialisées comme des tableaux vides.
    const dataWithDefaults = {
      ...profileData,
      favorites: profileData.favorites || [],
      readLater: profileData.readLater || [],
    };
    // setDoc crée le document s'il n'existe pas, ou l'écrase complètement s'il existe.
    // C'est pourquoi on l'utilise pour la création.
    await setDoc(userRef, dataWithDefaults);
  } catch (error) {
    console.error("Error creating user profile: ", error);
    throw new Error("Failed to create user profile");
  }
}

/**
 * Récupère les informations du profil d'un utilisateur.
 * @param userId - L'ID de l'utilisateur dont on veut le profil.
 * @returns Un objet UserProfile si l'utilisateur est trouvé, sinon null.
 */
export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as DocumentData;
      // On formate les données et on s'assure que les champs optionnels ont des valeurs par défaut (chaîne vide, tableau vide, etc.).
      return {
        id: docSnap.id,
        bio: data.bio || "",
        website: data.website || "",
        socialLinks: data.socialLinks || {},
        avatar: data.avatar || "",
        displayName: data.displayName,
        email: data.email,
        favorites: data.favorites || [],
        readLater: data.readLater || [],
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile: ", error);
    return null;
  }
}

/**
 * Met à jour une partie du profil d'un utilisateur.
 * @param userId - L'ID de l'utilisateur à modifier.
 * @param updateData - Un objet avec les champs à mettre à jour (ex: { bio: "Nouveau bio", website: "..." }).
 */
export async function updateUserProfile(
  userId: string,
  updateData: Partial<UserProfile>
): Promise<void> {
  try {
    const docRef = doc(db, "users", userId);
    // On utilise updateDoc car on ne veut modifier que certains champs, pas écraser tout le profil.
    await updateDoc(docRef, updateData as DocumentData);
  } catch (error) {
    console.error("Error updating user profile: ", error);
    throw new Error("Failed to update user profile");
  }
}

/**
 * Ajoute ou retire une histoire des favoris d'un utilisateur.
 * C'est une fonction "bascule" (toggle).
 * @param userId - L'ID de l'utilisateur.
 * @param storyId - L'ID de l'histoire à ajouter/retirer.
 */
export async function toggleFavorite(userId: string, storyId: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error("User profile not found");
    }
    
    const userData = userSnap.data();
    const currentFavorites = userData.favorites || [];
    
    let updatedFavorites: string[];
    // On vérifie si l'histoire est déjà dans les favoris.
    if (currentFavorites.includes(storyId)) {
      // Si oui, on la retire en filtrant le tableau.
      updatedFavorites = currentFavorites.filter((id: string) => id !== storyId);
    } else {
      // Si non, on l'ajoute au tableau.
      updatedFavorites = [...currentFavorites, storyId];
    }
    
    // On met à jour le champ "favorites" du profil utilisateur avec le nouveau tableau.
    await updateDoc(userRef, { favorites: updatedFavorites });
  } catch (error) {
    console.error("Error toggling favorite: ", error);
    throw new Error("Failed to toggle favorite");
  }
}

/**
 * Récupère la liste complète des histoires favorites d'un utilisateur.
 * @param userId - L'ID de l'utilisateur.
 * @returns Une liste d'objets Story.
 */
export async function getFavoriteStories(userId: string): Promise<Story[]> {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return [];
    }
    
    const userData = userSnap.data();
    // On récupère le tableau des IDs des histoires favorites.
    const favoriteIds = userData.favorites || [];
    
    if (favoriteIds.length === 0) {
      return [];
    }
    
    // Pour chaque ID, on va chercher les détails complets de l'histoire.
    // Note : Cela peut être inefficace si un utilisateur a des milliers de favoris,
    // car cela fait une lecture de base de données par favori.
    const favoriteStories: Story[] = [];
    for (const storyId of favoriteIds) {
      const story = await getStory(storyId); // On réutilise la fonction getStory !
      if (story) { // On vérifie que l'histoire existe toujours.
        favoriteStories.push(story);
      }
    }
    
    return favoriteStories;
  } catch (error) {
    console.error("Error getting favorite stories: ", error);
    return [];
  }
}

/**
 * Vérifie si une histoire spécifique est dans les favoris d'un utilisateur.
 * C'est plus rapide que `getFavoriteStories` si on veut juste savoir "oui" ou "non".
 * @param userId - L'ID de l'utilisateur.
 * @param storyId - L'ID de l'histoire à vérifier.
 * @returns true si l'histoire est en favori, sinon false.
 */
export async function isStoryFavorited(userId: string, storyId: string): Promise<boolean> {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return false;
    }
    
    const userData = userSnap.data();
    const favorites = userData.favorites || [];
    
    // On vérifie simplement si l'ID de l'histoire est présent dans le tableau des favoris.
    return favorites.includes(storyId);
  } catch (error) {
    console.error("Error checking if story is favorited: ", error);
    return false;
  }
}

/**
 * Ajoute ou retire une histoire de la liste "À lire plus tard" d'un utilisateur.
 * @param userId - L'ID de l'utilisateur.
 * @param storyId - L'ID de l'histoire.
 */
export async function toggleReadLater(userId: string, storyId: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error("User profile not found");
    }
    
    const userData = userSnap.data();
    const currentReadLater = userData.readLater || [];
    
    let updatedReadLater: string[];
    if (currentReadLater.includes(storyId)) {
      // Si l'histoire y est déjà, on la retire.
      updatedReadLater = currentReadLater.filter((id: string) => id !== storyId);
    } else {
      // Sinon, on l'ajoute.
      updatedReadLater = [...currentReadLater, storyId];
    }
    
    await updateDoc(userRef, { readLater: updatedReadLater });
  } catch (error) {
    console.error("Error toggling read later: ", error);
    throw new Error("Failed to toggle read later");
  }
}

/**
 * Récupère la liste complète des histoires que l'utilisateur a marquées "À lire plus tard".
 * @param userId - L'ID de l'utilisateur.
 * @returns Une liste d'objets Story.
 */
export async function getReadLaterStories(userId: string): Promise<Story[]> {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return [];
    }
    
    const userData = userSnap.data();
    const readLaterIds = userData.readLater || [];
    
    if (readLaterIds.length === 0) {
      return [];
    }
    
    // Comme pour les favoris, on récupère les détails de chaque histoire une par une.
    const readLaterStories: Story[] = [];
    for (const storyId of readLaterIds) {
      const story = await getStory(storyId);
      if (story) {
        readLaterStories.push(story);
      }
    }
    
    return readLaterStories;
  } catch (error) {
    console.error("Error getting read later stories: ", error);
    return [];
  }
}

/**
 * Vérifie si une histoire est dans la liste "À lire plus tard" d'un utilisateur.
 * @param userId - L'ID de l'utilisateur.
 * @param storyId - L'ID de l'histoire.
 * @returns true si l'histoire est dans la liste, sinon false.
 */
export async function isStoryInReadLater(userId: string, storyId: string): Promise<boolean> {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return false;
    }
    
    const userData = userSnap.data();
    const readLater = userData.readLater || [];
    
    return readLater.includes(storyId);
  } catch (error) {
    console.error("Error checking if story is in read later: ", error);
    return false;
  }
}

/**
 * Marque une histoire comme "supprimée" sans la supprimer réellement de la base de données.
 * C'est une "suppression douce" (soft delete). Cela permet de la restaurer plus tard.
 * @param id - L'ID de l'histoire à marquer.
 */
export async function softDeleteStory(id: string): Promise<void> {
  try {
    const docRef = doc(db, "stories", id);
    // On met simplement à jour le document avec un drapeau `deleted: true` et la date de suppression.
    await updateDoc(docRef, {
      deleted: true,
      deletedAt: Timestamp.now().toMillis().toString()
    });
  } catch (error) {
    console.error("Error soft-deleting story: ", error);
    throw new Error("Failed to soft-delete story");
  }
}

/**
 * Restaure une histoire qui a été supprimée "doucement".
 * @param id - L'ID de l'histoire à restaurer.
 */
export async function restoreStory(id: string): Promise<void> {
  try {
    const docRef = doc(db, "stories", id);
    // On inverse simplement l'opération de `softDeleteStory`.
    await updateDoc(docRef, {
      deleted: false,
      deletedAt: null // On efface la date de suppression.
    });
  } catch (error) {
    console.error("Error restoring story: ", error);
    throw new Error("Failed to restore story");
  }
}

/**
 * Récupère la liste des histoires d'un utilisateur qui ont été marquées comme supprimées.
 * @param userId - L'ID de l'auteur.
 * @returns Une liste d'histoires supprimées.
 */
export async function getDeletedStories(userId: string): Promise<UserStory[]> {
  try {
    const storiesRef = collection(db, 'stories');
    // On récupère d'abord toutes les histoires de l'auteur.
    // Note : Il serait plus efficace d'avoir une requête `where('deleted', '==', true)`
    // mais cela peut nécessiter un index composite dans Firestore. Le filtrage côté client est une alternative plus simple.
    const q = query(storiesRef, where('authorId', '==', userId));
    
    const snapshot = await getDocs(q);
    const deletedStories: UserStory[] = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as DocumentData;
      
      // On filtre ici pour ne garder que celles avec `deleted: true`.
      if (data.deleted !== true) {
        continue;
      }
      
      const commentCount = await getCommentCountForStory(docSnap.id);
      const { average: averageRating } = await getAverageRating(docSnap.id);

      deletedStories.push({
        id: docSnap.id,
        title: data.title,
        imageUrl: data.coverImage || "/assets/cover.png",
        commentCount: commentCount,
        averageRating: averageRating,
        deletedAt: data.deletedAt
      });
    }
    
    return deletedStories;
  } catch (error) {
    console.error("Error getting deleted stories:", error);
    return [];
  }
}

/**
 * Supprime définitivement les histoires qui ont été "soft-deleted" depuis plus de 30 jours.
 * C'est une fonction de maintenance qui pourrait être exécutée périodiquement (par exemple, via une Cloud Function).
 */
export async function purgeOldStories(): Promise<void> {
  try {
    // On calcule le timestamp d'il y a 30 jours.
    const threshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const storiesRef = collection(db, 'stories');
    // On requête les histoires qui sont marquées comme supprimées ET dont la date de suppression est antérieure au seuil.
    const q = query(
      storiesRef,
      where('deleted', '==', true),
      where('deletedAt', '<', threshold.toString())
    );
    
    const snapshot = await getDocs(q);
    // On prépare une promesse de suppression pour chaque histoire trouvée.
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    // On exécute toutes les suppressions en parallèle pour plus d'efficacité.
    await Promise.all(deletePromises);
    
    console.log(`Purged ${snapshot.size} old stories`);
  } catch (error) {
    console.error("Error purging old stories:", error);
    throw new Error("Failed to purge old stories");
  }
}

/**
 * Récupère une liste d'histoires que l'utilisateur a lues récemment pour lui proposer de "Continuer la lecture".
 * @param userId - L'ID de l'utilisateur.
 * @param count - Le nombre d'histoires à suggérer.
 * @returns Une liste d'objets Story.
 */
export async function getContinueReadingStories(userId: string, count: number = 5): Promise<Story[]> {
  try {
    // On requête la collection `readingProgress` qui stocke quand un utilisateur a lu une histoire pour la dernière fois.
    const readingProgressQuery = query(
      collection(db, "readingProgress"),
      where("userId", "==", userId),
      orderBy("lastReadDate", "desc"), // On trie par date pour avoir les plus récentes en premier.
      limit(count)
    );

    const progressSnapshot = await getDocs(readingProgressQuery);
    // On extrait les IDs des histoires de ces enregistrements de progression.
    const storyIds = progressSnapshot.docs.map(doc => (doc.data() as ReadingProgress).storyId);

    if (storyIds.length === 0) {
      return [];
    }

    const stories: Story[] = [];
    for (const storyId of storyIds) {
      const story = await getStory(storyId);
      // On vérifie que l'histoire existe et que l'utilisateur n'est pas l'auteur (on ne veut pas lui suggérer ses propres histoires).
      if (story && story.authorId !== userId) {
        stories.push(story);
      }
    }
    return stories;
  } catch (error) {
    console.error("Error getting continue reading stories: ", error);
    return [];
  }
}

/**
 * Récupère les histoires les plus populaires, basées sur le nombre de lectures (`readCount`).
 * @param count - Le nombre d'histoires à récupérer.
 * @returns Une liste d'objets Story.
 */
export async function getPopularStories(count: number = 10): Promise<Story[]> {
  try {
    // On requête les histoires publiées, triées par le champ `readCount` en ordre décroissant.
    const storiesQuery = query(
      collection(db, "stories"),
      where("status", "==", "published"), // On ne veut que les histoires visibles par tous.
      orderBy("readCount", "desc"),
      limit(count)
    );

    const querySnapshot = await getDocs(storiesQuery);
    const stories: Story[] = [];

    // La logique de formatage est la même que dans `getStories`.
    querySnapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      let chapters = data.chapters || [];
      if (!data.chapters && data.content) {
        chapters = [{ id: 'default', title: 'Chapter 1', content: data.content, order: 1 }];
      }
      
      let genres: string[] = [];
      if (data.genres && Array.isArray(data.genres)) {
        genres = data.genres;
      } else if (data.genre && typeof data.genre === 'string') {
        genres = [data.genre];
      }

      const tags: string[] = (data.tags && Array.isArray(data.tags)) ? data.tags : [];

      stories.push({
        id: doc.id,
        title: data.title,
        chapters: chapters,
        description: data.description,
        genres: genres,
        tags: tags,
        authorId: data.authorId,
        authorName: data.authorName,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt || data.createdAt,
        status: data.status || "published",
        coverImage: data.coverImage || "/placeholder.jpg",
        readCount: data.readCount || 0,
      });
    });

    return stories;
  } catch (error) {
    console.error("Error getting popular stories: ", error);
    return [];
  }
}

/**
 * Enregistre le fait qu'un utilisateur a lu une histoire.
 * Met à jour deux choses :
 * 1. La progression de lecture de l'utilisateur (pour la section "Continuer la lecture").
 * 2. Le compteur de lectures de l'histoire (pour la popularité).
 * @param userId - L'ID de l'utilisateur qui lit.
 * @param storyId - L'ID de l'histoire lue.
 */
export async function recordStoryRead(userId: string, storyId: string): Promise<void> {
  try {
    // On met à jour (ou crée) un document dans `readingProgress` pour marquer que cet utilisateur a lu cette histoire à cet instant.
    // L'ID composite `${userId}_${storyId}` garantit un enregistrement unique par utilisateur et par histoire.
    const readingProgressRef = doc(db, "readingProgress", `${userId}_${storyId}`);
    await setDoc(readingProgressRef, {
      userId,
      storyId,
      lastReadDate: Timestamp.now().toMillis().toString(),
    }, { merge: true }); // `merge: true` évite d'écraser d'autres champs si le document existait déjà.

    // On incrémente le compteur de lectures de l'histoire.
    // Note : Cette opération n'est pas atomique. Pour une application à très grande échelle,
    // on utiliserait `increment()` de Firestore pour garantir que le compteur est toujours juste, même avec des lectures simultanées.
    const storyRef = doc(db, "stories", storyId);
    const storySnap = await getDoc(storyRef);

    if (storySnap.exists()) {
      const currentReadCount = storySnap.data().readCount || 0;
      await updateDoc(storyRef, {
        readCount: currentReadCount + 1,
      });
    } else {
      console.warn(`Story with id ${storyId} not found for readCount increment.`);
    }

  } catch (error) {
    console.error(`Error recording story read for story ${storyId} by user ${userId}: `, error);
  }
}
