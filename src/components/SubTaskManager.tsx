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
  
  const getAssigneeAvatar = (assignedTo?: string) => {
    if (!assignedTo) return null;
    const member = teamMembers.find(m => m.id === assignedTo);
    return member ? member.avatar : null;
  };
  
  const getAssigneeInitials = (assignedTo?: string) => {
    if (!assignedTo) return null;
    const member = teamMembers.find(m => m.id === assignedTo);
    return member ? member.name.charAt(0) : null;
  };
  
  return (
    <div className="space-y-4 relative">
      {/* Add new subtask input */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Input
            placeholder="Add a new subtask..."
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddSubtask();
              }
            }}
            disabled={isLoading}
            className="w-full"
          />
        </div>
        <Button 
          onClick={handleAddSubtask} 
          disabled={!newSubtaskTitle.trim() || isLoading}
          className="h-9 sm:h-10"
        >
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      
      {/* Subtasks Progress */}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm">{calculateProgress()}%</span>
          </div>
          <Progress value={calculateProgress()} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {task.subtasks.filter(subtask => subtask.completed).length} of {task.subtasks.length} subtasks completed
          </p>
        </div>
      )}

      {/* Subtasks List */}
      <div className="space-y-3">
        {task.subtasks && task.subtasks.length > 0 ? (
          <div>
            {task.subtasks.map((subtask) => (
              <div 
                key={subtask.id} 
                className="group flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 mb-2 border-b last:border-b-0 pb-2"
              >
                {editingSubtaskId === subtask.id ? (
                  <div className="flex flex-col sm:flex-row w-full gap-2">
                    <Input
                      value={editedSubtaskTitle}
                      onChange={(e) => setEditedSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveEditedSubtask();
                        } else if (e.key === 'Escape') {
                          setEditingSubtaskId(null);
                        }
                      }}
                      className="flex-1"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2 sm:mt-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setEditingSubtaskId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={saveEditedSubtask}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center h-6">
                      <Checkbox 
                        id={`subtask-${subtask.id}`}
                        checked={subtask.completed}
                        onCheckedChange={() => handleToggleSubtask(subtask.id)}
                        disabled={isLoading}
                        className="mr-1"
                      />
                    </div>
                    <Label 
                      htmlFor={`subtask-${subtask.id}`}
                      className={`flex-1 text-sm cursor-pointer ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {subtask.title}
                      {subtask.assignedTo && (
                        <div className="flex items-center mt-1">
                          <Avatar className="h-5 w-5 mr-1">
                            <AvatarImage src={getAssigneeAvatar(subtask.assignedTo)} />
                            <AvatarFallback className="text-[10px]">{getAssigneeInitials(subtask.assignedTo)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{getAssigneeName(subtask.assignedTo)}</span>
                        </div>
                      )}
                    </Label>
                    <div className="flex gap-1 invisible group-hover:visible sm:flex">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0" 
                        onClick={() => handleEditSubtask(subtask)}
                        disabled={isLoading}
                      >
                        <PencilLine className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive" 
                        onClick={() => handleDeleteSubtask(subtask.id)}
                        disabled={isLoading}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground border border-dashed rounded-md">
            <p>No subtasks yet. Add some to track your progress!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubTaskManager; 