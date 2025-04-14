import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { TeamMember, Task } from '@/lib/types';
import { getCollection, refreshFirebaseConnection } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from './use-toast';

interface AppDataContextType {
  teamMembers: TeamMember[];
  tasks: Task[];
  addTeamMember: (member: TeamMember) => void;
  updateTeamMember: (member: TeamMember) => void;
  deleteTeamMember: (memberId: string) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  refreshConnection: () => Promise<boolean>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const { toast } = useToast();

  // Function to refresh Firebase connection with latest environment variables
  const refreshConnection = useCallback(async () => {
    try {
      // Show loading toast
      toast({
        title: "Refreshing connection...",
        description: "Updating Firebase connection with new configuration.",
      });

      // Call the refresh function from firebase.ts
      const success = await refreshFirebaseConnection();
      
      if (success) {
        toast({
          title: "Connection refreshed",
          description: "Firebase connection has been updated successfully.",
        });
      } else {
        toast({
          title: "Refresh failed",
          description: "Could not refresh the Firebase connection. Please check console for errors.",
          variant: "destructive",
        });
      }
      
      return success;
    } catch (error) {
      console.error('Error refreshing connection:', error);
      toast({
        title: "Refresh failed",
        description: "An error occurred while refreshing the Firebase connection.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  // Load team members from Firebase when the component mounts
  useEffect(() => {
    // Create a query for users
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('name', 'asc')
    );

    // Set up real-time listener for users
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const loadedMembers: TeamMember[] = [];
      snapshot.forEach((doc) => {
        const userData = doc.data();
        // Only add active users
        if (userData.active !== false) {
          loadedMembers.push({
            id: doc.id,
            name: userData.name,
            email: userData.email,
            role: userData.role || 'staff',
            userRole: userData.userRole || 'staff',
            avatar: userData.avatar || '/placeholder.svg'
          });
        }
      });
      setTeamMembers(loadedMembers);
    }, (error) => {
      console.error('Error loading team members:', error);
    });

    // Clean up listener on unmount
    return () => unsubscribe();
  }, []);

  // Set up real-time listener for tasks
  useEffect(() => {
    // Create a query for tasks, ordered by creation date
    const tasksQuery = query(
      collection(db, 'tasks'),
      orderBy('updatedAt', 'desc')
    );

    // Set up real-time listener with immediate response to changes
    const unsubscribe = onSnapshot(
      tasksQuery, 
      { includeMetadataChanges: true },
      (snapshot) => {
        const loadedTasks: Task[] = [];
        snapshot.forEach((doc) => {
          const taskData = doc.data() as Task;
          // Ensure the task has all required fields
          loadedTasks.push({
            ...taskData,
            id: doc.id,
            comments: taskData.comments || [],
            approvals: taskData.approvals || [],
          });
        });
        
        setTasks(loadedTasks);
      }, 
      (error) => {
        console.error('Error loading tasks:', error);
      }
    );

    // Clean up listener on unmount
    return () => unsubscribe();
  }, []);

  const addTeamMember = (member: TeamMember) => {
    setTeamMembers(prev => [...prev, member]);
  };

  const updateTeamMember = (member: TeamMember) => {
    setTeamMembers(prev => prev.map(m => m.id === member.id ? member : m));
  };

  const deleteTeamMember = (memberId: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const addTask = (task: Task) => {
    // Check if task with same ID already exists to prevent duplicates
    setTasks(prev => {
      // If task already exists, don't add it again
      if (prev.some(t => t.id === task.id)) {
        return prev;
      }
      // Otherwise add the new task
      return [...prev, task];
    });
  };

  const updateTask = (task: Task) => {
    setTasks(prev => prev.map(t => {
      if (t.id === task.id) {
        // Check for comment duplication
        if (task.comments?.length > 0 && t.comments?.length > 0) {
          // Create a new set of comment IDs that are unique by combining ID + content
          const existingCommentKeys = new Set(
            t.comments.map(c => `${c.id}-${c.content}`)
          );
          
          // Filter out comments that already exist (by ID + content)
          const uniqueComments = task.comments.filter(
            comment => !existingCommentKeys.has(`${comment.id}-${comment.content}`)
          );
          
          // If we found duplicates, merge comments correctly
          if (uniqueComments.length < task.comments.length) {
            return {
              ...task,
              comments: [...t.comments, ...uniqueComments]
            };
          }
        }
        return task;
      }
      return t;
    }));
  };

  return (
    <AppDataContext.Provider value={{ 
      teamMembers, 
      tasks, 
      addTeamMember,
      updateTeamMember,
      deleteTeamMember,
      addTask, 
      updateTask,
      refreshConnection
    }}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = (): AppDataContextType => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
