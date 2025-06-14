import React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Trash2 } from 'lucide-react';

interface UserStoryCardProps {
  id: string;
  title: string;
  imageUrl: string;
  commentCount: number;
  averageRating: number;
  onDelete?: (id: string) => void;
}

const UserStoryCard: React.FC<UserStoryCardProps> = ({
  id,
  title,
  imageUrl,
  commentCount,
  averageRating,
  onDelete,
}) => {
  const imageAspectClass = "aspect-[2/3]";

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      toast('Supprimer l\'histoire', {
        description: 'Êtes-vous sûr de vouloir supprimer cette histoire ? Elle sera déplacée dans la corbeille.',
        action: {
          label: 'Confirmer',
          onClick: () => onDelete(id),
        },
        cancel: {
          label: 'Annuler',
          onClick: () => {},
        },
      });
    }
  };

  return (
    <div className="relative group">
      <Link href={`/story/${id}`} className="block hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-shadow hover:shadow-xl">
        <Card className="rounded-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 ease-in-out">
          <img src={imageUrl} alt={title} className={`w-full object-cover ${imageAspectClass}`} />
          <CardContent className="p-2 sm:p-3">
            <h3 className="text-sm sm:text-md font-semibold text-gray-800 dark:text-gray-200 truncate">{title}</h3>
            <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" />
                <span>{averageRating.toFixed(1)}</span>
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
                <span>{commentCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      {onDelete && (
        <Button
          onClick={handleDelete}
          size="sm"
          variant="destructive"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 h-10 w-10"
        >
          <Trash2 className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
};

export default UserStoryCard;