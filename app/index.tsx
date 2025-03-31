import { useTaskManagement } from '@/hooks/useTaskManagement';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, StatusBar, AppState, AppStateStatus, ScrollView, ActivityIndicator } from 'react-native';
import { TaskForm } from '../components/tasks/TaskForm';
import { TaskList } from '../components/tasks/TaskList';
import { StreakDisplay } from '../components/motivation/StreakDisplay';
import { TaskInsights } from '../components/motivation/TaskInsights';
import { Task } from '../types/task';
import { borderRadius, colors } from './theme';
import * as Notifications from 'expo-notifications';
import { 
  registerForPushNotificationsAsync, 
  saveUserNotificationToken,
  updateUserActivityTimestamp,
  triggerMotivationalNotification,
  recordNotificationResponse,
  triggerLocalNotification,
  triggerTestNotification
} from '../services/firebase/notifications';
import { calculateStreak } from '../utils/streakCalculator';

type Subscription = {
  remove: () => void;
};

// Task Item Component
interface TaskItemProps {
  task: Task;
  onPress: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onPress, onStatusChange }) => {
  const statusColors = {
    pending: '#FFC800',     // Yellow for pending
    in_progress: '#FF9600', // Orange for in progress
    completed: '#58CC02',   // Green for completed
  };

  const priorityColors = {
    low: '#58CC02',    // Green for low priority
    medium: '#FF9600', // Orange for medium priority
    high: '#FF4B4B',   // Red for high priority
  };

  return (
    <TouchableOpacity
      style={[
        styles.taskItem,
        { borderLeftColor: priorityColors[task.priority as keyof typeof priorityColors] },
        task.status === 'completed' && styles.completedTask,
      ]}
      onPress={() => onPress(task)}
    >
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, task.status === 'completed' && styles.completedText]}>
          {task.title}
        </Text>
        {task.description ? (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}
        <View style={styles.taskMeta}>
          <View style={[styles.taskStatus, { backgroundColor: statusColors[task.status as keyof typeof statusColors] }]}>
            <Text style={styles.taskStatusText}>
              {task.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.taskDate}>
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.statusButton, { backgroundColor: statusColors[task.status as keyof typeof statusColors] }]}
        onPress={() => {
          const nextStatus = 
            task.status === 'pending' ? 'in_progress' : 
            task.status === 'in_progress' ? 'completed' : 'pending';
          onStatusChange(task.id, nextStatus);
        }}
      >
        <Ionicons 
          name={
            task.status === 'pending' ? 'hourglass-outline' : 
            task.status === 'in_progress' ? 'time-outline' : 'checkmark'
          } 
          size={24} 
          color="#FFF" 
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default function App() {
  const router = useRouter();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  const [notificationOpenTime, setNotificationOpenTime] = useState<Date | null>(null);
  const notificationListener = useRef<Subscription>();
  const responseListener = useRef<Subscription>();
  const appState = useRef(AppState.currentState);
  
  const {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    refreshTasks,
    taskCompletionHistory
  } = useTaskManagement();

  // Calculate current streak
  const currentStreak = calculateStreak(taskCompletionHistory || []);

  // Set up notification listeners
  useEffect(() => {
    // Initialize the app
    const initializeApp = async () => {
      try {
        // Register for push notifications
        const token = await registerForPushNotificationsAsync();
        if (token) {
          setExpoPushToken(token);
          await saveUserNotificationToken('temp-user-id', token);
          console.log('Notification token registered successfully');
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };
    
    // Run initialization
    initializeApp();

    // Handle received notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      
      // Store the notification ID for tracking purposes
      if (notification.request.identifier) {
        setLastNotificationId(notification.request.identifier);
      }
    });

    // Handle notification responses
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // Handle notification tap 
      console.log('Notification tapped:', response);
      
      // Record when the notification was tapped
      setNotificationOpenTime(new Date());
      
      // Store the notification ID
      if (response.notification.request.identifier) {
        setLastNotificationId(response.notification.request.identifier);
      }
      
      // Record that the notification was opened
      if (response.notification.request.identifier && response.notification.request.content.data?.userId) {
        recordNotificationResponse(
          response.notification.request.content.data.userId as string,
          response.notification.request.identifier,
          true, // was opened
          false // don't know if a task was completed yet
        );
      }
      
      // Refresh tasks when notification is tapped
      refreshTasks();
    });

    // App state change listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // Clean up listeners
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      subscription.remove();
    };
  }, []);

  // Handle app state changes (active, background, inactive)
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App has come to the foreground!');
      // Update user activity timestamp when app becomes active
      updateUserActivityTimestamp('temp-user-id');
      // Refresh tasks
      refreshTasks();
    }
    appState.current = nextAppState;
  };

  // Trigger a test notification
  const handleTestNotification = async () => {
    try {
      console.log('Attempting to trigger a test notification...');
      const success = await triggerMotivationalNotification('temp-user-id');
      
      if (success) {
        console.log('Test notification triggered successfully');
        await triggerLocalNotification(
          "Notification System Active",
          "The previous notification was triggered by the local notification system. You'll receive personalized notifications at optimal times.",
          { type: 'test', source: 'direct-test' }
        );
      } else {
        console.error('Failed to trigger ML notification, using fallback');
        // If the ML notification fails, use the simple one
        await triggerTestNotification();
      }
    } catch (error) {
      console.error('Error triggering notification:', error);
      // Last resort fallback
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Notification Test",
            body: "This is a direct test notification.",
          },
          trigger: null,
        });
      } catch (fallbackError) {
        console.error('Even direct notification failed:', fallbackError);
      }
    }
  };

  // Record task completion after notification
  const handleTaskStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      
      // If a task was completed and we have a recent notification interaction,
      // record this to improve the ML model
      if (
        newStatus === 'completed' && 
        lastNotificationId && 
        notificationOpenTime &&
        (new Date().getTime() - notificationOpenTime.getTime() < 30 * 60 * 1000) // Within 30 min
      ) {
        // Record that a task was completed after notification interaction
        await recordNotificationResponse(
          'temp-user-id', 
          lastNotificationId,
          true, // notification was opened
          true  // task was completed
        );
        
        // Reset tracking
        setLastNotificationId(null);
        setNotificationOpenTime(null);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleTaskPress = (task: Task) => {
    setEditingTask(task);
    setIsModalVisible(true);
  };

  const handleSubmit = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskData);
      } else {
        await addTask(taskData);
      }
      // Only close modal if successful
      setIsModalVisible(false);
      setEditingTask(null);
      return true;
    } catch (error) {
      console.error('Error handling task submission:', error);
      return false;
    }
  };

  // Navigate to team dashboard
  const handleTeamPress = () => {
    // Use router.navigate directly instead of href
    router.navigate('team-dashboard', {
      teamId: 'team123',
      teamName: 'Product Team'
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={colors.primary} 
        animated={true}
      />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Tasks</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={handleTeamPress}>
            <Ionicons name="people" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleTestNotification}>
            <Ionicons name="notifications" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={refreshTasks}>
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Streak Display Component */}
          <StreakDisplay 
            completionHistory={taskCompletionHistory || []}
            currentStreak={currentStreak}
          />
          
          {/* Task Insights Component - ML-based insights */}
          <TaskInsights
            userId="temp-user-id"
            completionHistory={taskCompletionHistory || []}
          />
          
          {/* Task List Section */}
          <View style={styles.taskListContainer}>
            <Text style={styles.sectionTitle}>Your Tasks</Text>
            
            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : error ? (
              <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Error: {error.message}</Text>
              </View>
            ) : tasks.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="list" size={64} color={colors.primary} />
                <Text style={styles.emptyStateText}>No tasks yet!</Text>
                <Text style={styles.emptyStateSubtext}>
                  Tap the + button to create your first task
                </Text>
              </View>
            ) : (
              tasks.map(task => (
                <TaskItem 
                  key={task.id}
                  task={task}
                  onPress={handleTaskPress}
                  onStatusChange={handleTaskStatusChange}
                />
              ))
            )}
          </View>
        </ScrollView>
        
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setEditingTask(null);
            setIsModalVisible(true);
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>

        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setIsModalVisible(false);
            setEditingTask(null);
          }}
          statusBarTranslucent={true}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TaskForm
                onSubmit={handleSubmit}
                initialValues={editingTask || undefined}
                submitLabel={editingTask ? 'Update Task' : 'Add Task'}
                onCancel={() => {
                  setIsModalVisible(false);
                  setEditingTask(null);
                }}
              />
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.primaryDark,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    maxHeight: '95%',
    flex: 1,
    borderBottomWidth: 6,
    borderBottomColor: '#D1D1D1',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120, // Extra space for the FAB
  },
  taskListContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.text,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: borderRadius.large,
    backgroundColor: colors.background,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: colors.text,
  },
  taskDescription: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  taskStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  taskDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  statusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  completedTask: {
    opacity: 0.7,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
}); 