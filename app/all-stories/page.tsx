// Importation des fonctions et composants nécessaires.
// getStories est une fonction qui récupère les histoires depuis la base de données Firebase (Firestore).
import { getStories } from '@/lib/firebase/firestore';
// StoryList est un composant qui affiche une liste d'histoires.
import StoryList from '@/components/story-list';
// PageHeader est un composant simple pour afficher le titre de la page.
import PageHeader from '@/components/layout/page-header';

// Déclaration de la page "All Stories" comme un composant serveur asynchrone.
// "async" est utilisé ici car nous devons attendre que les données des histoires soient chargées
// avant de pouvoir afficher la page. C'est une fonctionnalité clé de Next.js pour le rendu côté serveur.
export default async function AllStoriesPage() {
  // Appel de la fonction getStories pour récupérer toutes les histoires.
  // "await" met en pause l'exécution de la fonction jusqu'à ce que la promesse de getStories soit résolue,
  // c'est-à-dire jusqu'à ce que les données soient arrivées.
  const stories = await getStories();
  
  // Le JSX retourné par le composant, qui représente la structure de la page.
  return (
    <div className="container mx-auto p-4">
      {/* Affiche le titre de la page en utilisant le composant PageHeader. */}
      <PageHeader title="All Stories" />
      {/* Affiche la liste des histoires en utilisant le composant StoryList. */}
      {/* On passe les histoires récupérées (`stories`) en tant que "prop" au composant. */}
      <StoryList stories={stories} user={null} />
    </div>
  );
}