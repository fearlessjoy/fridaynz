import { addDoc, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { Task, TeamMember, Comment } from './types';
import { createTaskNotification } from './notifications';
import { getUserProfile } from './firebase';

export const createTask = async (task: Omit<Task, 'id'>, currentUser: TeamMember) => {
  try {
    const docRef = await addDoc(collection(db, 'tasks'), {
      ...task,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Get all team members for notification
    const teamMembersSnapshot = await getDocs(collection(db, 'users'));
    const teamMembers = teamMembersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));

    // Create notifications for all team members
    await createTaskNotification(
      { id: docRef.id, ...task } as Task,
      'TASK_CREATED',
      teamMembers,
      currentUser
    );

    return docRef.id;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

export const updateTask = async (taskId: string, updates: Partial<Task>, currentUser: TeamMember) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);
    
    if (!taskDoc.exists()) {
      throw new Error('Task not found');
    }

    const task = { id: taskDoc.id, ...taskDoc.data() } as Task;

    await updateDoc(taskRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    // Get relevant team members for notification
    const relevantMembers = new Set<string>();
    relevantMembers.add(task.assigneeId); // Original assignee
    if (updates.assigneeId) relevantMembers.add(updates.assigneeId); // New assignee if changed
    if (task.approvers) task.approvers.forEach(a => relevantMembers.add(a.userId)); // Approvers

    const teamMembersPromises = Array.from(relevantMembers).map(id => getUserProfile(id));
    const teamMembers = (await Promise.all(teamMembersPromises)).filter(Boolean) as TeamMember[];

    // Create notifications
    await createTaskNotification(
      { ...task, ...updates } as Task,
      'TASK_UPDATED',
      teamMembers,
      currentUser
    );

  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

export const addComment = async (taskId: string, comment: Omit<Comment, 'id' | 'createdAt'>, currentUser: TeamMember) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);
    
    if (!taskDoc.exists()) {
      throw new Error('Task not found');
    }

    const task = { id: taskDoc.id, ...taskDoc.data() } as Task;

    const commentDoc = await addDoc(collection(db, 'comments'), {
      ...comment,
      taskId,
      createdAt: new Date().toISOString(),
    });

    // Get task assignee and creator for notification
    const relevantMembers = new Set<string>();
    relevantMembers.add(task.assigneeId);
    relevantMembers.add(task.createdBy);
    if (task.approvers) task.approvers.forEach(a => relevantMembers.add(a.userId));

    const teamMembersPromises = Array.from(relevantMembers).map(id => getUserProfile(id));
    const teamMembers = (await Promise.all(teamMembersPromises)).filter(Boolean) as TeamMember[];

    // Create notifications
    await createTaskNotification(
      task,
      'TASK_COMMENT',
      teamMembers,
      currentUser
    );

    return commentDoc.id;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}; 