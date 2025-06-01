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

// Composant pour un élément de signalement
const ReportItem: React.FC<{ report: Report; onAction: () => void }> = ({ report, onAction }) => {
  const [actionMessage, setActionMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null);
  const [storyDetails, setStoryDetails] = useState<Story | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (report.storyId) {
        // Pour simplifier, on ne récupère pas l'histoire complète ici,
        // mais dans un vrai scénario, on pourrait vouloir le titre, l'auteur etc.
        // const story = await getStory(report.storyId); // Supposons que getStory existe
        // if (story) {
        //   setStoryDetails(story);
        //   const profile = await getUserProfile(story.authorId);
        //   setAuthorProfile(profile);
        // }
      }
    };
    fetchDetails();
  }, [report.storyId]);

  const handleAdminAction = async (actionType: AdminAction['actionType'], storyId: string, targetUserId?: string) => {
    if (!storyId) {
      alert("ID de l'histoire manquant.");
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
            message: `Votre histoire (ID: ${storyId.substring(0,6)}...) a été supprimée. Raison: ${actionMessage || 'Violation des conditions'}.`,
            link: `/my-stories` // ou une page expliquant la suppression
          });
        }
      } else if (actionType === 'request_correction') {
        await updateStory(storyId, { status: 'pending_correction', updatedAt: new Date().toISOString() });
         if (targetUserId) {
          await createNotification({
            userId: targetUserId,
            type: 'correction_requested',
            message: `Une correction est requise pour votre histoire (ID: ${storyId.substring(0,6)}...). Message de l'admin: ${actionMessage}`,
            link: `/write?id=${storyId}`
          });
        }
      }
      
      await resolveReport(report.id);
      alert(`Action "${actionType}" effectuée et signalement résolu.`);
      onAction(); // Pour rafraîchir la liste des signalements
    } catch (error) {
      console.error("Erreur lors de l'action admin:", error);
      alert("Erreur lors de l'action admin.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border p-4 my-2 rounded-lg shadow">
      <p><strong>Signalement ID:</strong> {report.id}</p>
      <p><strong>Histoire ID:</strong> <Link href={`/story/${report.storyId}`} target="_blank" className="text-blue-500 hover:underline">{report.storyId}</Link></p>
      {/* {storyDetails && <p><strong>Titre:</strong> {storyDetails.title}</p>}
      {authorProfile && <p><strong>Auteur:</strong> {authorProfile.displayName} (ID: {storyDetails?.authorId})</p>} */}
      <p><strong>Signalé par (User ID):</strong> {report.userId}</p>
      <p><strong>Raison:</strong> {report.reason}</p>
      <p><strong>Date:</strong> {new Date(report.createdAt).toLocaleString()}</p>
      <Textarea 
        placeholder="Message optionnel pour l'utilisateur ou note interne..."
        value={actionMessage}
        onChange={(e) => setActionMessage(e.target.value)}
        className="my-2"
      />
      <div className="flex space-x-2 mt-2">
        <Button onClick={() => handleAdminAction('request_correction', report.storyId, storyDetails?.authorId)} disabled={isLoading} variant="outline">Demander correction</Button>
        <Button onClick={() => handleAdminAction('delete', report.storyId, storyDetails?.authorId)} disabled={isLoading} variant="destructive">Supprimer Histoire</Button>
        <Button onClick={async () => { await resolveReport(report.id); alert('Signalement ignoré/résolu.'); onAction();}} disabled={isLoading}>Ignorer/Résoudre</Button>
      </div>
    </div>
  );
};

