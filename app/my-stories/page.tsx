'use client';

import React, { useState, useEffect } from 'react';
import UserStoryCard from '@/components/cards/user-story-card';
import DeletedStoryCard from '@/components/cards/deleted-story-card';
import PageHeader from '@/components/layout/page-header';
import { getUserStories, getDeletedStories, softDeleteStory, restoreStory, deleteStory } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import type { UserStory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const MyStoriesPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [deletedStories, setDeletedStories] = useState<UserStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentDeletedPage, setCurrentDeletedPage] = useState(1);
  const [storiesPerPage] = useState(12);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    const fetchStories = async () => {
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

    fetchStories();
  }, [user, toast]);

  const handleDeleteStory = async (storyId: string) => {
    try {
      await softDeleteStory(storyId);
      const storyToMove = userStories.find(story => story.id === storyId);
      if (storyToMove) {
        setUserStories(prev => prev.filter(story => story.id !== storyId));
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

  const handleRestoreStory = async (storyId: string) => {
    try {
      await restoreStory(storyId);
      const storyToRestore = deletedStories.find(story => story.id === storyId);
      if (storyToRestore) {
        setDeletedStories(prev => prev.filter(story => story.id !== storyId));
        const { deletedAt, ...restoredStory } = storyToRestore;
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

  const handlePermanentDelete = async (storyId: string) => {
    try {
      await deleteStory(storyId);
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

  const handleEmptyTrash = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vider la corbeille ? Cette action est irréversible.')) {
      try {
        await Promise.all(deletedStories.map(story => deleteStory(story.id)));
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

  // Calculate pagination for active stories
  const indexOfLastStory = currentPage * storiesPerPage;
  const indexOfFirstStory = indexOfLastStory - storiesPerPage;
  const currentStories = userStories.slice(indexOfFirstStory, indexOfLastStory);
  const totalPages = Math.ceil(userStories.length / storiesPerPage);

  // Calculate pagination for deleted stories
  const indexOfLastDeletedStory = currentDeletedPage * storiesPerPage;
  const indexOfFirstDeletedStory = indexOfLastDeletedStory - storiesPerPage;
  const currentDeletedStories = deletedStories.slice(indexOfFirstDeletedStory, indexOfLastDeletedStory);
  const totalDeletedPages = Math.ceil(deletedStories.length / storiesPerPage);

  const renderActiveStories = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Chargement de vos histoires...</p>
        </div>
      );
    }

    if (userStories.length === 0) {
      return (
        <div className="text-center py-12">
          <i className="material-icons text-6xl text-gray-300 dark:text-gray-600 mb-4">book</i>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Aucune histoire</h2>
          <p className="text-gray-600 dark:text-gray-400">Commencez à écrire votre première histoire !</p>
        </div>
      );
    }

    return (
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Vos histoires actives ({userStories.length})
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
          {currentStories.map((story) => (
            <UserStoryCard
              key={story.id}
              id={story.id}
              title={story.title}
              imageUrl={story.imageUrl}
              commentCount={story.commentCount}
              averageRating={story.averageRating}
              onDelete={handleDeleteStory}
            />
          ))}
        </div>
        
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

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Mes histoires"
        description="Histoires que vous avez écrites et publiées"
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Actives ({userStories.length})
          </TabsTrigger>
          <TabsTrigger value="trash">
            Corbeille ({deletedStories.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-6">
          {renderActiveStories()}
        </TabsContent>
        
        <TabsContent value="trash" className="mt-6">
          {renderDeletedStories()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyStoriesPage;
