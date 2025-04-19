import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Checkbox } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function WorkOrderItem({ workOrder }) {
  const [checked, setChecked] = React.useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{workOrder.title}</Text>
        <TouchableOpacity>
          <Icon name="info" size={24} color="#5D6271" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{workOrder.type}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Lokasjon</Text>
          <Text style={styles.value}>{workOrder.location}</Text>
        </View>
      </View>
      
      <Checkbox.Android
        status={checked ? 'checked' : 'unchecked'}
        onPress={() => setChecked(!checked)}
        color="#5D6271"
        style={styles.checkbox}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  content: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 80,
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  checkbox: {
    alignSelf: 'flex-end',
  },
});