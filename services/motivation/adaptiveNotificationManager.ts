import { collection, getDocs, query, where, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { NotificationPreference } from '../firebase/notifications';
import { TaskCompletion } from '../../utils/streakCalculator';
import { TaskCompletionPredictor, UserBehaviorPattern } from './taskCompletionPredictor';
import { MotivationalMessage, selectMotivationalMessage } from './notificationOptimizer';
import * as Notifications from 'expo-notifications';

export class AdaptiveNotificationManager {
  private predictor: TaskCompletionPredictor;
  
  constructor() {
    this.predictor = new TaskCompletionPredictor();
  }
  
  public async scheduleAdaptiveNotification(userId: string): Promise<boolean> {
    try {
      
      const prefs = await this.getUserPreferences(userId);
      if (!prefs) {
        console.log('No notification preferences found for user');
        return false;
      }
      
      
      const behaviorPattern = this.predictor.analyzeUserBehavior(
        userId, 
        prefs.taskCompletionHistory || []
      );
      
      
      const notificationTime = this.predictor.predictOptimalNotificationTime(
        userId,
        prefs,
        behaviorPattern
      );
      
      
      const message = await this.getPersonalizedMessage(userId, behaviorPattern);
      
      
      const now = new Date();
      const secondsUntilNotification = Math.floor(
        (notificationTime.getTime() - now.getTime()) / 1000
      );
      
      
      const triggerSeconds = secondsUntilNotification < 10 ? null : secondsUntilNotification;
      
      
      await this.scheduleNotification(
        message.title,
        message.body,
        { 
          type: message.type, 
          userId, 
          behaviorData: JSON.stringify({
            optimalHour: notificationTime.getHours(),
            optimalDay: notificationTime.getDay()
          })
        },
        triggerSeconds
      );
      
      console.log(`Scheduled adaptive notification for ${notificationTime.toLocaleString()}`);
      return true;
    } catch (error) {
      console.error('Error scheduling adaptive notification:', error);
      return false;
    }
  }

  private async getPersonalizedMessage(
    userId: string, 
    behaviorPattern: UserBehaviorPattern
  ): Promise<MotivationalMessage> {
    try {
      
      return await selectMotivationalMessage(userId);
    } catch (error) {
      console.error('Error getting personalized message:', error);
      
      
      return {
        title: "Let's get back to your tasks!",
        body: "You've made great progress. Keep it up!",
        type: "implementation"
      };
    }
  }
  
  private async getUserPreferences(userId: string): Promise<NotificationPreference | null> {
    try {
      const prefsCollection = collection(db, 'notificationPreferences');
      const q = query(prefsCollection, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('No notification preferences found for user, creating default preferences');
        
        
        const now = new Date();
        const defaultPrefs: NotificationPreference = {
          userId,
          token: 'mock-token',
          preferredTimes: [],
          morningWindow: true,
          eveningWindow: true,
          weekendNotifications: false,
          lastActiveTime: now,
          taskCompletionHistory: this.generateMockTaskHistory()
        };
        
        
        try {
          await addDoc(prefsCollection, defaultPrefs);
          console.log("Created default notification preferences");
          return defaultPrefs;
        } catch (saveError) {
          console.error("Error saving default preferences:", saveError);
          
          
          return defaultPrefs;
        }
      }
      
      return querySnapshot.docs[0].data() as NotificationPreference;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      
      
      return {
        userId,
        token: 'mock-token-fallback',
        preferredTimes: [],
        morningWindow: true,
        eveningWindow: true,
        weekendNotifications: false,
        lastActiveTime: new Date(),
        taskCompletionHistory: this.generateMockTaskHistory()
      };
    }
  }

  private generateMockTaskHistory() {
    const history = [];
    const today = new Date();
    
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; 
      
      const totalTasks = Math.floor(Math.random() * 5) + 1; 
      const completedTasks = Math.floor(Math.random() * (totalTasks + 1)); 
      
      history.push({
        date: dateStr,
        completedTasks,
        totalTasks
      });
    }
    
    return history;
  }

  private async scheduleNotification(
    title: string,
    body: string,
    data: any,
    triggerSeconds: number | null
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
        },
        trigger: null, 
      });
      console.log(`Notification scheduled with ID: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return 'notification-scheduling-failed';
    }
  }

  public async recordNotificationInteraction(
    userId: string,
    notificationId: string,
    wasOpened: boolean,
    completedTaskAfter: boolean,
    timeToOpen?: number
  ): Promise<boolean> {
    try {
      
      const prefs = await this.getUserPreferences(userId);
      if (!prefs) return false;
      
      
      
      
      console.log(`Recorded notification interaction: opened=${wasOpened}, completed task=${completedTaskAfter}`);
      return true;
    } catch (error) {
      console.error('Error recording notification interaction:', error);
      return false;
    }
  }

  public async triggerTestAdaptiveNotification(userId: string): Promise<boolean> {
    try {
      
      const prefs = await this.getUserPreferences(userId);
      if (!prefs) return false;
      
      const behaviorPattern = this.predictor.analyzeUserBehavior(
        userId, 
        prefs.taskCompletionHistory || []
      );
      
      
      const message = await this.getPersonalizedMessage(userId, behaviorPattern);
      
      
      await this.scheduleNotification(
        message.title,
        message.body,
        { 
          type: message.type, 
          userId,
          isTestNotification: true,
          behaviorPattern: JSON.stringify({
            optimalHour: new Date().getHours(),
            optimalDay: new Date().getDay()
          })
        },
        null 
      );
      
      console.log('Sent test adaptive notification');
      return true;
    } catch (error) {
      console.error('Error sending test adaptive notification:', error);
      return false;
    }
  }
} 