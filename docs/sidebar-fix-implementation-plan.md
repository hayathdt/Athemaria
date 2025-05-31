# Plan d'implémentation : Correction de la superposition de la sidebar

## Problème actuel
Lorsque la sidebar s'ouvre au survol de la souris (sur desktop), elle se superpose au contenu principal et cache :
- Les livres/cartes
- Le titre de la rubrique (Home, Favorites, etc.)

## Solution proposée
Modifier la marge gauche du contenu principal pour qu'elle s'ajuste dynamiquement en fonction de l'état de la sidebar (ouverte/fermée).

### Fichiers à modifier
1. `app/layout.tsx` - Layout principal
2. `lib/sidebar-context.tsx` - Contexte de la sidebar (déjà existant)

### Étapes d'implémentation

#### 1. Mettre à jour `app/layout.tsx`
```typescript
// Ajouter l'import du hook useSidebar
import { useSidebar } from '@/lib/sidebar-context';

// Dans le composant RootLayout, ajouter :
const { isOpen } = useSidebar();

// Modifier la classe du contenu principal :
<main className={`flex-1 transition-all duration-300 ease-in-out ${
  isOpen ? 'ml-0 md:ml-64' : 'ml-0 md:ml-16'
}`}>
```

#### 2. Justification des valeurs
- `md:ml-16` : Marge quand sidebar fermée (largeur 64px / 4 = 16 en Tailwind)
- `md:ml-64` : Marge quand sidebar ouverte (largeur 256px)
- `transition-all duration-300 ease-in-out` : Animation synchronisée avec la sidebar

#### 3. Avantages de cette solution
- Solution propre sans duplication de code
- Transition fluide et synchronisée avec l'animation de la sidebar
- Respect du responsive design (uniquement sur écrans md et plus grands)
- Aucun impact sur la version mobile

### Tests à effectuer
1. Sur desktop : 
   - Vérifier que le contenu se décale quand la sidebar s'ouvre
   - Vérifier que l'animation est fluide
   - Vérifier qu'aucun élément n'est caché
2. Sur mobile :
   - Vérifier que le comportement reste inchangé
   - Vérifier que la sidebar mobile fonctionne correctement

## Validation
Une fois ces modifications implémentées, le contenu principal se décalera fluidement pour laisser l'espace nécessaire à la sidebar ouverte, résolvant ainsi le problème de superposition.