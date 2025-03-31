import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../app/theme';
import { TeamMemberTaskActivity } from '../../types/team';

interface TeamMemberCardProps {
  member: TeamMemberTaskActivity;
  onPress?: () => void;
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({ 
  member,
  onPress,
}) => {
  // Format date for last active display
  const formatLastActive = (date: Date | null): string => {
    if (!date) return 'Never active';
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };
  
  // Get streak badge color based on streak length
  const getStreakBadgeColor = (streak: number): string => {
    if (streak >= 10) return '#FF9600'; // Orange for long streaks
    if (streak >= 5) return colors.secondary; // Yellow for medium streaks
    return colors.primary; // Green for short streaks
  };
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.leftSection}>
        {member.avatarUrl ? (
          <Image source={{ uri: member.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            <Text style={styles.avatarText}>{member.memberName.charAt(0)}</Text>
          </View>
        )}
        
        {member.currentStreak > 0 && (
          <View style={[styles.streakBadge, { backgroundColor: getStreakBadgeColor(member.currentStreak) }]}>
            <Ionicons name="flame" size={10} color="#FFF" />
            <Text style={styles.streakText}>{member.currentStreak}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.centerSection}>
        <Text style={styles.memberName}>{member.memberName}</Text>
        <Text style={styles.lastActive}>
          <Ionicons name="time-outline" size={12} color={colors.textLight} />
          {' '}Active {formatLastActive(member.lastActiveAt)}
        </Text>
      </View>
      
      <View style={styles.rightSection}>
        <View style={styles.statsItem}>
          <Text style={styles.statsValue}>{member.taskCompletedToday}</Text>
          <Text style={styles.statsLabel}>Today</Text>
        </View>
        <View style={styles.statsItem}>
          <Text style={styles.statsValue}>{member.taskCompletedThisWeek}</Text>
          <Text style={styles.statsLabel}>Week</Text>
        </View>
        <View style={styles.detailsButton}>
          <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  leftSection: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  placeholderAvatar: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  streakBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  streakText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  lastActive: {
    fontSize: 12,
    color: colors.textLight,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsItem: {
    alignItems: 'center',
    marginHorizontal: 6,
    minWidth: 32,
  },
  statsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  statsLabel: {
    fontSize: 10,
    color: colors.textLight,
  },
  detailsButton: {
    marginLeft: 8,
    padding: 4,
  },
}); 