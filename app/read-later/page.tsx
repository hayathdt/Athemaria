'use client';

import React, { useState, useEffect } from 'react';
import BookRecommendationCard from '@/components/cards/book-recommendation-card';
import PageHeader from '@/components/layout/page-header';
import { getReadLaterStories } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import type { Story } from '@/lib/types';

const ReadLaterPage: React.FC = () => {
  const { user } = useAuth();
  const [readLaterStories, setReadLaterStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReadLater = async () => {
      if (user) {
        try {
          const stories = await getReadLaterStories(user.uid);
          setReadLaterStories(stories);
        } catch (error) {
          console.error('Error fetching read later stories:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchReadLater();
  }, [user]);

  const renderContent = () => {
    if (!user) {
      return (
        <div className="text-center py-12">
          <i className="material-icons text-6xl text-gray-300 dark:text-gray-600 mb-4">person_outline</i>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Please log in</h2>
          <p className="text-gray-600 dark:text-gray-400">You need to be logged in to view your read later stories.</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading your read later stories...</p>
        </div>
      );
    }

    if (readLaterStories.length === 0) {
      return (
        <div className="text-center py-12">
          <i className="material-icons text-6xl text-gray-300 dark:text-gray-600 mb-4">bookmark_border</i>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No stories saved for later</h2>
          <p className="text-gray-600 dark:text-gray-400">Start exploring stories and add them to your read later list!</p>
        </div>
      );
    }

    return (
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Your Read Later Stories ({readLaterStories.length})
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
          {readLaterStories.map((story) => (
            <BookRecommendationCard key={story.id} story={story} />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Read Later"
        description="Stories you've saved to read later"
      />
      {renderContent()}
    </div>
  );
};

export default ReadLaterPage;