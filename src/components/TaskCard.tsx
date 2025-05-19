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
  ListChecks,
  Eye,
  MoreHorizontal
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
import React, { useState, useEffect } from "react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { currentUser, userData } = useAuth();

  // Detect mobile devices
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

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
        className="shadow-sm transition-all duration-200 hover:shadow-md hover:translate-y-[-2px] border-l-4 border-l-kiwi-500 overflow-hidden bg-card/80 backdrop-blur-sm cursor-pointer flex flex-col h-auto md:h-[200px] group relative"
        onClick={() => onSelect?.(task)}
      >
        {/* Mobile Quick Action Row - always visible on mobile */}
        {isMobile && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-md border-t border-kiwi-200/30 dark:border-kiwi-800/20 py-0.5 px-2 flex justify-between items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 rounded-md text-kiwi-600 dark:text-kiwi-400 hover:bg-kiwi-50 dark:hover:bg-kiwi-900/20"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(task);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 rounded-md text-kiwi-600 dark:text-kiwi-400 hover:bg-kiwi-50 dark:hover:bg-kiwi-900/20 relative"
              onClick={(e) => {
                e.stopPropagation();
                handleCommentsClick(e);
              }}
            >
              <MessageCircle className="h-4 w-4" />
              {task.comments?.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-kiwi-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-[9px] font-medium">
                  {task.comments.length}
                </span>
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 rounded-md text-kiwi-600 dark:text-kiwi-400 hover:bg-kiwi-50 dark:hover:bg-kiwi-900/20"
              onClick={(e) => {
                e.stopPropagation();
                setMobileMenuOpen(true);
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Mobile action button - visible on tablet only */}
        {!isMobile && (
          <button 
            className="md:hidden absolute top-2 right-2 z-30 bg-kiwi-500 text-white dark:bg-kiwi-600 dark:text-kiwi-50 border border-kiwi-400 dark:border-kiwi-700 rounded-full p-1 h-8 w-8 flex items-center justify-center shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              setMobileMenuOpen(!mobileMenuOpen);
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}

        {/* Centered hover popup menu that appears on hover (desktop) or tap (mobile/tablet) */}
        <div className={`absolute inset-0 backdrop-filter backdrop-blur-[4px] flex items-center justify-center transition-all duration-200 z-20 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>
          {/* Semi-transparent gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background/40 dark:from-black/30 dark:via-black/50 dark:to-black/30"></div>
          
          <div className="bg-background/95 dark:bg-gray-900/95 border border-kiwi-200/70 dark:border-kiwi-800/30 shadow-md rounded-md p-1.5 flex flex-wrap justify-center gap-1.5 transform transition-all duration-200 scale-95 group-hover:scale-100 z-10 max-w-[90%] w-auto mx-auto">
            {!isMobile && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 md:h-7 min-w-[70px] md:min-w-[60px] px-2 md:px-1.5 py-0 text-xs md:text-[11px] font-medium border-kiwi-300 dark:border-kiwi-700 hover:bg-kiwi-50 hover:text-kiwi-700 dark:hover:bg-kiwi-900/20 dark:hover:text-kiwi-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(task);
                  setMobileMenuOpen(false);
                }}
                title="View Details"
              >
                <Eye className="h-3.5 md:h-3 w-3.5 md:w-3 mr-1 flex-shrink-0 text-kiwi-500 dark:text-kiwi-400" />
                <span>View</span>
              </Button>
            )}
            
            {!isMobile && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 md:h-7 min-w-[70px] md:min-w-[66px] px-2 md:px-1.5 py-0 text-xs md:text-[11px] font-medium border-kiwi-300 dark:border-kiwi-700 hover:bg-kiwi-50 hover:text-kiwi-700 dark:hover:bg-kiwi-900/20 dark:hover:text-kiwi-300"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCommentsClick(e);
                  setMobileMenuOpen(false);
                }}
                title="Comments"
              >
                <MessageCircle className="h-3.5 md:h-3 w-3.5 md:w-3 mr-1 flex-shrink-0 text-kiwi-500 dark:text-kiwi-400" />
                <span>Comment</span>
                {task.comments?.length > 0 && (
                  <span className="ml-0.5 bg-kiwi-500 text-white dark:bg-kiwi-600 dark:text-kiwi-50 rounded-full h-4 md:h-3.5 w-4 md:w-3.5 flex items-center justify-center text-[9px] md:text-[8px] font-medium">
                    {task.comments.length}
                  </span>
                )}
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 md:h-7 min-w-[70px] md:min-w-[60px] px-2 md:px-1.5 py-0 text-xs md:text-[11px] font-medium border-kiwi-300 dark:border-kiwi-700 hover:bg-kiwi-50 hover:text-kiwi-700 dark:hover:bg-kiwi-900/20 dark:hover:text-kiwi-300"
                  title="Move to Stage"
                >
                  <MoveRight className="h-3.5 md:h-3 w-3.5 md:w-3 mr-1 flex-shrink-0 text-kiwi-500 dark:text-kiwi-400" />
                  <span>Move</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="min-w-[110px] bg-background/95 backdrop-blur-sm border-kiwi-200 dark:border-kiwi-800/30">
                {["Todo", "In Progress", "Under Review", "Completed"].map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange?.(task, status as TaskStatus);
                      setMobileMenuOpen(false);
                    }}
                    className={`${statusColors[status as TaskStatus]} py-1.5 text-[11px] ${task.status === status ? 'bg-kiwi-50 dark:bg-kiwi-900/20 font-medium border-l-2 border-l-kiwi-500 pl-2' : ''}`}
                  >
                    {status}
                  </DropdownMenuItem>
                ))}
                
                {userRole === 'admin' && (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(e);
                        setMobileMenuOpen(false);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 focus:text-red-700 py-1.5 text-[11px]"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {/* Close button on mobile */}
          {mobileMenuOpen && (
            <Button 
              variant="secondary" 
              size="sm" 
              className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full bg-background/90 hover:bg-background text-kiwi-700 dark:text-kiwi-300 shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                setMobileMenuOpen(false);
              }}
            >
              ✕
            </Button>
          )}
        </div>
        
        {/* A small indicator that shows there are actions even when not hovering - desktop only */}
        <div className="absolute top-2 right-2 w-2 h-2 bg-kiwi-500/70 rounded-full opacity-40 group-hover:opacity-0 transition-opacity z-10 hidden md:block"></div>

        <CardHeader className="p-2 pb-0 pt-1.5">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 w-full pr-2">
              <h3 className="font-medium text-sm line-clamp-1 overflow-hidden text-ellipsis">{task.title}</h3>
            </div>
            <Badge className={`${priorityColors[task.priority]} text-xs px-1.5 py-0`}>
              {task.priority}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className={`p-2 pt-1 flex-grow flex flex-col ${isMobile ? 'pb-9' : ''}`}>
          <p className="text-sm text-muted-foreground mb-1.5 line-clamp-2">{task.description}</p>
          
          <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 mb-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getCategoryIcon()}
              <span className="whitespace-nowrap text-xs">{task.category}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
              {task.comments?.length > 0 && (
                <>
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span className="text-xs">{task.comments.length}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground col-span-2">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap overflow-hidden text-ellipsis text-xs">Due: {formatDate(task.dueDate)}</span>
            </div>
          </div>
          
          {task.needsApproval && (
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <ThumbsUp className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs">Approvals:</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className={`text-xs py-0 h-4 ${isFullyApproved ? 'border-kiwi-500 text-kiwi-600' : 'border-amber-500 text-amber-600'}`}>
                  {totalApprovals}/{teamMembersCount}
                </Badge>
                {isFullyApproved ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-kiwi-500" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                )}
              </div>
            </div>
          )}
          
          {/* Enhanced progress information */}
          <div className="mt-auto">
            {/* Main task progress */}
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium">Progress</span>
              <span className="text-xs font-semibold">{task.progress}%</span>
            </div>
            <div className="relative mb-1">
              <Progress 
                value={task.progress} 
                className="h-2 relative" 
              />
            </div>
            
            {/* Subtask progress if available */}
            {subtaskProgress !== null && (
              <>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <ListChecks className="h-3.5 w-3.5 mr-1" />
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
        
        <CardFooter className="p-2 pt-0 flex justify-between items-center">
          {assignee && (
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-pointer overflow-hidden">
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarImage src={assignee.avatar} alt={assignee.name} />
                    <AvatarFallback className="text-[10px] bg-kiwi-100 text-kiwi-800 dark:bg-kiwi-800 dark:text-kiwi-200">
                      {assignee.name && assignee.name.includes(' ') 
                        ? assignee.name.split(' ').map(n => n[0]).join('')
                        : assignee.name ? assignee.name[0].toUpperCase() : 'U'
                      }
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate max-w-[100px]">
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
            <Button variant="outline" size="sm" className="h-6 text-xs px-2 py-0" onClick={() => onApprovalClick?.(task)}>
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
