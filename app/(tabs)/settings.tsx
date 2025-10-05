import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { Save, MapPin, FileSliders as Sliders, Smartphone } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const [deviceId, setDeviceId] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [threshold, setThreshold] = useState('0.9');
  const [autoSync, setAutoSync] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const id = await AsyncStorage.getItem('device_id');
      const lat = await AsyncStorage.getItem('latitude');
      const lon = await AsyncStorage.getItem('longitude');
      const thresh = await AsyncStorage.getItem('threshold');
      const sync = await AsyncStorage.getItem('auto_sync');

      if (id) setDeviceId(id);
      if (lat) setLatitude(lat);
      if (lon) setLongitude(lon);
      if (thresh) setThreshold(thresh);
      if (sync !== null) setAutoSync(sync === 'true');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      if (latitude) await AsyncStorage.setItem('latitude', latitude);
      if (longitude) await AsyncStorage.setItem('longitude', longitude);
      await AsyncStorage.setItem('threshold', threshold);
      await AsyncStorage.setItem('auto_sync', autoSync.toString());

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    }
  };

  const requestLocation = async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
        },
        (error) => {
          alert('Failed to get location: ' + error.message);
        }
      );
    } else {
      alert('Geolocation is not supported');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Configure sensor parameters</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Smartphone size={20} color="#10b981" />
          <Text style={styles.sectionTitle}>Device Information</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Device ID</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={deviceId}
            editable={false}
            placeholderTextColor="#6b7280"
          />
          <Text style={styles.helpText}>
            Unique identifier for this sensor
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MapPin size={20} color="#10b981" />
          <Text style={styles.sectionTitle}>Location</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Latitude</Text>
          <TextInput
            style={styles.input}
            value={latitude}
            onChangeText={setLatitude}
            placeholder="-41.077"
            keyboardType="numeric"
            placeholderTextColor="#6b7280"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Longitude</Text>
          <TextInput
            style={styles.input}
            value={longitude}
            onChangeText={setLongitude}
            placeholder="145.344"
            keyboardType="numeric"
            placeholderTextColor="#6b7280"
          />
        </View>

        <TouchableOpacity
          style={styles.locationButton}
          onPress={requestLocation}>
          <MapPin size={16} color="#10b981" />
          <Text style={styles.locationButtonText}>Use Current Location</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Sliders size={20} color="#10b981" />
          <Text style={styles.sectionTitle}>Detection Parameters</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confidence Threshold</Text>
          <TextInput
            style={styles.input}
            value={threshold}
            onChangeText={setThreshold}
            placeholder="0.9"
            keyboardType="numeric"
            placeholderTextColor="#6b7280"
          />
          <Text style={styles.helpText}>
            Minimum confidence (0.0 - 1.0) to trigger detection
          </Text>
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>Auto-sync detections</Text>
            <Text style={styles.helpText}>
              Upload data when online
            </Text>
          </View>
          <Switch
            value={autoSync}
            onValueChange={setAutoSync}
            trackColor={{ false: '#374151', true: '#10b98160' }}
            thumbColor={autoSync ? '#10b981' : '#6b7280'}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saved && styles.savedButton]}
        onPress={saveSettings}>
        <Save size={20} color="#fff" />
        <Text style={styles.saveButtonText}>
          {saved ? 'Saved!' : 'Save Settings'}
        </Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tarkine Ears v1.0 - Proof of Concept
        </Text>
        <Text style={styles.footerSubtext}>
          For production deployment, use native Android app
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  section: {
    margin: 16,
    padding: 20,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d1d5db',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  disabledInput: {
    opacity: 0.5,
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    margin: 16,
    padding: 18,
    backgroundColor: '#10b981',
    borderRadius: 12,
  },
  savedButton: {
    backgroundColor: '#059669',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 11,
    color: '#4b5563',
  },
});
