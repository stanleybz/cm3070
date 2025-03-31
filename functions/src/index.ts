import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { NotificationPreference } from '../../services/firebase/notifications';

admin.initializeApp();
const db = admin.firestore();

// This function runs on a schedule (e.g., every hour)
export const sendMotivationalNotifications = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Only send notifications during appropriate hours (8-10 AM and 7-9 PM)
    const isAppropriateHour = (currentHour >= 8 && currentHour <= 10) || 
                              (currentHour >= 19 && currentHour <= 21);
    
    if (!isAppropriateHour) {
      console.log(`Current hour (${currentHour}) is outside notification windows`);
      return null;
    }
    
    // Get all users with notification preferences
    const snapshot = await db.collection('notificationPreferences').get();
    
    if (snapshot.empty) {
      console.log('No users found with notification preferences');
      return null;
    }
    
    const batch = db.batch();
    const promises: Promise<any>[] = [];
    
    snapshot.forEach(doc => {
      const prefs = doc.data() as NotificationPreference;
      
      // Check if it's an appropriate time for this user
      const isMorningWindow = currentHour >= 8 && currentHour <= 10 && prefs.morningWindow;
      const isEveningWindow = currentHour >= 19 && currentHour <= 21 && prefs.eveningWindow;
      
      if (!isMorningWindow && !isEveningWindow) {
        return;
      }
      
      // Check if it's a weekend and if user wants weekend notifications
      const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (isWeekend && !prefs.weekendNotifications) {
        return;
      }
      
      // Get user's task data 
      // (In a real implementation, you'd fetch this from your tasks collection)
      const taskPromise = db.collection('tasks')
        .where('userId', '==', prefs.userId)
        .where('status', '!=', 'completed')
        .get()
        .then(async tasksSnapshot => {
          if (tasksSnapshot.empty) {
            console.log(`No pending tasks for user ${prefs.userId}`);
            return;
          }
          
          const pendingTasksCount = tasksSnapshot.size;
          
          // Select a motivation message type based on user history
          // This is a simplified version of the logic in your app
          const history = prefs.taskCompletionHistory || [];
          const recentHistory = history.slice(-7);
          const totalTasks = recentHistory.reduce((sum, day) => sum + day.totalTasks, 0);
          const completedTasks = recentHistory.reduce((sum, day) => sum + day.completedTasks, 0);
          const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
          
          let messageType = 'implementation';
          let message = {
            title: "Let's get back to your tasks!",
            body: `You have ${pendingTasksCount} tasks waiting for you.`
          };
          
          // Simple logic for message selection
          if (completionRate < 0.3) {
            messageType = 'intrinsic';
            message = {
              title: "Find your purpose",
              body: "Remember why these tasks matter to you personally."
            };
          } else if (completionRate >= 0.7) {
            messageType = 'achievement';
            message = {
              title: "Keep your momentum!",
              body: `You're making great progress with ${completedTasks} completed tasks recently.`
            };
          }
          
          // Send the notification
          const token = prefs.token;
          if (!token) {
            console.log(`No notification token for user ${prefs.userId}`);
            return;
          }
          
          const payload = {
            token,
            notification: {
              title: message.title,
              body: message.body,
            },
            data: {
              type: messageType,
              pendingTasks: String(pendingTasksCount),
              click_action: 'FLUTTER_NOTIFICATION_CLICK',
            },
            android: {
              priority: 'high',
            },
            apns: {
              payload: {
                aps: {
                  contentAvailable: true,
                },
              },
            },
          };
          
          return admin.messaging().send(payload)
            .then(response => {
              console.log(`Successfully sent notification to ${prefs.userId}:`, response);
            })
            .catch(error => {
              console.error(`Error sending notification to ${prefs.userId}:`, error);
            });
        })
        .catch(error => {
          console.error(`Error fetching tasks for user ${prefs.userId}:`, error);
        });
      
      promises.push(taskPromise);
    });
    
    await Promise.all(promises);
    return null;
  }); 