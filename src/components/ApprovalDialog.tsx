
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Task, TeamMember, Approval } from "@/lib/types";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ApprovalDialogProps = {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers: TeamMember[];
  currentUserId: string;
  onApprove: (task: Task, approval: Approval) => void;
  onReject: (task: Task, approval: Approval) => void;
};

const ApprovalDialog = ({
  task,
  open,
  onOpenChange,
  teamMembers,
  currentUserId,
  onApprove,
  onReject,
}: ApprovalDialogProps) => {
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  
  const currentUser = teamMembers.find(member => member.id === currentUserId);
  const existingApproval = task.approvals.find(a => a.partnerId === currentUserId);
  
  const handleApprove = () => {
    const approval: Approval = {
      partnerId: currentUserId,
      approved: true,
      timestamp: new Date().toISOString(),
      comment: comment.trim() || undefined,
    };
    
    onApprove(task, approval);
    toast({
      title: "Task approved",
      description: `You've approved "${task.title}"`,
    });
    setComment("");
    onOpenChange(false);
  };
  
  const handleReject = () => {
    const approval: Approval = {
      partnerId: currentUserId,
      approved: false,
      timestamp: new Date().toISOString(),
      comment: comment.trim() || undefined,
    };
    
    onReject(task, approval);
    toast({
      title: "Task rejected",
      description: `You've rejected "${task.title}"`,
    });
    setComment("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card/95 backdrop-blur-md border border-border/50">
        <AlertDialogHeader>
          <AlertDialogTitle>Approve Task</AlertDialogTitle>
          <AlertDialogDescription>
            Review and approve or reject this task: <strong>{task.title}</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="my-4 p-4 rounded-md bg-background/50 border border-border/30">
          <h3 className="font-medium mb-2">{task.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{task.description}</p>
          
          <div className="flex flex-col gap-1 text-sm mb-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Category:</span>
              <span className="font-medium">{task.category}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Priority:</span>
              <span className="font-medium">{task.priority}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Due Date:</span>
              <span className="font-medium">
                {new Date(task.dueDate).toLocaleDateString("en-NZ")}
              </span>
            </div>
          </div>
          
          {task.approvals.length > 0 && (
            <div className="mt-4 border-t border-border/30 pt-4">
              <h4 className="text-sm font-medium mb-2">Partner Approvals</h4>
              <div className="flex flex-col gap-2">
                {task.approvals.map((approval) => {
                  const partner = teamMembers.find((m) => m.id === approval.partnerId);
                  return (
                    <div key={approval.partnerId} className="flex items-center gap-2 p-2 rounded-md bg-background/30">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={partner?.avatar} />
                        <AvatarFallback className={`text-xs ${approval.approved ? "bg-kiwi-100 text-kiwi-800 dark:bg-kiwi-800 dark:text-kiwi-200" : "bg-destructive/20 text-destructive"}`}>
                          {partner?.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm flex-1">{partner?.name}</span>
                      {approval.approved ? (
                        <CheckCircle className="h-4 w-4 text-kiwi-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        <Textarea
          placeholder="Add an optional comment about your decision..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="my-2 bg-background/70"
        />
        
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel className="bg-background/70 hover:bg-background">Cancel</AlertDialogCancel>
          {existingApproval ? (
            <Button
              variant={existingApproval.approved ? "outline" : "default"}
              className={`${existingApproval.approved ? "border-destructive text-destructive hover:bg-destructive/10" : "bg-kiwi-600 hover:bg-kiwi-700"}`}
              onClick={existingApproval.approved ? handleReject : handleApprove}
            >
              {existingApproval.approved ? (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Change to Reject
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Change to Approve
                </>
              )}
            </Button>
          ) : (
            <>
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={handleReject}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button className="bg-kiwi-600 hover:bg-kiwi-700" onClick={handleApprove}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ApprovalDialog;
