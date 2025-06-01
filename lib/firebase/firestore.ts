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
  Report,
  AdminAction,
  Notification,
} from "../types";

export async function createStory(storyData: StoryInput): Promise<string> { 
  try {
    const dataToSave = {
      ...storyData,
      chapters: storyData.chapters || [],
      coverImage: storyData.coverImage || "/assets/cover.png", // Use correct default cover image
    };
    const docRef = await addDoc(collection(db, "stories"), dataToSave);
    return docRef.id;
  } catch (error) {
    console.error("Error adding story: ", error);
    throw new Error("Failed to create story");
  }
}

export async function updateComment(
  commentId: string,
  newText: string,
  userId: string
): Promise<void> {
  console.log(`[firestore.ts] Attempting to update comment ${commentId} by user ${userId} with new text: "${newText}"`);
  const commentRef = doc(db, "comments", commentId);
  try {
    const commentSnap = await getDoc(commentRef);

    if (!commentSnap.exists()) {
      console.error(`[firestore.ts] Comment ${commentId} not found for update.`);
      throw new Error("Comment not found.");
    }

    const commentData = commentSnap.data();
    if (commentData.userId !== userId) {
      console.error(`[firestore.ts] User ${userId} does not have permission to update comment ${commentId} owned by ${commentData.userId}.`);
      throw new Error("You do not have permission to update this comment.");
    }

    await updateDoc(commentRef, {
      text: newText,
      updatedAt: Timestamp.now().toMillis().toString(),
    });
    console.log(`[firestore.ts] Comment ${commentId} updated successfully by user ${userId}.`);
  } catch (error) {
    console.error(`[firestore.ts] Error updating comment ${commentId}:`, error);
    if (error instanceof Error && (error.message === "Comment not found." || error.message === "You do not have permission to update this comment.")) {
        throw error;
    }
    throw new Error(`Failed to update comment. Firestore error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function deleteComment(
  commentId: string,
  userId: string
): Promise<void> {
  console.log(`[firestore.ts] Attempting to delete comment ${commentId} by user ${userId}.`);
  const commentRef = doc(db, "comments", commentId);
  try {
    const commentSnap = await getDoc(commentRef);

    if (!commentSnap.exists()) {
      console.warn(`[firestore.ts] Comment ${commentId} not found for delete. Might have already been deleted.`);
      return; 
    }

    const commentData = commentSnap.data();
    if (commentData.userId !== userId) {
      console.error(`[firestore.ts] User ${userId} does not have permission to delete comment ${commentId} owned by ${commentData.userId}.`);
      throw new Error("You do not have permission to delete this comment.");
    }

    await deleteDoc(commentRef);
    console.log(`[firestore.ts] Comment ${commentId} deleted successfully by user ${userId}.`);
  } catch (error) {
    console.error(`[firestore.ts] Error deleting comment ${commentId}:`, error);
     if (error instanceof Error && error.message === "You do not have permission to delete this comment.") {
        throw error;
    }
    throw new Error(`Failed to delete comment. Firestore error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function setRating(ratingData: RatingInput): Promise<void> {
  const { storyId, userId, value } = ratingData;
  try {
    const ratingsQuery = query(
      collection(db, "ratings"),
      where("storyId", "==", storyId),
      where("userId", "==", userId),
      limit(1)
    );

    const querySnapshot = await getDocs(ratingsQuery);
    const now = Timestamp.now().toMillis().toString();

    if (!querySnapshot.empty) {
      const docId = querySnapshot.docs[0].id;
      await updateDoc(doc(db, "ratings", docId), {
        value,
        updatedAt: now,
      });
    } else {
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

export async function getRating(
  storyId: string,
  userId: string
): Promise<Rating | null> {
  try {
    const ratingsQuery = query(
      collection(db, "ratings"),
      where("storyId", "==", storyId),
      where("userId", "==", userId),
      limit(1)
    );

    const querySnapshot = await getDocs(ratingsQuery);

    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data() as DocumentData;
      return {
        id: docSnap.id,
        storyId: data.storyId,
        userId: data.userId,
        value: data.value,
      } as Rating;
    }
    return null;
  } catch (error) {
    console.error("Error getting rating: ", error);
    return null;
  }
}

export async function getAverageRating(storyId: string): Promise<ImportedRatingStats> {
  try {
    const ratingsQuery = query(
      collection(db, "ratings"),
      where("storyId", "==", storyId)
    );

    const querySnapshot = await getDocs(ratingsQuery);
    const count = querySnapshot.size;

    if (count === 0) {
      return { average: 0, count: 0 };
    }

    let totalValue = 0;
    querySnapshot.forEach((doc) => {
      const ratingValue = doc.data().value;
      if (typeof ratingValue === 'number') {
        totalValue += ratingValue;
      } else {
        console.warn(`[firestore.ts] Invalid rating value found for story ${storyId}, comment doc ID ${doc.id}:`, ratingValue);
      }
    });
    
    const average = totalValue / count;
    console.log(`[firestore.ts] Calculated average rating for story ${storyId}: ${average}, count: ${count}`);
    return { average, count };
  } catch (error) {
    console.error(`[firestore.ts] Error getting average rating stats for story ${storyId}:`, error);
    return { average: 0, count: 0 };
  }
}

export async function getCommentCountForStory(storyId: string): Promise<number> {
  try {
    const commentsQuery = query(
      collection(db, "comments"),
      where("storyId", "==", storyId)
    );
    const querySnapshot = await getDocs(commentsQuery);
    return querySnapshot.size;
  } catch (error) {
    console.error(`[firestore.ts] Error getting comment count for story ${storyId}:`, error);
    return 0;
  }
}

export async function getUserStories(userId: string): Promise<UserStory[]> {
  try {
    console.log(`[firestore.ts] getUserStories called with userId: ${userId}`);
    const storiesRef = collection(db, 'stories');
    const q = query(storiesRef, where('authorId', '==', userId));
    const snapshot = await getDocs(q);
    
    console.log(`[firestore.ts] Found ${snapshot.size} stories for user ${userId}`);
    
    const userStories: UserStory[] = [];
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as DocumentData;
      
      console.log(`[firestore.ts] Processing story: ${docSnap.id}, title: ${data.title}, authorId: ${data.authorId}, deleted: ${data.deleted}`);
      
      // Filtrer côté client les histoires supprimées
      if (data.deleted === true) {
        console.log(`[firestore.ts] Skipping deleted story: ${docSnap.id}`);
        continue;
      }
      
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
    
    console.log(`[firestore.ts] Returning ${userStories.length} user stories`);
    return userStories;
  } catch (error) {
    console.error("[firestore.ts] Error getting user stories:", error);
    return [];
  }
}

export async function createComment(
  commentData: CommentInput
): Promise<string> {
  console.log("[firestore.ts] Raw input commentData:", JSON.stringify(commentData, null, 2));

  const dataToSave: Partial<CommentInput> & { userAvatar?: string | null } = { ...commentData };

  if (dataToSave.userAvatar === undefined) {
    console.log("[firestore.ts] Safeguard: userAvatar was undefined, converting to null.");
    dataToSave.userAvatar = null;
  }

  const now = Timestamp.now().toMillis().toString();
  const docDataWithTimestamp = {
    ...dataToSave,
    createdAt: now,
    updatedAt: now,
  };

  console.log("[firestore.ts] Document to be added to 'comments' (after safeguard and adding updatedAt):", JSON.stringify(docDataWithTimestamp, null, 2));
  try {
    const docRef = await addDoc(collection(db, "comments"), docDataWithTimestamp);
    console.log("[firestore.ts] Comment added successfully with ID:", docRef.id);
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

export async function getComments(storyId: string): Promise<Comment[]> {
  try {
    const commentsQuery = query(
      collection(db, "comments"),
      where("storyId", "==", storyId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(commentsQuery);
    const comments: Comment[] = [];

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
    return [];
  }
}

export async function getStories(limitCount = 50): Promise<Story[]> {
  try {
    const storiesQuery = query(
      collection(db, "stories"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(storiesQuery);
    const stories: Story[] = [];

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
        coverImage: data.coverImage || "/placeholder.jpg", // Changed default path
        readCount: data.readCount || 0,
      });
    });

    return stories;
  } catch (error) {
    console.error("Error getting stories: ", error);
    return [];
  }
}

export async function getStory(id: string): Promise<Story | null> {
  try {
    const docRef = doc(db, "stories", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as DocumentData;
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
        coverImage: data.coverImage || "/placeholder.jpg", // Changed default path
        readCount: data.readCount || 0,
      };
      return story;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting story: ", error);
    return null;
  }
}

export async function updateStory(
  id: string,
  updateData: StoryUpdate 
): Promise<void> {
  try {
    const docRef = doc(db, "stories", id);
    const dataToUpdate: Partial<StoryUpdate> = { ...updateData };

    await updateDoc(docRef, dataToUpdate as DocumentData);
  } catch (error) {
    console.error("Error updating story: ", error);
    throw new Error("Failed to update story");
  }
}

export async function deleteStory(id: string): Promise<void> {
  try {
    const docRef = doc(db, "stories", id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting story: ", error);
    throw new Error("Failed to delete story");
  }
}

export async function createUserProfile(
  userId: string,
  profileData: UserProfile
): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    const dataWithDefaults = {
      ...profileData,
      favorites: profileData.favorites || [], // Initialize favorites as empty array if not provided
      readLater: profileData.readLater || [], // Initialize readLater as empty array if not provided
    };
    await setDoc(userRef, dataWithDefaults);
  } catch (error) {
    console.error("Error creating user profile: ", error);
    throw new Error("Failed to create user profile");
  }
}

export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as DocumentData;
      return {
        id: docSnap.id,
        bio: data.bio || "",
        website: data.website || "",
        socialLinks: data.socialLinks || {},
        avatar: data.avatar || "",
        displayName: data.displayName,
        email: data.email,
        favorites: data.favorites || [], // Ensure favorites is always an array
        readLater: data.readLater || [], // Ensure readLater is always an array
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile: ", error);
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  updateData: Partial<UserProfile>
): Promise<void> {
  try {
    const docRef = doc(db, "users", userId);
    await updateDoc(docRef, updateData as DocumentData);
  } catch (error) {
    console.error("Error updating user profile: ", error);
    throw new Error("Failed to update user profile");
  }
}

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
    if (currentFavorites.includes(storyId)) {
      // Remove from favorites
      updatedFavorites = currentFavorites.filter((id: string) => id !== storyId);
    } else {
      // Add to favorites
      updatedFavorites = [...currentFavorites, storyId];
    }
    
    await updateDoc(userRef, { favorites: updatedFavorites });
  } catch (error) {
    console.error("Error toggling favorite: ", error);
    throw new Error("Failed to toggle favorite");
  }
}

export async function getFavoriteStories(userId: string): Promise<Story[]> {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return [];
    }
    
    const userData = userSnap.data();
    const favoriteIds = userData.favorites || [];
    
    if (favoriteIds.length === 0) {
      return [];
    }
    
    // Fetch all favorite stories
    const favoriteStories: Story[] = [];
    for (const storyId of favoriteIds) {
      const story = await getStory(storyId);
      if (story) {
        favoriteStories.push(story);
      }
    }
    
    return favoriteStories;
  } catch (error) {
    console.error("Error getting favorite stories: ", error);
    return [];
  }
}

export async function isStoryFavorited(userId: string, storyId: string): Promise<boolean> {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return false;
    }
    
    const userData = userSnap.data();
    const favorites = userData.favorites || [];
    
    return favorites.includes(storyId);
  } catch (error) {
    console.error("Error checking if story is favorited: ", error);
    return false;
  }
}

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
      // Remove from read later
      updatedReadLater = currentReadLater.filter((id: string) => id !== storyId);
    } else {
      // Add to read later
      updatedReadLater = [...currentReadLater, storyId];
    }
    
    await updateDoc(userRef, { readLater: updatedReadLater });
  } catch (error) {
    console.error("Error toggling read later: ", error);
    throw new Error("Failed to toggle read later");
  }
}

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
    
    // Fetch all read later stories
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

