"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import type { Report, Story, AdminAction, UserProfile } from '@/lib/types';
import { 
  getUnresolvedReports, 
  resolveReport, 
  createAdminAction, 
  getStoriesByStatus, 
  updateStory,
  softDeleteStory,
  createNotification,
  getUserProfile
} from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"; // Assuming you have these or similar
import { Label } from "@/components/ui/label";

// Component for a report item
const ReportItem: React.FC<{ report: Report; onAction: () => void }> = ({ report, onAction }) => {
  const [actionMessage, setActionMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null); // Simplified for now
  // const [storyDetails, setStoryDetails] = useState<Story | null>(null); // Simplified for now

  useEffect(() => {
    const fetchDetails = async () => {
      if (report.storyId) {
        // To simplify, we are not fetching the full story here,
        // but in a real scenario, you might want the title, author, etc.
        // const story = await getStory(report.storyId); // Assuming getStory exists
        // if (story) {
        //   setStoryDetails(story);
        //   const profile = await getUserProfile(story.authorId);
        //   setAuthorProfile(profile);
        // }
      }
    };
    fetchDetails();
  }, [report.storyId]);

  const handleAdminAction = async (actionType: AdminAction['actionType'], storyId: string, targetUserId?: string, storyTitle?: string) => {
    if (!storyId) {
      toast.error("Story ID is missing.");
      return;
    }
    setIsLoading(true);
    try {
      await createAdminAction({
        storyId,
        actionType,
        message: actionMessage,
      });

      if (actionType === 'delete') {
        await softDeleteStory(storyId);
        if (targetUserId) {
          await createNotification({
            userId: targetUserId,
            type: 'story_deleted',
            message: `Your story (ID: ${storyId.substring(0,6)}...) has been deleted. Reason: ${actionMessage || 'Violation of terms'}.`,
            link: `/my-stories` // Or a page explaining the deletion
          });
        }
      } else if (actionType === 'request_correction') {
        await updateStory(storyId, { status: 'pending_correction', updatedAt: new Date().toISOString() });
         if (targetUserId) {
          await createNotification({
            userId: targetUserId,
            type: 'correction_requested',
            message: `A correction is required for your story (ID: ${storyId.substring(0,6)}...). Admin message: ${actionMessage}`,
            link: `/write?id=${storyId}`
          });
        }
      }
      
      await resolveReport(report.id);
      toast.success(`Action "${actionType}" performed and report resolved.`);
      onAction(); // To refresh the list of reports
    } catch (error) {
      console.error("Error performing admin action:", error);
      toast.error("Error performing admin action.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border p-4 my-2 rounded-lg shadow">
      <p><strong>Report ID:</strong> {report.id}</p>
      <p><strong>Story ID:</strong> <Link href={`/story/${report.storyId}`} target="_blank" className="text-blue-500 hover:underline">{report.storyId}</Link></p>
      {/* {storyDetails && <p><strong>Title:</strong> {storyDetails.title}</p>}
      {authorProfile && <p><strong>Author:</strong> {authorProfile.displayName} (ID: {storyDetails?.authorId})</p>} */}
      <p><strong>Reported by (User ID):</strong> {report.userId}</p>
      <p><strong>Reason:</strong> {report.reason}</p>
      <p><strong>Date:</strong> {new Date(report.createdAt).toLocaleString()}</p>
      <Textarea
        placeholder="Optional message for the user or internal note..."
        value={actionMessage}
        onChange={(e) => setActionMessage(e.target.value)}
        className="my-2"
      />
      <div className="flex space-x-2 mt-2">
        <Button onClick={() => handleAdminAction('request_correction', report.storyId, report.userId /* Assuming report.userId is the author to notify, adjust if story author is different */, "Story Title Placeholder" /* Pass story title if available */)} disabled={isLoading} variant="outline">Request Correction</Button>
        <Button onClick={() => handleAdminAction('delete', report.storyId, report.userId, "Story Title Placeholder")} disabled={isLoading} variant="destructive">Delete Story</Button>
        <Button onClick={async () => { await resolveReport(report.id); toast.info('Report ignored/resolved.'); onAction();}} disabled={isLoading}>Ignore/Resolve</Button>
      </div>
    </div>
  );
};

// Component for a story item pending correction
const PendingStoryItem: React.FC<{ story: Story; onAction: () => void }> = ({ story, onAction }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await updateStory(story.id, { status: 'published', updatedAt: new Date().toISOString() });
      await createAdminAction({
        storyId: story.id,
        actionType: 'approve',
        message: 'Story approved after correction.',
      });
      await createNotification({
        userId: story.authorId,
        type: 'story_approved',
        message: `Your story "${story.title}" has been approved and published!`,
        link: `/story/${story.id}`
      });
      toast.success('Story approved and published.');
      onAction(); // Refresh
    } catch (error) {
      console.error("Error approving story:", error);
      toast.error("Error approving story.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Option to send back for correction or delete directly
  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      toast.error("Rejection reason cannot be empty.");
      return;
    }
    setIsLoading(true);
    try {
      // For now, we delete if rejected after a correction request.
      // Could also re-block it or similar.
      await softDeleteStory(story.id);
      await createAdminAction({
        storyId: story.id,
        actionType: 'delete', // or 'block'
        message: `Story deleted after review. Reason: ${rejectReason}`,
      });
       await createNotification({
        userId: story.authorId,
        type: 'story_deleted', // or a new type 'correction_rejected'
        message: `Your story "${story.title}" was not approved after correction and has been removed. Reason: ${rejectReason}`,
        link: `/my-stories`
      });
      toast.info('Story rejected and deleted.');
      onAction();
      setIsRejectDialogOpen(false);
      setRejectReason("");
    } catch (error) {
      console.error("Error rejecting story:", error);
      toast.error("Error rejecting story.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="border p-4 my-2 rounded-lg shadow">
      <p><strong>Title:</strong> <Link href={`/story/${story.id}`} target="_blank" className="text-blue-500 hover:underline">{story.title}</Link></p>
      <p><strong>Author ID:</strong> {story.authorId}</p>
      <p><strong>Status:</strong> <Badge>{story.status}</Badge></p>
      <p><strong>Last Modified:</strong> {new Date(story.updatedAt).toLocaleString()}</p>
      <div className="flex space-x-2 mt-2">
        <Button onClick={handleApprove} disabled={isLoading} variant="default">Approve</Button>
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={isLoading} variant="destructive">Reject/Delete</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900">
            <DialogHeader>
              <DialogTitle className="text-amber-900 dark:text-amber-100">Reject Story "{story.title}"</DialogTitle>
              <DialogDescription className="text-amber-700/80 dark:text-amber-300/80">
                Please provide a reason for rejecting this story. This reason will be visible to the author.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="rejectReason" className="text-amber-800 dark:text-amber-200">Rejection Reason</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="border-amber-300 dark:border-amber-700 bg-white/70 dark:bg-gray-800/50 text-amber-900 dark:text-amber-100 placeholder-amber-500 dark:placeholder-amber-500/70"
                placeholder="Reason for rejection..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                 <Button variant="outline" className="text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700 hover:bg-amber-100/50 dark:hover:bg-amber-900/50">Cancel</Button>
              </DialogClose>
              <Button onClick={handleRejectSubmit} disabled={isLoading || !rejectReason.trim()} variant="destructive">
                {isLoading ? "Submitting..." : "Confirm Rejection & Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};


export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean>(false); // Simplified, needs a real role check

  const [unresolvedReports, setUnresolvedReports] = useState<Report[]>([]);
  const [pendingStories, setPendingStories] = useState<Story[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Vérification basique du rôle admin (à remplacer par une méthode sécurisée)
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login'); // Redirect if not logged in
      } else {
        // Hardcoded admin UID for testing. DO NOT USE IN PRODUCTION.
        // In production, check a 'role' field in the Firestore user profile.
        const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID || "";
        if (user.uid === ADMIN_UID) {
          setIsAdmin(true);
        } else {
          toast.error("Access denied. This page is for administrators only.");
          router.push('/');
        }
      }
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const reports = await getUnresolvedReports();
      setUnresolvedReports(reports);
      const stories = await getStoriesByStatus("pending_correction");
      setPendingStories(stories);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  if (authLoading || !isAdmin) {
    return <div className="container mx-auto p-4 text-center">Loading or verifying access...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Unresolved Reports ({unresolvedReports.length})</h2>
        {isLoadingData && <p>Loading reports...</p>}
        {!isLoadingData && unresolvedReports.length === 0 && <p>No reports to process.</p>}
        {unresolvedReports.map(report => (
          <ReportItem key={report.id} report={report} onAction={fetchData} />
        ))}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Stories Pending Correction/Approval ({pendingStories.length})</h2>
        {isLoadingData && <p>Loading pending stories...</p>}
        {!isLoadingData && pendingStories.length === 0 && <p>No stories pending.</p>}
        {pendingStories.map(story => (
          <PendingStoryItem key={story.id} story={story} onAction={fetchData} />
        ))}
      </section>
    </div>
  );
}