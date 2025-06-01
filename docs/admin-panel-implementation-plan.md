# Plan d'implémentation du panel administrateur

## 1. Modifications des types
```typescript
// lib/types.ts
export type StoryStatus = "draft" | "published" | "pending_correction" | "blocked";

export interface Report {
  id: string;
  storyId: string;
  userId: string;
  reason: string;
  createdAt: string;
  resolved: boolean;
}

export interface AdminAction {
  id: string;
  storyId: string;
  actionType: "delete" | "block" | "request_correction" | "approve";
  message?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "story_deleted" | "correction_requested" | "story_approved";
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}
```

## 2. Backend Firestore
### Fonctions pour les signalements
```typescript
// lib/firebase/firestore.ts
export const createReport = async (report: Omit<Report, 'id'>) => {
  const docRef = await addDoc(collection(db, 'reports'), report);
  return docRef.id;
};

export const getUnresolvedReports = async () => {
  const q = query(collection(db, 'reports'), where('resolved', '==', false));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
};
```

### Fonctions pour les actions admin
```typescript
export const createAdminAction = async (action: Omit<AdminAction, 'id'>) => {
  const docRef = await addDoc(collection(db, 'adminActions'), action);
  return docRef.id;
};

export const getPendingActions = async () => {
  const q = query(collection(db, 'adminActions'), where('resolvedAt', '==', null));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminAction));
};
```

### Fonctions pour les notifications
```typescript
export const createNotification = async (notification: Omit<Notification, 'id'>) => {
  const docRef = await addDoc(collection(db, 'notifications'), notification);
  return docRef.id;
};

export const getUserNotifications = async (userId: string) => {
  const q = query(collection(db, 'notifications'), 
                 where('userId', '==', userId),
                 orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
};
```

## 3. Système de signalement
### Ajout du bouton
```tsx
// app/story/[id]/page.tsx
<button 
  onClick={handleReport}
  className="p-3 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 shadow-md border border-amber-200/50 hover:border-amber-300"
>
  <Flag className="h-5 w-5" />
</button>
```

### Handler pour le signalement
```tsx
const handleReport = async () => {
  await createReport({
    storyId,
    userId: user!.uid,
    reason: "Signalement utilisateur",
    createdAt: new Date().toISOString(),
    resolved: false
  });
};
```

## 4. Système de notifications
### Ajout de la cloche dans la sidebar
```tsx
// components/layout/sidebar.tsx
<div className="relative mr-3">
  <BellIcon />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
      {unreadCount}
    </span>
  )}
</div>
```

### Dropdown des notifications
```tsx
{isNotificationsOpen && (
  <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 shadow-lg rounded-lg w-64 p-2">
    {notifications.map(notif => (
      <div key={notif.id} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
        {notif.message}
      </div>
    ))}
  </div>
)}
```

## 5. Panel Admin
### Page principale
```tsx
// app/admin/dashboard/page.tsx
export default function AdminDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const reports = await getUnresolvedReports();
      const stories = await getStoriesByStatus("pending_correction");
      setReports(reports);
      setStories(stories);
    };
    fetchData();
  }, []);

  return (
    <div>
      <h1>Tableau de bord administrateur</h1>
      
      <section>
        <h2>Signalements ({reports.length})</h2>
        {reports.map(report => (
          <ReportItem key={report.id} report={report} />
        ))}
      </section>

      <section>
        <h2>Histoires en attente ({stories.length})</h2>
        {stories.map(story => (
          <StoryItem key={story.id} story={story} />
        ))}
      </section>
    </div>
  );
}
```

## Workflow complet
```mermaid
sequenceDiagram
    Utilisateur->>Frontend: Signale une histoire
    Frontend->>Firestore: createReport()
    Firestore-->>Admin: createNotification()
    Admin->>Panel Admin: Consulte les signalements
    Admin->>Firestore: createAdminAction(delete)
    Firestore->>Auteur: createNotification()
    Auteur->>Sidebar: Voir notification