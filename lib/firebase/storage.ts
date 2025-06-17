import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from './config';

// Initialisation du service Firebase Storage.
// On utilise un bloc try...catch pour s'assurer que la configuration est correcte
// et que le service peut démarrer. Si ce n'est pas le cas, une erreur claire est levée.
let storage: any;
try {
  storage = getStorage(app);
  console.log('Firebase Storage initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase Storage:', error);
  throw new Error('Firebase Storage initialization failed. Check your configuration.');
}

// On exporte l'instance de Storage pour qu'elle soit utilisable dans d'autres parties de l'application.
export { storage };

// Default placeholder cover image URL (will be set after uploading to Firebase)
export const DEFAULT_COVER_URL = 'https://firebasestorage.googleapis.com/v0/b/your-project-id/o/placeholders%2Fcover.png?alt=media';

/**
 * Fonction générique pour téléverser un fichier sur Firebase Storage.
 * C'est la fonction de base qui est ensuite utilisée par des fonctions plus spécifiques (comme pour les couvertures ou les avatars).
 * @param file - Le fichier (objet File) à téléverser, généralement issu d'un <input type="file">.
 * @param path - Le chemin de destination dans le "bucket" de Firebase Storage (ex: 'covers/story-123.jpg').
 * @returns Une promesse qui se résout avec l'URL publique de téléchargement du fichier.
 */
export async function uploadFile(file: File, path: string): Promise<string> {
  try {
    console.log(`Attempting to upload file to path: ${path}`);
    console.log(`File details: name=${file.name}, size=${file.size}, type=${file.type}`);
    
    if (!storage) {
      throw new Error('Firebase Storage not initialized');
    }
    
    const storageRef = ref(storage, path);
    console.log('Storage reference created, starting upload...');
    
    const snapshot = await uploadBytes(storageRef, file);
    console.log('Upload completed, getting download URL...');
    
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Download URL obtained:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('storage/unauthorized')) {
        throw new Error('Upload failed: Firebase Storage rules deny access. Please check your Storage rules in Firebase Console.');
      } else if (error.message.includes('storage/unknown')) {
        throw new Error('Upload failed: Unknown Firebase Storage error. Check your Firebase configuration.');
      } else if (error.message.includes('storage/object-not-found')) {
        throw new Error('Upload failed: Storage bucket not found. Ensure Firebase Storage is enabled.');
      } else if (error.message.includes('storage/bucket-not-found')) {
        throw new Error('Upload failed: Storage bucket not found. Check your Firebase project configuration.');
      }
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    throw new Error('Failed to upload file: Unknown error');
  }
}

/**
 * Upload the default cover placeholder to Firebase Storage
 * This should be run once to set up the default cover
 * @param file - The cover.png file
 * @returns Promise<string> - The download URL
 */
export async function uploadDefaultCover(file: File): Promise<string> {
  try {
    console.log('Starting default cover upload...');
    return await uploadFile(file, 'placeholders/cover.png');
  } catch (error) {
    console.error('Error uploading default cover:', error);
    throw error; // Re-throw the detailed error from uploadFile
  }
}

/**
 * Get the default cover URL from Firebase Storage
 * @returns Promise<string> - The download URL
 */
export async function getDefaultCoverUrl(): Promise<string> {
  try {
    const storageRef = ref(storage, 'placeholders/cover.png');
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error getting default cover URL:', error);
    // Return a fallback URL or throw error
    throw new Error('Failed to get default cover URL');
  }
}

/**
 * Supprime un fichier de Firebase Storage.
 * Utile par exemple si un utilisateur change son image de couverture ou son avatar.
 * @param path - Le chemin complet du fichier à supprimer dans Firebase Storage.
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
}

/**
 * Fonction spécifique pour téléverser une image de couverture pour une histoire.
 * Elle construit un chemin unique pour éviter les conflits de noms de fichiers.
 * @param file - Le fichier image à téléverser.
 * @param storyId - L'ID de l'histoire, pour l'inclure dans le nom du fichier.
 * @returns L'URL de téléchargement de l'image de couverture.
 */
export async function uploadStoryCover(file: File, storyId: string): Promise<string> {
  const path = `covers/${storyId}-${Date.now()}.${file.name.split('.').pop()}`;
  return uploadFile(file, path);
}
/**
 * Fonction spécifique pour téléverser un avatar pour un utilisateur.
 * Elle construit un chemin basé sur l'ID de l'utilisateur pour garantir que chaque utilisateur n'a qu'un seul avatar,
 * écrasant l'ancien si un nouveau est téléversé.
 * @param file - Le fichier image à téléverser.
 * @param userId - L'ID de l'utilisateur.
 * @returns L'URL de téléchargement de l'avatar.
 */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const fileExtension = file.name.split('.').pop();
  const storagePath = `avatars/${userId}.${fileExtension}`;
  // Réutilise la fonction uploadFile existante pour la logique d'upload
  return uploadFile(file, storagePath);
}