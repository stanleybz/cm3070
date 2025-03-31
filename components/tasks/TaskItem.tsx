import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Task } from '../../types/task';

interface TaskItemProps {
  task: Task;
  onPress: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onPress, onStatusChange }) => {
  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'in_progress':
        return '#2196F3';
      default:
        return '#FFC107';
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(task)}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{task.title}</Text>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(task.status) }]} />
        </View>
        
        {task.description && (
          <Text style={styles.description} numberOfLines={2}>
            {task.description}
          </Text>
        )}
        
        {task.dueDate && (
          <Text style={styles.dueDate}>
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </Text>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.statusButton}
        onPress={() => {
          const nextStatus: Task['status'] = 
            task.status === 'pending' ? 'in_progress' :
            task.status === 'in_progress' ? 'completed' : 'pending';
          onStatusChange(task.id, nextStatus);
        }}
      >
        <Text style={styles.statusButtonText}>
          {task.status === 'pending' ? 'Start' :
           task.status === 'in_progress' ? 'Complete' : 'Reset'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 12,
    color: '#999',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    justifyContent: 'center',
    marginLeft: 12,
  },
  statusButtonText: {
    fontSize: 12,
    color: '#666',
  },
}); 