export interface TaskCompletion {
  date: string; // YYYY-MM-DD
  completedTasks: number;
  totalTasks: number;
}

export function calculateStreak(completionHistory: TaskCompletion[]): number {
  if (!completionHistory || !completionHistory.length) {
    return 0;
  }
  
  // Sort by date, most recent first
  const sortedHistory = [...completionHistory].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  // Check if today or yesterday has completed tasks
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  const todayEntry = sortedHistory.find(entry => entry.date === today);
  const yesterdayEntry = sortedHistory.find(entry => entry.date === yesterday);
  
  // If no activity today or yesterday, streak is broken
  if (
    (!todayEntry || todayEntry.completedTasks === 0) && 
    (!yesterdayEntry || yesterdayEntry.completedTasks === 0)
  ) {
    return 0;
  }
  
  // Start counting streak
  let streak = 0;
  let currentDate = new Date();
  
  // If we have activity today, start with today
  if (todayEntry && todayEntry.completedTasks > 0) {
    streak = 1;
  } else {
    // Start with yesterday
    currentDate = new Date(Date.now() - 86400000);
  }
  
  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const entry = sortedHistory.find(e => e.date === dateStr);
    
    // If no entry or no completed tasks, break the streak
    if (!entry || entry.completedTasks === 0) {
      break;
    }
    
    // Increment streak if there are completed tasks
    if (entry.completedTasks > 0) {
      streak += 1;
    }
    
    // Move to the previous day
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  return streak;
} 