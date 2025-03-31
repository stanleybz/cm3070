import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { TeamTask, TeamTaskCompletion, TeamStats, TeamMemberTaskActivity } from '../types/team';

// For in-memory storage fallback if Firebase fails
let localTeamTaskCache: TeamTask[] = [];
let mockTeamTaskId = 1;

export const useTeamTaskManagement = (teamId: string, userId: string) => {
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [useLocalMode, setUseLocalMode] = useState(false);
  const [teamTaskCompletionHistory, setTeamTaskCompletionHistory] = useState<TeamTaskCompletion[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [memberActivities, setMemberActivities] = useState<TeamMemberTaskActivity[]>([]);

  // Function to generate a mock task id
  const generateMockId = () => {
    return `local-team-task-${mockTeamTaskId++}`;
  };

  useEffect(() => {
    if (teamId) {
      fetchTeamTasks();
      fetchTeamTaskCompletionHistory();
      fetchTeamStats();
      fetchTeamMemberActivities();
    }
  }, [teamId]);

  const fetchTeamTasks = async () => {
    try {
      setLoading(true);
      
      if (useLocalMode) {
        // Use in-memory cache if Firebase failed previously
        setTeamTasks(localTeamTaskCache);
      } else {
        // Try Firebase first
        try {
          const tasksRef = collection(db, 'teamTasks');
          const q = query(
            tasksRef,
            where('teamId', '==', teamId),
            orderBy('createdAt', 'desc')
          );
          const querySnapshot = await getDocs(q);

          const tasksData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
            dueDate: doc.data().dueDate?.toDate(),
          })) as TeamTask[];
          
          setTeamTasks(tasksData);
          // Also update cache
          localTeamTaskCache = tasksData;
        } catch (fbError) {
          console.error('Firebase fetch failed, falling back to local:', fbError);
          setUseLocalMode(true);
          // Use local cache as fallback
          setTeamTasks(localTeamTaskCache);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team tasks'));
      // If all else fails, start with empty array
      setTeamTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamTaskCompletionHistory = async () => {
    try {
      if (useLocalMode) {
        // In local mode, generate some mock data for demonstration
        const mockHistory = generateMockTeamCompletionHistory();
        setTeamTaskCompletionHistory(mockHistory);
        return;
      }

      const completionCollection = collection(db, 'teamTaskCompletions');
      const q = query(
        completionCollection, 
        where('teamId', '==', teamId)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const history = querySnapshot.docs.map(doc => doc.data() as TeamTaskCompletion);
        setTeamTaskCompletionHistory(history);
      } else {
        // If no history found, create some mock data for demonstration
        const mockHistory = generateMockTeamCompletionHistory();
        setTeamTaskCompletionHistory(mockHistory);
      }
    } catch (err) {
      console.error('Error fetching team task completion history:', err);
      // Generate mock data if Firebase fails
      const mockHistory = generateMockTeamCompletionHistory();
      setTeamTaskCompletionHistory(mockHistory);
    }
  };

  const fetchTeamStats = async () => {
    try {
      if (useLocalMode) {
        // Generate mock stats for demonstration
        setTeamStats(generateMockTeamStats());
        return;
      }

      const statsCollection = collection(db, 'teamStats');
      const q = query(statsCollection, where('teamId', '==', teamId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const statsData = querySnapshot.docs[0].data();
        const lastUpdated = statsData.lastUpdated && typeof statsData.lastUpdated.toDate === 'function' 
          ? statsData.lastUpdated.toDate() 
          : new Date(statsData.lastUpdated);
          
        const stats: TeamStats = {
          ...statsData,
          lastUpdated
        } as TeamStats;
        
        setTeamStats(stats);
      } else {
        // Generate mock stats for demonstration
        setTeamStats(generateMockTeamStats());
      }
    } catch (err) {
      console.error('Error fetching team stats:', err);
      setTeamStats(generateMockTeamStats());
    }
  };

  const fetchTeamMemberActivities = async () => {
    try {
      if (useLocalMode) {
        // Generate mock member activities for demonstration
        setMemberActivities(generateMockMemberActivities());
        return;
      }

      const activitiesCollection = collection(db, 'teamMemberActivities');
      const q = query(activitiesCollection, where('teamId', '==', teamId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const activities = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // Handle Firestore timestamp conversion
          const lastActiveAt = data.lastActiveAt && typeof data.lastActiveAt.toDate === 'function'
            ? data.lastActiveAt.toDate()
            : new Date(data.lastActiveAt);
            
          return {
            ...data,
            lastActiveAt
          } as TeamMemberTaskActivity;
        });
        setMemberActivities(activities);
      } else {
        // Generate mock member activities for demonstration
        setMemberActivities(generateMockMemberActivities());
      }
    } catch (err) {
      console.error('Error fetching team member activities:', err);
      setMemberActivities(generateMockMemberActivities());
    }
  };

  // Generate some mock team completion history for demonstration
  const generateMockTeamCompletionHistory = (): TeamTaskCompletion[] => {
    const mockHistory: TeamTaskCompletion[] = [];
    const today = new Date();
    const memberIds = ['member1', 'member2', 'member3', userId]; // Include current user
    
    // Create entries for the last 14 days with varying completion rates for each member
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Add completion data for each team member
      memberIds.forEach(memberId => {
        // Randomly determine if there was task activity on this day
        const hasActivity = Math.random() > 0.3; // 70% chance of activity
        
        if (hasActivity || memberId === userId) { // Always include current user
          const totalTasks = Math.floor(Math.random() * 5) + 1; // 1-5 tasks
          const completedTasks = Math.floor(Math.random() * (totalTasks + 1)); // 0 to totalTasks
          
          mockHistory.push({
            date: dateStr,
            userId: memberId,
            teamId,
            completedTasks,
            totalTasks
          });
        }
      });
    }
    
    return mockHistory;
  };

  // Generate mock team stats for demonstration
  const generateMockTeamStats = (): TeamStats => {
    const totalTasks = Math.floor(Math.random() * 30) + 10; // 10-40 tasks
    const completedTasks = Math.floor(Math.random() * totalTasks);
    const inProgressTasks = Math.floor(Math.random() * (totalTasks - completedTasks));
    const pendingTasks = totalTasks - completedTasks - inProgressTasks;
    
    // Mock member contributions
    const memberContributions = [
      {
        memberId: 'member1',
        memberName: 'Alex Johnson',
        tasksCompleted: Math.floor(Math.random() * completedTasks),
        completionPercentage: 0, // Will calculate below
      },
      {
        memberId: 'member2',
        memberName: 'Sam Smith',
        tasksCompleted: Math.floor(Math.random() * completedTasks),
        completionPercentage: 0,
      },
      {
        memberId: 'member3',
        memberName: 'Jamie Williams',
        tasksCompleted: Math.floor(Math.random() * completedTasks),
        completionPercentage: 0,
      },
      {
        memberId: userId,
        memberName: 'You',
        tasksCompleted: Math.floor(Math.random() * completedTasks),
        completionPercentage: 0,
      }
    ];
    
    // Adjust to make sure sum matches completedTasks
    let currentSum = memberContributions.reduce((sum, member) => sum + member.tasksCompleted, 0);
    if (currentSum < completedTasks) {
      // Add the difference to current user
      const userMember = memberContributions.find(m => m.memberId === userId);
      if (userMember) {
        userMember.tasksCompleted += (completedTasks - currentSum);
      }
    } else if (currentSum > completedTasks) {
      // Adjust all members proportionally
      const ratio = completedTasks / currentSum;
      memberContributions.forEach(member => {
        member.tasksCompleted = Math.floor(member.tasksCompleted * ratio);
      });
    }
    
    // Calculate completion percentages
    memberContributions.forEach(member => {
      member.completionPercentage = completedTasks > 0 
        ? (member.tasksCompleted / completedTasks) * 100 
        : 0;
    });
    
    return {
      teamId,
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      tasksByPriority: {
        low: Math.floor(Math.random() * totalTasks),
        medium: Math.floor(Math.random() * totalTasks),
        high: Math.floor(Math.random() * totalTasks),
      },
      memberContributions,
      teamCompletionRate: (completedTasks / totalTasks) * 100,
      lastUpdated: new Date(),
    };
  };

  // Generate mock member activities for demonstration
  const generateMockMemberActivities = (): TeamMemberTaskActivity[] => {
    return [
      {
        memberId: 'member1',
        memberName: 'Alex Johnson',
        avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
        taskCompletedToday: Math.floor(Math.random() * 5),
        taskCompletedThisWeek: Math.floor(Math.random() * 20),
        currentStreak: Math.floor(Math.random() * 7),
        lastActiveAt: new Date(Date.now() - Math.floor(Math.random() * 86400000)), // Random time in last 24h
      },
      {
        memberId: 'member2',
        memberName: 'Sam Smith',
        avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
        taskCompletedToday: Math.floor(Math.random() * 5),
        taskCompletedThisWeek: Math.floor(Math.random() * 20),
        currentStreak: Math.floor(Math.random() * 7),
        lastActiveAt: new Date(Date.now() - Math.floor(Math.random() * 86400000)),
      },
      {
        memberId: 'member3',
        memberName: 'Jamie Williams',
        avatarUrl: 'https://randomuser.me/api/portraits/men/67.jpg',
        taskCompletedToday: Math.floor(Math.random() * 5),
        taskCompletedThisWeek: Math.floor(Math.random() * 20),
        currentStreak: Math.floor(Math.random() * 7),
        lastActiveAt: new Date(Date.now() - Math.floor(Math.random() * 86400000)),
      },
      {
        memberId: userId,
        memberName: 'You',
        avatarUrl: 'https://randomuser.me/api/portraits/lego/1.jpg',
        taskCompletedToday: Math.floor(Math.random() * 5),
        taskCompletedThisWeek: Math.floor(Math.random() * 20),
        currentStreak: Math.floor(Math.random() * 7),
        lastActiveAt: new Date(),
      },
    ];
  };

  const addTeamTask = async (taskData: Omit<TeamTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Validate input data
      if (!taskData.title) {
        throw new Error('Task title is required');
      }

      const newTask = {
        ...taskData,
        teamId,
        creatorId: userId, // Current user is the creator
        createdAt: new Date(),
        updatedAt: new Date(),
        // Ensure dueDate is a valid Date object
        dueDate: taskData.dueDate instanceof Date ? taskData.dueDate : new Date(taskData.dueDate || Date.now()),
        // Convert any complex objects to strings or simple types that Firestore can store
        tags: Array.isArray(taskData.tags) ? taskData.tags : [],
        status: taskData.status || 'pending',
        priority: taskData.priority || 'medium',
      };
      
      let task: TeamTask;
      
      if (useLocalMode) {
        // Use local storage if Firebase is not available
        task = {
          id: generateMockId(),
          ...newTask
        } as TeamTask;
        
        const updatedTasks = [task, ...teamTasks];
        setTeamTasks(updatedTasks);
        
        // Update in-memory cache
        localTeamTaskCache = updatedTasks;
      } else {
        // Use Firebase
        const tasksRef = collection(db, 'teamTasks');
        
        try {
          const docRef = await addDoc(tasksRef, newTask);
          
          task = { id: docRef.id, ...newTask } as TeamTask;
          const updatedTasks = [task, ...teamTasks];
          setTeamTasks(updatedTasks);
          // Update cache
          localTeamTaskCache = updatedTasks;
        } catch (firebaseErr: unknown) {
          console.error('Firebase error adding team task:', firebaseErr);
          
          // If Firebase fails, fall back to local mode
          setUseLocalMode(true);
          
          task = {
            id: generateMockId(),
            ...newTask
          } as TeamTask;
          
          const updatedTasks = [task, ...teamTasks];
          setTeamTasks(updatedTasks);
          
          // Update in-memory cache
          localTeamTaskCache = updatedTasks;
          
          throw new Error('Firebase error. Using local mode instead.');
        }
      }
      
      // Update team stats after adding a task
      updateTeamStats();
      
      return task;
    } catch (err) {
      console.error('Error adding team task:', err);
      setError(err instanceof Error ? err : new Error('Failed to add team task'));
      throw err;
    }
  };

  const updateTeamTask = async (taskId: string, taskData: Partial<TeamTask>) => {
    try {
      const taskRef = doc(db, 'teamTasks', taskId);
      const updateData = {
        ...taskData,
        updatedAt: new Date(),
      };
      
      if (!useLocalMode) {
        await updateDoc(taskRef, updateData);
      }
      
      setTeamTasks(prev =>
        prev.map(task =>
          task.id === taskId
            ? { ...task, ...updateData }
            : task
        )
      );
      
      // Update team stats after updating a task
      if (taskData.status) {
        updateTeamStats();
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update team task'));
      return false;
    }
  };

  const deleteTeamTask = async (taskId: string) => {
    try {
      if (!useLocalMode) {
        const taskRef = doc(db, 'teamTasks', taskId);
        await deleteDoc(taskRef);
      }
      
      setTeamTasks(prev => prev.filter(task => task.id !== taskId));
      
      // Update team stats after deleting a task
      updateTeamStats();
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete team task'));
      return false;
    }
  };

  const updateTeamTaskStatus = async (taskId: string, newStatus: TeamTask['status']) => {
    try {
      const result = await updateTeamTask(taskId, { status: newStatus });
      
      // If task is completed, update completion history
      if (newStatus === 'completed' && result) {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // Update team task completion history
        updateTeamTaskCompletionHistory(today);
        
        // Update team member activity
        updateTeamMemberActivity();
      }
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update team task status'));
      return false;
    }
  };

  const updateTeamTaskCompletionHistory = async (dateStr: string) => {
    try {
      // Find existing entry for current user and date
      const existingEntry = teamTaskCompletionHistory.find(
        entry => entry.date === dateStr && entry.userId === userId
      );
      
      let updatedHistory = [...teamTaskCompletionHistory];
      
      if (existingEntry) {
        // Update existing entry
        updatedHistory = updatedHistory.map(entry => 
          (entry.date === dateStr && entry.userId === userId)
            ? { ...entry, completedTasks: entry.completedTasks + 1 }
            : entry
        );
      } else {
        // Create new entry for today and current user
        updatedHistory.push({
          date: dateStr,
          userId,
          teamId,
          completedTasks: 1,
          totalTasks: 1
        });
      }
      
      setTeamTaskCompletionHistory(updatedHistory);
      
      // If not in local mode, update Firestore
      if (!useLocalMode) {
        try {
          // First try to find an existing document to update
          const completionCollection = collection(db, 'teamTaskCompletions');
          const q = query(
            completionCollection,
            where('teamId', '==', teamId),
            where('userId', '==', userId),
            where('date', '==', dateStr)
          );
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Update existing document
            const docRef = doc(db, 'teamTaskCompletions', querySnapshot.docs[0].id);
            const completionData = querySnapshot.docs[0].data() as TeamTaskCompletion;
            
            await updateDoc(docRef, {
              completedTasks: completionData.completedTasks + 1,
              totalTasks: completionData.totalTasks + 1
            });
          } else {
            // Create new document
            await addDoc(completionCollection, {
              date: dateStr,
              userId,
              teamId,
              completedTasks: 1,
              totalTasks: 1
            });
          }
        } catch (err) {
          console.error('Error updating team task completion history in Firestore:', err);
        }
      }
      
      return true;
    } catch (err) {
      console.error('Error updating team task completion history:', err);
      return false;
    }
  };

  const updateTeamMemberActivity = async () => {
    // Find or create activity record for current user
    const existingActivity = memberActivities.find(activity => activity.memberId === userId);
    
    if (existingActivity) {
      // Update existing activity
      const updatedActivities = memberActivities.map(activity => 
        activity.memberId === userId
          ? {
              ...activity,
              taskCompletedToday: activity.taskCompletedToday + 1,
              taskCompletedThisWeek: activity.taskCompletedThisWeek + 1,
              lastActiveAt: new Date()
            }
          : activity
      );
      
      setMemberActivities(updatedActivities);
    } else {
      // Create new activity record
      const newActivity: TeamMemberTaskActivity = {
        memberId: userId,
        memberName: 'You',
        taskCompletedToday: 1,
        taskCompletedThisWeek: 1,
        currentStreak: 1,
        lastActiveAt: new Date()
      };
      
      setMemberActivities([...memberActivities, newActivity]);
    }
    
    // Update in Firestore if not in local mode
    if (!useLocalMode) {
      try {
        const activitiesCollection = collection(db, 'teamMemberActivities');
        const q = query(
          activitiesCollection,
          where('teamId', '==', teamId),
          where('memberId', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Update existing document
          const docRef = doc(db, 'teamMemberActivities', querySnapshot.docs[0].id);
          const activityData = querySnapshot.docs[0].data() as TeamMemberTaskActivity;
          
          await updateDoc(docRef, {
            taskCompletedToday: activityData.taskCompletedToday + 1,
            taskCompletedThisWeek: activityData.taskCompletedThisWeek + 1,
            lastActiveAt: new Date()
          });
        } else {
          // Create new document
          await addDoc(activitiesCollection, {
            memberId: userId,
            teamId,
            memberName: 'You', // In a real app, get this from auth
            taskCompletedToday: 1,
            taskCompletedThisWeek: 1,
            currentStreak: 1,
            lastActiveAt: new Date()
          });
        }
      } catch (err) {
        console.error('Error updating team member activity in Firestore:', err);
      }
    }
  };

  const updateTeamStats = async () => {
    try {
      // In a real app, you'd query Firestore to get real stats
      // For this demo, we'll just regenerate the mock stats
      const updatedStats = generateMockTeamStats();
      setTeamStats(updatedStats);
      
      // Update in Firestore if not in local mode
      if (!useLocalMode) {
        try {
          const statsCollection = collection(db, 'teamStats');
          const q = query(statsCollection, where('teamId', '==', teamId));
          const querySnapshot = await getDocs(q);
          
          // Convert TeamStats to plain object for Firestore
          const firestoreStats = {
            teamId: updatedStats.teamId,
            totalTasks: updatedStats.totalTasks,
            completedTasks: updatedStats.completedTasks,
            pendingTasks: updatedStats.pendingTasks,
            inProgressTasks: updatedStats.inProgressTasks,
            tasksByPriority: updatedStats.tasksByPriority,
            memberContributions: updatedStats.memberContributions,
            teamCompletionRate: updatedStats.teamCompletionRate,
            lastUpdated: updatedStats.lastUpdated
          };
          
          if (!querySnapshot.empty) {
            // Update existing document
            const docRef = doc(db, 'teamStats', querySnapshot.docs[0].id);
            await updateDoc(docRef, firestoreStats);
          } else {
            // Create new document
            await addDoc(statsCollection, firestoreStats);
          }
        } catch (err) {
          console.error('Error updating team stats in Firestore:', err);
        }
      }
      
      return true;
    } catch (err) {
      console.error('Error updating team stats:', err);
      return false;
    }
  };

  return {
    teamTasks,
    loading,
    error,
    teamTaskCompletionHistory,
    teamStats,
    memberActivities,
    addTeamTask,
    updateTeamTask,
    deleteTeamTask,
    updateTeamTaskStatus,
    refreshTeamTasks: fetchTeamTasks,
  };
}; 