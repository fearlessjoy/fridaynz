import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Conversation, Message, TeamMember, MessageType } from "@/lib/types";
import { Send, Plus, Loader2, MessageCircle, Trash2, MoreVertical, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc,
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  limit
} from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface MessagingPanelProps {
  teamMembers: TeamMember[];
  currentUserId: string;
}

const MessagingPanel: React.FC<MessagingPanelProps> = ({ teamMembers, currentUserId }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([currentUserId]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const db = getFirestore();
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (activeConversation?.messages?.length) {
      scrollToBottom();
    }
  }, [activeConversation?.messages?.length]);

  // Load conversations for the current user
  useEffect(() => {
    if (!currentUserId) return;
    
    let unsubscribe: () => void;
    
    const loadConversations = async () => {
      setIsLoading(true);
      
      try {
        // Subscribe to conversations where the current user is a participant
        const q = query(
          collection(db, "conversations"),
          where("participants", "array-contains", currentUserId),
          limit(100)
        );
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          const conversationData: Conversation[] = [];
          let currentActiveConvId = activeConversation?.id;
          
          snapshot.docs.forEach((doc) => {
            const data = doc.data() as Conversation;
            conversationData.push({
              ...data,
              id: doc.id,
              lastMessageAt: data.lastMessageAt || ""
            });
          });
          
          // Only sort if viewing all conversations - don't change the order if in a specific conversation
          if (!activeConversation) {
            // Sort conversations by most recent message
            conversationData.sort((a, b) => {
              const dateA = new Date(b.lastMessageAt || 0).getTime();
              const dateB = new Date(a.lastMessageAt || 0).getTime();
              return dateA - dateB;
            });
          }
          
          setConversations(conversationData);
          
          // If we have an active conversation, keep it selected by finding its updated version
          if (currentActiveConvId) {
            const updatedActiveConv = conversationData.find(conv => conv.id === currentActiveConvId);
            if (updatedActiveConv) {
              setActiveConversation(updatedActiveConv);
            }
          } 
          // Otherwise, set the first conversation as active if none is selected
          else if (conversationData.length > 0 && !activeConversation) {
            setActiveConversation(conversationData[0]);
          }
          
          // Always set loading to false when we get a response
          setIsLoading(false);
        }, (error) => {
          console.error("Error loading conversations:", error);
          toast({
            title: "Error",
            description: "Failed to load conversations. Please try again later.",
            variant: "destructive"
          });
          setIsLoading(false);
        });
      } catch (error) {
        console.error("Error setting up conversations listener:", error);
        toast({
          title: "Error",
          description: "Failed to set up messaging. Please refresh the page.",
          variant: "destructive"
        });
        setIsLoading(false);
      }
    };
    
    loadConversations();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUserId, db, toast, activeConversation?.id]);

  const getTeamMember = (id: string): TeamMember | undefined => {
    return teamMembers.find((member) => member.id === id);
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatMessageTime = (timestamp: string | any): string => {
    if (!timestamp) return "";
    
    try {
      // Handle Firebase Timestamp objects
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        const date = timestamp.toDate();
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      // Handle ISO strings
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "";
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error("Error formatting message time:", error);
      return "";
    }
  };

  const formatConversationTime = (timestamp: string | any): string => {
    if (!timestamp) return "";
    
    try {
      // Handle Firebase Timestamp objects
      let date: Date;
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else {
        date = new Date(timestamp);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "";
      }
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch (error) {
      console.error("Error formatting conversation time:", error);
      return "";
    }
  };

  const formatCommentWithMentions = (text: string): React.ReactNode => {
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !currentUserId || isSending) return;
    
    try {
      setIsSending(true);
      
      const messageData: Message = {
        id: uuidv4(),
        type: "COMMENT" as MessageType,
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        senderId: currentUserId,
        senderName: getTeamMember(currentUserId)?.name || "Unknown User",
        recipientId: activeConversation.id,
        read: false,
        taskId: ""
      };
      
      // Save current active conversation ID to maintain selection
      const activeConversationId = activeConversation.id;
      
      // Update local state immediately for better UX
      if (activeConversation) {
        const updatedConversation: Conversation = {
          ...activeConversation,
          messages: [...(activeConversation.messages || []), messageData],
          lastMessageAt: new Date().toISOString()
        };
        
        // Update the active conversation directly
        setActiveConversation(updatedConversation);
        
        // Update in the conversations list without re-ordering
        setConversations(prev => {
          // First create the updated list with the message added
          const updated = prev.map(conv => 
            conv.id === activeConversationId ? updatedConversation : conv
          );
          
          // Return the updated list without re-sorting
          return updated;
        });
      }
      
      // Clear the input field immediately for better UX
      setNewMessage("");
      
      // Add message to Firestore (happens in background)
      const conversationRef = doc(db, "conversations", activeConversationId);
      
      try {
        // Get the existing conversation
        const conversationDoc = await getDoc(conversationRef);
        if (!conversationDoc.exists()) {
          throw new Error("Conversation not found");
        }
        
        const conversationData = conversationDoc.data() as Conversation;
        
        // Update the conversation with the new message
        await updateDoc(conversationRef, {
          messages: [...(conversationData.messages || []), messageData],
          lastMessageAt: serverTimestamp()
        });
        
        console.log(`Message sent to conversation ${activeConversationId}: ${messageData.content}`);
      } catch (error) {
        console.error("Error updating Firestore:", error);
        // Continue - we've already updated local state so the user can see their message
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message to server. Message is visible locally but may not sync.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedMembers.length < 2 || isLoading) return;
    
    try {
      setIsLoading(true);
      
      // Create a new conversation in Firestore
      const conversationData: Omit<Conversation, "id"> = {
        participants: selectedMembers,
        isGroup: true,
        name: newGroupName.trim(),
        messages: [],
        lastMessageAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, "conversations"), conversationData);
      
      // Clear the form
      setNewGroupName("");
      setSelectedMembers([currentUserId]);
      
      toast({
        title: "Group Created",
        description: `Group "${newGroupName}" has been created.`
      });
      
      console.log(`Created new group ${newGroupName} with members: ${selectedMembers.join(", ")}`);
    } catch (error) {
      console.error("Error creating group:", error);
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDirectMessage = async (recipientId: string) => {
    if (recipientId === currentUserId || isSending) return;
    
    try {
      setIsSending(true);
      
      // Check if a conversation already exists between these users
      const existingConversation = conversations.find(conv => 
        !conv.isGroup && 
        conv.participants.includes(currentUserId) && 
        conv.participants.includes(recipientId)
      );
      
      if (existingConversation) {
        // Use the existing conversation
        setActiveConversation(existingConversation);
        setIsSending(false);
        return;
      }
      
      // Create a new conversation data
      const newConversationData: Omit<Conversation, "id"> = {
        participants: [currentUserId, recipientId],
        isGroup: false,
        messages: [],
        lastMessageAt: new Date().toISOString()
      };
      
      try {
        // Try to add to Firestore
        const docRef = await addDoc(collection(db, "conversations"), newConversationData);
        
        // Create the new conversation object with the Firestore ID
        const newConversation: Conversation = {
          ...newConversationData,
          id: docRef.id
        };
        
        // Update local state
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversation(newConversation);
        
        toast({
          title: "Conversation Started",
          description: `New conversation with ${getTeamMember(recipientId)?.name || "User"} started.`
        });
      } catch (error) {
        console.error("Error creating conversation in Firestore:", error);
        
        // Even if Firestore fails, create a local conversation for better UX
        const tempId = `temp-${uuidv4()}`;
        const localConversation: Conversation = {
          ...newConversationData,
          id: tempId
        };
        
        setConversations(prev => [localConversation, ...prev]);
        setActiveConversation(localConversation);
        
        toast({
          title: "Conversation Started Locally",
          description: `Started conversation with ${getTeamMember(recipientId)?.name || "User"} in offline mode.`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error creating direct message:", error);
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    // Cannot remove current user from selection
    if (memberId === currentUserId) return;
    
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  const getConversationName = (conversation: Conversation): string => {
    if (conversation.name) return conversation.name;
    
    if (!conversation.isGroup) {
      const otherParticipantId = conversation.participants.find(
        id => id !== currentUserId
      );
      const otherParticipant = otherParticipantId ? getTeamMember(otherParticipantId) : undefined;
      return otherParticipant ? otherParticipant.name : "Unknown User";
    }
    
    return conversation.participants
      .map(id => getTeamMember(id)?.name || "Unknown")
      .join(", ");
  };

  const renderMessage = (message: Message) => {
    if (!message || !message.id || !message.content) return null;
    
    const isCurrentUser = message.senderId === currentUserId;
    const senderName = message.senderName || getTeamMember(message.senderId)?.name || "Unknown User";
    
    return (
      <div
        key={message.id}
        className={cn(
          "flex mb-2",
          isCurrentUser ? "justify-end" : "justify-start"
        )}
      >
        <div
          className={cn(
            "max-w-[80%] px-3 py-2 rounded-lg",
            isCurrentUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          {!isCurrentUser && (
            <div className="font-medium text-xs mb-1">{senderName}</div>
          )}
          <div className="text-sm">{formatCommentWithMentions(message.content)}</div>
          <div className="text-xs mt-1 opacity-70">
            {formatMessageTime(message.timestamp)}
          </div>
        </div>
      </div>
    );
  };

  // Get latest message for conversation preview
  const getLatestMessage = (conversation: Conversation): string => {
    if (!conversation.messages || conversation.messages.length === 0) {
      return "No messages yet";
    }
    
    const latestMessage = conversation.messages[conversation.messages.length - 1];
    return latestMessage.content;
  };

  // Function to clear all messages from a conversation
  const handleClearMessages = async () => {
    if (!activeConversation || !currentUserId || isSending) return;
    
    try {
      setIsSending(true);
      
      // Create updated conversation object without messages
      const updatedConversation: Conversation = {
        ...activeConversation,
        messages: [],
        lastMessageAt: new Date().toISOString()
      };
      
      // Update Firestore
      const conversationRef = doc(db, "conversations", activeConversation.id);
      await updateDoc(conversationRef, {
        messages: [],
        lastMessageAt: serverTimestamp()
      });
      
      // Update local state
      setActiveConversation(updatedConversation);
      setConversations(prev => 
        prev.map(conv => 
          conv.id === activeConversation.id ? updatedConversation : conv
        )
      );
      
      toast({
        title: "Messages Cleared",
        description: "All messages in this conversation have been cleared."
      });
    } catch (error) {
      console.error("Error clearing messages:", error);
      toast({
        title: "Error",
        description: "Failed to clear messages. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
      {/* Conversation List - Hidden on Mobile When Conversation is Active */}
      <div className={cn(
        "border-r border-gray-200 dark:border-gray-800 transition-all",
        "md:w-1/3 w-full",
        activeConversation && "hidden md:block"
      )}>
        <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h2 className="font-semibold text-base">Messages</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby="group-member-description">
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
              </DialogHeader>
              <div id="group-member-description" className="sr-only">
                Select team members to add to the new messaging group
              </div>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Group Name</label>
                  <Input 
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter group name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Select Members</label>
                  <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                    {teamMembers.map((member) => (
                      <div 
                        key={member.id}
                        className={`flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer ${
                          member.id === currentUserId ? "opacity-50" : ""
                        }`}
                        onClick={() => toggleMemberSelection(member.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => {}}
                          className="mr-2"
                          disabled={member.id === currentUserId}
                        />
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{member.name}</div>
                          <div className="text-xs text-gray-500">{member.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Button 
                  onClick={handleCreateGroup} 
                  className="w-full" 
                  disabled={!newGroupName.trim() || selectedMembers.length < 2 || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Group"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Quick Contacts Section */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-xs font-medium text-gray-500 mb-2">Quick Contacts</h3>
          <div className="flex overflow-x-auto space-x-2 pb-2">
            {teamMembers.filter(member => member.id !== currentUserId).map(member => (
              <Button
                key={member.id}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 whitespace-nowrap py-1 px-2 h-8 text-xs"
                onClick={() => handleCreateDirectMessage(member.id)}
              >
                <Avatar className="h-4 w-4">
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback className="text-[8px]">{getInitials(member.name)}</AvatarFallback>
                </Avatar>
                <span>{member.name}</span>
              </Button>
            ))}
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100%-6rem)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-6 h-32">
              <MessageCircle className="h-10 w-10 mb-2 text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start a new conversation with your team members</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "flex items-center p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800",
                    activeConversation?.id === conversation.id && "bg-gray-100 dark:bg-gray-800"
                  )}
                  onClick={() => setActiveConversation(conversation)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium truncate">
                        {getConversationName(conversation)}
                      </h3>
                      <span className="text-[10px] text-gray-500 ml-2">
                        {formatConversationTime(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {getLatestMessage(conversation)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Active Conversation - Takes Full Width on Mobile */}
      {activeConversation ? (
        <div className="flex-1 flex flex-col max-w-full">
          <div className="border-b border-gray-200 dark:border-gray-800 p-3 flex justify-between items-center">
            {/* Back button shown only on mobile */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden h-8 w-8 mr-2"
                onClick={() => setActiveConversation(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="font-semibold">{getConversationName(activeConversation)}</h2>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Clear all messages">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all messages?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all messages in this conversation.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearMessages}>
                    Clear Messages
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Messages Area */}
          <ScrollArea className="h-[calc(100%-9rem)] p-4">
            <div className="flex flex-col">
              {activeConversation && activeConversation.messages && activeConversation.messages.length > 0 ? (
                activeConversation.messages
                  .filter(message => message && message.id && message.content)
                  .map(message => renderMessage(message))
              ) : (
                <div className="text-center py-8 text-sm text-gray-500">
                  No messages yet. Start the conversation!
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-end gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="min-h-[2.5rem] max-h-24 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              className="h-9 w-9 shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex md:flex-1 items-center justify-center p-8">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <h3 className="text-lg font-medium mb-2">No conversation selected</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select a conversation from the sidebar or start a new one
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagingPanel;