export async function softDeleteStory(id: string): Promise<void> {
  try {
    const docRef = doc(db, "stories", id);
    await updateDoc(docRef, {
      deleted: true,
      deletedAt: Timestamp.now().toMillis().toString()
    });
  } catch (error) {
    console.error("Error soft-deleting story: ", error);
    throw new Error("Failed to soft-delete story");
  }
}

export async function restoreStory(id: string): Promise<void> {
  try {
    const docRef = doc(db, "stories", id);
    await updateDoc(docRef, {
      deleted: false,
      deletedAt: null
    });
  } catch (error) {
    console.error("Error restoring story: ", error);
    throw new Error("Failed to restore story");
  }
}

export async function getDeletedStories(userId: string): Promise<UserStory[]> {
  try {
    console.log(`[firestore.ts] getDeletedStories called with userId: ${userId}`);
    const storiesRef = collection(db, 'stories');
    const q = query(storiesRef, where('authorId', '==', userId));
    
    const snapshot = await getDocs(q);
    const deletedStories: UserStory[] = [];
    
    console.log(`[firestore.ts] Found ${snapshot.size} total stories, filtering for deleted ones`);
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as DocumentData;
      
      // Filtrer côté client pour les histoires supprimées
      if (data.deleted !== true) {
        continue;
      }
      
      console.log(`[firestore.ts] Processing deleted story: ${docSnap.id}, title: ${data.title}`);
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
    
    console.log(`[firestore.ts] Returning ${deletedStories.length} deleted stories`);
    return deletedStories;
  } catch (error) {
    console.error("Error getting deleted stories:", error);
    return [];
  }
}

