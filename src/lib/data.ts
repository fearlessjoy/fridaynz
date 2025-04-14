
import { Task, TaskCategory, TaskStatus, TaskPriority, TeamMember, Message, Conversation, UserRole } from "./types";

export const teamMembers: TeamMember[] = [
  {
    id: "1",
    name: "Partner One",
    role: "Managing Partner",
    avatar: "/placeholder.svg",
    userRole: "admin"
  },
  {
    id: "2",
    name: "Partner Two",
    role: "Finance Partner",
    avatar: "/placeholder.svg",
    userRole: "admin"
  },
  {
    id: "3",
    name: "Partner Three",
    role: "Legal Partner",
    avatar: "/placeholder.svg",
    userRole: "manager"
  },
  {
    id: "4",
    name: "Partner Four",
    role: "Site Procurement Partner",
    avatar: "/placeholder.svg",
    userRole: "manager"
  },
  {
    id: "5",
    name: "Operations Manager",
    role: "Operations Lead",
    avatar: "/placeholder.svg",
    userRole: "staff"
  },
];

export const tasks: Task[] = [
  {
    id: "task-1",
    title: "Company Registration",
    description: "Register the company with the New Zealand Companies Office",
    category: "Legal",
    assignee: "3",
    dueDate: "2025-05-15",
    status: "In Progress",
    priority: "High",
    progress: 65,
    createdAt: "2025-04-01",
    updatedAt: "2025-04-05",
    needsApproval: false,
    approvals: []
  },
  {
    id: "task-2",
    title: "Find Location in Wellington",
    description: "Search for suitable restaurant locations in Wellington central area",
    category: "Site",
    assignee: "4",
    dueDate: "2025-05-30",
    status: "In Progress",
    priority: "Urgent",
    progress: 40,
    createdAt: "2025-04-02",
    updatedAt: "2025-04-06",
    needsApproval: false,
    approvals: []
  },
  {
    id: "task-3",
    title: "Create Initial Menu Draft",
    description: "Design first draft of the menu with local New Zealand ingredients",
    category: "Menu",
    assignee: "5",
    dueDate: "2025-05-20",
    status: "Todo",
    priority: "Medium",
    progress: 0,
    createdAt: "2025-04-03",
    updatedAt: "2025-04-03",
    needsApproval: true,
    approvals: []
  },
  {
    id: "task-4",
    title: "Open Business Bank Account",
    description: "Set up business banking with appropriate accounts and permissions",
    category: "Finance",
    assignee: "2",
    dueDate: "2025-04-25",
    status: "Completed",
    priority: "High",
    progress: 100,
    createdAt: "2025-04-01",
    updatedAt: "2025-04-08",
    needsApproval: false,
    approvals: []
  },
  {
    id: "task-5",
    title: "Apply for Food Service License",
    description: "Submit application for food service license to local health department",
    category: "Licensing",
    assignee: "3",
    dueDate: "2025-06-10",
    status: "Todo",
    priority: "High",
    progress: 0,
    createdAt: "2025-04-05",
    updatedAt: "2025-04-05",
    needsApproval: true,
    approvals: []
  },
  {
    id: "task-6",
    title: "Develop Marketing Strategy",
    description: "Create comprehensive marketing plan for restaurant launch",
    category: "Marketing",
    assignee: "5",
    dueDate: "2025-05-30",
    status: "Todo",
    priority: "Medium",
    progress: 0,
    createdAt: "2025-04-06",
    updatedAt: "2025-04-06",
    needsApproval: true,
    approvals: []
  },
  {
    id: "task-7",
    title: "Initial Budget Planning",
    description: "Develop detailed budget for startup costs and first year operations",
    category: "Finance",
    assignee: "2",
    dueDate: "2025-04-20",
    status: "In Progress",
    priority: "High",
    progress: 75,
    createdAt: "2025-04-01",
    updatedAt: "2025-04-07",
    needsApproval: false,
    approvals: []
  },
  {
    id: "task-8",
    title: "Negotiate Lease Terms",
    description: "Once location is selected, negotiate favorable lease terms",
    category: "Site",
    assignee: "4",
    dueDate: "2025-06-15",
    status: "Todo",
    priority: "Medium",
    progress: 0,
    createdAt: "2025-04-07",
    updatedAt: "2025-04-07",
    needsApproval: true,
    approvals: []
  },
  {
    id: "task-9",
    title: "Hire Head Chef",
    description: "Recruit experienced head chef with knowledge of New Zealand cuisine",
    category: "Staffing",
    assignee: "5",
    dueDate: "2025-06-30",
    status: "Todo",
    priority: "High",
    progress: 0,
    createdAt: "2025-04-08",
    updatedAt: "2025-04-08",
    needsApproval: true,
    approvals: []
  },
  {
    id: "task-10",
    title: "Set Up Accounting System",
    description: "Implement accounting software and processes",
    category: "Finance",
    assignee: "2",
    dueDate: "2025-05-01",
    status: "Under Review",
    priority: "Medium",
    progress: 90,
    createdAt: "2025-04-02",
    updatedAt: "2025-04-09",
    needsApproval: false,
    approvals: []
  }
];

