'use client';

import React, { useState, useEffect } from 'react';
import type { Story } from '@/lib/types';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { toggleFavorite, isStoryFavorited } from '@/lib/firebase/firestore';
import { useDefaultCover } from '@/lib/hooks/use-default-cover';

interface ContinueReadingCardProps {
  story: Story;
  isMobile?: boolean;
}

const ContinueReadingCard: React.FC<ContinueReadingCardProps> = ({
  story,
  isMobile = false,
}) => {
  const { user } = useAuth();
  const { defaultCoverUrl } = useDefaultCover();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (user) {
        const favorited = await isStoryFavorited(user.uid, story.id);
        setIsFavorite(favorited);
      }
    };

    checkFavoriteStatus();
  }, [user, story.id]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || isLoading) return;
    
    setIsLoading(true);
    try {
      await toggleFavorite(user.uid, story.id);
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative group w-full">
      <Link href={`/story/${story.id}`}>
        <div className={`block hover:no-underline focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg transition-shadow hover:shadow-xl bg-white dark:bg-gray-800 ${isMobile ? 'p-3' : 'p-4'} rounded-lg shadow-md flex items-center h-full min-h-[120px] sm:min-h-[140px]`}>
          <div className={`relative flex-shrink-0 ${isMobile ? 'mr-3' : 'mr-4'}`}>
            <img
              src={story.coverImage || defaultCoverUrl}
              alt={`Cover for ${story.title}`}
              className={`${isMobile ? 'w-14 h-20' : 'w-20 h-28'} sm:w-24 sm:h-36 object-cover rounded-lg`}
              onError={(e) => {
                e.currentTarget.src = defaultCoverUrl;
              }}
            />
            {user && (
              <button
                onClick={handleFavoriteClick}
                disabled={isLoading}
                className="absolute -top-1 -right-1 sm:top-1 sm:right-1 p-1 rounded-full bg-white/80 hover:bg-white transition-all duration-200 shadow-md opacity-0 group-hover:opacity-100 touch-manipulation"
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <i className={`material-icons text-xs sm:text-sm ${isFavorite ? 'text-red-500' : 'text-gray-400'} ${isLoading ? 'opacity-50' : ''}`}>
                  {isFavorite ? 'favorite' : 'favorite_border'}
                </i>
              </button>
            )}
          </div>
          <div className="flex-grow min-w-0 space-y-1 sm:space-y-2">
            <h3 className={`font-semibold ${isMobile ? 'text-sm' : 'text-base'} sm:text-lg text-gray-900 dark:text-gray-200 line-clamp-2 leading-tight`}>{story.title}</h3>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400 truncate`}>{story.authorName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Story</p>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ContinueReadingCard;
