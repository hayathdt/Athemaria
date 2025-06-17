"use client";

import { useState, useEffect, useCallback } from "react";
import { getStory, getComments, getAverageRating, getRating, createComment, setRating, updateComment, deleteComment, toggleFavorite, isStoryFavorited, toggleReadLater, isStoryInReadLater, recordStoryRead } from "@/lib/firebase/firestore"; // Added recordStoryRead
import { useAuth } from '@/lib/auth-context';
import type { Comment, Rating, Story, RatingStats, Chapter } from "@/lib/types"; // Added Chapter
import { formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StarRating } from '@/components/ui/star-rating';
import { Badge } from "@/components/ui/badge"; 
import { ArrowLeft, Book, ChevronLeft, ChevronRight, FileEdit } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function StoryPage({ params }: { params: { id: string } }) {
  const { id: storyId } = params; 

  const { user, loading: authLoading } = useAuth();

  const [story, setStory] = useState<Story | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0); 
  const [comments, setComments] = useState<Comment[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [userRating, setUserRating] = useState<Rating | null>(null);
  const [newComment, setNewComment] = useState<string>("");
  const [isLoadingStory, setIsLoadingStory] = useState<boolean>(true);
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(true);
  const [isLoadingRating, setIsLoadingRating] = useState<boolean>(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [isDeletingCommentId, setIsDeletingCommentId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState<boolean>(false);
  const [isInReadLater, setIsInReadLater] = useState<boolean>(false);
  const [isReadLaterLoading, setIsReadLaterLoading] = useState<boolean>(false);



  useEffect(() => {
    async function fetchStoryDetails() {
      setIsLoadingStory(true);
      try {
        const storyData = await getStory(storyId);
        if (storyData) {
          setStory(storyData);

          if (user && user.uid) {
            recordStoryRead(user.uid, storyId).catch(err => {});
          }
        } else {
          notFound();
        }
      } catch (error) {
        notFound();
      }
      setIsLoadingStory(false);
    }
    if (storyId) {
      fetchStoryDetails();
    }
  }, [storyId]);


  const fetchCommentsAndRatings = useCallback(async () => {
    if (!storyId) return;
    setIsLoadingComments(true);
    setIsLoadingRating(true);
    try {
      const fetchedComments = await getComments(storyId);
      setComments(fetchedComments);
      const ratingStats: RatingStats = await getAverageRating(storyId);
      setAverageRating(ratingStats.average);
      setRatingCount(ratingStats.count);
    } catch (error) {
      setAverageRating(0);
      setRatingCount(0);
    }
    setIsLoadingComments(false);
    setIsLoadingRating(false);
  }, [storyId]);

  useEffect(() => {
    fetchCommentsAndRatings();
  }, [fetchCommentsAndRatings]);


  const fetchUserRating = useCallback(async () => {
    if (!storyId || !user || !user.uid) return;
    setIsLoadingRating(true);
    try {
      const ratingData = await getRating(storyId, user.uid);
      setUserRating(ratingData);
    } catch (error) {
      // Handle error
    }
    setIsLoadingRating(false);
  }, [storyId, user]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchUserRating();
    }
  }, [user, authLoading, fetchUserRating]);

  // Check favorite status
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (user && storyId) {
        const favorited = await isStoryFavorited(user.uid, storyId);
        setIsFavorite(favorited);
      }
    };

    if (user && !authLoading) {
      checkFavoriteStatus();
    }
  }, [user, authLoading, storyId]);


  useEffect(() => {
    const checkReadLaterStatus = async () => {
      if (user && storyId) {
        const inReadLater = await isStoryInReadLater(user.uid, storyId);
        setIsInReadLater(inReadLater);
      }
    };

    if (user && !authLoading) {
      checkReadLaterStatus();
    }
  }, [user, authLoading, storyId]);



  const handleSetRating = async (value: 1 | 2 | 3 | 4 | 5) => {
    if (!user || !user.uid || !storyId) {

      return;
    }
    setIsSubmittingRating(true);
    try {
      await setRating({ storyId, userId: user.uid, value });
  
      fetchUserRating();
      const updatedRatingStats: RatingStats = await getAverageRating(storyId);
      setAverageRating(updatedRatingStats.average);
      setRatingCount(updatedRatingStats.count);
    } catch (error) {
    }
    setIsSubmittingRating(false);
  };

  const handleCommentSubmit = async () => {
    if (!user || !user.uid || !storyId || !newComment.trim()) return;

    const commentPayload = {
      storyId,
      userId: user.uid,
      userName: user.displayName || "Anonymous",
      userAvatar: user.photoURL || null,
      text: newComment.trim(),
    };
    setIsSubmittingComment(true);

    try {
      await createComment(commentPayload);
      setNewComment(""); // Clear input field
      await fetchCommentsAndRatings(); // Refetch comments
    } catch (error) {
      console.error("Failed to submit comment:", error);
    }
    setIsSubmittingComment(false);
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!user || !user.uid || !editText.trim()) return;
    setIsSubmittingEdit(true);
    try {
      await updateComment(commentId, editText.trim(), user.uid);
      setEditingCommentId(null);
      setEditText("");


      await fetchCommentsAndRatings();
    } catch (error) {
      console.error(`Failed to update comment ${commentId}:`, error);
    }
    setIsSubmittingEdit(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !user.uid) {
      return;
    }

    if (!window.confirm("Are you sure you want to delete this comment? This action cannot be undone.")) {
      return;
    }

    setIsDeletingCommentId(commentId);
    try {
      await deleteComment(commentId, user.uid);

      await fetchCommentsAndRatings();
    } catch (error) {
      console.error(`Failed to delete comment ${commentId}:`, error);
    }
    setIsDeletingCommentId(null);
  };

  const handleFavoriteToggle = async () => {
    if (!user || !storyId || isFavoriteLoading) return;
    
    setIsFavoriteLoading(true);
    try {
      await toggleFavorite(user.uid, storyId);
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const handleReadLaterToggle = async () => {
    if (!user || !storyId || isReadLaterLoading) return;
    
    setIsReadLaterLoading(true);
    try {
      await toggleReadLater(user.uid, storyId);
      setIsInReadLater(!isInReadLater);
    } catch (error) {
      console.error('Error toggling read later:', error);
    } finally {
      setIsReadLaterLoading(false);
    }
  };

  const handleRatingChange = (rating: number) => {
    if (rating >= 1 && rating <= 5) {
      handleSetRating(rating as 1 | 2 | 3 | 4 | 5);
    }
  };

  if (isLoadingStory || authLoading) {

    return <div className="container mx-auto px-4 py-8 text-center">Loading story...</div>;
  }

  if (!story) {

    return <div className="container mx-auto px-4 py-8 text-center">Story not found.</div>;
  }

  const currentChapter = story?.chapters?.[currentChapterIndex];
  const totalChapters = story?.chapters?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-white dark:from-amber-950/30 dark:via-gray-900 dark:to-gray-900">
      <div className="container relative mx-auto px-2 sm:px-4 py-4 md:py-6">
        {/* Decorative elements */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute left-0 top-1/4 h-[300px] w-[400px] rounded-full bg-gradient-to-br from-amber-200/20 to-orange-100/10 blur-3xl dark:from-amber-900/10 dark:to-orange-900/5" />
          <div className="absolute right-0 bottom-1/4 h-[250px] w-[350px] rounded-full bg-gradient-to-br from-orange-100/20 to-amber-200/10 blur-3xl dark:from-orange-900/10 dark:to-amber-900/5" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <Link href="/" passHref>
              <Button
                variant="ghost"
                className="text-amber-900 dark:text-amber-100 hover:bg-amber-100/50 dark:hover:bg-amber-900/50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to stories
              </Button>
            </Link>

            {user && story && user.uid === story.authorId && (
              <Link href={`/write?id=${story.id}`} passHref>
                <Button variant="outline" className="text-amber-900 dark:text-amber-100 hover:bg-amber-100/50 dark:hover:bg-amber-900/50 border-amber-300 dark:border-amber-700">
                  <FileEdit className="mr-2 h-4 w-4" />
                  Edit Story
                </Button>
              </Link>
            )}
          </div>

          <div className="rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-amber-200/30 dark:border-amber-800/30 shadow-2xl p-8 mb-8">

            <div className="mb-8">
              <div className="flex items-start justify-between mb-4">
                <h1 className="font-serif text-4xl font-medium text-amber-900 dark:text-amber-100 flex-1">
                  {story.title}
                </h1>
                {user && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleReadLaterToggle}
                      disabled={isReadLaterLoading}
                      className="p-3 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 shadow-md border border-amber-200/50 hover:border-amber-300"
                      aria-label={isInReadLater ? 'Remove from read later' : 'Add to read later'}
                    >
                      <i className={`material-icons text-2xl ${isInReadLater ? 'text-blue-500' : 'text-foreground'} ${isReadLaterLoading ? 'opacity-50' : ''}`}>
                        {isInReadLater ? 'bookmark' : 'bookmark_border'}
                      </i>
                    </button>
                    <button
                      onClick={handleFavoriteToggle}
                      disabled={isFavoriteLoading}
                      className="p-3 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 shadow-md border border-amber-200/50 hover:border-amber-300"
                      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <i className={`material-icons text-2xl ${isFavorite ? 'text-red-500' : 'text-foreground'} ${isFavoriteLoading ? 'opacity-50' : ''}`}>
                        {isFavorite ? 'favorite' : 'favorite_border'}
                      </i>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center text-sm text-amber-700/80 dark:text-amber-300/80 space-x-2 mb-2">
                <span>By {story.authorName || 'Unknown Author'}</span>
                <span>•</span>
                <span>{formatDate(story.createdAt)}</span>
              </div>
              {/* Genres Display */}
              {story.genres && story.genres.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                   <span className="text-sm text-amber-700/80 dark:text-amber-300/80">Genres:</span>
                  {story.genres.map((g, index) => (
                    <Badge key={index} variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-400 dark:border-amber-600">{g}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-8">
              <p className="text-lg text-amber-800/90 dark:text-amber-200/90 italic">
                {story.description}
              </p>
            </div>


            {story.tags && story.tags.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-semibold text-amber-800 dark:text-amber-200 mb-2">Tags:</h4>
                <div className="flex flex-wrap gap-2">
                  {story.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="bg-amber-200/70 hover:bg-amber-200 text-amber-800 dark:bg-amber-800/70 dark:hover:bg-amber-800 dark:text-amber-100">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            

            {totalChapters > 0 && (
              <div className="mb-6">
                <Select
                  value={currentChapterIndex.toString()}
                  onValueChange={(value) => setCurrentChapterIndex(parseInt(value, 10))}
                >
                  <SelectTrigger className="w-full md:w-auto text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700 bg-white/70 dark:bg-gray-800/50">
                    <SelectValue placeholder="Select a chapter" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100">
                    {story.chapters.map((chapter, index) => (
                      <SelectItem key={chapter.id || index} value={index.toString()} className="hover:bg-amber-100 dark:hover:bg-amber-700">
                        {chapter.title || `Chapter ${index + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}


            {currentChapter && (
              <h2 className="font-serif text-3xl font-medium text-amber-800 dark:text-amber-200 mb-4">
                {currentChapter.title || `Chapter ${currentChapterIndex + 1}`}
              </h2>
            )}


            <div className="prose prose-sm sm:prose-base prose-amber dark:prose-invert max-w-none mb-8">
              {currentChapter && currentChapter.content ? (
                currentChapter.content.split("\n").map((paragraph, index) => (
                  <p
                    key={index}
                    className="text-amber-950 dark:text-amber-100 leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))
              ) : totalChapters > 0 ? (
                <p className="text-amber-800 dark:text-amber-200">This chapter is empty.</p>
              ) : (
                <p className="text-amber-800 dark:text-amber-200">This story has no chapters yet.</p>
              )}
            </div>


            {totalChapters > 0 && (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-8 mb-8">
                <Button
                  onClick={() => setCurrentChapterIndex(prev => prev - 1)}
                  disabled={currentChapterIndex === 0}
                  variant="outline"
                  className="text-amber-900 dark:text-amber-100 hover:bg-amber-100/50 dark:hover:bg-amber-900/50 border-amber-300 dark:border-amber-700"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Previous Chapter
                </Button>
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  Chapter {currentChapterIndex + 1} of {totalChapters}
                </span>
                <Button
                  onClick={() => setCurrentChapterIndex(prev => prev + 1)}
                  disabled={currentChapterIndex >= totalChapters - 1}
                  variant="outline"
                  className="text-amber-900 dark:text-amber-100 hover:bg-amber-100/50 dark:hover:bg-amber-900/50 border-amber-300 dark:border-amber-700"
                >
                  Next Chapter <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>


          <div className="rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-amber-200/30 dark:border-amber-800/30 shadow-xl p-8 mb-8">
            <h2 className="font-serif text-2xl font-medium text-amber-900 dark:text-amber-100 mb-4">
              Rate this Story
            </h2>
            {isLoadingRating ? (
              <p>Loading rating...</p>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm text-amber-700/90 dark:text-amber-300/90">Average Rating:</p>
                  <StarRating currentRating={averageRating} readOnly size="h-5 w-5" />
                  <span className="text-sm text-amber-700/90 dark:text-amber-300/90">
                    ({averageRating > 0 ? averageRating.toFixed(1) : "0.0"} / 5 from {ratingCount} rating{ratingCount === 1 ? "" : "s"})
                  </span>
                </div>
                {user && !authLoading && (
                  <div className="mb-4">
                     <div className="flex items-center gap-2">
                      <p className="text-sm text-amber-700/90 dark:text-amber-300/90">Your Rating:</p>
                      <StarRating
                        currentRating={userRating?.value || 0}
                        onRate={handleRatingChange}
                        readOnly={isSubmittingRating}
                        size="h-6 w-6" 
                      />
                       {userRating && <span className="text-sm text-amber-700/90 dark:text-amber-300/90">({userRating.value}/5)</span>}
                    </div>
                     {isSubmittingRating && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Submitting rating...</p>}
                  </div>
                )}
                {!user && !authLoading && (
                  <p className="text-sm text-amber-700/80 dark:text-amber-300/80">
                    Please <Link href="/auth" className="underline hover:text-amber-600 dark:hover:text-amber-400">log in</Link> to rate this story.
                  </p>
                )}
              </>
            )}
          </div>


          <div className="rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-amber-200/30 dark:border-amber-800/30 shadow-xl p-8">
            <h2 className="font-serif text-2xl font-medium text-amber-900 dark:text-amber-100 mb-6">
              Comments ({comments.length})
            </h2>
            {isLoadingComments ? (
              <p className="text-amber-800 dark:text-amber-200">Loading comments...</p>
            ) : (
              <div className="space-y-6 mb-6">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-4 border border-amber-200/50 dark:border-amber-800/50 rounded-lg bg-white/50 dark:bg-gray-800/30">
                      <div className="flex items-center mb-2">
                        {comment.userAvatar && (
                          <img src={comment.userAvatar} alt={comment.userName} className="w-8 h-8 rounded-full mr-3" />
                        )}
                        <div>
                          <p className="font-semibold text-amber-900 dark:text-amber-100">
                            {comment.userName}
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            {formatDate(comment.updatedAt && comment.updatedAt !== comment.createdAt ? comment.updatedAt : comment.createdAt)}
                            {comment.updatedAt && comment.updatedAt !== comment.createdAt && <span className="italic"> (edited)</span>}
                          </p>
                        </div>
                      </div>

                      {editingCommentId === comment.id ? (

                        <div className="mt-2 space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-amber-300 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 bg-white/70 dark:bg-gray-800/50 text-amber-900 dark:text-amber-100"
                          />
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateComment(comment.id)}
                              disabled={isSubmittingEdit || !editText.trim()}
                              className="bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700"
                            >
                              {isSubmittingEdit ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setEditingCommentId(null); setEditText(""); }}
                              disabled={isSubmittingEdit}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (

                        <>
                          <p className="text-amber-800 dark:text-amber-200 whitespace-pre-wrap">
                            {comment.text}
                          </p>
                          {user && user.uid === comment.userId && (
                            <div className="mt-2 flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setEditingCommentId(comment.id); setEditText(comment.text); }}
                                className="text-xs px-2 py-1 text-foreground"
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteComment(comment.id)}
                                disabled={isDeletingCommentId === comment.id || isSubmittingEdit || isSubmittingComment} 
                                className="text-xs px-2 py-1 text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 border-red-600/50 hover:border-red-600"
                              >
                                {isDeletingCommentId === comment.id ? "Deleting..." : "Delete"}
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-amber-800 dark:text-amber-200">No comments yet. Be the first to share your thoughts!</p>
                )}
              </div>
            )}

            {user && !authLoading && (
              <div className="mt-6">
                <h3 className="font-serif text-xl font-medium text-amber-900 dark:text-amber-100 mb-3">
                  Leave a Comment
                </h3>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write your comment here..."
                  rows={4}
                  className="w-full p-3 border border-amber-300 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 bg-white/70 dark:bg-gray-800/50 text-amber-900 dark:text-amber-100 placeholder-amber-500 dark:placeholder-amber-500/70"
                  disabled={isSubmittingComment}
                />
                <Button
                  onClick={handleCommentSubmit}
                  disabled={isSubmittingComment || !newComment.trim()}
                  className="mt-3 bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700"
                >
                  {isSubmittingComment ? "Submitting..." : "Submit Comment"}
                </Button>
              </div>
            )}
            {!user && !authLoading && (
                <p className="text-sm text-amber-700/80 dark:text-amber-300/80 mt-6">
                  Please <Link href="/auth" className="underline hover:text-amber-600 dark:hover:text-amber-400">log in</Link> to leave a comment.
                </p>
            )}
          </div>



          <div className="flex justify-center opacity-60 mt-12 mb-8"> 
            <Book className="h-8 w-8 text-amber-800/30 dark:text-amber-200/30" />
          </div>
        </div>
      </div>
    </div>
  );
}
