import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../../app/theme';
import { TaskCompletion } from '../../utils/streakCalculator';
import { TaskCompletionPredictor, UserBehaviorPattern } from '../../services/motivation/taskCompletionPredictor';

interface TaskInsightsProps {
  userId: string;
  completionHistory: TaskCompletion[];
}

export const TaskInsights: React.FC<TaskInsightsProps> = ({ 
  userId, 
  completionHistory = [] 
}) => {
  const [loading, setLoading] = useState(true);
  const [behaviorPattern, setBehaviorPattern] = useState<UserBehaviorPattern | null>(null);
  const [optimalTime, setOptimalTime] = useState<string | null>(null);
  const [mostProductiveDay, setMostProductiveDay] = useState<string | null>(null);

  useEffect(() => {
    // Only analyze if we have enough data
    if (completionHistory.length >= 3) {
      analyzeUserData();
    } else {
      setLoading(false);
    }
  }, [completionHistory]);

  const analyzeUserData = async () => {
    try {
      setLoading(true);
      
      // Create predictor instance
      const predictor = new TaskCompletionPredictor();
      
      // Analyze behavior
      const pattern = predictor.analyzeUserBehavior(userId, completionHistory);
      setBehaviorPattern(pattern);
      
      // Determine optimal time
      const hourlyActivity = pattern.hourlyActivity;
      const optimalHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
      setOptimalTime(formatHour(optimalHour));
      
      // Determine most productive day
      const dailyActivity = pattern.dailyActivity;
      const optimalDay = dailyActivity.indexOf(Math.max(...dailyActivity));
      setMostProductiveDay(getDayName(optimalDay));
      
      setLoading(false);
    } catch (error) {
      console.error('Error analyzing user data:', error);
      setLoading(false);
    }
  };
  
  // Format hour for display (e.g., 14 -> "2 PM")
  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };
  
  // Convert day index to name
  const getDayName = (dayIndex: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
  };
  
  // If we don't have enough data, show a message
  if (completionHistory.length < 3) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Task Insights</Text>
        <Text style={styles.message}>
          Complete more tasks to see personalized insights.
        </Text>
      </View>
    );
  }
  
  if (loading || !behaviorPattern) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Task Insights</Text>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }
  
  // Determine task routine suggestion based on behavior pattern
  const getRoutineSuggestion = (): string => {
    if (behaviorPattern.taskPreferences.prefersDifficultTasksInMorning) {
      return "Try tackling your hardest tasks in the morning when your focus is strongest.";
    } else if (behaviorPattern.taskPreferences.prefersShortTasksFirst) {
      return "You tend to complete short tasks first. This builds momentum for larger tasks.";
    } else {
      return `Your average task session is about ${behaviorPattern.taskPreferences.averageSessionDuration} minutes.`;
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Personalized Insights</Text>
      
      <View style={styles.insightContainer}>
        <Text style={styles.insightLabel}>Best time to work:</Text>
        <Text style={styles.insightValue}>{optimalTime || 'Not enough data'}</Text>
      </View>
      
      <View style={styles.insightContainer}>
        <Text style={styles.insightLabel}>Most productive day:</Text>
        <Text style={styles.insightValue}>{mostProductiveDay || 'Not enough data'}</Text>
      </View>
      
      <View style={styles.insightContainer}>
        <Text style={styles.insightLabel}>Task routine:</Text>
        <Text style={styles.insightValue}>{getRoutineSuggestion()}</Text>
      </View>
      
      <Text style={styles.footnote}>
        Insights based on your task completion patterns
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    // marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  insightContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexWrap: 'wrap',
  },
  insightLabel: {
    fontSize: 15,
    color: colors.textLight,
    width: '40%',
  },
  insightValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    width: '60%',
    flexWrap: 'wrap',
    textAlign: 'right',
  },
  insightHighlight: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  message: {
    fontSize: 15,
    color: colors.textLight,
    textAlign: 'center',
    marginVertical: 16,
  },
  footnote: {
    fontSize: 12,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: 16,
    textAlign: 'center',
  },
}); 