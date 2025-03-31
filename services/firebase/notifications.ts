import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { db } from './config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc
} from 'firebase/firestore';
import { AdaptiveNotificationManager } from '../motivation/adaptiveNotificationManager';

// Create an instance of the adaptive notification manager
const adaptiveNotificationManager = new AdaptiveNotificationManager();

// Configure notification handler behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Interface for tracking notification preferences
export interface NotificationPreference {
  userId: string;
  token: string;
  preferredTimes: string[]; // Format: "HH:MM" 
  morningWindow: boolean; // 8-10 AM
  eveningWindow: boolean; // 7-9 PM
  weekendNotifications: boolean;
  lastActiveTime: Date;
  taskCompletionHistory: {
    date: string; // YYYY-MM-DD
    completedTasks: number;
    totalTasks: number;
  }[];
}

// Register for push notifications
export async function registerForPushNotificationsAsync() {
  let token;
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#58CC02',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for notifications!');
      return;
    }
    
    // Get the token that uniquely identifies this device
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

// Save the notification token to Firestore for a user
export async function saveUserNotificationToken(userId: string, token: string) {
  try {
    // Check if user already has a token
    const prefsCollection = collection(db, 'notificationPreferences');
    const q = query(prefsCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const now = new Date();
    const defaultPrefs: NotificationPreference = {
      userId,
      token,
      preferredTimes: [],
      morningWindow: true, // Default to mornings (8-10 AM)
      eveningWindow: true, // Default to evenings (7-9 PM)
      weekendNotifications: false, // Default to no weekend notifications
      lastActiveTime: now,
      taskCompletionHistory: []
    };
    
    if (querySnapshot.empty) {
      // Create new notification preferences
      await addDoc(prefsCollection, defaultPrefs);
      console.log("User notification preferences saved!");
    } else {
      // Update existing token
      const docRef = doc(db, 'notificationPreferences', querySnapshot.docs[0].id);
      await updateDoc(docRef, { 
        token,
        lastActiveTime: now
      });
      console.log("User notification token updated!");
    }
    
    return true;
  } catch (error) {
    console.error("Error saving notification token:", error);
    return false;
  }
}

// Update user activity timestamp (call this when app opens or user interacts)
export async function updateUserActivityTimestamp(userId: string) {
  try {
    const prefsCollection = collection(db, 'notificationPreferences');
    const q = query(prefsCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docRef = doc(db, 'notificationPreferences', querySnapshot.docs[0].id);
      await updateDoc(docRef, { 
        lastActiveTime: new Date()
      });
    }
  } catch (error) {
    console.error("Error updating user activity:", error);
  }
}

// Update task completion history
export async function updateTaskCompletionStats(userId: string, completed: boolean) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const prefsCollection = collection(db, 'notificationPreferences');
    const q = query(prefsCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const prefs = querySnapshot.docs[0].data() as NotificationPreference;
      const history = prefs.taskCompletionHistory || [];
      
      // Find today's entry or create it
      const todayEntry = history.find(entry => entry.date === today);
      
      if (todayEntry) {
        if (completed) {
          todayEntry.completedTasks += 1;
        }
        todayEntry.totalTasks += 1;
      } else {
        history.push({
          date: today,
          completedTasks: completed ? 1 : 0,
          totalTasks: 1
        });
      }
      
      // Update Firestore
      const docRef = doc(db, 'notificationPreferences', querySnapshot.docs[0].id);
      await updateDoc(docRef, { 
        taskCompletionHistory: history
      });
    }
  } catch (error) {
    console.error("Error updating task stats:", error);
  }
}

// Function to trigger a local notification (for testing)
export async function triggerLocalNotification(title: string, body: string, data?: any) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
    },
    trigger: null, // Immediate notification
  });
  console.log('Local notification scheduled');
}

// Function to trigger a notification based on psychological motivation system
export async function triggerMotivationalNotification(userId: string): Promise<boolean> {
  try {
    // Use the adaptive notification manager instead of the simple version
    return await adaptiveNotificationManager.triggerTestAdaptiveNotification(userId);
  } catch (error) {
    console.error('Error sending motivational notification:', error);
    return false;
  }
}

// Function to trigger a notification without Firestore dependencies (for testing)
export async function triggerTestNotification(): Promise<boolean> {
  try {
    await triggerLocalNotification(
      "Time for your tasks!",
      "Research shows that planning when and where you'll work increases success rates by 33%.",
      { type: 'implementation' }
    );
    return true;
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
}

// Schedule a notification based on ML-predicted optimal time
export async function scheduleAdaptiveNotification(userId: string): Promise<boolean> {
  return await adaptiveNotificationManager.scheduleAdaptiveNotification(userId);
}

// Record user interaction with a notification to improve ML model
export async function recordNotificationResponse(
  userId: string, 
  notificationId: string,
  wasOpened: boolean,
  completedTask: boolean
): Promise<boolean> {
  return await adaptiveNotificationManager.recordNotificationInteraction(
    userId,
    notificationId,
    wasOpened,
    completedTask
  );
} 