import React, { useState } from 'react';
import { Task, TeamMember, TaskStatus } from '@/lib/types';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { ChevronDown, Filter, Plus, CalendarDays, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { formatDistanceToNow } from 'date-fns';
import TaskDetailDialog from './TaskDetailDialog';
import TaskCreation from './TaskCreation';

interface MobileTaskViewProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  onTaskUpdate?: (updatedTask: Task) => void;
  userRole: string;
  currentUserId?: string;
  getFilteredTasks: (status: TaskStatus) => Task[];
  handleTaskSelect: (task: Task) => void;
  handleAddComment: (taskId: string, commentText: string) => void;
  handleStatusChange: (task: Task, newStatus: TaskStatus) => void;
  handleDeleteComment: (taskId: string, commentId: string) => Promise<void>;
  handleDeleteTask: (taskId: string) => void;
  getAssigneeForTask: (task: Task) => TeamMember | undefined;
  selectedTask: Task | null;
  taskDetailOpen: boolean;
  setTaskDetailOpen: (open: boolean) => void;
  handlePriorityChange: (task: Task, newPriority: string) => void;
  handleApprovalClick: (task: Task) => void;
}

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return formatDistanceToNow(date, { addSuffix: true });
};

const priorityColors = {
  Low: "bg-slate-100 text-slate-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-amber-100 text-amber-700",
  Urgent: "bg-red-100 text-red-700"
};