// Composant pour un élément d'histoire en attente de correction
const PendingStoryItem: React.FC<{ story: Story; onAction: () => void }> = ({ story, onAction }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await updateStory(story.id, { status: 'published', updatedAt: new Date().toISOString() });
      await createAdminAction({
        storyId: story.id,
        actionType: 'approve',
        message: 'Histoire approuvée après correction.',
      });
      await createNotification({
        userId: story.authorId,
        type: 'story_approved',
        message: `Votre histoire "${story.title}" a été approuvée et publiée !`,
        link: `/story/${story.id}`
      });
      alert('Histoire approuvée et publiée.');
      onAction(); // Rafraîchir
    } catch (error) {
      console.error("Erreur lors de l'approbation:", error);
      alert("Erreur lors de l'approbation.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Option pour renvoyer en correction ou supprimer directement
  const handleReject = async (reason: string) => {
    setIsLoading(true);
    try {
      // Pour l'instant, on supprime si rejeté après une demande de correction.
      // On pourrait aussi la re-bloquer ou autre.
      await softDeleteStory(story.id);
      await createAdminAction({
        storyId: story.id,
        actionType: 'delete', // ou 'block'
        message: `Histoire supprimée après révision. Raison: ${reason}`,
      });
       await createNotification({
        userId: story.authorId,
        type: 'story_deleted', // ou un nouveau type 'correction_rejected'
        message: `Votre histoire "${story.title}" n'a pas été approuvée après correction et a été retirée. Raison: ${reason}`,
        link: `/my-stories`
      });
      alert('Histoire rejetée et supprimée.');
      onAction();
    } catch (error) {
      console.error("Erreur lors du rejet:", error);
      alert("Erreur lors du rejet.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="border p-4 my-2 rounded-lg shadow">
      <p><strong>Titre:</strong> <Link href={`/story/${story.id}`} target="_blank" className="text-blue-500 hover:underline">{story.title}</Link></p>
      <p><strong>Auteur ID:</strong> {story.authorId}</p>
      <p><strong>Statut:</strong> <Badge>{story.status}</Badge></p>
      <p><strong>Dernière modif.:</strong> {new Date(story.updatedAt).toLocaleString()}</p>
      <div className="flex space-x-2 mt-2">
        <Button onClick={handleApprove} disabled={isLoading} variant="default">Approuver</Button>
        <Button onClick={() => {
            const reason = prompt("Raison du rejet (sera visible par l'utilisateur):");
            if (reason) handleReject(reason);
        }} disabled={isLoading} variant="destructive">Rejeter/Supprimer</Button>
      </div>
    </div>
  );
};


export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean>(false); // Simplifié, besoin d'une vraie vérification de rôle

  const [unresolvedReports, setUnresolvedReports] = useState<Report[]>([]);
  const [pendingStories, setPendingStories] = useState<Story[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Vérification basique du rôle admin (à remplacer par une méthode sécurisée)
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login'); // Rediriger si non connecté
      } else {
        // ID admin codé en dur pour test. NE PAS UTILISER EN PRODUCTION.
        // En production, vérifier un champ 'role' dans le profil utilisateur Firestore.
        const ADMIN_UID = "VOTRE_USER_ID_ADMIN_ICI"; // REMPLACEZ CECI
        if (user.uid === ADMIN_UID) {
          setIsAdmin(true);
        } else {
          alert("Accès refusé. Cette page est réservée aux administrateurs.");
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
      console.error("Erreur de chargement des données admin:", error);
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
    return <div className="container mx-auto p-4 text-center">Chargement ou vérification des accès...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Panel Administrateur</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Signalements Non Résolus ({unresolvedReports.length})</h2>
        {isLoadingData && <p>Chargement des signalements...</p>}
        {!isLoadingData && unresolvedReports.length === 0 && <p>Aucun signalement à traiter.</p>}
        {unresolvedReports.map(report => (
          <ReportItem key={report.id} report={report} onAction={fetchData} />
        ))}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Histoires en Attente de Correction/Approbation ({pendingStories.length})</h2>
        {isLoadingData && <p>Chargement des histoires en attente...</p>}
        {!isLoadingData && pendingStories.length === 0 && <p>Aucune histoire en attente.</p>}
        {pendingStories.map(story => (
          <PendingStoryItem key={story.id} story={story} onAction={fetchData} />
        ))}
      </section>
    </div>
  );
}