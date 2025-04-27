import React, { useEffect, useState } from 'react';
import { Task, TeamMember, TaskPriority, SubTask, Comment } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, User, MessageCircle, ListChecks, Trash2, ChevronLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import TaskComments from './TaskComments';
import SubTaskManager from './SubTaskManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { v4 as uuidv4 } from 'uuid';

interface MobileTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdate?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onDeleteComment?: (taskId: string, commentId: string) => Promise<void>;
  onCommentAdded?: (taskId: string, commentText: string) => void;
  teamMembers: TeamMember[];
  userRole?: string;
  currentUserId?: string;
  assignee?: TeamMember;
}

const priorityColors = {
  Low: "bg-slate-100 text-slate-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-amber-100 text-amber-700",
  Urgent: "bg-red-100 text-red-700"
};

export const MobileTaskDialog: React.FC<MobileTaskDialogProps> = ({
  task,
  open,
  onOpenChange,
  onTaskUpdate,
  onDeleteTask,
  onDeleteComment,
  onCommentAdded,
  teamMembers = [],
  userRole,
  currentUserId,
  assignee
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [localTask, setLocalTask] = useState<Task | null>(task);
  const [activeTab, setActiveTab] = useState("details");
  
  useEffect(() => {
    if (task) {
      // Deep clone to avoid reference issues
      setLocalTask(JSON.parse(JSON.stringify(task)));
    }
  }, [task]);
  
  // Reset state when dialog opens or closes
  useEffect(() => {
    if (open && task) {
      // When dialog opens, reset to the latest task data
      setLocalTask(JSON.parse(JSON.stringify(task)));
      
      // Reset active tab to details when opening
      setActiveTab("details");
    }
  }, [open, task]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NZ', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = () => {
    if (onDeleteTask) {
      onDeleteTask(localTask?.id || '');
      onOpenChange(false); // Close task detail dialog after deletion
    }
    setIsDeleteDialogOpen(false);
  };

  const handlePriorityChange = (newPriority: string) => {
    if (localTask && onTaskUpdate) {
      const updatedTask = {
        ...localTask,
        priority: newPriority as TaskPriority,
        updatedAt: new Date().toISOString()
      };
      setLocalTask(updatedTask);
      onTaskUpdate(updatedTask);
    }
  };

  const handleSubtaskUpdate = (updatedTask: Task) => {
    if (localTask && onTaskUpdate) {
      setLocalTask(updatedTask);
      onTaskUpdate(updatedTask);
    }
  };

  const handleCommentAdded = (taskId: string, commentText: string) => {
    // Update local state immediately for better UX
    if (localTask) {
      const newComment: Comment = {
        id: uuidv4(),
        userId: currentUserId || '',
        userName: teamMembers.find(m => m.id === currentUserId)?.name || 'You',
        content: commentText,
        timestamp: new Date().toISOString(),
        taskId: taskId
      };
      
      const updatedTask: Task = {
        ...localTask,
        comments: [...(localTask.comments || []), newComment],
        updatedAt: new Date().toISOString()
      };
      
      // Update local state
      setLocalTask(updatedTask);
    }
    
    // The actual update is handled at the TaskBoard level
    if (onCommentAdded) {
      onCommentAdded(taskId, commentText);
    }
  };

  const handleDeleteComment = async (taskId: string, commentId: string) => {
    if (localTask && onDeleteComment) {
      // Update local state immediately
      const updatedComments = (localTask.comments || []).filter(
        comment => comment.id !== commentId
      );
      
      const updatedLocalTask: Task = {
        ...localTask,
        comments: updatedComments,
        updatedAt: new Date().toISOString()
      };
      
      // Update local state for immediate UI feedback
      setLocalTask(updatedLocalTask);
      
      // Call parent component's delete handler
      await onDeleteComment(taskId, commentId);
    }
  };

  // Calculate progress
  const progress = localTask?.subtasks && localTask.subtasks.length > 0
    ? Math.round((localTask.subtasks.filter(st => st.completed).length / localTask.subtasks.length) * 100)
    : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-[90vh] p-0 m-0 flex flex-col overflow-hidden rounded-t-lg bottom-0 top-auto" aria-describedby="mobile-task-detail-description">
          <div className="p-3 flex-none">
            <DialogHeader className="mb-2">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <DialogTitle className="text-lg">{localTask?.title}</DialogTitle>
              </div>
            </DialogHeader>
          </div>
          
          <div id="mobile-task-detail-description" className="sr-only">
            Mobile task details and management interface
          </div>
          
          <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-3 w-full h-10 bg-background px-3 mb-2">
              <TabsTrigger value="details">
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  <span>Details</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="subtasks">
                <div className="flex items-center gap-1">
                  <ListChecks className="h-4 w-4" />
                  <span>Tasks</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="comments">
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" />
                  <span>Comments</span>
                </div>
              </TabsTrigger>
            </TabsList>
            
            <ScrollArea className="flex-1 px-4">
              <TabsContent value="details" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <div className="space-y-4">
                  {/* Priority */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Priority</span>
                    <Select 
                      value={localTask?.priority}
                      onValueChange={handlePriorityChange}
                      disabled={userRole !== 'admin' && userRole !== 'manager'}
                    >
                      <SelectTrigger className={`w-32 h-8 text-xs ${priorityColors[localTask?.priority || 'Low']}`}>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low" className={priorityColors.Low}>Low</SelectItem>
                        <SelectItem value="Medium" className={priorityColors.Medium}>Medium</SelectItem>
                        <SelectItem value="High" className={priorityColors.High}>High</SelectItem>
                        <SelectItem value="Urgent" className={priorityColors.Urgent}>Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Category */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Category</span>
                    <Badge variant="outline">{localTask?.category}</Badge>
                  </div>
                  
                  {/* Due Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Due Date</span>
                    <span className="text-sm">{localTask?.dueDate ? formatDate(localTask.dueDate) : 'Not set'}</span>
                  </div>
                  
                  {/* Assignee */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Assignee</span>
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={assignee.avatar} alt={assignee.name} />
                          <AvatarFallback>{assignee.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                  
                  {/* Progress */}
                  {localTask?.subtasks && localTask.subtasks.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2 w-full" />
                    </div>
                  )}
                  
                  <Separator />
                  
                  {/* Description */}
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Description</span>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {localTask?.description || 'No description provided'}
                    </p>
                  </div>
                  
                  {/* Delete button for admin/manager */}
                  {(userRole === 'admin' || userRole === 'manager') && (
                    <div className="flex justify-end">
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={handleDeleteClick}
                        className="text-xs flex items-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Task</span>
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="subtasks" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                {localTask && (
                  <SubTaskManager 
                    task={localTask} 
                    onTaskUpdate={handleSubtaskUpdate} 
                    userRole={userRole}
                    currentUserId={currentUserId}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="comments" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                {localTask && (
                  <TaskComments 
                    task={localTask}
                    onCommentAdded={handleCommentAdded}
                    onDeleteComment={handleDeleteComment}
                    currentUserId={currentUserId}
                  />
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}; 