export async function purgeOldStories(): Promise<void> {
  try {
    const threshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const storiesRef = collection(db, 'stories');
    const q = query(
      storiesRef, 
      where('deleted', '==', true),
      where('deletedAt', '<', threshold.toString())
    );
    
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`Purged ${snapshot.size} old stories`);
  } catch (error) {
    console.error("Error purging old stories:", error);
    throw new Error("Failed to purge old stories");
  }
}

export async function getContinueReadingStories(userId: string, count: number = 5): Promise<Story[]> {
  try {
    const readingProgressQuery = query(
      collection(db, "readingProgress"),
      where("userId", "==", userId),
      orderBy("lastReadDate", "desc"),
      limit(count)
    );

    const progressSnapshot = await getDocs(readingProgressQuery);
    const storyIds = progressSnapshot.docs.map(doc => (doc.data() as ReadingProgress).storyId);

    if (storyIds.length === 0) {
      return [];
    }

    const stories: Story[] = [];
    for (const storyId of storyIds) {
      const story = await getStory(storyId);
      // Vérifier que l'histoire existe et que l'auteur n'est pas l'utilisateur actuel
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

export async function getPopularStories(count: number = 10): Promise<Story[]> {
  try {
    // Pour l'instant, nous trions par readCount.
    // Une implémentation plus avancée pourrait prendre en compte la date pour "les plus lus du mois".
    const storiesQuery = query(
      collection(db, "stories"),
      where("status", "==", "published"), // Uniquement les histoires publiées
      orderBy("readCount", "desc"),
      limit(count)
    );

    const querySnapshot = await getDocs(storiesQuery);
    const stories: Story[] = [];

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

// Fonctions pour les signalements (Reports)
export const createReport = async (reportData: Omit<Report, 'id' | 'createdAt' | 'resolved'>): Promise<string> => {
  try {
    const reportToSave = {
      ...reportData,
      createdAt: Timestamp.now().toMillis().toString(),
      resolved: false,
    };
    const docRef = await addDoc(collection(db, 'reports'), reportToSave);
    return docRef.id;
  } catch (error) {
    console.error("Error creating report: ", error);
    throw new Error("Failed to create report");
  }
};

export const getUnresolvedReports = async (): Promise<Report[]> => {
  try {
    const q = query(collection(db, 'reports'), where('resolved', '==', false), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
  } catch (error) {
    console.error("Error getting unresolved reports: ", error);
    return [];
  }
};

export const resolveReport = async (reportId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'reports', reportId), { resolved: true });
  } catch (error) {
    console.error(`Error resolving report ${reportId}: `, error);
    throw new Error("Failed to resolve report");
  }
};

// Fonctions pour les actions admin
export const createAdminAction = async (actionData: Omit<AdminAction, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const actionToSave = {
      ...actionData,
      createdAt: Timestamp.now().toMillis().toString(),
    };
    const docRef = await addDoc(collection(db, 'adminActions'), actionToSave);
    return docRef.id;
  } catch (error) {
    console.error("Error creating admin action: ", error);
    throw new Error("Failed to create admin action");
  }
};

export const getPendingAdminActions = async (): Promise<AdminAction[]> => {
  try {
    // On pourrait vouloir filtrer par resolvedAt == null, mais pour l'instant on les prend toutes
    const q = query(collection(db, 'adminActions'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminAction));
  } catch (error) {
    console.error("Error getting admin actions: ", error);
    return [];
  }
};

export const updateAdminAction = async (actionId: string, updates: Partial<AdminAction>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'adminActions', actionId), updates);
  } catch (error) {
    console.error(`Error updating admin action ${actionId}: `, error);
    throw new Error("Failed to update admin action");
  }
};


