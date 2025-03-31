import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db } from './config';
import { Task } from '../../types/task';

const COLLECTION_NAME = 'tasks';

export const taskService = {
  // Create a new task
  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...task,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return {
      id: docRef.id,
      ...task,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  // Get all tasks for a user
  async getUserTasks(userId: string): Promise<Task[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
  },

  // Update a task
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: new Date(),
    });
  },

  // Delete a task
  async deleteTask(taskId: string): Promise<void> {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    await deleteDoc(taskRef);
  },

  // Get a single task
  async getTask(taskId: string): Promise<Task | null> {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    const taskDoc = await getDoc(taskRef);
    
    if (taskDoc.exists()) {
      return {
        id: taskDoc.id,
        ...taskDoc.data()
      } as Task;
    }
    return null;
  }
}; 