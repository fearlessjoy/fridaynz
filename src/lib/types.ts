export type TeamMember = {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar?: string;
  userRole: UserRole; // Added user role property
  password?: string; // Optional field for password handling (not stored in Firestore)
};

export type UserRole = 'admin' | 'manager' | 'staff';

export type TaskCategory = 
  | "Operations" 
  | "Legal" 
  | "Finance" 
  | "Site" 
  | "Marketing" 
  | "Licensing" 
  | "Staffing" 
  | "Menu";

export type TaskStatus = 
  | "Todo" 
  | "In Progress" 
  | "Under Review" 
  | "Completed";

export type TaskPriority = 
  | "Low" 
  | "Medium" 
  | "High" 
  | "Urgent";

export type Approval = {
  partnerId: string;
  approved: boolean;
  timestamp: string;
  comment?: string;
};

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: any; // Firebase Timestamp
  taskId: string;
  mentions?: string[]; // Array of user IDs that were mentioned
}

export interface SubTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string; // Optional user ID
}

export type Task = {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  assignee: string;
  assignedTo: string; // User ID of the person assigned to the task
  ownerId: string; // User ID of the task owner/creator
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  createdAt: string;
  updatedAt: string;
  needsApproval: boolean;
  approvals: Approval[];
  comments: Comment[];
  subtasks?: SubTask[]; // Array of subtasks
};

export type MessageType = 'COMMENT' | 'TASK_UPDATE' | 'APPROVAL';

export interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: any; // Firebase Timestamp
  senderId: string;
  senderName: string;
  recipientId: string;
  read: boolean;
  taskId: string;
}

export type Conversation = {
  id: string;
  participants: string[];
  isGroup: boolean;
  name?: string;
  messages: Message[];
  lastMessageAt: string;
};

export type NotificationType = 
  | 'TASK_CREATED' 
  | 'TASK_UPDATED' 
  | 'TASK_COMMENT' 
  | 'TASK_APPROVAL_NEEDED'
  | 'TASK_APPROVED'
  | 'TASK_REJECTED';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  createdAt: string;
  userId: string;
  read: boolean;
  link?: string;
}
