// Adjusted WorkOrderItems.js with smaller UI elements
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Checkbox } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function WorkOrderItem({ workOrder, onToggleComplete, onViewDetails }) {
  const [checked, setChecked] = useState(workOrder.status === 'completed');

  const handleCheck = () => {
    if (workOrder.status === 'completed') return;
    
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

  // Calculate the progress bar colors based on progress
  const getProgressColor = (progress) => {
    if (progress > 0.75) return '#F44336'; // Red for high urgency
    if (progress > 0.5) return '#FF9800';  // Orange for medium urgency
    return '#4CAF50';                      // Green for low urgency
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{workOrder.title}</Text>
        <TouchableOpacity onPress={handleInfoPress}>
          <MaterialIcons name="info-outline" size={16} color="#5D6271" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Type</Text>
          <Text style={styles.infoValue}>{workOrder.type || 'Standard'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Location</Text>
          <Text style={styles.infoValue}>{workOrder.location || '-'}</Text>
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
                { 
                  width: `${workOrder.progress * 100}%`,
                  backgroundColor: getProgressColor(workOrder.progress)
                }
              ]} 
            />
          </View>
        </View>
      )}
      
      <View style={styles.checkboxContainer}>
        <Checkbox.Android
          status={checked ? 'checked' : 'unchecked'}
          onPress={handleCheck}
          color="#5D6271"
          disabled={workOrder.status === 'completed'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  cardContent: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  infoLabel: {
    width: 60,
    fontSize: 12,
    color: '#666',
  },
  infoValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  progressSection: {
    marginTop: 4,
    marginBottom: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  progressLabel: {
    fontSize: 11,
    color: '#666',
  },
  timeRemaining: {
    fontSize: 11,
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
  checkboxContainer: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
});