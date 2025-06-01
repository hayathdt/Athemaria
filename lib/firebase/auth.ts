import { 
  getAuth, 
  sendPasswordResetEmail as firebaseSendPasswordResetEmail, 
  confirmPasswordReset as firebaseConfirmPasswordReset 
} from "firebase/auth";
import { app } from './config'; // Assurez-vous que ce chemin est correct
import { FirebaseError } from 'firebase/app';

const auth = getAuth(app);

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