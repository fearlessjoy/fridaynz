import React, { useState } from "react";
import { TeamMember, UserRole } from "@/lib/types";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db, registerUser, updateUserProfile, deleteUserAccount } from "@/lib/firebase";

interface UserManagementProps {
  teamMembers: TeamMember[];
  onAddUser?: (user: TeamMember) => void;
  onUpdateUser?: (user: TeamMember) => void;
  onDeleteUser?: (userId: string) => void;
  currentUserRole: UserRole;
}

const UserManagement: React.FC<UserManagementProps> = ({ 
  teamMembers, 
  onAddUser, 
  onUpdateUser, 
  onDeleteUser,
  currentUserRole 
}) => {
  const { toast } = useToast();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [newUser, setNewUser] = useState<Partial<TeamMember & { password: string }>>({
    name: "",
    role: "",
    email: "",
    password: "",
    userRole: "staff"
  });
  const [editUser, setEditUser] = useState<TeamMember & { password?: string } | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.name || !newUser.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Register the user in Firebase Auth
      const userCredential = await registerUser(newUser.email, newUser.password);
      const userId = userCredential.user.uid;

      // Create the team member object with the Firebase user ID
      const teamMember: TeamMember = {
        id: userId,
        name: newUser.name,
        email: newUser.email,
        role: 'Staff Member',
        userRole: 'staff'
      };

      // Add the user to the team
      onAddUser?.(teamMember);

      // Reset the form and close dialog
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: ''
      });
      setIsAddUserOpen(false);

      toast({
        title: "Success",
        description: "User added successfully"
      });
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add user",
        variant: "destructive"
      });
    }
  };

  const handleEditClick = (member: TeamMember) => {
    setEditUser({...member, password: ""});
    setIsEditUserOpen(true);
  };

  const handleDeleteClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsDeleteUserOpen(true);
  };

  const handleUpdateUser = async (updatedMember: TeamMember) => {
    try {
      // Extract password from the updatedMember object
      const { password, ...memberData } = updatedMember;
      
      // Update user profile in Firestore
      const updatedProfile = await updateUserProfile(updatedMember.id, {
        name: updatedMember.name,
        role: updatedMember.role,
        email: updatedMember.email,
        userRole: updatedMember.userRole,
        avatar: updatedMember.avatar
      });
      
      // Update local state
      onUpdateUser({
        ...memberData,
        id: updatedProfile.id
      });
      
      toast({
        title: "Success",
        description: `${updatedMember.name}'s information has been updated.`
      });
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user account",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) return;

    try {
      const auth = getAuth();
      const isCurrentUser = auth.currentUser?.uid === selectedUserId;

      // Delete user account using the helper function
      await deleteUserAccount(selectedUserId);

      toast({
        title: "User Deleted",
        description: isCurrentUser 
          ? "Your account has been completely deleted." 
          : "User has been removed from the team. Their login credentials will be invalidated.",
        variant: "default",
      });

      setIsDeleteUserOpen(false);
      onDeleteUser?.(selectedUserId);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Email validation helper
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Only admins can add new users or modify roles
  const canManageUsers = currentUserRole === 'admin';

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Team Members</h2>
        {canManageUsers && (
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-1 h-8">
                <UserPlus size={14} />
                <span className="hidden sm:inline">Add User</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account with login credentials.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-3">
                <div className="grid sm:grid-cols-4 items-center gap-2">
                  <Label htmlFor="name" className="sm:text-right text-left">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="sm:col-span-3"
                  />
                </div>
                <div className="grid sm:grid-cols-4 items-center gap-2">
                  <Label htmlFor="email" className="sm:text-right text-left">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="sm:col-span-3"
                    placeholder="user@example.com"
                  />
                </div>
                <div className="grid sm:grid-cols-4 items-center gap-2">
                  <Label htmlFor="password" className="sm:text-right text-left">
                    Password
                  </Label>
                  <div className="relative sm:col-span-3">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="pr-10"
                      placeholder="Min. 6 characters"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute inset-y-0 right-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-4 items-center gap-2">
                  <Label htmlFor="role" className="sm:text-right text-left">
                    Position
                  </Label>
                  <Input
                    id="role"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="sm:col-span-3"
                    placeholder="e.g., Executive Chef, Front Manager"
                  />
                </div>
                <div className="grid sm:grid-cols-4 items-center gap-2">
                  <Label htmlFor="userRole" className="sm:text-right text-left">
                    Access Level
                  </Label>
                  <Select 
                    value={newUser.userRole} 
                    onValueChange={(value: UserRole) => setNewUser({ ...newUser, userRole: value })}
                  >
                    <SelectTrigger className="sm:col-span-3">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser}>Add User</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby="edit-user-description">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details, credentials, and access level.
            </DialogDescription>
          </DialogHeader>
          <div id="edit-user-description" className="sr-only">
            Edit user information including name, email, and role
          </div>
          {editUser && (
            <div className="grid gap-4 py-3">
              <div className="grid sm:grid-cols-4 items-center gap-2">
                <Label htmlFor="edit-name" className="sm:text-right text-left">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  className="sm:col-span-3"
                />
              </div>
              <div className="grid sm:grid-cols-4 items-center gap-2">
                <Label htmlFor="edit-email" className="sm:text-right text-left">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editUser.email || ''}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  className="sm:col-span-3"
                />
              </div>
              <div className="grid sm:grid-cols-4 items-center gap-2">
                <Label htmlFor="edit-password" className="sm:text-right text-left">
                  Password
                </Label>
                <div className="relative sm:col-span-3">
                  <Input
                    id="edit-password"
                    type={showEditPassword ? "text" : "password"}
                    value={editUser.password || ''}
                    onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                    className="pr-10"
                    placeholder="Leave blank to keep current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0 h-full"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                  >
                    {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
              </div>
              <div className="grid sm:grid-cols-4 items-center gap-2">
                <Label htmlFor="edit-role" className="sm:text-right text-left">
                  Position
                </Label>
                <Input
                  id="edit-role"
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                  className="sm:col-span-3"
                />
              </div>
              <div className="grid sm:grid-cols-4 items-center gap-2">
                <Label htmlFor="edit-userRole" className="sm:text-right text-left">
                  Access Level
                </Label>
                <Select 
                  value={editUser.userRole} 
                  onValueChange={(value: UserRole) => setEditUser({ ...editUser, userRole: value })}
                >
                  <SelectTrigger className="sm:col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleUpdateUser(editUser as TeamMember)}>Update User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteUserOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Delete User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User List - Card Format on Mobile, Table on Desktop */}
      <div className="bg-card rounded-lg border shadow-sm">
        {/* Desktop Table View - Hidden on Mobile */}
        <div className="hidden md:block relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-10 px-4 text-left align-middle font-medium">Name</th>
                <th className="h-10 px-4 text-left align-middle font-medium">Email</th>
                <th className="h-10 px-4 text-left align-middle font-medium">Position</th>
                <th className="h-10 px-4 text-left align-middle font-medium">Access Level</th>
                {canManageUsers && <th className="h-10 px-4 text-left align-middle font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <td className="p-3 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs">{member.name.charAt(0)}</span>
                        )}
                      </div>
                      <span>{member.name}</span>
                    </div>
                  </td>
                  <td className="p-3 align-middle">{member.email || '-'}</td>
                  <td className="p-3 align-middle">{member.role}</td>
                  <td className="p-3 align-middle">
                    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      member.userRole === 'admin' 
                        ? 'border-green-500 text-green-700 bg-green-50 dark:border-green-500 dark:text-green-200 dark:bg-green-900/20'
                        : member.userRole === 'manager'
                        ? 'border-blue-500 text-blue-700 bg-blue-50 dark:border-blue-500 dark:text-blue-200 dark:bg-blue-900/20'
                        : 'border-gray-500 text-gray-700 bg-gray-50 dark:border-gray-500 dark:text-gray-200 dark:bg-gray-900/20'
                    }`}>
                      {member.userRole.charAt(0).toUpperCase() + member.userRole.slice(1)}
                    </div>
                  </td>
                  {canManageUsers && (
                    <td className="p-3 align-middle">
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => handleEditClick(member)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteClick(member.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Visible Only on Mobile */}
        <div className="md:hidden">
          <div className="divide-y">
            {teamMembers.map((member) => (
              <div key={member.id} className="p-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs">{member.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{member.name}</div>
                      <div className="text-xs text-gray-500">{member.role}</div>
                    </div>
                  </div>
                  
                  {canManageUsers && (
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7" 
                        onClick={() => handleEditClick(member)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDeleteClick(member.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Email: </span>
                    <span>{member.email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Access: </span>
                    <div className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold ${
                      member.userRole === 'admin' 
                        ? 'border-green-500 text-green-700 bg-green-50 dark:border-green-500 dark:text-green-200 dark:bg-green-900/20'
                        : member.userRole === 'manager'
                        ? 'border-blue-500 text-blue-700 bg-blue-50 dark:border-blue-500 dark:text-blue-200 dark:bg-blue-900/20'
                        : 'border-gray-500 text-gray-700 bg-gray-50 dark:border-gray-500 dark:text-gray-200 dark:bg-gray-900/20'
                    }`}>
                      {member.userRole.charAt(0).toUpperCase() + member.userRole.slice(1)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
