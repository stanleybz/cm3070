import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { Task } from '../types/task';
import { TaskCompletion } from '../utils/streakCalculator';

// For in-memory storage fallback if Firebase fails
let localTaskCache: Task[] = [];
let mockTaskId = 1;

export const useTaskManagement = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [useLocalMode, setUseLocalMode] = useState(false);
  const [taskCompletionHistory, setTaskCompletionHistory] = useState<TaskCompletion[]>([]);

  const userId = 'temp-user-id';

  useEffect(() => {
    fetchTasks();
    fetchTaskCompletionHistory();
  }, []);

  // Function to generate a mock task id
  const generateMockId = () => {
    return `local-task-${mockTaskId++}`;
  };

  // Fetch task completion history from Firebase
  const fetchTaskCompletionHistory = async () => {
    try {
      if (useLocalMode) {
        // In local mode, generate some mock data for demonstration
        const mockHistory = generateMockCompletionHistory();
        setTaskCompletionHistory(mockHistory);
        return;
      }

      const prefsCollection = collection(db, 'notificationPreferences');
      const q = query(prefsCollection, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const prefs = querySnapshot.docs[0].data();
        const history = prefs.taskCompletionHistory || [];
        setTaskCompletionHistory(history);
      } else {
        // If no history found, create some mock data for demonstration
        const mockHistory = generateMockCompletionHistory();
        setTaskCompletionHistory(mockHistory);
      }
    } catch (err) {
      console.error('Error fetching task completion history:', err);
      // Generate mock data if Firebase fails
      const mockHistory = generateMockCompletionHistory();
      setTaskCompletionHistory(mockHistory);
    }
  };

  // Generate some mock task completion history for demonstration
  const generateMockCompletionHistory = (): TaskCompletion[] => {
    const mockHistory: TaskCompletion[] = [];
    const today = new Date();

    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

      // Randomly determine if there was task activity on this day
      const hasActivity = Math.random() > 0.3; // 70% chance of activity
      
      if (hasActivity) {
        const totalTasks = Math.floor(Math.random() * 5) + 1; // 1-5 tasks
        const completedTasks = Math.floor(Math.random() * (totalTasks + 1)); // 0 to totalTasks
        
        mockHistory.push({
          date: dateStr,
          completedTasks,
          totalTasks
        });
      } else if (i < 7) {
        // For more recent days, always have some activity
        const totalTasks = Math.floor(Math.random() * 3) + 1; // 1-3 tasks
        const completedTasks = Math.floor(Math.random() * (totalTasks + 1)); // 0 to totalTasks
        
        mockHistory.push({
          date: dateStr,
          completedTasks,
          totalTasks
        });
      }
      // Else: day with no recorded activity (not in the history)
    }

    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // If today is not in the history, add it
    if (!mockHistory.find(h => h.date === todayStr)) {
      mockHistory.push({
        date: todayStr,
        completedTasks: 1,
        totalTasks: 2
      });
    }

    // If yesterday is not in the history, add it
    if (!mockHistory.find(h => h.date === yesterdayStr)) {
      mockHistory.push({
        date: yesterdayStr,
        completedTasks: 2,
        totalTasks: 3
      });
    }

    return mockHistory;
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      if (useLocalMode) {
        // Use in-memory cache if Firebase failed previously
        setTasks(localTaskCache);
      }  else {
        // Try Firebase first
        try {
          const tasksRef = collection(db, 'tasks');
          const q = query(
            tasksRef,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
          );
          const querySnapshot = await getDocs(q);

          const tasksData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
            dueDate: doc.data().dueDate?.toDate(),
          })) as Task[];
          setTasks(tasksData);
          // Also update cache
          localTaskCache = tasksData;
        } catch (fbError) {
          console.error('Firebase fetch failed, falling back to local:', fbError);
          setUseLocalMode(true);
          // Use local cache as fallback
          setTasks(localTaskCache);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch tasks'));
      // If all else fails, start with empty array
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Set timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out')), 10000)
    );
    
    try {
      // Validate input data
      if (!taskData.title) {
        throw new Error('Task title is required');
      }

      const newTask = {
        ...taskData,
        userId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Ensure dueDate is a valid Date object
        dueDate: taskData.dueDate instanceof Date ? taskData.dueDate : new Date(taskData.dueDate || Date.now()),
        // Convert any complex objects to strings or simple types that Firestore can store
        tags: Array.isArray(taskData.tags) ? taskData.tags : [],
        status: taskData.status || 'pending',
        priority: taskData.priority || 'medium',
      };
      
      let task: Task;
      
      if (useLocalMode) {
        // Use local storage if Firebase is not available
        task = {
          id: generateMockId(),
          ...newTask
        } as Task;
        
        const updatedTasks = [task, ...tasks];
        setTasks(updatedTasks);
        
        // Update in-memory cache
        localTaskCache = updatedTasks;
      } else {
        // Use Firebase
        const tasksRef = collection(db, 'tasks');
        
        // Simplify task object for Firestore
        const firestoreTask = {
          title: newTask.title,
          description: newTask.description,
          dueDate: newTask.dueDate,
          status: newTask.status,
          priority: newTask.priority,
          tags: newTask.tags,
          userId: newTask.userId,
          createdAt: newTask.createdAt,
          updatedAt: newTask.updatedAt,
        };
        
        try {
          // Race against timeout
          const docRef = await Promise.race([
            addDoc(tasksRef, firestoreTask),
            timeoutPromise
          ]) as any;
          
          task = { id: docRef.id, ...newTask } as Task;
          const updatedTasks = [task, ...tasks];
          setTasks(updatedTasks);
          // Update cache
          localTaskCache = updatedTasks;
        } catch (firebaseErr: unknown) {
          console.error('Firebase error adding task:', firebaseErr);
          
          // If Firebase fails, fall back to local mode
          setUseLocalMode(true);
          
          task = {
            id: generateMockId(),
            ...newTask
          } as Task;
          
          const updatedTasks = [task, ...tasks];
          setTasks(updatedTasks);
          
          // Update in-memory cache
          localTaskCache = updatedTasks;
          
          // Still throw an error for UI feedback
          if (firebaseErr && typeof firebaseErr === 'object' && 'message' in firebaseErr && typeof firebaseErr.message === 'string') {
            if (firebaseErr.message.includes('permission-denied')) {
              throw new Error('You do not have permission to add tasks. Using local mode instead.');
            } else if (firebaseErr.message.includes('network')) {
              throw new Error('Network error. Using local mode instead.');
            } else if (firebaseErr.message.includes('timed out')) {
              throw new Error('Request timed out. Using local mode instead.');
            }
          }
          
          throw new Error('Firebase error. Using local mode instead.');
        }
      }
      
      return task;
    } catch (err) {
      console.error('Error adding task:', err);
      setError(err instanceof Error ? err : new Error('Failed to add task'));
      throw err;
    }
  };

  const updateTask = async (taskId: string, taskData: Partial<Task>) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const updateData = {
        ...taskData,
        updatedAt: new Date(),
      };
      await updateDoc(taskRef, updateData);
      setTasks(prev =>
        prev.map(task =>
          task.id === taskId
            ? { ...task, ...updateData }
            : task
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update task'));
      throw err;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await deleteDoc(taskRef);
      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete task'));
      throw err;
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateTask(taskId, { status: newStatus });
      
      // If task is completed, update completion history
      if (newStatus === 'completed') {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // Find if we already have an entry for today
        const existingEntry = taskCompletionHistory.find(entry => entry.date === today);
        
        let updatedHistory = [...taskCompletionHistory];
        
        if (existingEntry) {
          // Update existing entry
          updatedHistory = updatedHistory.map(entry => 
            entry.date === today 
              ? { ...entry, completedTasks: entry.completedTasks + 1 }
              : entry
          );
        } else {
          // Create new entry for today
          updatedHistory.push({
            date: today,
            completedTasks: 1,
            totalTasks: 1
          });
        }
        
        setTaskCompletionHistory(updatedHistory);
        
        // If not in local mode, try to update Firebase
        if (!useLocalMode) {
          try {
            const prefsCollection = collection(db, 'notificationPreferences');
            const q = query(prefsCollection, where('userId', '==', userId));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              const docRef = doc(db, 'notificationPreferences', querySnapshot.docs[0].id);
              await updateDoc(docRef, { 
                taskCompletionHistory: updatedHistory 
              });
            }
          } catch (err) {
            console.error('Error updating completion history:', err);
            // Continue with local state even if Firebase update fails
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update task status'));
      throw err;
    }
  };

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    refreshTasks: fetchTasks,
    taskCompletionHistory,
  };
}; 