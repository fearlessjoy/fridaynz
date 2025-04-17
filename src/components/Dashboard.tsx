import React, { useEffect, useState } from "react";
import TaskBoard from "./TaskBoard";
import UserManagement from "./UserManagement";
import TaskCreation from "./TaskCreation";
import MessagingPanel from "./MessagingPanel";
import { Link } from "react-router-dom";
import { MessageCircle, BarChart3, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppData } from "@/hooks/useAppData";
import { useToast } from "@/hooks/use-toast";
import { TeamMember, UserRole } from "@/lib/types";
import { 
  registerUser, 
  createUserProfile, 
  updateUserProfile, 
  getCurrentUser, 
  ensureAdminRole,
  deleteUserAccount,
  checkUserExists 
} from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { doc, getFirestore, setDoc } from "firebase/firestore";

const Dashboard = () => {
  const { toast } = useToast();
  const { currentUser, userData, loadUserProfile } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>("staff");
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Load user profile when component mounts
  useEffect(() => {
    let isMounted = true;
    
    if (currentUser && !userData?.name && !loadingProfile) {
      setLoadingProfile(true);
      
      loadUserProfile().finally(() => {
        if (isMounted) {
          setLoadingProfile(false);
        }
      });
    }
    
    return () => {
      isMounted = false;
    };
  }, [currentUser, userData, loadUserProfile]);

  // Use app data context to access and update data
  const { 
    teamMembers, 
    tasks,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember, 
    addTask, 
    updateTask 
  } = useAppData();
  
  // Special function to set specific user as admin (for initial setup)
  const ensureUserIsAdmin = async () => {
    if (!currentUser) return;
    
    try {
      await ensureAdminRole(currentUser.uid);
      await loadUserProfile(); // Reload user profile to get updated role
      
      toast({
        title: "Admin Access Granted",
        description: "You now have administrator access to the system.",
      });
      
      setUserRole("admin");
    } catch (error: any) {
      console.error("Error setting admin role:", error);
      toast({
        title: "Error",
        description: "Failed to set admin role. " + error.message,
        variant: "destructive"
      });
    }
  };

  // Set user role when userData changes
  useEffect(() => {
    if (userData?.userRole) {
      setUserRole(userData.userRole as UserRole);
    }
  }, [userData]);
  
  // Calculate dashboard metrics
  const todoCount = tasks.filter(task => task.status === "Todo").length;
  const inProgressCount = tasks.filter(task => task.status === "In Progress").length;
  const pendingApprovalCount = tasks.filter(task => 
    task.needsApproval && 
    (task.approvals?.filter(a => a.approved).length || 0) < teamMembers.length
  ).length;
  
  // Handle adding a new team member with Firebase Auth
  const handleAddTeamMember = async (teamMember: TeamMember) => {
    try {
      // Extract password from the teamMember object
      const { password, ...memberData } = teamMember;
      
      if (!password) {
        toast({
          title: "Error",
          description: "Password is required to create a user account",
          variant: "destructive"
        });
        return;
      }

      // Check if user already exists
      const exists = await checkUserExists(teamMember.email);
      if (exists) {
        toast({
          title: "Error",
          description: "A user with this email already exists",
          variant: "destructive"
        });
        return;
      }
      
      // Register the user with Firebase Auth
      const { user } = await registerUser(teamMember.email, password);
      
      // Create a user profile in Firestore with the specified role
      await createUserProfile(user.uid, {
        name: teamMember.name,
        role: teamMember.role,
        email: teamMember.email,
        userRole: teamMember.userRole || "staff", // Ensure we use the selected role
        avatar: teamMember.avatar || "/placeholder.svg"
      });
      
      // Add user to local state with Firebase UID
      const newTeamMember: TeamMember = {
        ...memberData,
        id: user.uid
      };
      
      // Add the team member to the app state
      addTeamMember(newTeamMember);
      
      toast({
        title: "User Created",
        description: `${teamMember.name} has been added as ${teamMember.userRole}`,
      });
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Error Creating User",
        description: error.message || "Failed to create user account",
        variant: "destructive"
      });
    }
  };
  
  // Handle team member updates
  const handleUpdateTeamMember = async (updatedMember: TeamMember) => {
    try {
      // Extract password from the updatedMember object
      const { password, ...memberData } = updatedMember;
      
      // Update user profile in Firestore
      await updateUserProfile(updatedMember.id, {
        name: updatedMember.name,
        role: updatedMember.role,
        email: updatedMember.email,
        userRole: updatedMember.userRole
      });
      
      // Update local state
      updateTeamMember(memberData);
      
      toast({
        title: "User Updated",
        description: `${updatedMember.name}'s information has been updated.`
      });
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error Updating User",
        description: error.message || "Failed to update user account",
        variant: "destructive"
      });
    }
  };
  
  // Handle team member deletion
  const handleDeleteTeamMember = async (userId: string) => {
    const userToDelete = teamMembers.find(member => member.id === userId);
    if (!userToDelete) return;
    
    try {
      // Delete user from Firebase
      await deleteUserAccount(userId);
      
      // Remove from local state
      deleteTeamMember(userId);
      
      toast({
        title: "User Removed",
        description: `${userToDelete.name} has been removed from the team. Note: They will need to log in and delete their own authentication account.`,
      });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      
      // If the error is about auth deletion, still remove from team but show info message
      if (error.message.includes("users must delete their own authentication accounts")) {
        // Remove from local state even though auth account remains
        deleteTeamMember(userId);
        
        toast({
          title: "User Partially Removed",
          description: `${userToDelete.name} has been removed from the team. Please have them log in and delete their own account for complete removal.`,
        });
      } else {
        toast({
          title: "Error Removing User",
          description: error.message || "Failed to remove user from team",
          variant: "destructive"
        });
      }
    }
  };
  
  // Check if user is admin
  const isAdmin = userData?.userRole === "admin";
  
  // Get user display name once
  const userDisplayName = userData?.name || 
    currentUser?.displayName || 
    (currentUser?.email ? currentUser.email.split('@')[0] : 'User');
  
  return (
    <div className="sm:space-y-2 sm:p-3 p-2 space-y-1 w-full max-w-full">
      {/* Welcome Header */}
      <div className="flex items-center justify-between bg-card p-2 sm:p-3 rounded-lg shadow-sm">
        <div>
          <h1 className="text-lg font-semibold">
            Welcome, {userDisplayName}
          </h1>
          <p className="text-xs text-muted-foreground">Role: {userRole.charAt(0).toUpperCase() + userRole.slice(1)}</p>
        </div>
      </div>

      <Tabs defaultValue="tasks" className="sm:space-y-2 space-y-1">
        <TabsList className="h-8 w-full">
          <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
          <TabsTrigger value="messages" className="text-xs">Messages</TabsTrigger>
          {userRole === "admin" && <TabsTrigger value="team" className="text-xs">Team Management</TabsTrigger>}
        </TabsList>

        <TabsContent value="tasks" className="sm:space-y-2 space-y-1">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-2 sm:gap-2 gap-1">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-2 sm:py-2 sm:px-3">
                <CardTitle className="text-xs font-medium">
                  Todo Tasks
                </CardTitle>
                <BarChart3 className="h-3 w-3 text-muted-foreground" />
              </CardHeader>
              <CardContent className="py-1.5 px-2 sm:py-2 sm:px-3">
                <div className="text-xl font-bold">{todoCount}</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-2 sm:py-2 sm:px-3">
                <CardTitle className="text-xs font-medium">
                  In Progress
                </CardTitle>
                <Calendar className="h-3 w-3 text-muted-foreground" />
              </CardHeader>
              <CardContent className="py-1.5 px-2 sm:py-2 sm:px-3">
                <div className="text-xl font-bold">{inProgressCount}</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-2 sm:py-2 sm:px-3">
                <CardTitle className="text-xs font-medium">
                  Pending Approvals
                </CardTitle>
                <Users className="h-3 w-3 text-muted-foreground" />
              </CardHeader>
              <CardContent className="py-1.5 px-2 sm:py-2 sm:px-3">
                <div className="text-xl font-bold">{pendingApprovalCount}</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-2 sm:py-2 sm:px-3">
                <CardTitle className="text-xs font-medium">
                  Team Members
                </CardTitle>
                <Users className="h-3 w-3 text-muted-foreground" />
              </CardHeader>
              <CardContent className="py-1.5 px-2 sm:py-2 sm:px-3">
                <div className="text-xl font-bold">{teamMembers.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Task Board */}
          <TaskBoard
            tasks={tasks}
            teamMembers={teamMembers}
            onTaskUpdate={updateTask}
            userRole={userRole}
            currentUserId={currentUser?.uid}
          />
        </TabsContent>

        <TabsContent value="messages" className="sm:space-y-2 space-y-1">
          <div className="border rounded-lg h-[calc(100vh-9.5rem)]">
            <MessagingPanel 
              teamMembers={teamMembers} 
              currentUserId={currentUser?.uid || ""} 
            />
          </div>
        </TabsContent>

        {/* Make team management visible only to admin users */}
        {userRole === "admin" && (
          <TabsContent value="team">
            <UserManagement
              teamMembers={teamMembers}
              onAddUser={handleAddTeamMember}
              onUpdateUser={handleUpdateTeamMember}
              onDeleteUser={handleDeleteTeamMember}
              currentUserRole="admin"
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Dashboard;
