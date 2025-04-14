import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import { Notification, NotificationType, Task, TeamMember } from './types';

export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  taskId?: string,
  link?: string
) => {
  try {
    const notification: Omit<Notification, 'id'> = {
      type,
      title,
      message,
      taskId,
      link,
      userId,
      createdAt: new Date().toISOString(),
      read: false,
    };

    await addDoc(collection(db, 'notifications'), notification);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export const createTaskNotification = async (
  task: Task,
  type: NotificationType,
  recipients: TeamMember[],
  actor: TeamMember,
  mentionedUserIds?: string[]
) => {
  try {
    const messages: Record<NotificationType, string> = {
      TASK_CREATED: `${actor.name} created a new task: ${task.title}`,
      TASK_UPDATED: `${actor.name} updated the task: ${task.title}`,
      TASK_COMMENT: `${actor.name} commented on task: ${task.title}`,
      TASK_APPROVAL_NEEDED: `${actor.name} requested your approval for: ${task.title}`,
      TASK_APPROVED: `${actor.name} approved the task: ${task.title}`,
      TASK_REJECTED: `${actor.name} rejected the task: ${task.title}`,
      TASK_MENTION: `${actor.name} mentioned you in a comment on: ${task.title}`,
    };

    const titles: Record<NotificationType, string> = {
      TASK_CREATED: 'New Task Created',
      TASK_UPDATED: 'Task Updated',
      TASK_COMMENT: 'New Comment',
      TASK_APPROVAL_NEEDED: 'Approval Required',
      TASK_APPROVED: 'Task Approved',
      TASK_REJECTED: 'Task Rejected',
      TASK_MENTION: 'You were mentioned',
    };

    // If there are specific mentioned users, create mention notifications for them
    if (type === 'TASK_MENTION' && mentionedUserIds) {
      const mentionedRecipients = recipients.filter(r => mentionedUserIds.includes(r.id));
      const promises = mentionedRecipients
        .filter(recipient => recipient.id !== actor.id)
        .map(recipient =>
          createNotification(
            recipient.id,
            type,
            titles[type],
            messages[type],
            task.id,
            `/tasks/${task.id}`
          )
        );
      await Promise.all(promises);
      return;
    }

    // Create a notification for each recipient
    const promises = recipients
      .filter(recipient => recipient.id !== actor.id) // Don't notify the actor
      .map(recipient =>
        createNotification(
          recipient.id,
          type,
          titles[type],
          messages[type],
          task.id,
          `/tasks/${task.id}`
        )
      );

    await Promise.all(promises);
  } catch (error) {
    console.error('Error creating task notifications:', error);
  }
}; 