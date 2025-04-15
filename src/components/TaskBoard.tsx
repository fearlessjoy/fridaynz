import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TeamMember, Approval, Comment, UserRole, TaskPriority, TaskCategory } from "@/lib/types";
import TaskCard from "@/components/TaskCard";
import ApprovalDialog from "@/components/ApprovalDialog";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import TaskCreation from "@/components/TaskCreation";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { doc, updateDoc, getFirestore, arrayUnion, collection, addDoc, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/lib/firebase";
import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase/firestore';
import { Message } from '@/lib/types';
import { sendTaskUpdateEmail } from '@/lib/notificationService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type TaskBoardProps = {
  tasks: Task[];
  teamMembers: TeamMember[];
  onTaskUpdate?: (updatedTask: Task) => void;
  userRole: string;
  currentUserId?: string;
};

const statuses: TaskStatus[] = ["Todo", "In Progress", "Under Review", "Completed"];

const statusColors: Record<TaskStatus, string> = {
  "Todo": "bg-slate-100/70 dark:bg-slate-800/50",
  "In Progress": "bg-ocean-100/70 dark:bg-ocean-900/20",
  "Under Review": "bg-amber-100/70 dark:bg-amber-900/20",
  "Completed": "bg-kiwi-100/70 dark:bg-kiwi-900/20",
};

