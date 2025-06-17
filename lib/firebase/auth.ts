import { 
  getAuth, 
  sendPasswordResetEmail as firebaseSendPasswordResetEmail, 
  confirmPasswordReset as firebaseConfirmPasswordReset 
} from "firebase/auth";
import { app } from './config'; // Assurez-vous que ce chemin est correct
import { FirebaseError } from 'firebase/app';

// On récupère l'instance du service d'authentification initialisée dans config.ts.
// C'est cette instance `auth` qui nous permettra d'utiliser les fonctionnalités d'authentification de Firebase.
const auth = getAuth(app);

/**
 * Envoie un e-mail de réinitialisation de mot de passe à l'utilisateur.
 * C'est la première étape du processus de "mot de passe oublié". Firebase s'occupe de générer un lien sécurisé.
 * @param email L'adresse e-mail de l'utilisateur qui a oublié son mot de passe.
 * @returns Un objet indiquant si l'opération a réussi ou échoué, avec un message d'erreur le cas échéant.
 */
export const sendPasswordResetEmail = async (email: string) => {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (error) {
    const firebaseError = error as FirebaseError;
    console.error("Erreur lors de l'envoi de l'email de réinitialisation:", firebaseError.code, firebaseError.message);
    return { success: false, error: firebaseError.message };
  }
};

/**
 * Confirme la réinitialisation du mot de passe et le met à jour dans le système d'authentification de Firebase.
 * C'est la deuxième étape, qui est déclenchée lorsque l'utilisateur clique sur le lien dans l'e-mail et soumet son nouveau mot de passe.
 * @param oobCode Le code spécial ("out-of-band code") que Firebase inclut dans l'URL de réinitialisation pour vérifier la requête.
 * @param newPassword Le nouveau mot de passe que l'utilisateur a choisi.
 * @returns Un objet indiquant si l'opération a réussi ou échoué, avec un message d'erreur le cas échéant.
 */
export const confirmPasswordReset = async (oobCode: string, newPassword: string) => {
  try {
    await firebaseConfirmPasswordReset(auth, oobCode, newPassword);
    return { success: true, error: null };
  } catch (error) {
    const firebaseError = error as FirebaseError;
    console.error("Erreur lors de la confirmation de la réinitialisation du mot de passe:", firebaseError.code, firebaseError.message);
    return { success: false, error: firebaseError.message };
  }
};