import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Task } from '@/lib/types';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { useAppData } from '@/hooks/useAppData';
import { useToast } from '@/hooks/use-toast';

const TaskView = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { teamMembers } = useAppData();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTask = async () => {
      if (!taskId) {
        navigate('/');
        return;
      }

      try {
        const taskDoc = await getDoc(doc(db, 'tasks', taskId));
        
        if (!taskDoc.exists()) {
          toast({
            title: "Task not found",
            description: "The requested task could not be found.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }

        setTask({ id: taskDoc.id, ...taskDoc.data() } as Task);
      } catch (error) {
        console.error('Error loading task:', error);
        toast({
          title: "Error",
          description: "Failed to load task details.",
          variant: "destructive",
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [taskId, navigate, toast]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading task details...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  const getAssigneeForTask = (task: Task) => {
    return teamMembers.find(member => member.id === task.assignedTo);
  };

  return (
    <TaskDetailDialog
      task={task}
      open={true}
      onOpenChange={() => navigate('/')}
      assignee={getAssigneeForTask(task)}
      teamMembers={teamMembers}
    />
  );
};

export default TaskView; 