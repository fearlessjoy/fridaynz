import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Task, TeamMember, TaskStatus } from "@/lib/types";
import { 
  CalendarDays, 
  ChefHat, 
  ClipboardList, 
  FileText, 
  MapPin, 
  ShieldCheck, 
  BarChart, 
  Users, 
  PieChart, 
  ThumbsUp, 
  CheckCircle2,
  AlertCircle,
  MoveRight,
  MessageCircle,
  Trash2,
  ListChecks
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StableDialogComments } from "@/components/ui/stable-dialog-comments";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import React, { useState } from "react";
import TaskComments from './TaskComments';
import { useAuth } from "@/hooks/useAuth";
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

type TaskCardProps = {
  task: Task;
  assignee?: TeamMember;
  onApprovalClick?: (task: Task) => void;
  onStatusChange?: (task: Task, newStatus: TaskStatus) => void;
  showApprovalButton?: boolean;
  onSelect?: (task: Task) => void;
  teamMembersCount: number;
  onCommentAdded?: (taskId: string, commentText: string) => void;
  teamMembers: TeamMember[];
  onDeleteTask?: (taskId: string) => void;
  userRole?: string;
};

const priorityColors = {
  Low: "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Medium: "bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-800/50 dark:text-blue-300",
  High: "bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-800/50 dark:text-amber-300",
  Urgent: "bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-800/50 dark:text-red-300"
};

const statusColors = {
  "Todo": "text-slate-500",
  "In Progress": "text-ocean-500",
  "Under Review": "text-amber-500",
  "Completed": "text-kiwi-500"
};

