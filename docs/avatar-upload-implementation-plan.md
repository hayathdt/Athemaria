# Plan d'implémentation pour l'upload d'avatar

## Objectif
Permettre aux utilisateurs de changer leur photo de profil :
1. En cliquant sur l'avatar dans la page de profil
2. En sélectionnant une image
3. En uploadant et mettant à jour automatiquement

## Fichiers à modifier
1. `lib/firebase/storage.ts` - Ajouter uploadAvatar
2. `app/profile/page.tsx` - Implémenter l'UI et la logique
3. `lib/types.ts` - Vérifier le type UserProfile

## Étapes détaillées

### 1. Ajouter uploadAvatar dans storage.ts
```typescript
// Ajouter cette fonction dans lib/firebase/storage.ts
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const storage = getStorage();
  const fileExtension = file.name.split('.').pop();
  const storagePath = `avatars/${userId}.${fileExtension}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
```

### 2. Modifier ProfilePage dans app/profile/page.tsx

#### États à ajouter
```typescript
const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
```

#### Fonction handleAvatarUpload
```typescript
const handleAvatarUpload = async (file: File) => {
  if (!user) return;

  setIsUploadingAvatar(true);
  try {
    // Uploader la nouvelle image
    const newAvatarUrl = await uploadAvatar(file, user.uid);

    // Supprimer l'ancienne image si elle existe
    if (profile?.avatar && profile.avatar !== "/placeholder-user.jpg") {
      try {
        const url = new URL(profile.avatar);
        const pathName = url.pathname;
        const encodedPath = pathName.substring(pathName.indexOf('/o/') + 3);
        const decodedPath = decodeURIComponent(encodedPath);
        if (decodedPath && !decodedPath.includes("placeholders/")) {
          await deleteFile(decodedPath);
        }
      } catch (error) {
        console.error("Failed to delete old avatar:", error);
      }
    }

    // Mettre à jour le profil
    const updatedProfile = { ...profile, avatar: newAvatarUrl } as UserProfile;
    await updateUserProfile(user.uid, updatedProfile);
    setProfile(updatedProfile);
    
    toast({
      title: "Success",
      description: "Votre photo de profil a été mise à jour",
    });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    toast({
      title: "Error",
      description: "Échec de la mise à jour de l'avatar",
      variant: "destructive",
    });
  } finally {
    setIsUploadingAvatar(false);
    setSelectedAvatarFile(null);
    setAvatarPreview(null);
  }
};
```

#### Modifier le rendu de l'avatar
```tsx
<div className="rounded-full border-2 border-white shadow-lg w-24 h-24 overflow-hidden mb-4 relative">
  {isUploadingAvatar ? (
    <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
      <svg className="animate-spin h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  ) : (
    <>
      <img
        src={avatarPreview || profile?.avatar || "/placeholder-user.jpg"}
        alt="Profile"
        className="w-full h-full object-cover"
      />
      <button
        type="button"
        onClick={() => document.getElementById('avatarUpload')?.click()}
        className="absolute bottom-0 right-0 bg-white dark:bg-gray-800 rounded-full p-1 shadow-md"
      >
        <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
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
      setSelectedAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
      handleAvatarUpload(file);
    }
  }}
  className="hidden"
/>
```

### 3. Vérifier le type UserProfile
S'assurer que `UserProfile` dans `lib/types.ts` contient bien le champ `avatar`:
```typescript
avatar: string;
```

## Validation
1. Tester l'upload d'une nouvelle image
2. Vérifier que l'ancienne image est supprimée
3. Tester avec l'image par défaut
4. Vérifier les messages d'erreur

## Prochaines étapes
Après approbation de ce plan, passer en mode Code pour implémenter les changements.