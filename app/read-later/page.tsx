'use client';

import React, { useState, useEffect } from 'react';
import BookRecommendationCard from '@/components/cards/book-recommendation-card';
import PageHeader from '@/components/layout/page-header';
import { getReadLaterStories } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import type { Story } from '@/lib/types';

// Déclaration du composant React pour la page "Lire plus tard".
const ReadLaterPage: React.FC = () => {
  // On récupère l'état de l'authentification de l'utilisateur.
  const { user } = useAuth();
  
  // On déclare un état pour stocker les histoires à lire plus tard.
  // Le nom `readLaterStories` est plus descriptif que `stories`.
  const [readLaterStories, setReadLaterStories] = useState<Story[]>([]);
  
  // On utilise un état pour savoir si les données sont en cours de chargement.
  const [isLoading, setIsLoading] = useState(true);

  // Ce `useEffect` s'exécute quand le composant est monté ou quand l'utilisateur change.
  useEffect(() => {
    // Fonction asynchrone pour aller chercher les histoires sauvegardées.
    const fetchReadLater = async () => {
      // On vérifie si un utilisateur est bien connecté avant de faire la requête.
      if (user) {
        try {
          // On appelle la fonction spécifique `getReadLaterStories` pour obtenir les bonnes données.
          const stories = await getReadLaterStories(user.uid);
          // On met à jour l'état avec les histoires reçues, ce qui rafraîchit l'affichage.
          setReadLaterStories(stories);
        } catch (error) {
          // En cas de problème, on log l'erreur pour le débogage.
          console.error('Error fetching read later stories:', error);
        } finally {
          // Quoi qu'il arrive, on indique que le chargement est terminé.
          setIsLoading(false);
        }
      } else {
        // S'il n'y a pas d'utilisateur, pas besoin de charger, on arrête l'indicateur.
        setIsLoading(false);
      }
    };

    // On exécute la fonction de récupération.
    fetchReadLater();
  }, [user]); // La dépendance `[user]` est essentielle pour la réactivité.

  // Fonction qui détermine le contenu à afficher en fonction de l'état actuel.
  const renderContent = () => {
    // Si l'utilisateur n'est pas connecté, on affiche un message clair.
    if (!user) {
      return (
        <div className="text-center py-12">
          <i className="material-icons text-6xl text-gray-300 dark:text-gray-600 mb-4">person_outline</i>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Please log in</h2>
          <p className="text-gray-600 dark:text-gray-400">You need to be logged in to view your read later stories.</p>
        </div>
      );
    }

    // Pendant que `isLoading` est `true`, on montre une animation de chargement.
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading your read later stories...</p>
        </div>
      );
    }

    // Si le chargement est fini et que la liste est vide, on affiche un message pour encourager l'utilisateur.
    if (readLaterStories.length === 0) {
      return (
        <div className="text-center py-12">
          <i className="material-icons text-6xl text-gray-300 dark:text-gray-600 mb-4">bookmark_border</i>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No stories saved for later</h2>
          <p className="text-gray-600 dark:text-gray-400">Start exploring stories and add them to your read later list!</p>
        </div>
      );
    }

    // Si on a des histoires, on les affiche dans une grille de cartes.
    return (
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          {/* Le titre indique dynamiquement le nombre d'histoires dans la liste. */}
          Your Read Later Stories ({readLaterStories.length})
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
          {/*
            On boucle sur le tableau `readLaterStories` avec `.map()`.
            Chaque `story` est passée comme "prop" au composant `BookRecommendationCard`.
          */}
          {readLaterStories.map((story) => (
            <BookRecommendationCard key={story.id} story={story} />
          ))}
        </div>
      </section>
    );
  };

  // Rendu principal de la page.
  return (
    <div className="max-w-7xl mx-auto">
      {/* Utilisation d'un composant réutilisable pour l'en-tête de la page. */}
      <PageHeader
        title="Read Later"
        description="Stories you've saved to read later"
      />
      {/* Affichage du contenu principal déterminé par la fonction `renderContent`. */}
      {renderContent()}
    </div>
  );
};

export default ReadLaterPage;