const TaskCard = ({ 
  task, 
  assignee, 
  onApprovalClick, 
  onStatusChange,
  showApprovalButton = false,
  onSelect,
  teamMembersCount,
  onCommentAdded,
  teamMembers,
  onDeleteTask,
  userRole
}: TaskCardProps) => {
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { currentUser, userData } = useAuth();

  // Calculate subtask progress
  const calculateSubtaskProgress = () => {
    if (!task.subtasks || task.subtasks.length === 0) return null;
    const completedCount = task.subtasks.filter(subtask => subtask.completed).length;
    return Math.round((completedCount / task.subtasks.length) * 100);
  };

  const subtaskProgress = calculateSubtaskProgress();

  const getCategoryIcon = () => {
    switch(task.category) {
      case "Operations": return <ClipboardList className="h-4 w-4" />;
      case "Legal": return <ShieldCheck className="h-4 w-4" />;
      case "Finance": return <PieChart className="h-4 w-4" />;
      case "Site": return <MapPin className="h-4 w-4" />;
      case "Marketing": return <BarChart className="h-4 w-4" />;
      case "Licensing": return <FileText className="h-4 w-4" />;
      case "Staffing": return <Users className="h-4 w-4" />;
      case "Menu": return <ChefHat className="h-4 w-4" />;
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NZ', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const totalApprovals = task.approvals?.filter(a => a.approved).length || 0;
  const isFullyApproved = totalApprovals >= teamMembersCount;

  const handleCommentsClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection when clicking comments
    e.preventDefault(); // Prevent default browser behavior
    setIsCommentsDialogOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection when clicking delete
    e.preventDefault(); // Prevent default browser behavior
    setIsDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = () => {
    if (onDeleteTask) {
      onDeleteTask(task.id);
    }
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Card 
        className="shadow-sm transition-all duration-200 hover:shadow-md hover:translate-y-[-2px] border-l-4 border-l-kiwi-500 overflow-hidden bg-card/80 backdrop-blur-sm cursor-pointer h-[280px] flex flex-col"
        onClick={() => onSelect?.(task)}
      >
        <CardHeader className="p-3 pb-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 w-[80%]">
              <h3 className="font-medium text-sm line-clamp-1 overflow-hidden text-ellipsis">{task.title}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                    <MoveRight className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {["Todo", "In Progress", "Under Review", "Completed"].map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => onStatusChange?.(task, status as TaskStatus)}
                      className={`${statusColors[status as TaskStatus]} ${task.status === status ? 'bg-accent' : ''}`}
                    >
                      Move to {status}
                    </DropdownMenuItem>
                  ))}
                  
                  {userRole === 'admin' && (
                    <>
                      <DropdownMenuItem
                        onClick={handleDeleteClick}
                        className="text-red-600 hover:text-red-700 focus:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Task
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Badge className={priorityColors[task.priority]}>
              {task.priority}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-2 flex-grow flex flex-col">
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2 min-h-[2.5rem]">{task.description}</p>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getCategoryIcon()}
              <span>{task.category}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-1 hover:bg-accent"
              onClick={handleCommentsClick}
            >
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                <span>{task.comments?.length || 0}</span>
              </div>
            </Button>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <CalendarDays className="h-4 w-4" />
            <span>Due: {formatDate(task.dueDate)}</span>
          </div>
          
          {task.needsApproval && (
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <ThumbsUp className="h-4 w-4" />
                <span>Approvals:</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className={`text-xs ${isFullyApproved ? 'border-kiwi-500 text-kiwi-600' : 'border-amber-500 text-amber-600'}`}>
                  {totalApprovals}/{teamMembersCount}
                </Badge>
                {isFullyApproved ? (
                  <CheckCircle2 className="h-4 w-4 text-kiwi-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
              </div>
            </div>
          )}
          
          {/* Enhanced progress information */}
          <div className="mt-3 mb-1">
            {/* Main task progress */}
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">Progress</span>
              <span className="text-xs font-semibold">{task.progress}%</span>
            </div>
            <div className="relative mb-2">
              <Progress 
                value={task.progress} 
                className="h-2 relative" 
              />
            </div>
            
            {/* Subtask progress if available */}
            {subtaskProgress !== null && (
              <>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center">
                    <ListChecks className="h-3 w-3 mr-1" />
                    <span className="text-xs font-medium">Subtasks</span>
                  </div>
                  <span className="text-xs font-semibold">{subtaskProgress}%</span>
                </div>
                <div className="relative">
                  <Progress 
                    value={subtaskProgress} 
                    className="h-2 relative bg-slate-100 dark:bg-slate-800" 
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="p-3 pt-0 flex justify-between items-center">
          {assignee && (
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={assignee.avatar} alt={assignee.name} />
                    <AvatarFallback className="text-xs bg-kiwi-100 text-kiwi-800 dark:bg-kiwi-800 dark:text-kiwi-200">
                      {assignee.name && assignee.name.includes(' ') 
                        ? assignee.name.split(' ').map(n => n[0]).join('')
                        : assignee.name ? assignee.name[0].toUpperCase() : 'U'
                      }
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">
                    {assignee.name && assignee.name.length > 30 
                      ? (assignee.name.includes('@') ? 'User' : assignee.name.substring(0, 15) + '...')
                      : assignee.name || 'Unknown User'
                    }
                  </span>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-60">
                <div className="flex justify-between space-x-4">
                  <Avatar>
                    <AvatarImage src={assignee.avatar} />
                    <AvatarFallback className="bg-kiwi-100 text-kiwi-800 dark:bg-kiwi-800 dark:text-kiwi-200">
                      {assignee.name && assignee.name.includes(' ') 
                        ? assignee.name.split(' ').map(n => n[0]).join('')
                        : assignee.name ? assignee.name[0].toUpperCase() : 'U'
                      }
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">
                      {assignee.name || 'Unknown User'}
                    </h4>
                    <p className="text-sm text-muted-foreground">{assignee.role || 'Team Member'}</p>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          )}
          
          {showApprovalButton && task.needsApproval && (
            <Button variant="outline" size="sm" onClick={() => onApprovalClick?.(task)}>
              Review
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Comments Dialog - Using the Stable version to prevent auto-closing when adding comments */}
      <StableDialogComments 
        open={isCommentsDialogOpen} 
        onOpenChange={setIsCommentsDialogOpen}
        title={`Comments - ${task.title}`}
        description="Add or view comments for this task"
      >
        <div className="mt-4 flex-1 overflow-hidden flex">
          <TaskComments
            taskId={task.id}
            comments={task.comments || []}
            onCommentAdded={(taskId, commentText) => {
              // Only call onCommentAdded when there's actual comment text
              if (commentText && commentText.trim()) {
                onCommentAdded?.(taskId, commentText);
              }
            }}
            teamMembers={teamMembers}
            userRole={userRole}
            onDeleteComment={(taskId, commentId) => {
              return new Promise(async (resolve) => {
                try {
                  // Actually delete the comment using the parent component's function
                  if (onCommentAdded) {
                    // Pass a special marker to the parent component
                    onCommentAdded(taskId, `__DELETE_COMMENT__${commentId}`);
                  }
                  
                  resolve();
                } catch (error) {
                  console.error("Error deleting comment:", error);
                  resolve(); // Resolve anyway to avoid hanging promises
                }
              });
            }}
          />
        </div>
      </StableDialogComments>
      
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

export default TaskCard;
