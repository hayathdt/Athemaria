'use client';

import React, { useState, useEffect } from 'react';
import BookRecommendationCard from '@/components/cards/book-recommendation-card';
import PageHeader from '@/components/layout/page-header';
import { getFavoriteStories } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import type { Story } from '@/lib/types';

// Déclaration du composant React pour la page des favoris.
// Un composant est un morceau d'interface utilisateur réutilisable.
const FavoritesPage: React.FC = () => {
  // On utilise un "hook" personnalisé `useAuth` pour obtenir les informations de l'utilisateur connecté.
  // `user` contiendra les données de l'utilisateur ou sera `null` s'il n'est pas connecté.
  const { user } = useAuth();
  
  // Le hook `useState` permet de déclarer une variable d'état dans un composant.
  // `favoriteStories` stockera la liste des histoires, et `setFavoriteStories` est la fonction pour la mettre à jour.
  // On initialise avec un tableau vide `[]`.
  const [favoriteStories, setFavoriteStories] = useState<Story[]>([]);
  
  // Un autre état pour gérer l'affichage d'un indicateur de chargement.
  // `isLoading` est `true` au début, et passera à `false` une fois les données chargées.
  const [isLoading, setIsLoading] = useState(true);

  // Le hook `useEffect` exécute du code après que le composant a été affiché à l'écran.
  // C'est l'endroit idéal pour aller chercher des données sur un serveur (effets de bord).
  // Le `[user]` signifie que cet effet se redéclenchera si l'objet `user` change (ex: connexion/déconnexion).
  useEffect(() => {
    // On définit une fonction asynchrone pour récupérer les données.
    // `async` permet d'utiliser `await` à l'intérieur.
    const fetchFavorites = async () => {
      // On ne cherche les favoris que si un utilisateur est connecté.
      if (user) {
        try {
          // `await` met en pause la fonction jusqu'à ce que `getFavoriteStories` retourne un résultat.
          // On passe l'ID de l'utilisateur (`user.uid`) pour obtenir ses favoris personnels.
          const stories = await getFavoriteStories(user.uid);
          // On met à jour notre état `favoriteStories` avec les données reçues.
          // Cela provoquera un nouvel affichage du composant avec les données.
          setFavoriteStories(stories);
        } catch (error) {
          // Si une erreur se produit pendant la récupération, on l'affiche dans la console.
          console.error('Error fetching favorite stories:', error);
        } finally {
          // Le bloc `finally` s'exécute toujours, que la requête ait réussi ou échoué.
          // On met `isLoading` à `false` pour cacher l'indicateur de chargement.
          setIsLoading(false);
        }
      } else {
        // Si aucun utilisateur n'est connecté, on arrête aussi le chargement.
        setIsLoading(false);
      }
    };

    // On appelle la fonction pour démarrer la récupération.
    fetchFavorites();
  }, [user]);

  // Cette fonction `renderContent` contient la logique pour choisir quoi afficher.
  // C'est une bonne pratique pour ne pas surcharger le `return` final du composant.
  const renderContent = () => {
    // Cas 1: L'utilisateur n'est pas connecté. On affiche un message d'invitation.
    if (!user) {
      return (
        <div className="text-center py-12">
          <i className="material-icons text-6xl text-gray-300 dark:text-gray-600 mb-4">person_outline</i>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Please log in</h2>
          <p className="text-gray-600 dark:text-gray-400">You need to be logged in to view your favorite stories.</p>
        </div>
      );
    }

    // Cas 2: Les données sont en cours de chargement. On affiche un spinner.
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading your favorite stories...</p>
        </div>
      );
    }

    // Cas 3: L'utilisateur est connecté, le chargement est fini, mais il n'y a pas de favoris.
    if (favoriteStories.length === 0) {
      return (
        <div className="text-center py-12">
          <i className="material-icons text-6xl text-gray-300 dark:text-gray-600 mb-4">favorite_border</i>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No favorites yet</h2>
          <p className="text-gray-600 dark:text-gray-400">Start exploring stories and add them to your favorites!</p>
        </div>
      );
    }

    // Cas 4: Tout est bon, on affiche la liste des histoires favorites.
    return (
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          {/* On affiche le titre avec le nombre d'histoires trouvées. */}
          Your Favorite Stories ({favoriteStories.length})
        </h2>
        {/* On utilise une grille (grid) pour organiser les cartes des histoires. */}
        <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
          {/*
            La méthode `.map()` est utilisée pour transformer chaque élément du tableau `favoriteStories` en un composant React.
            Pour chaque `story`, on crée un composant `<BookRecommendationCard />`.
            La `key` est un attribut spécial et obligatoire pour React dans les listes, pour l'aider à optimiser l'affichage.
          */}
          {favoriteStories.map((story) => (
            <BookRecommendationCard key={story.id} story={story} />
          ))}
        </div>
      </section>
    );
  };

  // C'est le rendu final du composant `FavoritesPage`.
  return (
    <div className="max-w-7xl mx-auto">
      {/* On affiche un en-tête de page standardisé. */}
      <PageHeader
        title="My Favorites"
        description="Stories you've marked as favorites"
      />
      {/* On appelle notre fonction `renderContent` pour afficher le contenu principal. */}
      {renderContent()}
    </div>
  );
};

export default FavoritesPage;