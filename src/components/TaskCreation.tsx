import React, { useState } from "react";
import { TeamMember, Task, TaskCategory, TaskStatus, TaskPriority } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PlusCircle } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

interface TaskCreationProps {
  teamMembers: TeamMember[];
  onCreateTask?: (task: Task) => void;
  userRole: 'admin' | 'manager' | 'staff';
}

const TaskCreation: React.FC<TaskCreationProps> = ({ teamMembers, onCreateTask, userRole }) => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: "",
    description: "",
    category: "Operations",
    assignee: "",
    dueDate: "",
    status: "Todo",
    priority: "Medium",
    needsApproval: false,
  });

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.description || !newTask.assignee || !newTask.dueDate || !currentUser) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const taskId = uuidv4();
      const task: Task = {
        id: taskId,
        title: newTask.title,
        description: newTask.description,
        category: newTask.category as TaskCategory,
        assignee: newTask.assignee,
        assignedTo: newTask.assignee,
        ownerId: currentUser.uid,
        dueDate: newTask.dueDate,
        status: newTask.status as TaskStatus,
        priority: newTask.priority as TaskPriority,
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        needsApproval: newTask.needsApproval || false,
        approvals: [],
        comments: [],
        subtasks: []
      };

      await addDoc(collection(db, 'tasks'), task);

      setNewTask({
        title: "",
        description: "",
        category: "Operations",
        assignee: "",
        dueDate: "",
        status: "Todo",
        priority: "Medium",
        needsApproval: false,
      });
      setIsDialogOpen(false);
      
      toast({
        title: "Success",
        description: `Task "${task.title}" has been created`
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive"
      });
    }
  };

  // All authenticated users can create tasks
  const canCreateTasks = true;

  return (
    <div>
      {canCreateTasks && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusCircle size={16} />
              <span>Create Task</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task to the board with details and assignment.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="col-span-3"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Category
                </Label>
                <Select 
                  value={newTask.category as string} 
                  onValueChange={(value: TaskCategory) => setNewTask({ ...newTask, category: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
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
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assignee" className="text-right">
                  Assign To
                </Label>
                <Select 
                  value={newTask.assignee} 
                  onValueChange={(value: string) => setNewTask({ ...newTask, assignee: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dueDate" className="text-right">
                  Due Date
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">
                  Priority
                </Label>
                <Select 
                  value={newTask.priority as string} 
                  onValueChange={(value: TaskPriority) => setNewTask({ ...newTask, priority: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="needsApproval" className="text-right">
                  Needs Approval
                </Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Switch
                    id="needsApproval"
                    checked={newTask.needsApproval}
                    onCheckedChange={(checked) => setNewTask({ ...newTask, needsApproval: checked })}
                  />
                  <Label htmlFor="needsApproval" className="text-sm text-muted-foreground">
                    Requires partner approval before progress
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask}>Create Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TaskCreation;
