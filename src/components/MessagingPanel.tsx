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
import { Send, Plus, Loader2, MessageCircle, Trash2, MoreVertical } from "lucide-react";
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

  const formatMessageTime = (timestamp: string): string => {
    if (!timestamp) return "";
    
    try {
      const date = new Date(timestamp);
      // Check if date is valid before formatting
      if (isNaN(date.getTime())) {
        return "";
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error("Error formatting message time:", error);
      return "";
    }
  };

  const formatConversationTime = (timestamp: string): string => {
    if (!timestamp) return "";
    
    try {
      const date = new Date(timestamp);
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
    const sender = getTeamMember(message.senderId);
    const isCurrentUser = message.senderId === currentUserId;
    
    return (
      <div
        key={message.id}
        className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} mb-4`}
      >
        {!isCurrentUser && (
          <Avatar className="h-8 w-8 mr-2">
            <AvatarImage src={sender?.avatar} alt={sender?.name} />
            <AvatarFallback>{sender ? getInitials(sender.name) : "?"}</AvatarFallback>
          </Avatar>
        )}
        <div
          className={`px-4 py-2 rounded-lg max-w-[70%] ${
            isCurrentUser
              ? "bg-kiwi-600 text-white"
              : "bg-gray-100 dark:bg-gray-800"
          }`}
        >
          {!isCurrentUser && activeConversation?.isGroup && (
            <div className="text-xs font-medium mb-1 text-kiwi-600 dark:text-kiwi-400">
              {sender?.name}
            </div>
          )}
          <p className="text-sm">{message.content}</p>
          <div
            className={`text-xs mt-1 ${
              isCurrentUser ? "text-kiwi-100" : "text-gray-500"
            }`}
          >
            {formatMessageTime(message.timestamp)}
          </div>
        </div>
        {isCurrentUser && (
          <Avatar className="h-8 w-8 ml-2">
            <AvatarImage src={sender?.avatar} alt={sender?.name} />
            <AvatarFallback>{sender ? getInitials(sender.name) : "?"}</AvatarFallback>
          </Avatar>
        )}
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
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-800">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h2 className="font-semibold text-lg">Messages</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Plus className="h-5 w-5" />
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
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
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
        <ScrollArea className="h-[calc(100%-4rem)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-kiwi-600" />
              <span className="ml-2">Loading conversations...</span>
            </div>
          ) : (
            <>
              {/* Quick contacts section - always show at top */}
              <div className="p-3 border-b border-gray-200 dark:border-gray-800">
                <h3 className="font-medium text-sm mb-2">Start a conversation</h3>
                <div className="grid grid-cols-2 gap-2">
                  {teamMembers
                    .filter(member => member.id !== currentUserId)
                    .map(member => (
                      <div
                        key={member.id}
                        className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md cursor-pointer border"
                        onClick={() => handleCreateDirectMessage(member.id)}
                      >
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                          <div className="text-sm font-medium truncate">{member.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{member.role}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p>No conversations yet.</p>
                  <p className="text-sm mt-2">Create a group or message a team member to get started.</p>
                </div>
              ) : (
                <>
                  <div className="p-3 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="font-medium text-sm mb-2">Recent conversations</h3>
                  </div>
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                        activeConversation?.id === conversation.id ? "bg-gray-100 dark:bg-gray-800" : ""
                      }`}
                      onClick={() => setActiveConversation(conversation)}
                    >
                      <div className="flex items-center">
                        {conversation.isGroup ? (
                          <div className="relative w-12 h-12 flex-shrink-0">
                            <Avatar className="absolute top-0 left-0 h-8 w-8">
                              <AvatarImage src={getTeamMember(conversation.participants[0])?.avatar} />
                              <AvatarFallback>
                                {getTeamMember(conversation.participants[0]) 
                                  ? getInitials(getTeamMember(conversation.participants[0])!.name) 
                                  : "?"}
                              </AvatarFallback>
                            </Avatar>
                            <Avatar className="absolute bottom-0 right-0 h-8 w-8">
                              <AvatarImage src={getTeamMember(conversation.participants[1])?.avatar} />
                              <AvatarFallback>
                                {getTeamMember(conversation.participants[1]) 
                                  ? getInitials(getTeamMember(conversation.participants[1])!.name) 
                                  : "?"}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        ) : (
                          <Avatar className="h-12 w-12 mr-3 flex-shrink-0">
                            <AvatarImage 
                              src={getTeamMember(conversation.participants.find(id => id !== currentUserId) || "")?.avatar} 
                            />
                            <AvatarFallback>
                              {getTeamMember(conversation.participants.find(id => id !== currentUserId) || "") 
                                ? getInitials(getTeamMember(conversation.participants.find(id => id !== currentUserId) || "")!.name) 
                                : "?"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="ml-3 flex-1 overflow-hidden">
                          <div className="flex justify-between">
                            <div className="font-medium truncate">
                              {getConversationName(conversation)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatConversationTime(conversation.lastMessageAt)}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {getLatestMessage(conversation)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollArea>
      </div>
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{getConversationName(activeConversation)}</h2>
                <div className="text-xs text-gray-500">
                  {activeConversation.isGroup 
                    ? `${activeConversation.participants.length} members` 
                    : `${getTeamMember(activeConversation.participants.find(id => id !== currentUserId) || "")?.role || ""}`
                  }
                </div>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all messages?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all messages in this conversation. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleClearMessages}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Clear Messages
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {activeConversation.messages && activeConversation.messages.length > 0 ? (
                  activeConversation.messages.map((message) => {
                    // Skip rendering invalid messages
                    if (!message || !message.id || !message.content) {
                      return null;
                    }
                    return renderMessage(message);
                  })
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex space-x-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isSending}>
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-center p-4">
            <div>
              <MessageCircle className="h-12 w-12 text-kiwi-200 mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">Your Messages</h3>
              <p className="text-muted-foreground">
                Select a conversation or start a new one to begin messaging.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingPanel;
