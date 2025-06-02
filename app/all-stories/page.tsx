import { getStories } from '@/lib/firebase/firestore';
import StoryList from '@/components/story-list';
import PageHeader from '@/components/layout/page-header';

export default async function AllStoriesPage() {
  const stories = await getStories();
  
  return (
    <div className="container mx-auto p-4">
      <PageHeader title="All Stories" />
      <StoryList stories={stories} user={null} />
    </div>
  );
}