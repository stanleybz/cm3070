export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'member' | 'admin';
  joinedAt: Date;
  lastActiveAt: Date;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  members: TeamMember[];
  inviteCode?: string;
}

export interface TeamTask {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  teamId: string;
  assigneeId: string; // ID of the team member assigned to this task
  creatorId: string; // ID of the team member who created this task
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamTaskCompletion {
  date: string; // YYYY-MM-DD
  userId: string;
  teamId: string;
  completedTasks: number;
  totalTasks: number;
}

// Extend the existing Task interface to include team information
export interface TeamMemberTaskActivity {
  memberId: string;
  memberName: string;
  avatarUrl?: string;
  taskCompletedToday: number;
  taskCompletedThisWeek: number;
  currentStreak: number;
  lastActiveAt: Date;
}

// Represents a team stat for visualization
export interface TeamStats {
  teamId: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  tasksByPriority: {
    low: number;
    medium: number;
    high: number;
  };
  memberContributions: {
    memberId: string;
    memberName: string;
    tasksCompleted: number;
    completionPercentage: number;
  }[];
  teamCompletionRate: number; // Percentage of team tasks completed
  lastUpdated: Date;
} 