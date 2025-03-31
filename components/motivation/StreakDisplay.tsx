import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../app/theme';

interface TaskCompletion {
  date: string; // YYYY-MM-DD
  completedTasks: number;
  totalTasks: number;
}

interface StreakDisplayProps {
  completionHistory: TaskCompletion[];
  currentStreak: number;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({ 
  completionHistory = [],
  currentStreak = 0
}) => {
  // Generate last 14 days dates
  const getLast14Days = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      days.push(date.toISOString().split('T')[0]); // YYYY-MM-DD
    }
    
    return days;
  };
  
  const last14Days = getLast14Days();
  
  // Calculate completion intensity for each day (0-4)
  const getCompletionIntensity = (date: string) => {
    const dayData = completionHistory.find(day => day.date === date);
    
    if (!dayData || dayData.totalTasks === 0) return 0;
    
    const rate = dayData.completedTasks / dayData.totalTasks;
    
    if (rate <= 0) return 0;
    if (rate < 0.25) return 1;
    if (rate < 0.5) return 2;
    if (rate < 0.75) return 3;
    return 4;
  };
  
  // Format date for display
  const formatDayLabel = (dateString: string) => {
    const date = new Date(dateString);
    return date.getDate().toString();
  };
  
  // Render streak fire
  const renderStreakFire = () => {
    if (currentStreak <= 0) {
      return (
        <View style={styles.streakContainer}>
          <Ionicons name="flame-outline" size={24} color={colors.neutral} />
          <Text style={styles.streakTextInactive}>Start a streak!</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.streakContainer}>
        <Ionicons name="flame" size={28} color={currentStreak >= 7 ? '#FF9600' : colors.secondary} />
        <Text style={styles.streakText}>{currentStreak}</Text>
        <Text style={styles.streakLabel}>day streak!</Text>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      {renderStreakFire()}
      
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarTitle}>Your Activity</Text>
          <TouchableOpacity style={styles.calendarInfo}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.calendarGrid}>
          {last14Days.map((date) => {
            const intensity = getCompletionIntensity(date);
            return (
              <View key={date} style={styles.dayContainer}>
                <Text style={styles.dayLabel}>{formatDayLabel(date)}</Text>
                <View 
                  style={[
                    styles.daySquare, 
                    { backgroundColor: getSquareColor(intensity) }
                  ]}
                />
              </View>
            );
          })}
        </View>
        
        <View style={styles.legendContainer}>
          <Text style={styles.legendText}>Less</Text>
          {[0, 1, 2, 3, 4].map(level => (
            <View 
              key={`legend-${level}`}
              style={[
                styles.legendSquare, 
                { backgroundColor: getSquareColor(level) }
              ]}
            />
          ))}
          <Text style={styles.legendText}>More</Text>
        </View>
      </View>
    </View>
  );
};

// Helper function to get color based on intensity
const getSquareColor = (intensity: number) => {
  switch (intensity) {
    case 0: return '#EBEDF0'; // Light gray (no activity)
    case 1: return '#9BE9A8'; // Light green (low activity)
    case 2: return '#40C463'; // Medium green
    case 3: return '#30A14E'; // Dark green
    case 4: return '#216E39'; // Very dark green (high activity)
    default: return '#EBEDF0';
  }
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
    borderBottomWidth: 4,
    borderBottomColor: '#E5E5E5',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  streakText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 8,
  },
  streakTextInactive: {
    fontSize: 16,
    color: colors.textLight,
    marginLeft: 8,
  },
  streakLabel: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 4,
  },
  calendarContainer: {
    marginTop: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  calendarInfo: {
    padding: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  dayContainer: {
    alignItems: 'center',
    width: '7.14%', // 100% / 14 days
  },
  dayLabel: {
    fontSize: 10,
    color: colors.textLight,
    marginBottom: 4,
  },
  daySquare: {
    width: 16,
    height: 16,
    borderRadius: 3,
    marginBottom: 4,
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  legendText: {
    fontSize: 10,
    color: colors.textLight,
    marginHorizontal: 4,
  },
  legendSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginHorizontal: 1,
  },
}); 