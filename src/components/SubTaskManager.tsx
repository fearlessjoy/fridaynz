import React, { useState } from 'react';
import { SubTask, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, X, PencilLine, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { v4 as uuidv4 } from 'uuid';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SubTaskManagerProps {
  task: Task;
  teamMembers: any[];
  onUpdate: (updatedTask: Task) => void;
  userRole: string;
}

const SubTaskManager: React.FC<SubTaskManagerProps> = ({ 
  task, 
  teamMembers, 
  onUpdate, 
  userRole 
}) => {
  const { toast } = useToast();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editedSubtaskTitle, setEditedSubtaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Calculate subtask progress
  const calculateProgress = () => {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    const completedCount = task.subtasks.filter(subtask => subtask.completed).length;
    return Math.round((completedCount / task.subtasks.length) * 100);
  };
  
  const updateTaskInFirestore = async (updatedTask: Task) => {
    setIsLoading(true);
    try {
      const taskRef = doc(db, 'tasks', task.id);
      
      // Get the current task data to ensure we have the latest state
      const taskDoc = await getDoc(taskRef);
      if (!taskDoc.exists()) {
        throw new Error('Task not found');
      }
      
      // Get current data from Firestore
      const currentData = taskDoc.data();
      
      // Update in Firestore - important to use the currentData for everything except subtasks
      await updateDoc(taskRef, {
        subtasks: updatedTask.subtasks,
        updatedAt: serverTimestamp()
      });
      
      // Create a deep copy of the task with the new subtasks for local state
      const localUpdatedTask = {
        ...task,
        subtasks: JSON.parse(JSON.stringify(updatedTask.subtasks)), // Deep clone to avoid reference issues
        updatedAt: new Date().toISOString()
      };
      
      // Update local state through callback - this forces a re-render
      onUpdate(localUpdatedTask);
      
      return true;
    } catch (error) {
      console.error('Error updating subtasks:', error);
      toast({
        title: "Error",
        description: "Failed to update subtasks. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) {
      toast({
        title: "Error",
        description: "Subtask title cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    const newSubtask: SubTask = {
      id: uuidv4(),
      title: newSubtaskTitle.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Create a new array with the existing subtasks plus the new one
    const updatedSubtasks = [...(task.subtasks || []), newSubtask];
    
    const updatedTask = {
      ...task,
      subtasks: updatedSubtasks
    };
    
    console.log('Adding subtask:', newSubtask.title, 'to task:', task.title);
    
    const success = await updateTaskInFirestore(updatedTask);
    
    if (success) {
      console.log('Subtask added successfully, new count:', updatedTask.subtasks.length);
      setNewSubtaskTitle('');
      toast({
        title: "Subtask Added",
        description: "New subtask has been added to this task."
      });
    }
  };
  
  const handleToggleSubtask = async (subtaskId: string) => {
    if (!task.subtasks) return;
    
    // Create a new array with the updated subtask
    const updatedSubtasks = task.subtasks.map(subtask => {
      if (subtask.id === subtaskId) {
        return {
          ...subtask,
          completed: !subtask.completed,
          updatedAt: new Date().toISOString()
        };
      }
      return subtask;
    });
    
    const updatedTask = {
      ...task,
      subtasks: updatedSubtasks
    };
    
    await updateTaskInFirestore(updatedTask);
  };
  
  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!task.subtasks) return;
    
    // Find the subtask to be deleted for the toast message
    const subtaskToDelete = task.subtasks.find(st => st.id === subtaskId);
    
    // Create a new array without the deleted subtask
    const updatedSubtasks = task.subtasks.filter(subtask => subtask.id !== subtaskId);
    
    const updatedTask = {
      ...task,
      subtasks: updatedSubtasks
    };
    
    // Log before deletion
    console.log('Deleting subtask:', subtaskId, 'Current count:', task.subtasks.length, 'Will be:', updatedSubtasks.length);
    
    const success = await updateTaskInFirestore(updatedTask);
    
    if (success) {
      // Log after deletion
      console.log('Subtask deleted successfully, new count:', updatedTask.subtasks.length);
      
      toast({
        title: "Subtask Removed",
        description: subtaskToDelete ? `"${subtaskToDelete.title}" has been removed.` : "Subtask has been removed."
      });
    }
  };
  
  const handleEditSubtask = (subtask: SubTask) => {
    setEditingSubtaskId(subtask.id);
    setEditedSubtaskTitle(subtask.title);
  };
  
  const saveEditedSubtask = async () => {
    if (!editingSubtaskId || !editedSubtaskTitle.trim()) return;
    
    if (!task.subtasks) {
      setEditingSubtaskId(null);
      return;
    }
    
    // Find the current subtask before editing for the toast message
    const originalSubtask = task.subtasks.find(st => st.id === editingSubtaskId);
    
    // Create a new array with the edited subtask
    const updatedSubtasks = task.subtasks.map(subtask => {
      if (subtask.id === editingSubtaskId) {
        return {
          ...subtask,
          title: editedSubtaskTitle.trim(),
          updatedAt: new Date().toISOString()
        };
      }
      return subtask;
    });
    
    // Log the edit operation
    console.log('Editing subtask:', editingSubtaskId, 
      'From:', originalSubtask?.title, 
      'To:', editedSubtaskTitle.trim());
    
    const updatedTask = {
      ...task,
      subtasks: updatedSubtasks
    };
    
    // Clear editing state before async operation to prevent UI issues
    setEditingSubtaskId(null);
    
    const success = await updateTaskInFirestore(updatedTask);
    
    if (success) {
      toast({
        title: "Subtask Updated",
        description: `"${editedSubtaskTitle.trim()}" has been updated.`
      });
    } else {
      // If update failed, restore editing state
      setEditingSubtaskId(editingSubtaskId);
      setEditedSubtaskTitle(editedSubtaskTitle);
    }
  };
  
  const getAssigneeName = (assignedTo?: string) => {
    if (!assignedTo) return null;
    const member = teamMembers.find(m => m.id === assignedTo);
    return member ? member.name : "Unassigned";
  };
  
  const progress = calculateProgress();
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Subtasks</h3>
        <div className="text-sm text-muted-foreground">
          {task.subtasks?.filter(st => st.completed).length || 0} of {task.subtasks?.length || 0} completed
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      
      {/* Add new subtask */}
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Add a new subtask"
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAddSubtask();
            }
          }}
          disabled={isLoading}
        />
        <Button onClick={handleAddSubtask} size="sm" disabled={isLoading}>
          {isLoading ? 'Adding...' : <><Plus className="h-4 w-4 mr-1" /> Add</>}
        </Button>
      </div>
      
      {/* Subtasks list */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {task.subtasks && task.subtasks.length > 0 ? (
          <div className="rounded-md border">
            {task.subtasks.map((subtask, index) => (
              <div key={subtask.id} className={`p-3 ${index !== task.subtasks!.length - 1 ? 'border-b' : ''}`}>
                {editingSubtaskId === subtask.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedSubtaskTitle}
                      onChange={(e) => setEditedSubtaskTitle(e.target.value)}
                      className="flex-1"
                      autoFocus
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditedSubtask();
                        if (e.key === 'Escape') setEditingSubtaskId(null);
                      }}
                    />
                    <Button variant="outline" size="sm" onClick={() => setEditingSubtaskId(null)} disabled={isLoading}>Cancel</Button>
                    <Button size="sm" onClick={saveEditedSubtask} disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <Checkbox 
                        id={`subtask-${subtask.id}`} 
                        checked={subtask.completed} 
                        onCheckedChange={() => handleToggleSubtask(subtask.id)} 
                        className="mt-1"
                        disabled={isLoading}
                      />
                      <div>
                        <Label 
                          htmlFor={`subtask-${subtask.id}`} 
                          className={`font-medium ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}
                        >
                          {subtask.title}
                        </Label>
                        {subtask.assignedTo && (
                          <div className="flex items-center mt-1 text-xs text-muted-foreground">
                            <Avatar className="h-4 w-4 mr-1">
                              <AvatarImage src={teamMembers.find(m => m.id === subtask.assignedTo)?.avatar} />
                              <AvatarFallback>{getAssigneeName(subtask.assignedTo)?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {getAssigneeName(subtask.assignedTo)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditSubtask(subtask)} disabled={isLoading}>
                        <PencilLine className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteSubtask(subtask.id)} disabled={isLoading}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
            No subtasks yet. Add some to track progress.
          </div>
        )}
      </div>
    </div>
  );
};

export default SubTaskManager; 