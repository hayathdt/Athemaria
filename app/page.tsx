'use client';

import React, { useState, useEffect } from 'react';
import ContinueReadingCard from '@/components/cards/continue-reading-card';
import BookRecommendationCard from '@/components/cards/book-recommendation-card';
import PageHeader from '@/components/layout/page-header';
import { getStories } from '@/lib/firebase/firestore';
import type { Story } from '@/lib/types';

const HomePage: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const fetchedStories = await getStories();
        setStories(fetchedStories);
      } catch (error) {
        console.error("Failed to fetch stories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStories();
  }, []);

  const continueReadingStories = stories.slice(0, 3);
  const mainDisplayStories = stories.slice(3);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Loading stories...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Home" />

      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Continue Reading</h2>
        {continueReadingStories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {continueReadingStories.map((story) => (
              <ContinueReadingCard key={story.id} story={story} />
            ))}
          </div>
        ) : (
          <p>No recent stories to continue.</p>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">All Stories</h2>
        {mainDisplayStories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {mainDisplayStories.map((story) => (
              <BookRecommendationCard key={story.id} story={story} />
            ))}
          </div>
        ) : (
          stories.length === 0 ?
          <p>No stories available at the moment.</p> :
          <p>No other stories available at the moment.</p>
        )}
      </section>
    </div>
  );
};

export default HomePage;
