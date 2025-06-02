'use client';

import React, { useState, useEffect } from 'react';
import ContinueReadingCarousel from '@/components/ui/continue-reading-carousel';
import BookRecommendationCard from '@/components/cards/book-recommendation-card';
import PageHeader from '@/components/layout/page-header';
import { getStories, getContinueReadingStories, getPopularStories } from '@/lib/firebase/firestore';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Story } from '@/lib/types';
import { useAuth } from '@/lib/auth-context'; // Ajout pour l'authentification

const HomePage: React.FC = () => {
  const { user } = useAuth(); // Obtenir l'utilisateur actuel
  const [continueReading, setContinueReading] = useState<Story[]>([]);
  const [recommendations, setRecommendations] = useState<Story[]>([]);
  const [storiesByGenre, setStoriesByGenre] = useState<Record<string, Story[]>>({});
  const [allStories, setAllStories] = useState<Story[]>([]); // Pour le regroupement par genre
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchHomePageData = async () => {
      setIsLoading(true);
      try {
        const [fetchedAllStories, fetchedContinueReading, fetchedRecommendations] = await Promise.all([
          getStories(),
          user && user.uid ? getContinueReadingStories(user.uid, 5) : Promise.resolve([]),
          getPopularStories(10)
        ]);

        setAllStories(fetchedAllStories);
        setContinueReading(fetchedContinueReading as Story[]);
        setRecommendations(fetchedRecommendations);

        // Regrouper les histoires par genre
        const groupedByGenre: Record<string, Story[]> = {};
        fetchedAllStories.forEach(story => {
          if (story.genres && story.genres.length > 0) {
            const firstGenre = story.genres[0];
            if (!groupedByGenre[firstGenre]) {
              groupedByGenre[firstGenre] = [];
            }
            groupedByGenre[firstGenre].push(story);
          }
        });
        setStoriesByGenre(groupedByGenre);

      } catch (error) {
        console.error("Failed to fetch homepage data:", error);
        // S'assurer que les états sont réinitialisés en cas d'erreur pour éviter des états incohérents
        setAllStories([]);
        setContinueReading([]);
        setRecommendations([]);
        setStoriesByGenre({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomePageData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Loading stories...</p>
      </div>
    );
  }


  return (
    <div className="homepage-container w-full max-w-full px-4 sm:px-6 lg:px-8">
      <PageHeader title="Home" />

      {/* Section Continue Reading */}
      {user && continueReading && continueReading.length > 0 && (
        <section className="homepage-section mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Continue Reading</h2>
          <ContinueReadingCarousel stories={continueReading} isMobile={isMobile} />
        </section>
      )}
      {user && continueReading && continueReading.length === 0 && !isLoading && (
         <section className="homepage-section mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Continue Reading</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">No stories to continue reading at the moment.</p>
        </section>
      )}

      {/* Section Recommandations */}
      {recommendations && recommendations.length > 0 && (
        <section className="homepage-section mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Recommendations</h2>
          <div className="homepage-scroll-container flex overflow-x-auto space-x-3 sm:space-x-4 py-2 sm:py-4 scrollbar-thin scrollbar-thumb-amber-600 scrollbar-track-amber-200">
            {recommendations.map((story) => (
              <div key={story.id} className="homepage-card flex-shrink-0 w-[48%] min-[480px]:w-[32%] sm:w-[30%] md:w-[23%] lg:w-[18%] xl:w-[15%]">
                <BookRecommendationCard story={story} />
              </div>
            ))}
          </div>
        </section>
      )}
       {recommendations && recommendations.length === 0 && !isLoading && (
         <section className="homepage-section mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Recommendations</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">No recommendations available at the moment.</p>
        </section>
      )}

      {/* Sections par Genre */}
      {Object.entries(storiesByGenre).map(([genre, genreStories]) => {
        if (genreStories.length === 0) return null;
        return (
          <section key={genre} className="homepage-section mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 capitalize">{genre}</h2>
            <div className="homepage-scroll-container flex overflow-x-auto space-x-3 sm:space-x-4 py-2 sm:py-4 scrollbar-thin scrollbar-thumb-amber-600 scrollbar-track-amber-200">
              {genreStories.slice(0,10).map((story) => (
                <div key={story.id} className="homepage-card flex-shrink-0 w-[48%] min-[480px]:w-[32%] sm:w-[30%] md:w-[23%] lg:w-[18%] xl:w-[15%]">
                  <BookRecommendationCard story={story} />
                </div>
              ))}
            </div>
            {genreStories.length === 0 && <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">No stories available in this genre at the moment.</p>}
          </section>
        );
      })}
      
      {continueReading.length === 0 && recommendations.length === 0 && Object.keys(storiesByGenre).length === 0 && !isLoading && (
        <p>No stories to display at the moment. Explore and start reading!</p>
      )}
    </div>
  );
};

export default HomePage;
