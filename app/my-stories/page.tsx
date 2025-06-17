// Indique que ce composant est un "Client Component" dans Next.js.
// Cela signifie qu'il peut utiliser des hooks React comme useState et useEffect,
// et qu'il sera exécuté dans le navigateur de l'utilisateur.
'use client';

// On importe React et ses "hooks" (useState, useEffect) qui sont des outils de base
// pour créer des composants interactifs.
import React, { useState, useEffect } from 'react';
// On importe les composants qui servent à afficher une carte pour une histoire active ou supprimée.
import UserStoryCard from '@/components/cards/user-story-card';
import DeletedStoryCard from '@/components/cards/deleted-story-card';
// Le composant pour afficher le titre et la description en haut de la page.
import PageHeader from '@/components/layout/page-header';
// Fonctions qui communiquent avec la base de données Firebase pour gérer les histoires.
import { getUserStories, getDeletedStories, softDeleteStory, restoreStory, deleteStory } from '@/lib/firebase/firestore';
// Un "hook" personnalisé qui permet de savoir si un utilisateur est connecté et qui il est.
import { useAuth } from '@/lib/auth-context';
// On importe le "type" UserStory. C'est une sorte de contrat qui garantit
// que nos données d'histoire auront toujours la même structure (un titre, une image, etc.).
import type { UserStory } from '@/lib/types';
// Composants d'interface utilisateur (boutons, système d'onglets)
// importés depuis une bibliothèque partagée pour garder un style cohérent.
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Un autre "hook" personnalisé pour afficher des petites notifications à l'utilisateur
// (par exemple "L'histoire a bien été supprimée").
import { useToast } from '@/hooks/use-toast';

