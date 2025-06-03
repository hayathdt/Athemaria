# Plan d'Implémentation : Correction du Responsive Mobile

## Problème Actuel
Les pages de lecture d'histoires présentent des défauts d'affichage sur mobile :
- Éléments qui débordent de l'écran
- Marges excessives réduisant l'espace utile
- Typographie non adaptée
- Navigation peu ergonomique

## Solutions Proposées

### 1. Modifications CSS Globales
```css:styles/globals.css
@media (max-width: 767px) {
  .container {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
  
  .prose {
    font-size: 1rem;
    line-height: 1.5;
  }
}
```

### 2. Adaptations Composant StoryPage
```tsx:app/story/[id]/page.tsx
// Remplacer
<div className="container mx-auto px-4 py-8">

// Par
<div className="container mx-auto px-2 sm:px-4 py-4 md:py-6">
```

### 3. Optimisations Spécifiques
- **Conteneurs** : `max-width: 100%` pour tous les éléments parents
- **Espacements** : Conversion px → rem/em
- **Navigation chapitres** : 
  ```tsx
  <div className="flex flex-col sm:flex-row">
  ```
- **Typographie** : 
  ```tsx
  <div className="prose prose-sm sm:prose-base">
  ```

### 4. Plan de Validation
| Test | Méthode | Critère de Succès |
|------|---------|-------------------|
| Affichage texte | Chrome Dev Tools | Aucun débordement horizontal |
| Navigation | Test tactile réel | Boutons accessibles au pouce |
| Performance | Lighthouse | Score > 90/100 |
| Accessibilité | VoiceOver/TalkBack | Lecture fluide |

## Calendrier d'Implémentation
1. **Phase 1** (J1) : Modifications CSS globales
2. **Phase 2** (J1) : Adaptation composant StoryPage
3. **Phase 3** (J2) : Tests et ajustements
4. **Phase 4** (J2) : Déploiement staging
5. **Phase 5** (J3) : Validation finale