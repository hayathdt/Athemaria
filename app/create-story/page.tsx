"use client";

import type React from "react";
import { useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// Assuming Select components are available and follow this pattern.
// If not, standard HTML select will be used within the JSX.
// For this example, I'll proceed as if standard <select> is fine.
import { AlertCircle, BookOpen, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AuthCheck from "@/components/auth-check";
import { getDefaultCoverUrlSync } from "@/lib/hooks/use-default-cover";
import { uploadStoryCover } from "@/lib/firebase/storage";

export default function CreateStoryPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre1, setGenre1] = useState("");
  const [genre2, setGenre2] = useState("");
  const [genre3, setGenre3] = useState("");
  const [tags, setTags] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState(""); // Stores URL from input or upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setCoverImageUrl(""); // Clear any manually entered URL if a file is chosen
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setFilePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("You must be logged in to create a story");
      return;
    }

    if (!title || !description || !genre1) {
      setError("Please fill out title, description, and select at least one genre.");
      return;
    }

    setIsLoading(true);
    let finalCoverImageUrl = getDefaultCoverUrlSync();

    try {
      if (selectedFile) {
        // Create a unique path for the story cover.
        // Since storyId is not available yet, use userId and timestamp as a unique identifier for the story.
        // uploadStoryCover will construct the full path including 'covers/', the identifier, a new timestamp, and extension.
        const uniqueStoryIdentifier = `${user.uid}-${Date.now()}`;
        finalCoverImageUrl = await uploadStoryCover(selectedFile, uniqueStoryIdentifier);
      } else if (coverImageUrl) {
        // If a URL was manually entered and no file selected
        finalCoverImageUrl = coverImageUrl;
      }

      const selectedGenres: string[] = [];
      if (genre1) selectedGenres.push(genre1);
      if (genre2) selectedGenres.push(genre2);
      if (genre3) selectedGenres.push(genre3);

      const processedTags: string[] = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== "");

      localStorage.setItem(
        "pendingStory",
        JSON.stringify({
          title,
          description,
          genres: selectedGenres,
          tags: processedTags,
          status: "draft" as const,
          coverImage: finalCoverImageUrl,
        })
      );
      router.push("/write");

    } catch (err: any) {
      console.error("Failed to upload cover image or create story:", err);
      setError(err.message || "Failed to process story creation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCheck>
      <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-white dark:from-amber-950/30 dark:via-gray-900 dark:to-gray-900">
        <div className="container relative mx-auto px-4 py-12">
          {/* Decorative elements */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
          >
            <div className="absolute left-0 top-1/4 h-[300px] w-[400px] rounded-full bg-gradient-to-br from-amber-200/20 to-orange-100/10 blur-3xl dark:from-amber-900/10 dark:to-orange-900/5" />
            <div className="absolute right-0 bottom-1/4 h-[250px] w-[350px] rounded-full bg-gradient-to-br from-orange-100/20 to-amber-200/10 blur-3xl dark:from-orange-900/10 dark:to-amber-900/5" />
          </div>

          <div className="relative max-w-2xl mx-auto">
            <div className="rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-amber-200/30 dark:border-amber-800/30 shadow-2xl">
              <div className="px-6 py-6 border-b border-amber-200/30 dark:border-amber-800/30">
                <h1 className="font-serif text-3xl font-medium text-amber-900 dark:text-amber-100">
                  Create a New Story
                </h1>
                <p className="mt-1.5 text-sm text-amber-800/80 dark:text-amber-200/80">
                  Share your creativity with the world
                </p>
              </div>

              <div className="p-6">
                {error && (
                  <Alert
                    variant="destructive"
                    className="mb-6 rounded-2xl border-red-500/20 bg-red-50/50 dark:bg-red-900/20 backdrop-blur-xl"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="title"
                      className="text-sm font-medium text-amber-900 dark:text-amber-100"
                    >
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter your story title"
                      required
                      className="rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="genre1"
                      className="text-sm font-medium text-amber-900 dark:text-amber-100"
                    >
                      Genre 1
                    </Label>
                    <select
                      id="genre1"
                      value={genre1}
                      onChange={(e) => setGenre1(e.target.value)}
                      required
                      className="w-full rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50 p-2 text-sm text-foreground"
                    >
                      <option value="" className="text-muted-foreground">Select a genre</option>
                      {[
                        "Fantasy", "Sci-Fi", "Romance", "Mystery", "Thriller",
                        "Horror", "Historical", "Contemporary", "Young Adult",
                        "Adventure", "Literary Fiction"
                      ].map(g => <option key={g} value={g} className="text-foreground">{g}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="genre2"
                      className="text-sm font-medium text-amber-900 dark:text-amber-100"
                    >
                      Genre 2 (Optional)
                    </Label>
                    <select
                      id="genre2"
                      value={genre2}
                      onChange={(e) => setGenre2(e.target.value)}
                      className="w-full rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50 p-2 text-sm text-foreground"
                    >
                      <option value="" className="text-muted-foreground">Select a genre</option>
                      {[
                        "Fantasy", "Sci-Fi", "Romance", "Mystery", "Thriller",
                        "Horror", "Historical", "Contemporary", "Young Adult",
                        "Adventure", "Literary Fiction"
                      ].map(g => <option key={g} value={g} className="text-foreground">{g}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="genre3"
                      className="text-sm font-medium text-amber-900 dark:text-amber-100"
                    >
                      Genre 3 (Optional)
                    </Label>
                    <select
                      id="genre3"
                      value={genre3}
                      onChange={(e) => setGenre3(e.target.value)}
                      className="w-full rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50 p-2 text-sm text-foreground"
                    >
                      <option value="" className="text-muted-foreground">Select a genre</option>
                      {[
                        "Fantasy", "Sci-Fi", "Romance", "Mystery", "Thriller",
                        "Horror", "Historical", "Contemporary", "Young Adult",
                        "Adventure", "Literary Fiction"
                      ].map(g => <option key={g} value={g} className="text-foreground">{g}</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label
                      htmlFor="tags"
                      className="text-sm font-medium text-amber-900 dark:text-amber-100"
                    >
                      Tags (comma-separated)
                    </Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="e.g., magic, space opera, high school"
                      className="rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium text-amber-900 dark:text-amber-100"
                    >
                      Story Description
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter a brief summary of your story..."
                      className="min-h-[100px] rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="coverImageFile"
                      className="text-sm font-medium text-amber-900 dark:text-amber-100"
                    >
                      Cover Image (Optional)
                    </Label>
                    <Input
                      id="coverImageFile"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="h-14 p-3 rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200"
                      disabled={isLoading}
                    />
                    {filePreview && (
                      <div className="mt-2">
                        <img src={filePreview} alt="Cover preview" className="max-h-40 rounded-lg object-cover" />
                      </div>
                    )}
                    {!selectedFile && (
                        <>
                            <p className="text-xs text-center text-amber-700/70 dark:text-amber-300/70 my-1">OR</p>
                            <Input
                              id="coverImageUrlInput"
                              type="url"
                              value={coverImageUrl}
                              onChange={(e) => {
                                setCoverImageUrl(e.target.value);
                                setSelectedFile(null); // Clear selected file if URL is typed
                                setFilePreview(null);
                              }}
                              placeholder="Enter image URL"
                              className="rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50"
                              disabled={isLoading}
                            />
                        </>
                    )}
                    <p className="text-xs text-amber-700/70 dark:text-amber-300/70 mt-1">
                      Upload an image or provide a URL. If neither, a default cover will be used.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-xl bg-amber-800 hover:bg-amber-700 text-amber-50 dark:bg-amber-700 dark:hover:bg-amber-600 font-medium py-2.5 transition-colors shadow-lg shadow-amber-900/20 dark:shadow-amber-900/10"
                  >
                    Start Writing
                  </Button>
                </form>
              </div>
            </div>

            {/* Decorative book icon */}
            <div className="mt-8 flex justify-center opacity-60">
              <BookOpen className="h-8 w-8 text-amber-800/30 dark:text-amber-200/30" />
            </div>
          </div>
        </div>
      </div>
    </AuthCheck>
  );
}
