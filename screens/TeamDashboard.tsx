import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTeamTaskManagement } from '../hooks/useTeamTaskManagement';
import { colors } from '../app/theme';
import { TeamTask } from '../types/team';
import { router } from 'expo-router';

// Mock team ID for development
const MOCK_TEAM_ID = 'team123';
const MOCK_USER_ID = 'user123';

export const TeamDashboardScreen = ({ route }: any) => {
  const teamId = route?.params?.teamId || MOCK_TEAM_ID;
  const teamName = route?.params?.teamName || 'My Team';
  
  const {
    teamTasks,
    memberActivities,
    loading,
    error,
    refreshTeamTasks,
    updateTeamTaskStatus,
    deleteTeamTask
  } = useTeamTaskManagement(teamId, MOCK_USER_ID);
  
  const [refreshing, setRefreshing] = useState(false);
  
  // Fetch data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      refreshTeamTasks();
      return () => {
        // Cleanup if needed
      };
    }, [teamId])
  );
  
  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshTeamTasks();
    setRefreshing(false);
  };
  
  // Handle task completion
  const handleTaskStatusChange = async (taskId: string, status: 'pending' | 'in_progress' | 'completed') => {
    try {
      await updateTeamTaskStatus(taskId, status);
    } catch (err) {
      console.error('Error updating task status', err);
      Alert.alert('Error', 'Failed to update the task. Please try again.');
    }
  };
  
  // Handle task press
  const handleTaskPress = (task: TeamTask) => {
    router.push({
      pathname: '/team-dashboard',
      params: { teamId, taskId: task.id }
    });
  };
  
  // Handle add task
  const handleAddTask = () => {
    router.push({
      pathname: '/',
      params: { teamId, teamName }
    });
  };
  
  // Helper functions for task formatting
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return '#4CD964';
      case 'in_progress': return colors.secondary;
      case 'pending': return colors.neutral;
      default: return colors.neutral;
    }
  };
  
  const formatDueDate = (date: Date): string => {
    if (!date) return 'No due date';
    
    const now = new Date();
    const dueDate = new Date(date);
    
    if (dueDate < now && dueDate.toDateString() !== now.toDateString()) {
      return `Overdue: ${dueDate.toLocaleDateString()}`;
    }
    
    if (dueDate.toDateString() === now.toDateString()) {
      return 'Due Today';
    }
    
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (dueDate.toDateString() === tomorrow.toDateString()) {
      return 'Due Tomorrow';
    }
    
    return `Due: ${dueDate.toLocaleDateString()}`;
  };

  // Get assignee name
  const getAssigneeName = (assigneeId: string): string => {
    return memberActivities.find(m => m.memberId === assigneeId)?.memberName || 'Unassigned';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={colors.primary} 
        animated={true}
      />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{teamName} Tasks</Text>
        <TouchableOpacity style={styles.headerButton} onPress={refreshTeamTasks}>
          <Ionicons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.taskListContainer}>
            <Text style={styles.sectionTitle}>Team Tasks</Text>
            
            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color={colors.danger} />
                <Text style={styles.errorText}>Something went wrong</Text>
                <Text style={styles.errorSubtext}>{error.message}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={refreshTeamTasks}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : teamTasks.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="people" size={64} color={colors.primary} />
                <Text style={styles.emptyStateText}>No team tasks yet!</Text>
                <Text style={styles.emptyStateSubtext}>
                  Tap the + button to create your first team task
                </Text>
              </View>
            ) : (
              teamTasks.map(task => (
                <TouchableOpacity 
                  key={task.id}
                  style={styles.taskItem}
                  onPress={() => handleTaskPress(task)}
                >
                  <View style={[styles.taskStatus, { backgroundColor: getStatusColor(task.status) }]} />
                  <View style={styles.taskContent}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View style={styles.taskMeta}>
                      <Text style={styles.taskAssignee}>
                        {getAssigneeName(task.assigneeId)}
                      </Text>
                      <Text style={styles.taskDueDate}>
                        {formatDueDate(task.dueDate)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.taskAction}
                    onPress={() => handleTaskStatusChange(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                  >
                    <Ionicons 
                      name={task.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'} 
                      size={24} 
                      color={task.status === 'completed' ? '#4CD964' : colors.textLight} 
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
        
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddTask}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerButton: {
    padding: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  centerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  taskListContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  taskStatus: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taskAssignee: {
    fontSize: 12,
    color: colors.textLight,
  },
  taskDueDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  taskAction: {
    padding: 8,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
}); 