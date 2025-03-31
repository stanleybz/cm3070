import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  TextInput,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../app/theme';
import { TeamTask } from '../../types/team';

interface TeamTasksListProps {
  teamId: string;
  tasks: TeamTask[];
  loading: boolean;
  onRefresh: () => void;
  onTaskPress: (task: TeamTask) => void;
  onTaskComplete: (taskId: string) => void;
  onAddTask?: () => void;
  teamMembers: { id: string; name: string; avatarUrl?: string }[];
}

export const TeamTasksList: React.FC<TeamTasksListProps> = ({
  teamId,
  tasks,
  loading,
  onRefresh,
  onTaskPress,
  onTaskComplete,
  onAddTask,
  teamMembers
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);

  // Filter tasks based on search query and filters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus ? task.status === filterStatus : true;
    const matchesPriority = filterPriority ? task.priority === filterPriority : true;
    const matchesAssignee = filterAssignee ? task.assigneeId === filterAssignee : true;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
  });

  // Get member name from id
  const getMemberName = (memberId: string): string => {
    const member = teamMembers.find(m => m.id === memberId);
    return member ? member.name : 'Unknown Member';
  };

  // Get member avatar from id
  const getMemberAvatar = (memberId: string): string | undefined => {
    const member = teamMembers.find(m => m.id === memberId);
    return member?.avatarUrl;
  };

  // Get priority color
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return '#FF3B30';
      case 'medium': return '#FFCC00';
      case 'low': return '#4CD964';
      default: return colors.neutral;
    }
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return '#4CD964';
      case 'in_progress': return colors.secondary;
      case 'pending': return colors.neutral;
      default: return colors.neutral;
    }
  };

  // Format date for display
  const formatDueDate = (date: Date): string => {
    if (!date) return 'No due date';
    
    const now = new Date();
    const dueDate = new Date(date);
    
    // Check if the date is today
    if (dueDate.toDateString() === now.toDateString()) {
      return 'Today';
    }
    
    // Check if the date is tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (dueDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    // Check if the date is within a week
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);
    if (dueDate < nextWeek) {
      const options: Intl.DateTimeFormatOptions = { weekday: 'long' };
      return dueDate.toLocaleDateString(undefined, options);
    }
    
    // Otherwise, return the full date
    return dueDate.toLocaleDateString();
  };

  // Determine if task is overdue
  const isOverdue = (date: Date, status: string): boolean => {
    return status !== 'completed' && new Date(date) < new Date();
  };

  // Render filter badges
  const renderFilterBadges = () => {
    return (
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterChip 
            label="All" 
            isActive={!filterStatus && !filterPriority && !filterAssignee}
            onPress={() => {
              setFilterStatus(null);
              setFilterPriority(null);
              setFilterAssignee(null);
            }}
          />
          
          <Text style={styles.filterLabel}>Status:</Text>
          <FilterChip 
            label="Pending" 
            isActive={filterStatus === 'pending'}
            onPress={() => setFilterStatus(filterStatus === 'pending' ? null : 'pending')}
            color={colors.neutral}
          />
          <FilterChip 
            label="In Progress" 
            isActive={filterStatus === 'in_progress'}
            onPress={() => setFilterStatus(filterStatus === 'in_progress' ? null : 'in_progress')}
            color={colors.secondary}
          />
          <FilterChip 
            label="Completed" 
            isActive={filterStatus === 'completed'}
            onPress={() => setFilterStatus(filterStatus === 'completed' ? null : 'completed')}
            color="#4CD964"
          />
          
          <Text style={styles.filterLabel}>Priority:</Text>
          <FilterChip 
            label="Low" 
            isActive={filterPriority === 'low'}
            onPress={() => setFilterPriority(filterPriority === 'low' ? null : 'low')}
            color="#4CD964"
          />
          <FilterChip 
            label="Medium" 
            isActive={filterPriority === 'medium'}
            onPress={() => setFilterPriority(filterPriority === 'medium' ? null : 'medium')}
            color="#FFCC00"
          />
          <FilterChip 
            label="High" 
            isActive={filterPriority === 'high'}
            onPress={() => setFilterPriority(filterPriority === 'high' ? null : 'high')}
            color="#FF3B30"
          />
          
          {teamMembers.length > 0 && (
            <>
              <Text style={styles.filterLabel}>Assignee:</Text>
              {teamMembers.map(member => (
                <FilterChip 
                  key={member.id}
                  label={member.name.split(' ')[0]} 
                  isActive={filterAssignee === member.id}
                  onPress={() => setFilterAssignee(filterAssignee === member.id ? null : member.id)}
                  avatarUrl={member.avatarUrl}
                />
              ))}
            </>
          )}
        </ScrollView>
      </View>
    );
  };

  // Render a task item
  const renderTaskItem = ({ item }: { item: TeamTask }) => {
    const overdueStyle = isOverdue(item.dueDate, item.status) ? styles.overdue : {};
    
    return (
      <TouchableOpacity 
        style={[styles.taskItem, item.status === 'completed' && styles.completedTask]}
        onPress={() => onTaskPress(item)}
        activeOpacity={0.7}
      >
        <TouchableOpacity 
          style={styles.checkboxContainer}
          onPress={() => onTaskComplete(item.id)}
        >
          <View style={[
            styles.checkbox, 
            item.status === 'completed' && styles.checkboxChecked
          ]}>
            {item.status === 'completed' && (
              <Ionicons name="checkmark" size={16} color="#FFF" />
            )}
          </View>
        </TouchableOpacity>
        
        <View style={styles.taskContent}>
          <Text style={[
            styles.taskTitle, 
            item.status === 'completed' && styles.completedTaskText
          ]}>
            {item.title}
          </Text>
          
          {item.description.length > 0 && (
            <Text 
              style={styles.taskDescription}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}
          
          <View style={styles.taskFooter}>
            <View style={styles.taskMeta}>
              <View style={[
                styles.priorityBadge, 
                { backgroundColor: getPriorityColor(item.priority) }
              ]}>
                <Text style={styles.priorityText}>
                  {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                </Text>
              </View>
              
              <View style={[
                styles.statusBadge, 
                { backgroundColor: getStatusColor(item.status) }
              ]}>
                <Text style={styles.statusText}>
                  {item.status === 'in_progress' ? 'In Progress' : 
                    item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
              
              <Text style={[styles.dueDate, overdueStyle]}>
                <Ionicons 
                  name="calendar-outline" 
                  size={12} 
                  color={isOverdue(item.dueDate, item.status) ? '#FF3B30' : colors.textLight} 
                />
                {' '}{formatDueDate(item.dueDate)}
              </Text>
            </View>
            
            <View style={styles.assigneeContainer}>
              {getMemberAvatar(item.assigneeId) ? (
                <Image 
                  source={{ uri: getMemberAvatar(item.assigneeId) }} 
                  style={styles.assigneeAvatar} 
                />
              ) : (
                <View style={styles.assigneePlaceholder}>
                  <Text style={styles.assigneeInitial}>
                    {getMemberName(item.assigneeId).charAt(0)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search team tasks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textLight}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>
      
      {renderFilterBadges()}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading team tasks...</Text>
        </View>
      ) : filteredTasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="list" size={48} color={colors.neutral} />
          <Text style={styles.emptyText}>No tasks found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery || filterStatus || filterPriority || filterAssignee ? 
              'Try adjusting your filters' : 'Add some tasks to get started'}
          </Text>
          {!searchQuery && !filterStatus && !filterPriority && !filterAssignee && onAddTask && (
            <TouchableOpacity style={styles.addButton} onPress={onAddTask}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.addButtonText}>Add Task</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTaskItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={loading}
          ListFooterComponent={
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
              </Text>
              {onAddTask && (
                <TouchableOpacity 
                  style={styles.addButtonSmall} 
                  onPress={onAddTask}
                >
                  <Ionicons name="add" size={16} color="#FFF" />
                  <Text style={styles.addButtonText}>New Task</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
};

// Filter chip component
interface FilterChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  color?: string;
  avatarUrl?: string;
}

const FilterChip: React.FC<FilterChipProps> = ({ 
  label, 
  isActive, 
  onPress, 
  color,
  avatarUrl
}) => {
  return (
    <TouchableOpacity 
      style={[
        styles.filterChip,
        isActive && { backgroundColor: color || colors.primary },
      ]}
      onPress={onPress}
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.filterAvatar} />
      ) : color && !isActive ? (
        <View style={[styles.colorDot, { backgroundColor: color }]} />
      ) : null}
      <Text style={[
        styles.filterChipText,
        isActive && styles.activeFilterText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: colors.text,
  },
  filterContainer: {
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  filterLabel: {
    marginLeft: 8,
    marginRight: 4,
    fontSize: 12,
    color: colors.textLight,
    alignSelf: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.text,
  },
  activeFilterText: {
    color: '#FFF',
    fontWeight: '500',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  filterAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginHorizontal: 32,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 24,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  addButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  taskItem: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  completedTask: {
    opacity: 0.7,
    borderLeftColor: '#4CD964',
  },
  checkboxContainer: {
    marginRight: 12,
    alignSelf: 'flex-start',
    paddingTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CD964',
    borderColor: '#4CD964',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
    color: colors.textLight,
  },
  taskDescription: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 8,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  priorityText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '500',
  },
  dueDate: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 4,
  },
  overdue: {
    color: '#FF3B30',
  },
  assigneeContainer: {
    marginLeft: 8,
  },
  assigneeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  assigneePlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assigneeInitial: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 14,
    color: colors.textLight,
  },
}); 