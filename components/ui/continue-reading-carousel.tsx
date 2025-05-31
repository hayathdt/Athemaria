'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Story } from '@/lib/types';
import ContinueReadingCard from '@/components/cards/continue-reading-card';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ContinueReadingCarouselProps {
  stories: Story[];
  isMobile: boolean;
}

const ContinueReadingCarousel: React.FC<ContinueReadingCarouselProps> = ({
  stories,
  isMobile,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);
  const currentX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  const itemsPerView = isMobile ? 1 : 3;
  const maxIndex = Math.max(0, stories.length - itemsPerView);

  const goToSlide = (index: number) => {
    if (isTransitioning) return;
    
    const clampedIndex = Math.max(0, Math.min(index, maxIndex));
    setCurrentIndex(clampedIndex);
    setIsTransitioning(true);
    
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToPrevious = () => {
    goToSlide(currentIndex - 1);
  };

  const goToNext = () => {
    goToSlide(currentIndex + 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isDragging.current) return;
    
    currentX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isMobile || !isDragging.current) return;
    
    const deltaX = startX.current - currentX.current;
    const threshold = 50;
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && currentIndex < maxIndex) {
        goToNext();
      } else if (deltaX < 0 && currentIndex > 0) {
        goToPrevious();
      }
    }
    
    isDragging.current = false;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    
    startX.current = e.clientX;
    isDragging.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMobile || !isDragging.current) return;
    
    currentX.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (isMobile || !isDragging.current) return;
    
    const deltaX = startX.current - currentX.current;
    const threshold = 50;
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && currentIndex < maxIndex) {
        goToNext();
      } else if (deltaX < 0 && currentIndex > 0) {
        goToPrevious();
      }
    }
    
    isDragging.current = false;
  };

  useEffect(() => {
    const handleMouseUpGlobal = () => {
      isDragging.current = false;
    };

    document.addEventListener('mouseup', handleMouseUpGlobal);
    return () => document.removeEventListener('mouseup', handleMouseUpGlobal);
  }, []);

  if (stories.length === 0) {
    return <p>No recent stories to continue.</p>;
  }

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div
          ref={carouselRef}
          className={`flex transition-transform duration-300 ease-in-out ${
            isTransitioning ? '' : 'transition-none'
          }`}
          style={{
            transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {stories.map((story, index) => (
            <div
              key={story.id}
              className={`flex-shrink-0 ${
                isMobile ? 'w-full px-2' : 'w-1/3 px-3'
              }`}
            >
              <ContinueReadingCard story={story} isMobile={isMobile} />
            </div>
          ))}
        </div>
      </div>

      {!isMobile && stories.length > 3 && (
        <>
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed z-10"
            aria-label="Previous stories"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          <button
            onClick={goToNext}
            disabled={currentIndex >= maxIndex}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed z-10"
            aria-label="Next stories"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </>
      )}

      {isMobile && stories.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {stories.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? 'bg-blue-500 dark:bg-blue-400'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              aria-label={`Go to story ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ContinueReadingCarousel;