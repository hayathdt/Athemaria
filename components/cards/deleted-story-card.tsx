import React from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, RotateCcw, Trash2 } from 'lucide-react';

interface DeletedStoryCardProps {
  id: string;
  title: string;
  imageUrl: string;
  commentCount: number;
  averageRating: number;
  deletedAt?: string;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

const DeletedStoryCard: React.FC<DeletedStoryCardProps> = ({
  id,
  title,
  imageUrl,
  commentCount,
  averageRating,
  deletedAt,
  onRestore,
  onPermanentDelete,
}) => {
  const getDaysRemaining = () => {
    if (!deletedAt) return 30;
    const deletedDate = new Date(parseInt(deletedAt));
    const now = new Date();
    const diffTime = 30 * 24 * 60 * 60 * 1000 - (now.getTime() - deletedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const daysRemaining = getDaysRemaining();
  const imageAspectClass = "aspect-[2/3]";

  const handleRestore = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRestore(id);
  };

  const handlePermanentDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast('Supprimer définitivement l\'histoire', {
      description: 'Êtes-vous sûr de vouloir supprimer définitivement cette histoire ? Cette action est irréversible.',
      action: {
        label: 'Confirmer',
        onClick: () => onPermanentDelete(id),
      },
      cancel: {
        label: 'Annuler',
        onClick: () => {},
      },
    });
  };

  return (
    <Card className="rounded-lg overflow-hidden opacity-75 border-red-200 dark:border-red-800">
      <div className="relative">
        <img src={imageUrl} alt={title} className={`w-full object-cover ${imageAspectClass}`} />
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
          {daysRemaining}j restants
        </div>
      </div>
      <CardContent className="p-2 sm:p-3">
        <h3 className="text-sm sm:text-md font-semibold text-gray-800 dark:text-gray-200 truncate mb-2">
          {title}
        </h3>
        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3">
          <div className="flex items-center">
            <Star className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" />
            <span>{averageRating.toFixed(1)}</span>
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            <span>{commentCount}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            onClick={handleRestore}
            size="sm"
            variant="outline"
            className="w-full sm:w-auto text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Restaurer
          </Button>
          <Button
            onClick={handlePermanentDelete}
            size="sm"
            variant="destructive"
            className="w-full sm:w-auto text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Supprimer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeletedStoryCard;