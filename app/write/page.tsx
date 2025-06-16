"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createStory, updateStory, getStory } from "@/lib/firebase/firestore";
import { Chapter } from "@/lib/types"; 
import { v4 as uuidv4 } from "uuid"; 
import Editor from "../create-story/editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; 
import { AlertCircle, BookOpen, Save, PlusCircle, Trash2, ArrowUp, ArrowDown, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AuthCheck from "@/components/auth-check";
import { Label } from "@/components/ui/label";
import { uploadStoryCover, deleteFile } from "@/lib/firebase/storage";
import { getDefaultCoverUrlSync } from "@/lib/hooks/use-default-cover";
import { Textarea } from "@/components/ui/textarea";

export default function WritePage() {

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number | null>(
    null
  );
  const [currentChapterTitle, setCurrentChapterTitle] = useState<string>("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);


  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [coverImage, setCoverImage] = useState<string>("");
  const [initialCoverImage, setInitialCoverImage] = useState<string>("");
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [coverFilePreview, setCoverFilePreview] = useState<string | null>(null);
  const [storyGenres, setStoryGenres] = useState<string[]>([]);
  const [storyTags, setStoryTags] = useState<string[]>([]);
 
  const [genre1, setGenre1] = useState<string>("");
  const [genre2, setGenre2] = useState<string>("");
  const [genre3, setGenre3] = useState<string>("");
  const [tagsInput, setTagsInput] = useState<string>("");


  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storyId = searchParams.get("id");

  useEffect(() => {
    if (storyId) {
      const loadStory = async () => {
        try {
          const loadedStory = await getStory(storyId);
          if (loadedStory && loadedStory.authorId === user?.uid) {

            setTitle(loadedStory.title || "");
            setDescription(loadedStory.description || "");
            const loadedCover = loadedStory.coverImage || "";
            setCoverImage(loadedCover);
            setInitialCoverImage(loadedCover);
            const currentGenres = loadedStory.genres || [];
            setStoryGenres(currentGenres);
            setGenre1(currentGenres[0] || "");
            setGenre2(currentGenres[1] || "");
            setGenre3(currentGenres[2] || "");
            const currentTags = loadedStory.tags || [];
            setStoryTags(currentTags);
            setTagsInput(currentTags.join(", "));

            if (loadedStory.chapters && loadedStory.chapters.length > 0) {
              setChapters(loadedStory.chapters);
              setCurrentChapterIndex(0);
              setCurrentChapterTitle(loadedStory.chapters[0].title);
            } else {
              const defaultChapter: Chapter = {
                id: uuidv4(),
                title: "Chapter 1",
                content: "",
                order: 1,
              };
              setChapters([defaultChapter]);
              setCurrentChapterIndex(0);
              setCurrentChapterTitle(defaultChapter.title);
            }
          } else if (!loadedStory && storyId) {
             setError("Failed to load the story. It might not exist or you may not have permission.");
          }
        } catch (err: any) {
          setError("Failed to load the story: " + (err.message || "Unknown error"));
        }
      };
      loadStory();
    }
  }, [storyId, user?.uid]);


  useEffect(() => {
    if (!storyId && user?.uid) {
      const pendingStoryString = localStorage.getItem("pendingStory");
      if (pendingStoryString) {
        const pendingStoryData = JSON.parse(pendingStoryString);
        setTitle(pendingStoryData.title || "");
        setDescription(pendingStoryData.description || "");
        const pendingCover = pendingStoryData.coverImage || "";
        setCoverImage(pendingCover);
        setInitialCoverImage(pendingCover);
        const currentGenres = pendingStoryData.genres || [];
        setStoryGenres(currentGenres);
        setGenre1(currentGenres[0] || "");
        setGenre2(currentGenres[1] || "");
        setGenre3(currentGenres[2] || "");
        const currentTags = pendingStoryData.tags || [];
        setStoryTags(currentTags);
        setTagsInput(currentTags.join(", "));
      }


      if (chapters.length === 0) {
      const defaultChapter: Chapter = {
        id: uuidv4(),
        title: "Chapter 1",
        content: "",
        order: 1,
      };
      setChapters([defaultChapter]);
      setCurrentChapterIndex(0);
      setCurrentChapterTitle(defaultChapter.title);
    }
    }
  }, [storyId, user?.uid, chapters.length]);

  const handleCoverFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedCoverFile(file);
      setCoverImage("");
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedCoverFile(null);
      setCoverFilePreview(null);
    }
  };

  const handleSave = async (status: "draft" | "published") => {
    if (!user) {
      setError("You must be logged in to save.");
      return;
    }
    if (chapters.length === 0 || currentChapterIndex === null) {
      setError("Cannot save: No chapters or no chapter selected.");
      return;
    }

    setIsSaving(true);
    setError("");

    let finalCoverImageUrl = initialCoverImage || getDefaultCoverUrlSync();
    let newCoverPath: string | null = null;



    try {
      if (selectedCoverFile) {

        const uniquePathSegment = storyId || `${user.uid}-${Date.now()}`;

        finalCoverImageUrl = await uploadStoryCover(selectedCoverFile, uniquePathSegment);

        if (initialCoverImage && initialCoverImage.includes("firebasestorage.googleapis.com") && initialCoverImage !== getDefaultCoverUrlSync()) {
            try {
                const url = new URL(initialCoverImage);
                const pathName = url.pathname;
                const encodedPath = pathName.substring(pathName.indexOf('/o/') + 3);
                const decodedPath = decodeURIComponent(encodedPath);
                if (decodedPath && !decodedPath.includes("placeholders/cover.png")) {
                    await deleteFile(decodedPath);
                }
            } catch (deleteError) {
                console.warn("Could not delete old cover image:", deleteError);

            }
        }

      } else if (coverImage !== initialCoverImage) {

        finalCoverImageUrl = coverImage || getDefaultCoverUrlSync();
      }


      const chaptersWithTitles = chapters.map((chap, index) => ({
        ...chap,
        title: chap.title || `Chapter ${index + 1}`,
        order: index + 1,
      }));
      setChapters(chaptersWithTitles);

      const finalGenres: string[] = [];
      if (genre1) finalGenres.push(genre1);
      if (genre2) finalGenres.push(genre2);
      if (genre3) finalGenres.push(genre3);

      const finalTags: string[] = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== "");

      if (!title.trim()) {
        setError("Story title cannot be empty.");
        setIsSaving(false);
        return;
      }
      if (finalGenres.length === 0) {
        setError("Please select at least one genre.");
        setIsSaving(false);
        return;
      }

      let currentStoryId = storyId;

      if (currentStoryId) {
        const storyUpdateData: any = {
          title: title.trim(),
          description: description.trim(),
          genres: finalGenres,
          tags: finalTags,
          chapters: chaptersWithTitles,
          status,
          updatedAt: new Date().toISOString(),
          coverImage: finalCoverImageUrl,

        };
        await updateStory(currentStoryId, storyUpdateData);
      } else {
        const newStoryData: any = {
          title: title.trim(),
          description: description.trim(),
          genres: finalGenres,
          tags: finalTags,
          chapters: chaptersWithTitles,
          status,
          authorId: user.uid,
          authorName: user.displayName || "Anonymous",
          createdAt: new Date().toISOString(),
          coverImage: finalCoverImageUrl,

        };
        currentStoryId = await createStory(newStoryData);
      }

      localStorage.removeItem("pendingStory");
      router.push(status === "published" ? `/story/${currentStoryId}` : "/my-stories");
    } catch (err: any) {
      setError(err.message || "Failed to save the story.");
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AuthCheck>
      <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-white dark:from-amber-950/30 dark:via-gray-900 dark:to-gray-900">
        <div className="relative">

          <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute left-0 top-1/4 h-[300px] w-[400px] rounded-full bg-gradient-to-br from-amber-200/20 to-orange-100/10 blur-3xl dark:from-amber-900/10 dark:to-orange-900/5" />
            <div className="absolute right-0 bottom-1/4 h-[250px] w-[350px] rounded-full bg-gradient-to-br from-orange-100/20 to-amber-200/10 blur-3xl dark:from-orange-900/10 dark:to-amber-900/5" />
          </div>


          <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-amber-200/30 dark:border-amber-800/30">
            <div className="container mx-auto px-4 py-4">
              <div className="flex justify-between items-center">
                <h1 className="font-serif text-2xl font-medium text-amber-900 dark:text-amber-100">
                  {storyId ? "Edit Story" : "Write Your Story"}
                </h1>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => handleSave("draft")}
                    variant="outline"
                    className="border-amber-200/50 dark:border-amber-800/50 text-amber-900 dark:text-amber-100 hover:bg-amber-100/50 dark:hover:bg-amber-900/50"
                    disabled={isSaving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </Button>
                  <Button
                    onClick={() => handleSave("published")}
                    className="bg-amber-800 hover:bg-amber-700 text-amber-50 dark:bg-amber-700 dark:hover:bg-amber-600 shadow-lg shadow-amber-900/20 dark:shadow-amber-900/10"
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Publish"}
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              {error && (
                <Alert
                  variant="destructive"
                  className="mb-6 rounded-2xl border-red-500/20 bg-red-50/50 dark:bg-red-900/20 backdrop-blur-xl"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}


              <div className="mb-8 p-6 rounded-3xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg border border-amber-200/40 dark:border-amber-800/40 shadow-xl space-y-6">
                <h2 className="text-xl font-semibold text-amber-800 dark:text-amber-200 font-serif">Story Details</h2>
                
                <div className="space-y-2">
                  <Label htmlFor="storyTitle" className="text-sm font-medium text-amber-900 dark:text-amber-100">Title</Label>
                  <Input
                    id="storyTitle"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter your story title"
                    required
                    className="rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storyDescription" className="text-sm font-medium text-amber-900 dark:text-amber-100">Description</Label>
                  <Textarea
                    id="storyDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter a brief summary of your story..."
                    className="min-h-[100px] rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl text-foreground"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="genre1" className="text-sm font-medium text-amber-900 dark:text-amber-100">Genre 1</Label>
                    <select
                      id="genre1"
                      value={genre1}
                      onChange={(e) => setGenre1(e.target.value)}
                      required
                      className="w-full rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl p-2 text-sm text-foreground"
                    >
                      <option value="" className="text-muted-foreground">Select a genre</option>
                      {["Fantasy", "Sci-Fi", "Romance", "Mystery", "Thriller", "Horror", "Historical", "Contemporary", "Young Adult", "Adventure", "Literary Fiction"].map(g => <option key={g} value={g} className="text-foreground">{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="genre2" className="text-sm font-medium text-amber-900 dark:text-amber-100">Genre 2 (Optional)</Label>
                    <select
                      id="genre2"
                      value={genre2}
                      onChange={(e) => setGenre2(e.target.value)}
                      className="w-full rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl p-2 text-sm text-foreground"
                    >
                      <option value="" className="text-muted-foreground">Select a genre</option>
                      {["Fantasy", "Sci-Fi", "Romance", "Mystery", "Thriller", "Horror", "Historical", "Contemporary", "Young Adult", "Adventure", "Literary Fiction"].map(g => <option key={g} value={g} className="text-foreground">{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="genre3" className="text-sm font-medium text-amber-900 dark:text-amber-100">Genre 3 (Optional)</Label>
                    <select
                      id="genre3"
                      value={genre3}
                      onChange={(e) => setGenre3(e.target.value)}
                      className="w-full rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl p-2 text-sm text-foreground"
                    >
                      <option value="" className="text-muted-foreground">Select a genre</option>
                      {["Fantasy", "Sci-Fi", "Romance", "Mystery", "Thriller", "Horror", "Historical", "Contemporary", "Young Adult", "Adventure", "Literary Fiction"].map(g => <option key={g} value={g} className="text-foreground">{g}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagsInput" className="text-sm font-medium text-amber-900 dark:text-amber-100">Tags (comma-separated)</Label>
                  <Input
                    id="tagsInput"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g., magic, space opera, high school"
                    className="rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coverImageFile" className="text-sm font-medium text-amber-900 dark:text-amber-100">Cover Image</Label>
                  <Input
                    id="coverImageFile"
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFileChange}
                    className="h-14 p-3 rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl transition-colors focus:border-amber-500/50 dark:focus:border-amber-500/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200"
                    disabled={isSaving}
                  />
                  {coverFilePreview && (
                    <div className="mt-2">
                      <img src={coverFilePreview} alt="New cover preview" className="max-h-40 w-auto rounded-lg object-cover border dark:border-gray-700" />
                    </div>
                  )}
                  {!selectedCoverFile && coverImage && (
                    <>
                      <p className="text-xs text-center text-amber-700/70 dark:text-amber-300/70 my-1">OR Current / Manual URL:</p>
                      <Input
                        id="coverImageUrlInput"
                        type="url"
                        value={coverImage}
                        onChange={(e) => {
                            setCoverImage(e.target.value);
                            setSelectedCoverFile(null);
                            setCoverFilePreview(null);
                        }}
                        placeholder="Enter image URL"
                        className="rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl text-foreground"
                        disabled={isSaving}
                      />
                    </>
                  )}
                   {!selectedCoverFile && !coverImage && (
                     <>
                        <p className="text-xs text-center text-amber-700/70 dark:text-amber-300/70 my-1">OR</p>
                        <Input
                            id="coverImageUrlInputManual"
                            type="url"
                            onChange={(e) => setCoverImage(e.target.value)}
                            placeholder="Enter image URL"
                            className="rounded-xl border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl text-foreground"
                            disabled={isSaving}
                        />
                     </>
                   )}
                  <p className="text-xs text-amber-700/70 dark:text-amber-300/70 mt-1">
                    Upload a new image or provide/edit the URL. If left empty, the default or existing cover will be used.
                  </p>
                  {initialCoverImage && !coverFilePreview && !selectedCoverFile && (
                    <div className="mt-2">
                      <p className="text-xs text-amber-700/70 dark:text-amber-300/70">Current cover:</p>
                      <img src={initialCoverImage} alt="Current cover" className="max-h-40 w-auto rounded-lg object-cover border dark:border-gray-700" />
                    </div>
                  )}
                </div>
              </div>


              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                  <h2 className="text-xl font-semibold text-amber-800 dark:text-amber-200 font-serif">Chapters</h2>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {chapters.map((chapter, index) => (
                      <div
                        key={chapter.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all
                                  ${currentChapterIndex === index
                                    ? "bg-amber-100 dark:bg-amber-800 shadow-md"
                                    : "bg-white/50 dark:bg-gray-800/50 hover:bg-amber-50 dark:hover:bg-amber-900"
                                  }`}
                        onClick={() => {
                          setCurrentChapterIndex(index);
                          setCurrentChapterTitle(chapter.title);
                        }}
                      >
                        <p className="font-medium text-sm text-amber-900 dark:text-amber-100 truncate">
                          {chapter.title || `Chapter ${index + 1}`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {chapter.content?.substring(0,30) || "Empty"}...
                        </p>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => {
                      const newChapter: Chapter = {
                        id: uuidv4(),
                        title: `Chapter ${chapters.length + 1}`,
                        content: "",
                        order: chapters.length + 1,
                      };
                      setChapters([...chapters, newChapter]);
                      setCurrentChapterIndex(chapters.length);
                      setCurrentChapterTitle(newChapter.title);
                    }}
                    variant="outline"
                    className="w-full border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" /> Add New Chapter
                  </Button>
                </div>

                <div className="md:col-span-2 space-y-4">
                  {currentChapterIndex !== null && chapters[currentChapterIndex] && (
                    <>
                      <Input
                        placeholder="Chapter Title"
                        value={currentChapterTitle}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const newTitle = e.target.value;
                          setCurrentChapterTitle(newTitle);
                          const updatedChapters = chapters.map((chap, index) =>
                            index === currentChapterIndex
                              ? { ...chap, title: newTitle }
                              : chap
                          );
                          setChapters(updatedChapters);
                        }}
                        className="text-lg font-semibold text-foreground"
                      />
                       <div className="flex space-x-2 mb-2">
                        <Button
                          onClick={() => {
                            if (chapters.length > 1 && currentChapterIndex !== null) {
                              const updatedChapters = chapters.filter((_, index) => index !== currentChapterIndex)
                                .map((chap, idx) => ({ ...chap, order: idx + 1 }));
                              setChapters(updatedChapters);
                              if (updatedChapters.length > 0) {
                                const newIndex = Math.max(0, currentChapterIndex -1);
                                setCurrentChapterIndex(newIndex);
                                setCurrentChapterTitle(updatedChapters[newIndex].title);
                              } else {

                                const defaultChapter: Chapter = { id: uuidv4(), title: "Chapter 1", content: "", order: 1 };
                                setChapters([defaultChapter]);
                                setCurrentChapterIndex(0);
                                setCurrentChapterTitle(defaultChapter.title);
                              }
                            }
                          }}
                          variant="destructive"
                          size="sm"
                          disabled={chapters.length <= 1 || currentChapterIndex === null}
                        >
                          <Trash2 className="w-4 h-4 mr-1 text-foreground" />
                          <span className="text-foreground">Delete</span>
                        </Button>
                         <Button
                            onClick={() => {
                                if (currentChapterIndex !== null && currentChapterIndex > 0) {
                                    const newChapters = [...chapters];
                                    const temp = newChapters[currentChapterIndex];
                                    newChapters[currentChapterIndex] = newChapters[currentChapterIndex - 1];
                                    newChapters[currentChapterIndex - 1] = temp;

                                    newChapters[currentChapterIndex].order = currentChapterIndex + 1;
                                    newChapters[currentChapterIndex - 1].order = currentChapterIndex;
                                    setChapters(newChapters);
                                    setCurrentChapterIndex(currentChapterIndex - 1);
                                }
                            }}
                            variant="outline"
                            size="sm"
                            disabled={currentChapterIndex === null || currentChapterIndex === 0}
                        >
                            <ArrowUp className="w-4 h-4 mr-1 text-foreground" />
                            <span className="text-foreground">Up</span>
                        </Button>
                        <Button
                            onClick={() => {
                                if (currentChapterIndex !== null && currentChapterIndex < chapters.length - 1) {
                                    const newChapters = [...chapters];
                                    const temp = newChapters[currentChapterIndex];
                                    newChapters[currentChapterIndex] = newChapters[currentChapterIndex + 1];
                                    newChapters[currentChapterIndex + 1] = temp;

                                    newChapters[currentChapterIndex].order = currentChapterIndex + 1;
                                    newChapters[currentChapterIndex + 1].order = currentChapterIndex + 2;

                                    const reorderedChapters = newChapters.map((chap, idx) => ({ ...chap, order: idx + 1 }));
                                    setChapters(reorderedChapters);
                                    setCurrentChapterIndex(currentChapterIndex + 1);
                                }
                            }}
                            variant="outline"
                            size="sm"
                            disabled={currentChapterIndex === null || currentChapterIndex === chapters.length - 1}
                        >
                            <ArrowDown className="w-4 h-4 mr-1 text-foreground" />
                            <span className="text-foreground">Down</span>
                        </Button>
                      </div>
                    </>
                  )}
                  <div className="rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-amber-200/30 dark:border-amber-800/30 shadow-2xl">
                    <Editor
                      value={
                        currentChapterIndex !== null && chapters[currentChapterIndex]
                          ? chapters[currentChapterIndex].content
                          : ""
                      }
                      onChange={(newContent) => {
                        if (currentChapterIndex !== null) {
                          const updatedChapters = chapters.map((chap, index) =>
                            index === currentChapterIndex
                              ? { ...chap, content: newContent }
                              : chap
                          );
                          setChapters(updatedChapters);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-center opacity-60">
                <BookOpen className="h-8 w-8 text-amber-800/30 dark:text-amber-200/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthCheck>
  );
}
