import { Task, TeamMember } from './types';
import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

export const sendTaskUpdateEmail = async (
  task: Task,
  updatedBy: TeamMember,
  recipients: TeamMember[],
  updateType: 'created' | 'updated' | 'approval_needed' | 'deleted'
) => {
  try {
    const recipientEmails = recipients.map(r => r.email).filter(Boolean);
    if (!recipientEmails.length) return;

    const subject = getEmailSubject(task, updateType);
    const content = getEmailContent(task, updatedBy, updateType);

    // Instead of using a local server, store the notification in Firestore
    // This will trigger a Cloud Function that will handle the email sending
    await addDoc(collection(db, 'mail'), {
      to: recipientEmails,
      message: {
        subject: subject,
        html: content
      },
      createdAt: new Date().toISOString()
    });

    console.log('Email notification queued successfully');
  } catch (error) {
    console.warn('Error queueing email notification:', error);
    // Don't throw the error up to the caller
  }
};

const getEmailSubject = (task: Task, updateType: string): string => {
  switch (updateType) {
    case 'created':
      return `New Task Created: ${task.title}`;
    case 'updated':
      return `Task Updated: ${task.title}`;
    case 'approval_needed':
      return `Approval Required: ${task.title}`;
    case 'deleted':
      return `Task Deleted: ${task.title}`;
    default:
      return `Task Notification: ${task.title}`;
  }
};

const getEmailContent = (task: Task, updatedBy: TeamMember, updateType: string): string => {
  const baseUrl = window.location.origin;
  const taskUrl = `${baseUrl}/tasks/${task.id}`;
  
  const content = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">${getEmailSubject(task, updateType)}</h2>
      <p>Hello,</p>
      <p>${getEmailBody(task, updatedBy, updateType)}</p>
      <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
        <h3 style="margin-top: 0;">Task Details:</h3>
        <p><strong>Title:</strong> ${task.title}</p>
        <p><strong>Status:</strong> ${task.status}</p>
        <p><strong>Priority:</strong> ${task.priority}</p>
        <p><strong>Due Date:</strong> ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}</p>
        <p><strong>Description:</strong> ${task.description || 'No description provided'}</p>
      </div>
      <p>
        <a href="${taskUrl}" 
           style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          View Task
        </a>
      </p>
      <p style="color: #666; font-size: 0.9em;">
        This is an automated notification. Please do not reply to this email.
      </p>
    </div>
  `;

  return content;
};

const getEmailBody = (task: Task, updatedBy: TeamMember, updateType: string): string => {
  switch (updateType) {
    case 'created':
      return `${updatedBy.name} has created a new task that requires your attention.`;
    case 'updated':
      return `${updatedBy.name} has updated the task "${task.title}".`;
    case 'approval_needed':
      return `${updatedBy.name} has requested your approval for the task "${task.title}".`;
    case 'deleted':
      return `${updatedBy.name} has deleted the task "${task.title}".`;
    default:
      return `There has been an update to the task "${task.title}".`;
  }
}; 