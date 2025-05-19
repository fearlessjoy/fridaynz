import React, { useEffect, useState } from 'react';
import { Task, TeamMember, TaskPriority, SubTask, Comment } from '@/lib/types';
import {
  StableDialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/stable-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, User, MessageCircle, ThumbsUp, CheckCircle, XCircle, Trash2, ListChecks } from 'lucide-react';
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

interface TaskDetailDialogProps {
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
  Low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Medium: "bg-blue-100 text-blue-700 dark:bg-blue-800/50 dark:text-blue-300",
  High: "bg-amber-100 text-amber-700 dark:bg-amber-800/50 dark:text-amber-300",
  Urgent: "bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300"
};

const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
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
  const [hasApprovalTab, setHasApprovalTab] = useState(false);
  
  useEffect(() => {
    if (task) {
      // Deep clone to avoid reference issues
      setLocalTask(JSON.parse(JSON.stringify(task)));
      
      // Check if we need to show the approvals tab
      const needsApproval = task.approvals && task.approvals.length > 0;
      setHasApprovalTab(needsApproval);
    }
  }, [
    task, 
    // Watch specific task properties for changes
    task?.status,
    task?.title,
    task?.description,
    task?.priority,
    task?.category,
    task?.dueDate,
    task?.assignee,
    task?.progress,
    // Watch arrays by using their length as dependency
    task?.subtasks?.length,
    task?.comments?.length,
    task?.approvals?.length
  ]);
  
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

  const handleReassignTask = (newAssigneeId: string) => {
    if (localTask && onTaskUpdate) {
      const assignee = teamMembers.find(member => member.id === newAssigneeId);
      const updatedTask = {
        ...localTask,
        assignee: newAssigneeId,
        assignedTo: newAssigneeId,
        updatedAt: new Date().toISOString()
      };
      setLocalTask(updatedTask);
      onTaskUpdate(updatedTask);
    }
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    console.log('Task update received:', 
      updatedTask.subtasks?.length || 0, 'subtasks');
    
    if (onTaskUpdate) {
      // Update parent component state
      onTaskUpdate(updatedTask);
    }
    
    // Always update local state immediately for better responsiveness
    setLocalTask(updatedTask);
  };

  // Handle subtask updates from the SubTaskManager
  const handleSubtaskUpdate = (updatedTask: Task) => {
    if (localTask && onTaskUpdate) {
      console.log('Task updated in TaskDetailDialog', updatedTask);
      setLocalTask(updatedTask);
      onTaskUpdate(updatedTask);
    }
  };

  // Handle comment updates from TaskComments
  const handleCommentAdded = (taskId: string, commentText: string) => {
    console.log('Comment added in TaskDetailDialog', taskId, commentText);
    
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
    // This function is passed to ensure the parent component is notified
    if (onCommentAdded) {
      onCommentAdded(taskId, commentText);
      
      // Note: The parent component will handle the Firestore update
    }
  };

  // Handle comment deletion with local state update
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

  // Helper function to safely get avatar fallback
  const getAvatarFallback = (name?: string): string => {
    return name && name.length > 0 ? name.charAt(0) : '?';
  };

  return (
    <>
      <StableDialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] w-[95vw] flex flex-col overflow-hidden" aria-describedby="task-detail-description">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <DialogTitle className="break-words mr-2 pr-2">{localTask?.title}</DialogTitle>
            </div>
          </DialogHeader>
          <div id="task-detail-description" className="sr-only">
            Task details and management interface
          </div>
          
          <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-4 w-full h-auto md:h-12 bg-background border-b mb-3">
              <TabsTrigger 
                value="details" 
                className="data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary font-medium text-base py-2 md:py-3 transition-all"
              >
                <div className="flex items-center gap-1 md:gap-2">
                  <CalendarDays className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="text-sm md:text-base">Details</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="subtasks" 
                className="data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary font-medium text-base py-2 md:py-3 transition-all"
              >
                <div className="flex items-center gap-1 md:gap-2">
                  <ListChecks className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="text-sm md:text-base">Subtasks</span> 
                  <span className="hidden md:inline">{localTask?.subtasks?.length ? `(${localTask.subtasks.length})` : ''}</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="comments" 
                className="data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary font-medium text-base py-2 md:py-3 transition-all"
              >
                <div className="flex items-center gap-1 md:gap-2">
                  <MessageCircle className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="text-sm md:text-base">Comments</span>
                  <span className="hidden md:inline">{localTask?.comments?.length ? `(${localTask.comments.length})` : ''}</span>
                </div>
              </TabsTrigger>
              {hasApprovalTab && (
                <TabsTrigger 
                  value="approvals"
                  className="data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary font-medium text-base py-2 md:py-3 transition-all"
                >
                  <div className="flex items-center gap-1 md:gap-2">
                    <ThumbsUp className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="text-sm md:text-base">Approvals</span>
                    <span className="hidden md:inline">{localTask?.approvals?.length ? `(${localTask.approvals.length})` : ''}</span>
                  </div>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="details" className="mt-2 flex flex-col flex-1 overflow-hidden">
              <ScrollArea className="h-[calc(65vh-10rem)]">
                <div className="space-y-4 p-1">
                  {/* Task Description */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground break-words">{localTask?.description}</p>
                  </div>

                  {/* Task Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Category</h4>
                      <p className="text-sm text-muted-foreground">{localTask?.category}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Status</h4>
                      <p className="text-sm text-muted-foreground">{localTask?.status}</p>
                    </div>
                  </div>

                  {/* Priority Selector and Badge */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Priority</h4>
                      <div className="flex items-center gap-3">
                        <Select 
                          defaultValue={localTask?.priority} 
                          onValueChange={handlePriorityChange}
                        >
                          <SelectTrigger className="w-[120px] sm:w-[180px]">
                            <SelectValue placeholder={localTask?.priority} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <Badge className={priorityColors[localTask?.priority]}>
                          {localTask?.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium">Due Date</h4>
                        <p className="text-sm text-muted-foreground">{formatDate(localTask?.dueDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 shrink-0" />
                      <div className="min-w-0 overflow-hidden">
                        <h4 className="text-sm font-medium">Assigned To</h4>
                        {/* Add reassign dropdown if user has permission */}
                        {(userRole === 'admin' || userRole === 'manager' || currentUserId === task.ownerId) ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Select 
                              defaultValue={localTask?.assignedTo} 
                              onValueChange={handleReassignTask}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue>
                                  {assignee ? (
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-5 w-5 shrink-0">
                                        <AvatarImage src={assignee.avatar || `https://ui-avatars.com/api/?name=${assignee.name || 'U'}`} />
                                        <AvatarFallback>{getAvatarFallback(assignee.name)}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm truncate">{assignee.name || 'Unknown User'}</span>
                                    </div>
                                  ) : (
                                    'Select user'
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {teamMembers.map(member => (
                                  <SelectItem key={member.id} value={member.id}>
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-5 w-5 shrink-0">
                                        <AvatarImage src={member.avatar || `https://ui-avatars.com/api/?name=${member.name || 'U'}`} />
                                        <AvatarFallback>{getAvatarFallback(member.name)}</AvatarFallback>
                                      </Avatar>
                                      <span>{member.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Avatar className="h-6 w-6 shrink-0">
                              <AvatarImage src={assignee?.avatar || `https://ui-avatars.com/api/?name=${assignee?.name || 'U'}`} />
                              <AvatarFallback>{getAvatarFallback(assignee?.name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground truncate">{assignee?.name || 'Unknown User'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <h4 className="text-sm font-medium">Progress</h4>
                      <span className="text-sm text-muted-foreground">{localTask?.progress}%</span>
                    </div>
                    <Progress value={localTask?.progress} className="h-2" />
                  </div>

                  {/* Creation Info */}
                  <div className="pt-4">
                    <Separator className="mb-4" />
                    <div className="text-xs text-muted-foreground">
                      <p>Created: {formatDate(localTask?.createdAt)}</p>
                      <p>Last Updated: {formatDate(localTask?.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="subtasks" className="mt-2 flex-1 overflow-hidden">
              <ScrollArea className="h-[calc(65vh-10rem)]">
                <div className="p-1">
                  <SubTaskManager 
                    task={localTask} 
                    teamMembers={teamMembers} 
                    onUpdate={handleSubtaskUpdate} 
                    userRole={userRole || 'staff'}
                  />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="comments" className="mt-2 flex-1 overflow-hidden">
              <div className="h-[calc(65vh-10rem)] overflow-hidden">
                <TaskComments
                  taskId={localTask?.id}
                  comments={localTask?.comments || []}
                  onCommentAdded={handleCommentAdded}
                  teamMembers={teamMembers}
                  userRole={userRole}
                  onDeleteComment={handleDeleteComment}
                  directUpdate={false}
                />
              </div>
            </TabsContent>

            {localTask?.needsApproval && (
              <TabsContent value="approvals" className="mt-2 flex-1 overflow-hidden">
                <ScrollArea className="h-[calc(65vh-10rem)]">
                  <div className="space-y-3 p-1">
                    {localTask.approvals.map((approval) => {
                      const partner = teamMembers.find((m) => m.id === approval.partnerId);
                      return (
                        <div key={approval.partnerId} className="flex items-center gap-3 p-3 rounded-lg border">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={partner?.avatar || `https://ui-avatars.com/api/?name=${partner?.name || 'U'}`} />
                            <AvatarFallback>{getAvatarFallback(partner?.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{partner?.name || 'Unknown User'}</span>
                              {approval.approved ? (
                                <Badge variant="outline" className="border-kiwi-500 text-kiwi-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approved
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-destructive text-destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Rejected
                                </Badge>
                              )}
                            </div>
                            {approval.comment && (
                              <p className="text-sm text-muted-foreground mt-1">{approval.comment}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(approval.timestamp), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>

          <DialogFooter className="mt-4 pt-2 border-t flex items-center justify-end">
            {userRole === 'admin' && (
              <Button 
                variant="destructive" 
                size="sm"
                className="mr-auto gap-2"
                onClick={handleDeleteClick}
              >
                <Trash2 className="h-4 w-4" />
                Delete Task
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </StableDialog>
      
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
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskDetailDialog; 