const TaskBoard = ({ tasks, teamMembers, onTaskUpdate, userRole, currentUserId }: TaskBoardProps) => {
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [taskCreationOpen, setTaskCreationOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { currentUser, userData } = useAuth();
  
  // Use the currentUserId from props or fall back to the current user's uid
  const userId = currentUserId || currentUser?.uid;
  
  // Effect to update task progress based on status
  useEffect(() => {
    const updateTasksProgress = async () => {
      if (!currentUser || !onTaskUpdate) return;
      
      try {
        // Update tasks that have incorrect progress values
        for (const task of tasks) {
          let expectedProgress = 0;
          
          switch (task.status) {
            case "Todo":
              expectedProgress = 0;
              break;
            case "In Progress":
              expectedProgress = 33;
              break;
            case "Under Review":
              expectedProgress = 66;
              break;
            case "Completed":
              expectedProgress = 100;
              break;
            default:
              expectedProgress = 0;
          }
          
          // If task progress doesn't match expected, update it
          if (task.progress !== expectedProgress) {
            const taskRef = doc(db, 'tasks', task.id);
            await updateDoc(taskRef, { progress: expectedProgress });
            
            // Update in local state
            const updatedTask: Task = {
              ...task,
              progress: expectedProgress
            };
            
            onTaskUpdate(updatedTask);
          }
        }
      } catch (error) {
        console.error('Error updating task progress values:', error);
      }
    };
    
    updateTasksProgress();
  }, [tasks, currentUser, onTaskUpdate]); // Run once when tasks change
  
  const handleApprovalClick = (task: Task) => {
    setSelectedTask(task);
    setApprovalDialogOpen(true);
  };
  
  const handleApprove = async (task: Task, approval: Approval) => {
    if (!onTaskUpdate || !currentUser) return;
    
    try {
      const taskRef = doc(db, 'tasks', task.id);
      
      // Get the current task data to ensure we have the latest state
      const taskDoc = await getDoc(taskRef);
      if (!taskDoc.exists()) {
        throw new Error('Task not found');
      }
      
      const currentTask = taskDoc.data() as Task;
      
      // Ensure approval has all required fields
      const formattedApproval: Approval = {
        partnerId: approval.partnerId,
        approved: approval.approved,
        comment: approval.comment || '',
        timestamp: new Date().toISOString()
      };
      
      // Initialize approvals array if it doesn't exist
      let newApprovals = currentTask.approvals || [];
      
      // Find if there is an existing approval from this user
      const existingApprovalIndex = newApprovals.findIndex(a => a.partnerId === formattedApproval.partnerId);
      
      if (existingApprovalIndex >= 0) {
        // Replace the existing approval
        newApprovals[existingApprovalIndex] = formattedApproval;
      } else {
        // Add a new approval
        newApprovals = [...newApprovals, formattedApproval];
      }
      
      // Check if all partners have approved based on actual team members count
      const approvedCount = newApprovals.filter(a => a.approved).length;
      const allApproved = approvedCount >= teamMembers.length;
      
      // Prepare the update data with explicit typing
      const updateData = {
        approvals: newApprovals,
        status: allApproved && currentTask.status === "Todo" ? "In Progress" : currentTask.status,
        updatedAt: serverTimestamp()
      };

      // Update the task in Firestore
      await updateDoc(taskRef, updateData);
      
      // Prepare updated task for local state
      const updatedTask: Task = {
        ...currentTask,
        approvals: newApprovals,
        status: updateData.status,
        updatedAt: new Date().toISOString() // For local state we use ISO string
      };
      
      // If all partners approved, show a toast
      if (allApproved && currentTask.status === "Todo") {
        toast({
          title: "Task Ready for Progress",
          description: `"${task.title}" has been approved by all partners and moved to In Progress.`,
        });
      }
      
      onTaskUpdate(updatedTask);
      
      toast({
        title: "Approval Registered",
        description: "Your approval has been successfully recorded.",
      });

      // Get the current user's team member info
      const updatedBy = teamMembers.find(m => m.id === currentUser?.uid);
      if (!updatedBy) return;

      // For approvals, notify the task assignee and admin/managers
      const recipients = teamMembers.filter(m => 
        m.id !== currentUser?.uid && 
        (m.id === task.assignedTo || 
         m.userRole === 'admin' || 
         m.userRole === 'manager')
      );

      // Send email notifications
      if (recipients.length > 0) {
        await sendTaskUpdateEmail(updatedTask, updatedBy, recipients, 'updated');
      }
    } catch (error) {
      console.error('Error updating task approvals:', error);
      toast({
        title: "Error",
        description: "Failed to update task approvals and send notifications. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleReject = async (task: Task, approval: Approval) => {
    if (!onTaskUpdate || !currentUser) return;
    
    try {
      const taskRef = doc(db, 'tasks', task.id);
      
      // Get the current task data to ensure we have the latest state
      const taskDoc = await getDoc(taskRef);
      if (!taskDoc.exists()) {
        throw new Error('Task not found');
      }
      
      const currentTask = taskDoc.data() as Task;
      
      // Ensure approval has all required fields
      const formattedApproval: Approval = {
        partnerId: approval.partnerId,
        approved: approval.approved,
        comment: approval.comment || '',
        timestamp: new Date().toISOString()
      };
      
      // Initialize approvals array if it doesn't exist
      let newApprovals = currentTask.approvals || [];
      
      // Find if there is an existing approval from this user
      const existingApprovalIndex = newApprovals.findIndex(a => a.partnerId === formattedApproval.partnerId);
      
      if (existingApprovalIndex >= 0) {
        // Replace the existing approval
        newApprovals[existingApprovalIndex] = formattedApproval;
      } else {
        // Add a new approval
        newApprovals = [...newApprovals, formattedApproval];
      }
      
      // Update the task in Firestore
      const updateData = {
        approvals: newApprovals,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(taskRef, updateData);
      
      // Prepare updated task for local state
      const updatedTask: Task = {
        ...currentTask,
        approvals: newApprovals,
        updatedAt: new Date().toISOString() // For local state we use ISO string
      };
      
      onTaskUpdate(updatedTask);
      
      toast({
        title: "Rejection Registered",
        description: "Your rejection has been successfully recorded.",
      });

      // Get the current user's team member info
      const updatedBy = teamMembers.find(m => m.id === currentUser?.uid);
      if (!updatedBy) return;

      // For rejections, notify the task assignee and admin/managers
      const recipients = teamMembers.filter(m => 
        m.id !== currentUser?.uid && 
        (m.id === task.assignedTo || 
         m.userRole === 'admin' || 
         m.userRole === 'manager')
      );

      // Send email notifications
      if (recipients.length > 0) {
        await sendTaskUpdateEmail(updatedTask, updatedBy, recipients, 'updated');
      }
    } catch (error) {
      console.error('Error updating task rejections:', error);
      toast({
        title: "Error",
        description: "Failed to update task rejections and send notifications. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async (taskId: string, commentText: string) => {
    try {
      if (!currentUser) return;
      
      // Special case for comment deletion
      if (commentText.startsWith('__DELETE_COMMENT__')) {
        // Extract comment ID from the special marker
        const commentId = commentText.replace('__DELETE_COMMENT__', '');
        // Call our delete comment handler directly
        await handleDeleteComment(taskId, commentId);
        // Exit early - we don't want to add a comment in this case
        return;
      }
      
      // Skip empty comments
      if (!commentText.trim()) {
        return;
      }
      
      // Find the task in the local state
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error("Task not found:", taskId);
        return;
      }

      // Get the latest task data from Firestore to ensure we're working with current data
      const taskRef = doc(db, 'tasks', taskId);
      const taskDoc = await getDoc(taskRef);
      
      if (!taskDoc.exists()) {
        console.error("Task document does not exist in Firestore");
        return;
      }
      
      const taskData = taskDoc.data() as Task;

      // Extract mentions from the comment
      const mentionRegex = /@([a-zA-Z\s]+)/g;
      const mentions = Array.from(commentText.matchAll(mentionRegex))
        .map(match => match[1].trim());
      
      // Find mentioned user IDs
      const mentionedUsers = teamMembers
        .filter(member => mentions.some(mention => 
          member.name.toLowerCase() === mention.toLowerCase()))
        .map(member => member.id);

      // Create new comment with correct type
      const newComment: Comment = {
        id: uuidv4(), // Use UUID for more reliable unique IDs
        userId: currentUser.uid,
        userName: userData?.name || 'Unknown',
        content: commentText,
        timestamp: new Date().toISOString(),
        taskId: taskId,
        mentions: mentionedUsers
      };

      // Update Firestore with the new comment
      await updateDoc(taskRef, {
        comments: [...(taskData.comments || []), newComment],
        updatedAt: serverTimestamp()
      });

      // Update local state to show the comment immediately
      if (onTaskUpdate && task) {
        const updatedTask: Task = {
          ...task,
          comments: [...(task.comments || []), newComment],
          updatedAt: new Date().toISOString()
        };
        
        // Update the tasks array with the new comment
        onTaskUpdate(updatedTask);
        
        // If this task is the currently selected task, update it
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(updatedTask);
        }
      }

      toast({
        title: "Success",
        description: "Your comment has been added to the task.",
      });

      // Get the current user's team member info
      const updatedBy = teamMembers.find(m => m.id === currentUser.uid);
      if (!updatedBy) return;

      // For comments, notify the task assignee and admin/managers
      const recipients = teamMembers.filter(m => 
        m.id !== currentUser.uid && 
        (m.id === task.assignedTo || 
         m.userRole === 'admin' || 
         m.userRole === 'manager')
      );

      // Send email notifications
      if (recipients.length > 0) {
        await sendTaskUpdateEmail(task, updatedBy, recipients, 'updated');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (!onTaskUpdate || !currentUser) return;
    
    try {
      const taskRef = doc(db, 'tasks', task.id);
      
      // Calculate progress based on status
      let newProgress = task.progress;
      
      // Map statuses to progress values
      switch (newStatus) {
        case "Todo":
          newProgress = 0;
          break;
        case "In Progress":
          newProgress = 33;
          break;
        case "Under Review":
          newProgress = 66;
          break;
        case "Completed":
          newProgress = 100;
          break;
        default:
          break;
      }
      
      const updateData = {
        status: newStatus,
        progress: newProgress,
        updatedAt: serverTimestamp()
      };

      // Update in Firestore
      await updateDoc(taskRef, updateData);

      // Prepare updated task for local state
      const updatedTask: Task = {
        ...task,
        status: newStatus,
        progress: newProgress,
        updatedAt: new Date().toISOString()
      };

      // Update local state through callback
      onTaskUpdate(updatedTask);

      // Get the current user's team member info
      const updatedBy = teamMembers.find(m => m.id === currentUser?.uid);
      if (!updatedBy) return;

      // For status changes, notify the task assignee and admin/managers
      const recipients = teamMembers.filter(m => 
        m.id !== currentUser?.uid && 
        (m.id === task.assignedTo || 
         m.userRole === 'admin' || 
         m.userRole === 'manager')
      );

      // Send email notifications
      if (recipients.length > 0) {
        try {
          await sendTaskUpdateEmail(task, updatedBy, recipients, 'updated');
        } catch (emailError) {
          console.error('Error sending notification emails:', emailError);
          // Don't block the update if email notifications fail
          toast({
            title: "Warning",
            description: "Task updated but notification emails could not be sent.",
          });
        }
      }

      toast({
        title: "Success",
        description: `Task status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!onTaskUpdate || !currentUser) return;
    
    try {
      const taskRef = doc(db, 'tasks', taskId);
      
      // Delete the task from Firestore
      await deleteDoc(taskRef);
      
      // Show success toast
      toast({
        title: "Task Deleted",
        description: "The task has been successfully deleted.",
      });
      
      // Remove task from local state by returning a filtered list
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      
      // Find the task that was deleted (for notification purposes)
      const deletedTask = tasks.find(t => t.id === taskId);
      
      if (deletedTask) {
        // Get the current user's team member info
        const updatedBy = teamMembers.find(m => m.id === currentUser?.uid);
        if (updatedBy) {
          // For task deletion, notify the task assignee and admin/managers
          const recipients = teamMembers.filter(m => 
            m.id !== currentUser?.uid && 
            (m.id === deletedTask.assignedTo || 
             m.userRole === 'admin' || 
             m.userRole === 'manager')
          );
          
          // Send email notifications
          if (recipients.length > 0) {
            try {
              await sendTaskUpdateEmail(deletedTask, updatedBy, recipients, 'deleted');
            } catch (emailError) {
              console.error('Error sending notification emails:', emailError);
              toast({
                title: "Warning",
                description: "Task deleted but notification emails could not be sent.",
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete the task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (taskId: string, commentId: string) => {
    try {
      if (!currentUser || !onTaskUpdate) return;
      
      // Find the task in the local state
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error("Task not found:", taskId);
        return;
      }

      // Remove the comment from local state immediately for better UI feedback
      const localUpdatedComments = (task.comments || []).filter(
        comment => comment.id !== commentId
      );
      
      // Update local state immediately
      const localUpdatedTask: Task = {
        ...task,
        comments: localUpdatedComments,
        updatedAt: new Date().toISOString()
      };
      
      // Update the local state to refresh the UI immediately
      onTaskUpdate(localUpdatedTask);

      // Then update Firestore (this happens in the background)
      const taskRef = doc(db, 'tasks', taskId);
      const taskDoc = await getDoc(taskRef);
      
      if (!taskDoc.exists()) {
        console.error("Task document does not exist in Firestore");
        return;
      }
      
      const taskData = taskDoc.data() as Task;
      
      // Filter out the comment to delete from the Firestore data
      const updatedComments = (taskData.comments || []).filter(
        comment => comment.id !== commentId
      );
      
      // Update Firestore with the filtered comments array
      await updateDoc(taskRef, {
        comments: updatedComments,
        updatedAt: serverTimestamp()
      });
      
      toast({
        title: "Success",
        description: "Comment has been deleted.",
      });
      
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePriorityChange = async (task: Task, newPriority: string) => {
    if (!onTaskUpdate || !currentUser) return;
    
    try {
      const taskRef = doc(db, 'tasks', task.id);
      
      // Skip if priority hasn't changed
      if (task.priority === newPriority) return;
      
      // Get the current task data to ensure we have the latest state
      const taskDoc = await getDoc(taskRef);
      if (!taskDoc.exists()) {
        throw new Error('Task not found');
      }
      
      const currentTask = taskDoc.data() as Task;
      
      // Create update data
      const updateData = {
        priority: newPriority,
        updatedAt: serverTimestamp()
      };
      
      // Update in Firestore
      await updateDoc(taskRef, updateData);
      
      // Prepare updated task for local state
      const updatedTask: Task = {
        ...currentTask,
        priority: newPriority as TaskPriority,
        updatedAt: new Date().toISOString() // For local state we use ISO string
      };
      
      // Update local state through callback
      onTaskUpdate(updatedTask);
      
      toast({
        title: "Priority Updated",
        description: `Task priority changed to ${newPriority}`,
      });
      
      // Get the current user's team member info
      const updatedBy = teamMembers.find(m => m.id === currentUser?.uid);
      if (!updatedBy) return;
      
      // For priority changes, notify the task owner and admins/managers
      const recipients = teamMembers.filter(m => 
        m.id !== currentUser?.uid && 
        (m.id === task.assignedTo || 
         m.userRole === 'admin' || 
         m.userRole === 'manager')
      );
      
      // Send email notifications
      if (recipients.length > 0) {
        try {
          // Include priority change in the update message
          await sendTaskUpdateEmail(
            updatedTask, 
            updatedBy, 
            recipients, 
            'updated'
          );
        } catch (emailError) {
          console.error('Error sending notification emails:', emailError);
          toast({
            title: "Warning",
            description: "Task updated but notification emails could not be sent.",
          });
        }
      }
    } catch (error) {
      console.error('Error updating task priority:', error);
      toast({
        title: "Error",
        description: "Failed to update task priority. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    setTaskDetailOpen(true);
  };

  const getAssigneeForTask = (task: Task) => {
    // Find the team member based on assignedTo field
    const assignee = teamMembers.find(member => member.id === task.assignedTo);
    
    // If no assignee is found but we have the assignee name in the task, create a placeholder
    if (!assignee) {
      // Check if assignee is a UID-like string (no spaces, long string of characters)
      const isUidLike = (name: string) => 
        name && 
        name.length > 20 && 
        !name.includes(' ') && 
        /^[a-zA-Z0-9]*$/.test(name);
      
      // Try to find by matching name if assignedTo doesn't work
      if (task.assignee && !isUidLike(task.assignee)) {
        const memberByName = teamMembers.find(member => 
          member.name.toLowerCase() === task.assignee.toLowerCase()
        );
        
        if (memberByName) {
          return memberByName;
        }
      }
      
      // Look for the team member by ID if the assignee looks like a UID
      if (task.assignee && isUidLike(task.assignee)) {
        const memberById = teamMembers.find(member => member.id === task.assignee);
        if (memberById) {
          return memberById;
        }
      }
      
      // Create a placeholder with appropriate name
      return {
        id: task.assignedTo || 'unknown',
        name: isUidLike(task.assignee) ? 'Team Member' : (task.assignee || 'Unknown User'),
        role: '',
        email: '',
        userRole: 'staff' as UserRole
      };
    }
    
    return assignee;
  };

  // Filter tasks based on selected category
  const getFilteredTasks = (status: TaskStatus) => {
    return tasks
      .filter(task => task.status === status)
      .filter(task => selectedCategory === "all" || task.category === selectedCategory);
  };

  // Update the renderTaskList function to use the filtered tasks
  const renderTaskList = (status: TaskStatus) => {
    const filteredTasks = getFilteredTasks(status);
    return (
      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.map((task) => (
          <TaskCard
            key={`task-${task.id}-${task.comments?.length || 0}`}
            task={task}
            assignee={getAssigneeForTask(task)}
            onApprovalClick={() => handleApprovalClick(task)}
            onStatusChange={handleStatusChange}
            showApprovalButton={task.needsApproval}
            onSelect={handleTaskSelect}
            teamMembersCount={teamMembers.length}
            onCommentAdded={handleAddComment}
            teamMembers={teamMembers}
            onDeleteTask={handleDeleteTask}
            userRole={userRole}
          />
        ))}
        {filteredTasks.length === 0 && (
          <div className="h-[280px] border border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
            <p className="text-sm">No tasks</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Task Board</h2>
        <div className="flex items-center gap-2">
          {userRole && (
            <Select 
              value={selectedCategory}
              onValueChange={(value) => {
                setSelectedCategory(value);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
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
          )}
          {userRole && (userRole === 'admin' || userRole === 'manager') && (
            <TaskCreation 
              teamMembers={teamMembers}
              onCreateTask={onTaskUpdate}
              userRole={userRole as 'admin' | 'manager' | 'staff'}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
        <div className="flex flex-col bg-muted/30 rounded-lg p-3 h-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg tracking-tight">
              Todo ({getFilteredTasks("Todo").length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {renderTaskList("Todo")}
          </div>
        </div>
        
        <div className="flex flex-col bg-muted/30 rounded-lg p-3 h-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg tracking-tight">
              In Progress ({getFilteredTasks("In Progress").length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {renderTaskList("In Progress")}
          </div>
        </div>
        
        <div className="flex flex-col bg-muted/30 rounded-lg p-3 h-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg tracking-tight">
              Under Review ({getFilteredTasks("Under Review").length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {renderTaskList("Under Review")}
          </div>
        </div>
        
        <div className="flex flex-col bg-muted/30 rounded-lg p-3 h-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg tracking-tight">
              Completed ({getFilteredTasks("Completed").length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {renderTaskList("Completed")}
          </div>
        </div>
      </div>

      {/* Task Detail Dialog */}
      {selectedTask && taskDetailOpen && (
        <TaskDetailDialog
          task={selectedTask}
          open={taskDetailOpen}
          onOpenChange={setTaskDetailOpen}
          assignee={getAssigneeForTask(selectedTask)}
          teamMembers={teamMembers}
          onTaskUpdate={(updatedTask) => {
            // Check if the priority has changed
            if (updatedTask.priority !== selectedTask.priority) {
              handlePriorityChange(selectedTask, updatedTask.priority);
            } else if (onTaskUpdate) {
              // For other updates, use the normal handler
              onTaskUpdate(updatedTask);
            }
          }}
          onDeleteTask={handleDeleteTask}
          onDeleteComment={async (taskId, commentId) => {
            // Use a dedicated method to avoid triggering comment additions
            await handleDeleteComment(taskId, commentId);
            // We don't need to return anything here
          }}
          userRole={userRole}
          currentUserId={currentUser?.uid}
          onCommentAdded={handleAddComment}
        />
      )}
      
      {/* Approval Dialog */}
      {selectedTask && approvalDialogOpen && currentUser && (
        <ApprovalDialog
          task={selectedTask}
          open={approvalDialogOpen}
          onOpenChange={setApprovalDialogOpen}
          onApprove={handleApprove}
          onReject={handleReject}
          teamMembers={teamMembers}
          currentUserId={currentUser.uid}
        />
      )}
    </div>
  );
};

export default TaskBoard;