// Sample conversations
export const conversations: Conversation[] = [
  {
    id: "conv-1",
    participants: ["1", "2"],
    isGroup: false,
    messages: [
      {
        id: "msg-1",
        senderId: "1",
        content: "Hi, have you had a chance to look at the budget proposal?",
        type: "text",
        timestamp: "2025-04-08T13:45:00Z",
        read: true,
      },
      {
        id: "msg-2",
        senderId: "2",
        content: "Yes, I reviewed it yesterday. Let's discuss the equipment costs in our next meeting.",
        type: "text",
        timestamp: "2025-04-08T14:20:00Z",
        read: true,
      },
      {
        id: "msg-3",
        senderId: "1",
        content: "Sounds good. I think we might need to allocate more for kitchen equipment.",
        type: "text",
        timestamp: "2025-04-08T14:25:00Z",
        read: false,
      }
    ],
    lastMessageAt: "2025-04-08T14:25:00Z",
  },
  {
    id: "conv-2",
    participants: ["2", "3", "4"],
    isGroup: true,
    name: "Legal & Site Team",
    messages: [
      {
        id: "msg-4",
        senderId: "3",
        content: "I've drafted the initial lease agreement for the Wellington location.",
        type: "text",
        timestamp: "2025-04-07T10:15:00Z",
        read: true,
      },
      {
        id: "msg-5",
        senderId: "4",
        content: "Thanks, I'll review it today. The landlord is eager to move forward.",
        type: "text",
        timestamp: "2025-04-07T11:30:00Z",
        read: true,
      },
      {
        id: "msg-6",
        senderId: "2",
        content: "We should discuss the payment terms before finalizing. I have some concerns about the deposit amount.",
        type: "text",
        timestamp: "2025-04-07T13:45:00Z",
        read: false,
      }
    ],
    lastMessageAt: "2025-04-07T13:45:00Z",
  },
  {
    id: "conv-3",
    participants: ["1", "2", "3", "4", "5"],
    isGroup: true,
    name: "All Partners",
    messages: [
      {
        id: "msg-7",
        senderId: "1",
        content: "Team meeting tomorrow at 10AM to discuss progress on all fronts.",
        type: "text",
        timestamp: "2025-04-09T08:00:00Z",
        read: true,
      },
      {
        id: "msg-8",
        senderId: "5",
        content: "I'll prepare an update on operations and menu development.",
        type: "text",
        timestamp: "2025-04-09T08:15:00Z",
        read: true,
      },
      {
        id: "msg-9",
        senderId: "3",
        content: "I'll bring the latest on our licensing applications and legal structure.",
        type: "text",
        timestamp: "2025-04-09T08:30:00Z",
        read: false,
      }
    ],
    lastMessageAt: "2025-04-09T08:30:00Z",
  }
];