// Fonctions pour les notifications
export const createNotification = async (notificationData: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<string> => {
  try {
    const notificationToSave = {
      ...notificationData,
      createdAt: Timestamp.now().toMillis().toString(),
      read: false,
    };
    const docRef = await addDoc(collection(db, 'notifications'), notificationToSave);
    return docRef.id;
  } catch (error) {
    console.error("Error creating notification: ", error);
    throw new Error("Failed to create notification");
  }
};

export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
  } catch (error) {
    console.error(`Error getting notifications for user ${userId}: `, error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch (error) {
    console.error(`Error marking notification ${notificationId} as read: `, error);
    throw new Error("Failed to mark notification as read");
  }
};

export const markAllUserNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    const updates = snapshot.docs.map(docRef => updateDoc(doc(db, 'notifications', docRef.id), { read: true }));
    await Promise.all(updates);
  } catch (error) {
    console.error(`Error marking all notifications as read for user ${userId}: `, error);
    throw new Error("Failed to mark all notifications as read");
  }
};

// Fonction pour récupérer les histoires par statut (utile pour le panel admin)
export async function getStoriesByStatus(status: Story['status']): Promise<Story[]> {
  try {
    const storiesQuery = query(
      collection(db, "stories"),
      where("status", "==", status),
      orderBy("updatedAt", "desc") // ou createdAt selon le besoin
    );

    const querySnapshot = await getDocs(storiesQuery);
    const stories: Story[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as DocumentData;
      // Logique de mapping similaire à getStories/getStory
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

      stories.push({
        id: docSnap.id,
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
        deleted: data.deleted || false,
        deletedAt: data.deletedAt || undefined,
      });
    });

    return stories;
  } catch (error) {
    console.error(`Error getting stories with status ${status}: `, error);
    return [];
  }
}

// Fonction pour mettre à jour le readCount et enregistrer la progression de lecture
export async function recordStoryRead(userId: string, storyId: string): Promise<void> {
  try {
    // Mettre à jour la progression de lecture
    const readingProgressRef = doc(db, "readingProgress", `${userId}_${storyId}`); // Utiliser un ID composite
    await setDoc(readingProgressRef, {
      userId,
      storyId,
      lastReadDate: Timestamp.now().toMillis().toString(),
    }, { merge: true }); // merge:true pour créer ou mettre à jour

    // Incrémenter le readCount de l'histoire
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
    // Ne pas bloquer l'utilisateur si cela échoue, mais logger l'erreur.
  }
}
