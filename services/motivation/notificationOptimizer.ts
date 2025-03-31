import {
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { NotificationPreference } from '../firebase/notifications';

export interface MotivationalMessage {
  title: string;
  body: string;
  type: 'intrinsic' | 'extrinsic' | 'implementation' | 'achievement';
}

const implementationMessages: MotivationalMessage[] = [
  {
    title: "Plan your next step",
    body: "When you finish your current task, then immediately start the next one in your list!",
    type: "implementation"
  },
  {
    title: "Create a specific plan",
    body: "When will you work on this task? Set a specific time to increase your chances of success!",
    type: "implementation"
  },
  {
    title: "Make it concrete",
    body: "Where exactly will you complete this task? Setting a specific location helps follow-through!",
    type: "implementation"
  }
];

const intrinsicMessages: MotivationalMessage[] = [
  {
    title: "Find your purpose",
    body: "Remember why this task matters to you personally. How does it connect to your values?",
    type: "intrinsic"
  },
  {
    title: "Celebrate growth",
    body: "Each task you complete is helping you develop your skills and abilities!",
    type: "intrinsic"
  },
  {
    title: "Autonomy boost",
    body: "You chose this goal because it matters to you. You have the power to accomplish it!",
    type: "intrinsic"
  }
];

const achievementMessages: MotivationalMessage[] = [
  {
    title: "You're on a streak!",
    body: "Keep the momentum going - you've completed tasks 3 days in a row!",
    type: "achievement"
  },
  {
    title: "Almost there!",
    body: "You've completed 80% of your tasks this week. Finish strong!",
    type: "achievement"
  },
  {
    title: "New personal best!",
    body: "You completed more tasks yesterday than any previous day this month!",
    type: "achievement"
  }
];

const extrinsicMessages: MotivationalMessage[] = [
  {
    title: "Reward yourself",
    body: "Once you complete this important task, treat yourself to something you enjoy!",
    type: "extrinsic"
  },
  {
    title: "Deadline approaching",
    body: "Don't miss out on completing this task on time!",
    type: "extrinsic"
  },
  {
    title: "Progress update",
    body: "You've completed 5 tasks this week. Keep building on your success!",
    type: "extrinsic"
  }
];

export async function calculateOptimalNotificationTime(userId: string): Promise<Date | null> {
  try {
    const prefsCollection = collection(db, 'notificationPreferences');
    const q = query(prefsCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("No notification preferences found for user");
      return null;
    }

    const prefs = querySnapshot.docs[0].data() as NotificationPreference;
    const now = new Date();
    const dayOfWeek = now.getDay();

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend && !prefs.weekendNotifications) {
      console.log("Weekend notifications disabled for user");
      return null;
    }

    let lastActive: Date;
    if (typeof prefs.lastActiveTime === 'object' && prefs.lastActiveTime !== null && 'toDate' in prefs.lastActiveTime) {
      lastActive = (prefs.lastActiveTime as any).toDate();
    } else {
      lastActive = new Date(prefs.lastActiveTime);
    }

    let hour = now.getHours();

    if (prefs.morningWindow && hour < 8) {
      const morningTime = new Date(now);
      morningTime.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0);
      return morningTime;
    }


    if (prefs.eveningWindow && hour < 19) {
      const eveningTime = new Date(now);
      eveningTime.setHours(19 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0);
      return eveningTime;
    }

    const tomorrowMorning = new Date(now);
    tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
    tomorrowMorning.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0);
    return tomorrowMorning;
  } catch (error) {
    console.error("Error calculating notification time:", error);
    return null;
  }
}


export async function selectMotivationalMessage(userId: string): Promise<MotivationalMessage> {
  try {
    const prefsCollection = collection(db, 'notificationPreferences');
    const q = query(prefsCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return implementationMessages[Math.floor(Math.random() * implementationMessages.length)];
    }

    const prefs = querySnapshot.docs[0].data() as NotificationPreference;
    const history = prefs.taskCompletionHistory || [];

    if (history.length === 0) {
      return implementationMessages[Math.floor(Math.random() * implementationMessages.length)];
    }

    const recentHistory = history.slice(-7);
    const totalTasks = recentHistory.reduce((sum, day) => sum + day.totalTasks, 0);
    const completedTasks = recentHistory.reduce((sum, day) => sum + day.completedTasks, 0);
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const day = history[i];
      if (day.completedTasks > 0) {
        streak++;
      } else {
        break;
      }
    }

    if (streak >= 3) {
      return achievementMessages[Math.floor(Math.random() * achievementMessages.length)];
    } else if (completionRate < 0.3) {
      return intrinsicMessages[Math.floor(Math.random() * intrinsicMessages.length)];
    } else if (completionRate >= 0.7) {
      const messages = [...extrinsicMessages, ...achievementMessages];
      return messages[Math.floor(Math.random() * messages.length)];
    } else {
      const messages = [...implementationMessages, ...intrinsicMessages];
      return messages[Math.floor(Math.random() * messages.length)];
    }
  } catch (error) {
    console.error("Error selecting motivational message:", error);
    return implementationMessages[Math.floor(Math.random() * implementationMessages.length)];
  }
}

export async function getIncompleteTasks(userId: string) {
  return {
    count: 5,
    oldestTask: "Important presentation",
    mostUrgent: "Client meeting preparation"
  };
} 