// Ici commence la définition de notre composant de page "Mes Histoires".
// Un composant est un morceau d'interface réutilisable.
const MyStoriesPage: React.FC = () => {
  // --- GESTION DE L'ÉTAT (STATE) ---
  // L'état (state) est la mémoire du composant. On utilise `useState` pour déclarer
  // des variables qui, lorsqu'elles changent, provoquent un nouvel affichage du composant.
  const { user } = useAuth(); // L'objet `user` contient les informations de l'utilisateur connecté.
  const { toast } = useToast(); // La fonction `toast` permet d'afficher des notifications.
  const [userStories, setUserStories] = useState<UserStory[]>([]); // Stocke la liste des histoires actives.
  const [deletedStories, setDeletedStories] = useState<UserStory[]>([]); // Stocke la liste des histoires supprimées.
  const [isLoading, setIsLoading] = useState(true); // Un booléen pour savoir si on attend des données.
  const [currentPage, setCurrentPage] = useState(1); // Le numéro de la page affichée pour les histoires actives.
  const [currentDeletedPage, setCurrentDeletedPage] = useState(1); // Le numéro de la page pour la corbeille.
  const [storiesPerPage] = useState(12); // Le nombre maximum d'histoires par page.
  const [activeTab, setActiveTab] = useState('active'); // L'onglet actuellement sélectionné ('active' ou 'trash').

  // --- CHARGEMENT DES DONNÉES ---
  // Le hook `useEffect` permet d'exécuter du code après que le composant a été affiché,
  // ou quand une de ses dépendances (ici, `user`) change. C'est l'endroit idéal
  // pour aller chercher des données sur un serveur.
  useEffect(() => {
    // On définit une fonction `fetchStories` qui sera "asynchrone" (`async`),
    // car on doit attendre (`await`) la réponse de la base de données.
    const fetchStories = async () => {
      // On ne fait rien si aucun utilisateur n'est connecté.
      if (user) {
        try {
          console.log('[MyStoriesPage] Fetching stories for user:', user.uid);
          
          // Récupérer les histoires actives
          const stories = await getUserStories(user.uid);
          console.log('[MyStoriesPage] Active stories fetched:', stories.length);
          setUserStories(stories);
          
          // Récupérer les histoires supprimées (avec gestion d'erreur séparée)
          try {
            const deleted = await getDeletedStories(user.uid);
            console.log('[MyStoriesPage] Deleted stories fetched:', deleted.length);
            setDeletedStories(deleted);
          } catch (deletedError) {
            console.warn('[MyStoriesPage] Could not fetch deleted stories (index may be missing):', deletedError);
            setDeletedStories([]);
          }
          
        } catch (error) {
          console.error('[MyStoriesPage] Error fetching stories:', error);
          toast({
            title: "Erreur",
            description: "Impossible de charger les histoires",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    // On appelle la fonction pour démarrer la récupération des données.
    fetchStories();
    // Le tableau `[user, toast]` est la liste des dépendances. Le code dans `useEffect`
    // sera ré-exécuté si la valeur de `user` ou `toast` change.
  }, [user, toast]);

  // --- ACTIONS DE L'UTILISATEUR ---

  // Gère le clic sur le bouton "supprimer" d'une histoire.
  // C'est une "suppression douce" (soft delete) : l'histoire n'est pas vraiment effacée,
  // on lui ajoute juste un marqueur pour la déplacer dans la corbeille.
  const handleDeleteStory = async (storyId: string) => {
    try {
      await softDeleteStory(storyId);
      // Met à jour l'interface immédiatement, sans attendre le rechargement de la page.
      const storyToMove = userStories.find(story => story.id === storyId);
      if (storyToMove) {
        // Retire l'histoire de la liste des actives...
        setUserStories(prev => prev.filter(story => story.id !== storyId));
        // ...et l'ajoute à la liste de la corbeille.
        setDeletedStories(prev => [...prev, { ...storyToMove, deletedAt: Date.now().toString() }]);
        toast({
          title: "Histoire supprimée",
          description: "L'histoire a été déplacée dans la corbeille",
        });
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'histoire",
        variant: "destructive",
      });
    }
  };

  // Gère le clic sur le bouton "restaurer" dans la corbeille.
  const handleRestoreStory = async (storyId: string) => {
    try {
      await restoreStory(storyId);
      // Met à jour l'interface.
      const storyToRestore = deletedStories.find(story => story.id === storyId);
      if (storyToRestore) {
        // Retire l'histoire de la corbeille...
        setDeletedStories(prev => prev.filter(story => story.id !== storyId));
        // ...et la remet dans la liste des actives.
        const { deletedAt, ...restoredStory } = storyToRestore; // On enlève la propriété `deletedAt`.
        setUserStories(prev => [...prev, restoredStory]);
        toast({
          title: "Histoire restaurée",
          description: "L'histoire a été restaurée avec succès",
        });
      }
    } catch (error) {
      console.error('Error restoring story:', error);
      toast({
        title: "Erreur",
        description: "Impossible de restaurer l'histoire",
        variant: "destructive",
      });
    }
  };

  // Gère le clic sur le bouton "supprimer définitivement".
  // Cette action est irréversible.
  const handlePermanentDelete = async (storyId: string) => {
    try {
      await deleteStory(storyId);
      // Met à jour l'interface en retirant l'histoire de la corbeille.
      setDeletedStories(prev => prev.filter(story => story.id !== storyId));
      toast({
        title: "Histoire supprimée définitivement",
        description: "L'histoire a été supprimée de façon permanente",
      });
    } catch (error) {
      console.error('Error permanently deleting story:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer définitivement l'histoire",
        variant: "destructive",
      });
    }
  };

  // Gère le clic sur le bouton "Vider la corbeille".
  const handleEmptyTrash = async () => {
    // On demande une confirmation avant de tout supprimer.
    if (window.confirm('Êtes-vous sûr de vouloir vider la corbeille ? Cette action est irréversible.')) {
      try {
        // On exécute toutes les suppressions en parallèle pour que ce soit plus rapide.
        await Promise.all(deletedStories.map(story => deleteStory(story.id)));
        // On vide la liste dans l'état local.
        setDeletedStories([]);
        toast({
          title: "Corbeille vidée",
          description: "Toutes les histoires supprimées ont été définitivement effacées",
        });
      } catch (error) {
        console.error('Error emptying trash:', error);
        toast({
          title: "Erreur",
          description: "Impossible de vider la corbeille",
          variant: "destructive",
        });
      }
    }
  };


  // --- LOGIQUE DE PAGINATION ---
  // Calcule les histoires à afficher pour la page actuelle des histoires actives.
  const indexOfLastStory = currentPage * storiesPerPage;
  const indexOfFirstStory = indexOfLastStory - storiesPerPage;
  const currentStories = userStories.slice(indexOfFirstStory, indexOfLastStory);
  const totalPages = Math.ceil(userStories.length / storiesPerPage);


  // Calcule les histoires à afficher pour la page actuelle de la corbeille.
  const indexOfLastDeletedStory = currentDeletedPage * storiesPerPage;
  const indexOfFirstDeletedStory = indexOfLastDeletedStory - storiesPerPage;
  const currentDeletedStories = deletedStories.slice(indexOfFirstDeletedStory, indexOfLastDeletedStory);
  const totalDeletedPages = Math.ceil(deletedStories.length / storiesPerPage);

  // --- FONCTIONS D'AFFICHAGE (RENDER) ---
  // Ces fonctions génèrent le code HTML (en JSX) à afficher.
  // C'est une bonne pratique de les séparer pour garder le code principal plus lisible.

  // Génère l'affichage pour l'onglet "Actives".
  const renderActiveStories = () => {
    // 1. Si les données sont en cours de chargement, on affiche une animation.
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Chargement de vos histoires...</p>
        </div>
      );
    }

    // 2. Si le chargement est fini mais qu'il n'y a pas d'histoires, on affiche un message.
    if (userStories.length === 0) {
      return (
        <div className="text-center py-12">
          <i className="material-icons text-6xl text-gray-300 dark:text-gray-600 mb-4">book</i>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Aucune histoire</h2>
          <p className="text-gray-600 dark:text-gray-400">Commencez à écrire votre première histoire !</p>
        </div>
      );
    }

    // 3. Sinon, on affiche la liste des histoires.
    return (
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Vos histoires actives ({userStories.length})
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
          {/* On utilise `.map()` pour transformer chaque objet `story` du tableau `currentStories`
              en un composant `UserStoryCard` à afficher. */}
          {currentStories.map((story) => (
            <UserStoryCard
              key={story.id} // La `key` est un identifiant unique nécessaire pour React.
              id={story.id}
              title={story.title}
              imageUrl={story.imageUrl}
              commentCount={story.commentCount}
              averageRating={story.averageRating}
              onDelete={handleDeleteStory} // On passe la fonction de suppression au composant enfant.
            />
          ))}
        </div>
        
        {/* La pagination n'est affichée que s'il y a plus d'une page. */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-4 mt-8">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              variant="outline"
            >
              Précédent
            </Button>
            <span className="flex items-center text-gray-700 dark:text-gray-300">
              Page {currentPage} sur {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
            >
              Suivant
            </Button>
          </div>
        )}
      </section>
    );
  };

  // Génère l'affichage pour l'onglet "Corbeille". La logique est très similaire.
  const renderDeletedStories = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Chargement de la corbeille...</p>
        </div>
      );
    }

    if (deletedStories.length === 0) {
      return (
        <div className="text-center py-12">
          <i className="material-icons text-6xl text-gray-300 dark:text-gray-600 mb-4">delete_outline</i>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Corbeille vide</h2>
          <p className="text-gray-600 dark:text-gray-400">Aucune histoire supprimée</p>
        </div>
      );
    }

    return (
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Corbeille ({deletedStories.length})
          </h2>
          <Button
            onClick={handleEmptyTrash}
            variant="destructive"
            size="sm"
          >
            Vider la corbeille
          </Button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
          {currentDeletedStories.map((story) => (
            <DeletedStoryCard
              key={story.id}
              id={story.id}
              title={story.title}
              imageUrl={story.imageUrl}
              commentCount={story.commentCount}
              averageRating={story.averageRating}
              deletedAt={story.deletedAt}
              onRestore={handleRestoreStory}
              onPermanentDelete={handlePermanentDelete}
            />
          ))}
        </div>
        
        {totalDeletedPages > 1 && (
          <div className="flex justify-center gap-4 mt-8">
            <Button
              onClick={() => setCurrentDeletedPage(prev => Math.max(1, prev - 1))}
              disabled={currentDeletedPage === 1}
              variant="outline"
            >
              Précédent
            </Button>
            <span className="flex items-center text-gray-700 dark:text-gray-300">
              Page {currentDeletedPage} sur {totalDeletedPages}
            </span>
            <Button
              onClick={() => setCurrentDeletedPage(prev => Math.min(totalDeletedPages, prev + 1))}
              disabled={currentDeletedPage === totalDeletedPages}
              variant="outline"
            >
              Suivant
            </Button>
          </div>
        )}
      </section>
    );
  };

  // --- AFFICHAGE FINAL DU COMPOSANT ---

  // Si l'utilisateur n'est pas connecté, on affiche un message l'invitant à le faire.
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Mes histoires"
          description="Histoires que vous avez écrites et publiées"
        />
        <div className="text-center py-12">
          <i className="material-icons text-6xl text-gray-300 dark:text-gray-600 mb-4">person_outline</i>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Veuillez vous connecter</h2>
          <p className="text-gray-600 dark:text-gray-400">Vous devez être connecté pour voir vos histoires.</p>
        </div>
      </div>
    );
  }

  // Si l'utilisateur est connecté, on affiche la page principale avec les onglets.
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Mes histoires"
        description="Histoires que vous avez écrites et publiées"
      />
      
      {/* Le composant `Tabs` gère la logique de changement d'onglet.
          `value` est l'onglet actif, et `onValueChange` est la fonction à appeler quand on change d'onglet. */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Actives ({userStories.length})
          </TabsTrigger>
          <TabsTrigger value="trash">
            Corbeille ({deletedStories.length})
          </TabsTrigger>
        </TabsList>
        
        {/* Contenu de l'onglet "Actives" */}
        <TabsContent value="active" className="mt-6">
          {/* On appelle notre fonction de rendu pour afficher le contenu. */}
          {renderActiveStories()}
        </TabsContent>
        
        {/* Contenu de l'onglet "Corbeille" */}
        <TabsContent value="trash" className="mt-6">
          {renderDeletedStories()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// On exporte le composant `MyStoriesPage` pour qu'il puisse être utilisé
// par le système de routing de Next.js pour afficher la page.
export default MyStoriesPage;
