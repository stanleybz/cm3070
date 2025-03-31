import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// import { ProgressCircle } from 'react-native-svg-charts';
import { colors } from '../../app/theme';
import { TeamStats } from '../../types/team';

// Define additional colors for the stats display
const statsColors = {
  success: '#4CD964', // Green for completed/success
  warning: '#FFCC00', // Yellow for warnings/medium priority
  error: '#FF3B30',   // Red for errors/high priority
  backgroundLight: '#F7F7F7', // Light background for progress circle
};

interface TeamStatsCardProps {
  stats: TeamStats;
  onRefresh?: () => void;
  loading?: boolean;
}

export const TeamStatsCard: React.FC<TeamStatsCardProps> = ({
  stats,
  onRefresh,
  loading = false,
}) => {
  // Format percentage for display
  const formatPercentage = (value: number): string => {
    return `${Math.round(value)}%`;
  };

  // Get color based on completion rate
  const getCompletionColor = (rate: number): string => {
    if (rate >= 75) return statsColors.success;
    if (rate >= 50) return colors.secondary;
    if (rate >= 25) return statsColors.warning;
    return statsColors.error;
  };

  // Calculate days since last update
  const getDaysSinceUpdate = (): string => {
    if (!stats.lastUpdated) return 'Never updated';
    
    const lastUpdate = new Date(stats.lastUpdated);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastUpdate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Updated today';
    if (diffDays === 1) return 'Updated yesterday';
    return `Updated ${diffDays} days ago`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Team Performance</Text>
        <TouchableOpacity onPress={onRefresh} disabled={loading}>
          <Ionicons
            name={loading ? 'sync-circle' : 'refresh-circle-outline'}
            size={24}
            color={colors.primary}
            style={loading ? { transform: [{ rotate: '45deg' }] } : undefined}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.updateText}>{getDaysSinceUpdate()}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={styles.progressCircleContainer}>
            {/* Custom circle progress implementation since ProgressCircle is commented out */}
            <View style={styles.progressCircleBackground}>
              <View 
                style={[
                  styles.progressCircleFill, 
                  { 
                    backgroundColor: getCompletionColor(stats.teamCompletionRate),
                    width: `${stats.teamCompletionRate}%`
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {formatPercentage(stats.teamCompletionRate)}
            </Text>
          </View>
          <Text style={styles.statLabel}>Completion Rate</Text>
        </View>

        <View style={styles.statItem}>
          <View style={styles.countContainer}>
            <Text style={styles.statCount}>{stats.completedTasks}</Text>
            <Text style={styles.statTotal}>/{stats.totalTasks}</Text>
          </View>
          <Text style={styles.statLabel}>Tasks Completed</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.prioritySection}>
        <Text style={styles.sectionTitle}>Tasks by Priority</Text>
        <View style={styles.priorityRow}>
          <View style={styles.priorityItem}>
            <View style={[styles.priorityIndicator, { backgroundColor: statsColors.success }]} />
            <Text style={styles.priorityLabel}>Low</Text>
            <Text style={styles.priorityCount}>{stats.tasksByPriority.low}</Text>
          </View>
          <View style={styles.priorityItem}>
            <View style={[styles.priorityIndicator, { backgroundColor: statsColors.warning }]} />
            <Text style={styles.priorityLabel}>Medium</Text>
            <Text style={styles.priorityCount}>{stats.tasksByPriority.medium}</Text>
          </View>
          <View style={styles.priorityItem}>
            <View style={[styles.priorityIndicator, { backgroundColor: statsColors.error }]} />
            <Text style={styles.priorityLabel}>High</Text>
            <Text style={styles.priorityCount}>{stats.tasksByPriority.high}</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Tasks by Status</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusBar}>
            <View 
              style={[
                styles.statusSegment, 
                { 
                  backgroundColor: statsColors.success,
                  flex: stats.completedTasks || 0.01
                }
              ]} 
            />
            <View 
              style={[
                styles.statusSegment, 
                { 
                  backgroundColor: colors.secondary,
                  flex: stats.inProgressTasks || 0.01
                }
              ]} 
            />
            <View 
              style={[
                styles.statusSegment, 
                { 
                  backgroundColor: colors.neutral,
                  flex: stats.pendingTasks || 0.01
                }
              ]} 
            />
          </View>
          <View style={styles.statusLabels}>
            <View style={styles.statusLabel}>
              <View style={[styles.statusIndicator, { backgroundColor: statsColors.success }]} />
              <Text style={styles.statusText}>Completed</Text>
              <Text style={styles.statusCount}>{stats.completedTasks}</Text>
            </View>
            <View style={styles.statusLabel}>
              <View style={[styles.statusIndicator, { backgroundColor: colors.secondary }]} />
              <Text style={styles.statusText}>In Progress</Text>
              <Text style={styles.statusCount}>{stats.inProgressTasks}</Text>
            </View>
            <View style={styles.statusLabel}>
              <View style={[styles.statusIndicator, { backgroundColor: colors.neutral }]} />
              <Text style={styles.statusText}>Pending</Text>
              <Text style={styles.statusCount}>{stats.pendingTasks}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  updateText: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressCircleContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleBackground: {
    width: 80,
    height: 8,
    backgroundColor: statsColors.backgroundLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressCircleFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressCircle: {
    height: 80,
    width: 80,
  },
  progressText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 10,
  },
  statCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  statTotal: {
    fontSize: 16,
    color: colors.textLight,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  prioritySection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  priorityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityItem: {
    alignItems: 'center',
    flex: 1,
  },
  priorityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  priorityLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 2,
  },
  priorityCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusSection: {
    marginBottom: 8,
  },
  statusRow: {
    marginTop: 8,
  },
  statusBar: {
    height: 16,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  statusSegment: {
    height: '100%',
  },
  statusLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flex: 1,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: colors.textLight,
    flex: 1,
  },
  statusCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
}); 