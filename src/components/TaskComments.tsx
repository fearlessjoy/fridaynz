import React, { useState, useRef, useEffect } from 'react';
import { Comment, TeamMember, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, arrayUnion, getFirestore, getDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { AtSign, Send, Trash2 } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

interface TaskCommentsProps {
  taskId: string;
  comments: Comment[];
  onCommentAdded: (taskId: string, commentText: string) => void;
  teamMembers: TeamMember[];
  userRole?: string;
  onDeleteComment?: (taskId: string, commentId: string) => Promise<void>;
}

interface MentionData {
  id: string;
  name: string;
  trigger: string;
  index: number;
}

const TaskComments: React.FC<TaskCommentsProps> = ({ taskId, comments, onCommentAdded, teamMembers, userRole, onDeleteComment }) => {
  const [newComment, setNewComment] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { currentUser, userData } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // For comment deletion
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    setNewComment(value);
    setCursorPosition(position);

    // Check for @ symbol
    const lastAtSymbol = value.lastIndexOf('@', position);
    if (lastAtSymbol !== -1 && lastAtSymbol < position) {
      const query = value.slice(lastAtSymbol + 1, position);
      setMentionQuery(query);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleMention = (member: TeamMember) => {
    const beforeMention = newComment.slice(0, newComment.lastIndexOf('@'));
    const afterMention = newComment.slice(cursorPosition);
    const newValue = `${beforeMention}@${member.name} ${afterMention}`;
    setNewComment(newValue);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser || !userData || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const db = getFirestore();
      const taskRef = doc(db, 'tasks', taskId);
      
      const taskDoc = await getDoc(taskRef);
      if (!taskDoc.exists()) {
        throw new Error('Task document does not exist');
      }
      
      const taskData = taskDoc.data();

      // Extract mentions from the comment
      const mentionRegex = /@([a-zA-Z\s]+)/g;
      const mentions = Array.from(newComment.matchAll(mentionRegex))
        .map(match => match[1].trim());
      
      // Find mentioned user IDs
      const mentionedUsers = teamMembers
        .filter(member => mentions.some(mention => 
          member.name.toLowerCase() === mention.toLowerCase()))
        .map(member => member.id);

      const comment: Comment = {
        id: uuidv4(),
        userId: currentUser.uid,
        userName: userData.name || 'Anonymous',
        content: newComment.trim(),
        timestamp: new Date().toISOString(),
        taskId: taskId,
        mentions: mentionedUsers
      };
      
      // Clear the input field immediately for better UX
      setNewComment('');
      
      // Update Firestore with explicit update instead of arrayUnion
      await updateDoc(taskRef, {
        comments: [...(taskData.comments || []), comment],
        updatedAt: serverTimestamp()
      });
      
      // Notify parent component about the comment addition
      // This allows the parent to update its state and UI
      console.log('Notifying parent of new comment');
      onCommentAdded(taskId, comment.content);
      
      toast({
        title: "Comment Added",
        description: "Your comment has been added to the task.",
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment. Please ensure the task exists.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCommentText = (text: string) => {
    return text.split(' ').map((word, index) => {
      if (word.startsWith('@')) {
        const userName = word.slice(1);
        if (teamMembers.some(member => member.name === userName)) {
          return (
            <span key={index} className="text-primary font-medium">
              {word}{' '}
            </span>
          );
        }
      }
      return word + ' ';
    });
  };

  const handleDeleteClick = (comment: Comment) => {
    setCommentToDelete(comment);
    setIsDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!commentToDelete || !onDeleteComment) {
      setIsDeleteDialogOpen(false);
      return;
    }
    
    try {
      console.log("Deleting comment:", commentToDelete.id);
      
      // Call the parent component's delete handler
      await onDeleteComment(taskId, commentToDelete.id);
      
      // Show a toast notification for the user
      toast({
        title: "Comment Deleted",
        description: "The comment has been successfully deleted.",
      });
      
      // Close the dialog
      setIsDeleteDialogOpen(false);
      setCommentToDelete(null);
      
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
      setCommentToDelete(null);
    }
  };

  return (
    <div className="flex flex-col w-full h-full">
      {/* Comments List - scrollable area */}
      <div className="flex-1 overflow-y-auto mb-4 pr-2">
        {comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No comments yet. Be the first to add one!
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="group flex gap-3 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarImage src={`https://ui-avatars.com/api/?name=${comment.userName}`} />
                  <AvatarFallback>{comment.userName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{comment.userName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    {(userRole === 'admin' || comment.userId === currentUser?.uid) && onDeleteComment && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 hover:bg-red-100/50"
                        onClick={() => handleDeleteClick(comment)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm mt-1 text-foreground/90 break-words">
                    {formatCommentText(comment.content)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comment Input - fixed at bottom */}
      <div className="flex-shrink-0 border-t pt-3">
        <div className="flex gap-2 items-start">
          <Avatar className="w-8 h-8 mt-1 shrink-0">
            <AvatarImage src={userData?.avatar || `https://ui-avatars.com/api/?name=${userData?.name || 'U'}`} />
            <AvatarFallback>{userData?.name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              ref={textareaRef}
              placeholder="Add a comment... (Use @ to mention team members)"
              value={newComment}
              onChange={handleTextareaChange}
              className="min-h-[80px] resize-none bg-muted/30"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
              disabled={isSubmitting}
            />
            {showMentions && (
              <div className="absolute z-10 w-64 mt-1 bg-popover border rounded-md shadow-lg">
                <Command>
                  <CommandInput placeholder="Search team members..." />
                  <CommandList>
                    <CommandEmpty>No team members found.</CommandEmpty>
                    <CommandGroup>
                      {teamMembers
                        .filter(member => 
                          member.name.toLowerCase().includes(mentionQuery.toLowerCase())
                        )
                        .map(member => (
                          <CommandItem
                            key={member.id}
                            onSelect={() => handleMention(member)}
                            className="cursor-pointer"
                          >
                            <Avatar className="w-6 h-6 mr-2">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {member.name}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            )}
            <div className="flex justify-between items-center">
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => setShowMentions(true)}
              >
                <AtSign className="w-4 h-4 mr-1" />
                Mention
              </Button>
              <Button 
                onClick={handleAddComment} 
                disabled={!newComment.trim() || isSubmitting}
                size="sm"
              >
                {isSubmitting ? (
                  'Adding...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Comment Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
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
    </div>
  );
};

export default TaskComments; 