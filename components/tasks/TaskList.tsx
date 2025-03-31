import React from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Task } from '../../types/task';
import { colors, borderRadius, spacing, shadows } from '../../app/theme';
import { Ionicons } from '@expo/vector-icons';

interface TaskListProps {
  tasks: Task[];
  onTaskPress: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
  loading?: boolean;
  error?: Error | null;
}

const TaskItem = ({ task, onPress, onStatusChange }) => {
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
        { borderLeftColor: priorityColors[task.priority] },
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
          <View style={[styles.taskStatus, { backgroundColor: statusColors[task.status] }]}>
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
        style={[styles.statusButton, { backgroundColor: statusColors[task.status] }]}
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

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onTaskPress,
  onStatusChange,
  loading,
  error
}) => {
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
      </View>
    );
  }

  if (!tasks.length) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyStateContainer}>
          <Ionicons name="list" size={64} color={colors.primary} />
          <Text style={styles.emptyStateText}>No tasks yet!</Text>
          <Text style={styles.emptyStateSubtext}>
            Tap the + button to create your first task
          </Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TaskItem
          task={item}
          onPress={onTaskPress}
          onStatusChange={onStatusChange}
        />
      )}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: 80, // Extra space for FAB
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  taskItem: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.large,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    borderLeftWidth: 6,
  },
  completedTask: {
    opacity: 0.8,
  },
  taskContent: {
    flex: 1,
    padding: spacing.md,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: colors.textLight,
  },
  taskDescription: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  taskStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.pill,
  },
  taskStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  statusButton: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    textAlign: 'center',
  },
}); 