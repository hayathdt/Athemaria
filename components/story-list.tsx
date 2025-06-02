'use client';
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
// Button, AlertDialog etc. may not be needed if BookRecommendationCard handles actions
// import { Button } from "@/components/ui/button";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
//   AlertDialogTrigger,
// } from "@/components/ui/alert-dialog";
// import { formatDate } from "@/lib/utils";
// import { Edit, Trash2 } from "lucide-react";
// import { deleteStory } from "@/lib/firebase/firestore";
import type { Story } from "@/lib/types";
import type { User } from "firebase/auth";
import { useState } from "react"; // useState for isDeleting might be removed if delete is handled differently or not at all
import BookRecommendationCard from "@/components/cards/book-recommendation-card"; // Added import

export default function StoryList({
  stories,
  user,
  onDelete,
}: {
  stories: Story[];
  user: User | null;
  onDelete?: (id: string) => void;
}) {
  // const [isDeleting, setIsDeleting] = useState<string | null>(null); // Potentially remove if delete is not handled here

  // const handleDelete = async (storyId: string) => { // Potentially remove
  //   setIsDeleting(storyId);
  //   try {
  //     await deleteStory(storyId);
  //     onDelete?.(storyId);
  //   } catch (error) {
  //     console.error("Failed to delete story:", error);
  //   } finally {
  //     setIsDeleting(null);
  //   }
  // };

  if (stories.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-100/50 to-white/30 dark:from-amber-900/20 dark:to-gray-900/50 backdrop-blur-xl rounded-3xl" />
          <div className="relative px-6 py-12">
            <h3 className="text-xl font-medium mb-2 text-amber-900 dark:text-amber-100">
              No stories yet
            </h3>
            <p className="text-amber-800/80 dark:text-amber-200/80 mb-6">
              Be the first to publish a story!
            </p>
            <Link href="/create-story">
              <Badge
                variant="outline"
                className="text-sm py-1.5 px-4 cursor-pointer border-amber-200 bg-amber-100/50 hover:bg-amber-200/50 text-amber-900 dark:border-amber-700 dark:bg-amber-900/50 dark:hover:bg-amber-800/50 dark:text-amber-100 transition-all"
              >
                Write a Story
              </Badge>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
      {stories.map((story) => (
        <BookRecommendationCard key={story.id} story={story} />
      ))}
    </div>
  );
}
