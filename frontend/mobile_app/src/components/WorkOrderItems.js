// Adjusted WorkOrderItems.js with smaller UI elements
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Checkbox } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function WorkOrderItem({ workOrder, onToggleComplete, onViewDetails }) {
  const [checked, setChecked] = React.useState(workOrder.status === 'completed');

  const handleCheck = () => {
    setChecked(!checked);
    if (onToggleComplete) {
      onToggleComplete(workOrder.id, !checked);
    }
  };

  const handleInfoPress = () => {
    if (onViewDetails) {
      onViewDetails(workOrder);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{workOrder.title}</Text>
        <TouchableOpacity onPress={handleInfoPress}>
          <Icon name="info" size={18} color="#5D6271" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{workOrder.type}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{workOrder.location}</Text>
        </View>
      </View>
      
      {workOrder.progress !== undefined && (
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.timeRemaining}>{workOrder.timeRemaining}</Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${workOrder.progress * 100}%` },
                workOrder.progress > 0.75 ? styles.highProgress :
                workOrder.progress > 0.5 ? styles.mediumProgress :
                styles.lowProgress
              ]} 
            />
          </View>
        </View>
      )}
      
      <Checkbox.Android
        status={checked ? 'checked' : 'unchecked'}
        onPress={handleCheck}
        color="#5D6271"
        style={styles.checkbox}
        uncheckedColor="#AAAAAA"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 10,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  content: {
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  label: {
    width: 60,
    fontSize: 12,
    color: '#666',
  },
  value: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  progressSection: {
    marginTop: 6,
    marginBottom: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
  },
  timeRemaining: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#EEEEEE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  lowProgress: {
    backgroundColor: '#52c41a', // Green
  },
  mediumProgress: {
    backgroundColor: '#FF9800', // Orange
  },
  highProgress: {
    backgroundColor: '#F44336', // Red
  },
  checkbox: {
    alignSelf: 'flex-end',
    margin: 0,
    padding: 0,
  },
});