const MobileTaskView: React.FC<MobileTaskViewProps> = ({
  tasks,
  teamMembers,
  onTaskUpdate,
  userRole,
  currentUserId,
  getFilteredTasks,
  handleTaskSelect,
  handleAddComment,
  handleStatusChange,
  handleDeleteComment,
  handleDeleteTask,
  getAssigneeForTask,
  selectedTask,
  taskDetailOpen,
  setTaskDetailOpen,
  handlePriorityChange,
  handleApprovalClick
}) => {
  const [activeTab, setActiveTab] = useState<TaskStatus>("Todo");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Get filtered and sorted tasks
  const filteredTasks = getFilteredTasks(activeTab).filter(task => 
    selectedCategory === "all" || task.category === selectedCategory
  );
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "priority":
        const priorityOrder = { Urgent: 3, High: 2, Medium: 1, Low: 0 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case "dueDate":
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      default:
        return 0;
    }
  });

  const getTaskStatusCount = (status: TaskStatus) => {
    return getFilteredTasks(status).length;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-11rem)] px-0.5">
      {/* Category filter and new task button */}
      <div className="flex items-center justify-between mb-1.5">
        <Select 
          value={selectedCategory}
          onValueChange={(value) => setSelectedCategory(value)}
        >
          <SelectTrigger className="w-[120px] h-7 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Operations">Operations</SelectItem>
            <SelectItem value="Legal">Legal</SelectItem>
            <SelectItem value="Finance">Finance</SelectItem>
            <SelectItem value="Site">Site</SelectItem>
            <SelectItem value="Marketing">Marketing</SelectItem>
            <SelectItem value="Licensing">Licensing</SelectItem>
            <SelectItem value="Staffing">Staffing</SelectItem>
            <SelectItem value="Menu">Menu</SelectItem>
          </SelectContent>
        </Select>

        {userRole && (userRole === 'admin' || userRole === 'manager') && (
          <TaskCreation 
            teamMembers={teamMembers}
            onCreateTask={onTaskUpdate}
            userRole={userRole as 'admin' | 'manager' | 'staff'}
          />
        )}
      </div>

      {/* Header with tab selection */}
      <div className="flex items-center justify-between mb-1.5">
        <Tabs 
          defaultValue="Todo" 
          className="w-full" 
          onValueChange={(value) => setActiveTab(value as TaskStatus)}
        >
          <TabsList className="w-full grid grid-cols-4 h-7 p-0.5">
            <TabsTrigger value="Todo" className="text-[9px] px-0.5 h-6">
              Todo <span className="opacity-70">({getTaskStatusCount("Todo")})</span>
            </TabsTrigger>
            <TabsTrigger value="In Progress" className="text-[9px] px-0.5 h-6">
              In Prog <span className="opacity-70">({getTaskStatusCount("In Progress")})</span>
            </TabsTrigger>
            <TabsTrigger value="Under Review" className="text-[9px] px-0.5 h-6">
              Review <span className="opacity-70">({getTaskStatusCount("Under Review")})</span>
            </TabsTrigger>
            <TabsTrigger value="Completed" className="text-[9px] px-0.5 h-6">
              Done <span className="opacity-70">({getTaskStatusCount("Completed")})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters and actions */}
      <div className="flex items-center justify-between mb-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1 h-6 text-[10px] px-2">
              <Filter className="h-3 w-3" />
              <span>Sort</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
              <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="oldest">Oldest</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="priority">Priority</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dueDate">Due Date</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="text-xs font-medium">{activeTab}</div>
      </div>

      {/* Tasks list */}
      <ScrollArea className="flex-1 pr-0.5">
        <div className="grid grid-cols-2 gap-1">
          {sortedTasks.length > 0 ? (
            sortedTasks.map((task) => {
              const assignee = getAssigneeForTask(task);
              const priorityStyle = priorityColors[task.priority] || {};
              const progress = task.subtasks && task.subtasks.length > 0
                ? Math.round((task.subtasks.filter(st => st.completed).length / task.subtasks.length) * 100)
                : 0;
              
              return (
                <div 
                  key={task.id}
                  className="bg-white dark:bg-gray-800 rounded-md shadow-sm p-1 border border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:shadow transition-all duration-150 cursor-pointer"
                  onClick={() => handleTaskSelect(task)}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-1">
                        <h3 className="font-medium text-[10px] line-clamp-1">{task.title}</h3>
                        <p className="text-[8px] text-gray-500 dark:text-gray-400 line-clamp-1">
                          {task.description}
                        </p>
                      </div>
                      <Badge className={`ml-1 shrink-0 text-[8px] px-1 py-0 h-3.5 ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-[8px] text-gray-500 dark:text-gray-400">
                      <span>{task.dueDate ? formatDate(task.dueDate) : ''}</span>
                      <span>{task.comments?.length || 0}</span>
                    </div>
                    
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div>
                        <Progress value={progress} className="h-0.5 mt-0.5" />
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      {task.category && (
                        <span className="text-[8px] px-1 py-0 bg-gray-100 dark:bg-gray-700 rounded">
                          {task.category}
                        </span>
                      )}
                      
                      {assignee && (
                        <div className="flex items-center gap-0.5">
                          <Avatar className="h-3 w-3">
                            <AvatarImage src={assignee.avatar} alt={assignee.name} />
                            <AvatarFallback className="text-[6px]">
                              {assignee.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[8px] line-clamp-1 max-w-[40px]">{assignee.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-2 text-muted-foreground text-xs col-span-2">
              <p>No tasks in this category</p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Task Detail Dialog */}
      {selectedTask && taskDetailOpen && (
        <TaskDetailDialog
          task={selectedTask}
          open={taskDetailOpen}
          onOpenChange={setTaskDetailOpen}
          assignee={getAssigneeForTask(selectedTask)}
          teamMembers={teamMembers}
          onTaskUpdate={(updatedTask) => {
            if (updatedTask.priority !== selectedTask.priority) {
              handlePriorityChange(selectedTask, updatedTask.priority);
            } else if (onTaskUpdate) {
              onTaskUpdate(updatedTask);
            }
          }}
          onDeleteTask={handleDeleteTask}
          onDeleteComment={handleDeleteComment}
          userRole={userRole}
          currentUserId={currentUserId}
          onCommentAdded={handleAddComment}
        />
      )}
    </div>
  );
};

export default MobileTaskView; 