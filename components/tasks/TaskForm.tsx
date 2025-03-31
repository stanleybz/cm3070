import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Task } from '../../types/task';
import { colors, spacing, borderRadius } from '../../app/theme';

interface TaskFormProps {
  onSubmit: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  initialValues?: Partial<Task>;
  submitLabel?: string;
  onCancel?: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  onSubmit,
  initialValues,
  submitLabel = 'Add Task',
  onCancel,
}) => {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [dueDate, setDueDate] = useState(initialValues?.dueDate || new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState<Task['priority']>(
    initialValues?.priority || 'medium'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    // Create a timeout to prevent getting stuck in loading state
    const submitTimeout = setTimeout(() => {
      if (isSubmitting) {
        setIsSubmitting(false);
        setError('Request is taking too long. Please try again.');
        Alert.alert('Error', 'The operation timed out. Please try again.');
      }
    }, 10000); // 10 second timeout

    try {
      setIsSubmitting(true);
      setError(null);
      
      const result = await onSubmit({
        title: title.trim(),
        description: description.trim(),
        dueDate,
        status: 'pending',
        priority,
        tags: initialValues?.tags || [],
        userId: 'temp-user-id',
      });

      // If we get here, submission was successful
      clearTimeout(submitTimeout);
      
      // Reset form for new task creation
      if (!initialValues?.id) {
        setTitle('');
        setDescription('');
        setDueDate(new Date());
        setPriority('medium');
      }
      
      return result;
    } catch (err) {
      clearTimeout(submitTimeout);
      console.error('Error submitting form:', err);
      setError(err instanceof Error ? err.message : 'Failed to save task');
      // Show alert with error
      Alert.alert(
        'Error', 
        err instanceof Error ? err.message : 'Failed to save task. Please try again.'
      );
      throw err; // Re-throw to let parent component know submission failed
    } finally {
      clearTimeout(submitTimeout);
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingView}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{initialValues?.id ? 'Edit Task' : 'Create Task'}</Text>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Task Title"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (error && text.trim()) setError(null);
              }}
              placeholderTextColor={colors.textLight}
            />
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.textLight}
            />
          </View>

          <View style={styles.priorityContainer}>
            <Text style={styles.label}>Priority:</Text>
            <View style={styles.priorityButtons}>
              {(['low', 'medium', 'high'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityButton,
                    priority === p && styles.priorityButtonActive,
                    priority === p && 
                      p === 'low' ? { backgroundColor: '#FFC800' } : 
                      p === 'medium' ? { backgroundColor: '#FF9600' } : 
                      { backgroundColor: '#FF4B4B' }
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[
                      styles.priorityButtonText,
                      priority === p && styles.priorityButtonTextActive,
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>Due Date: {dueDate.toLocaleDateString()}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setDueDate(selectedDate);
                }
              }}
            />
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, isSubmitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>{submitLabel}</Text>
              )}
            </TouchableOpacity>
            {onCancel && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.primary,
    borderTopLeftRadius: borderRadius.large,
    borderTopRightRadius: borderRadius.large,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.medium,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  form: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  inputWrapper: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.medium,
    backgroundColor: colors.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    borderRadius: borderRadius.medium,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.text,
  },
  priorityContainer: {
    marginBottom: spacing.md,
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  priorityButtonActive: {
    shadowOffset: { width: 0, height: 1 },
    transform: [{ translateY: 2 }],
  },
  priorityButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  priorityButtonTextActive: {
    color: '#FFFFFF',
  },
  dateButton: {
    padding: spacing.md,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.large,
    marginBottom: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateButtonText: {
    color: colors.text,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 0,
    elevation: 4,
  },
  submitButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primaryDark,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#ECECEC',
    shadowColor: '#D1D1D1',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorText: {
    color: colors.danger,
    marginBottom: spacing.md,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
}); 