import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Upload, Radio, MapPin } from 'lucide-react-native';
import { SensorService, SensorStats } from '../../services/sensorService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationService } from '../../services/locationService';

export default function MonitorScreen() {
  const [stats, setStats] = useState<SensorStats>({
    isRunning: false,
    totalSegmentsProcessed: 0,
    totalDetections: 0,
    pendingUploads: 0,
  });
  const [deviceId, setDeviceId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const sensorServiceRef = useRef<SensorService | null>(null);
  const locationServiceRef = useRef<LocationService>(new LocationService());

  useEffect(() => {
    initializeSensor();
  }, []);

  const initializeSensor = async () => {
    try {
      let id = await AsyncStorage.getItem('device_id');
      if (!id) {
        id = `sensor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('device_id', id);
      }
      setDeviceId(id);

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (error) {
        console.error('Microphone permission denied:', error);
        alert('Microphone access is required for audio detection. Please grant permission in settings.');
      }

      await locationServiceRef.current.requestPermission();
      const location = await locationServiceRef.current.getCurrentLocation();
      if (location) {
        setCurrentLocation({ latitude: location.latitude, longitude: location.longitude });
      }

      const threshold = await AsyncStorage.getItem('threshold');

      const sensor = new SensorService(
        {
          deviceId: id,
          segmentDuration: 5000,
          detectionThreshold: threshold ? parseFloat(threshold) : 0.9,
          latitude: location?.latitude,
          longitude: location?.longitude,
        },
        setStats
      );

      await sensor.initialize();
      sensorServiceRef.current = sensor;
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize sensor:', error);
    }
  };

  const handleStartStop = async () => {
    if (!sensorServiceRef.current) return;

    if (stats.isRunning) {
      sensorServiceRef.current.stop();
    } else {
      try {
        await sensorServiceRef.current.start();
      } catch (error) {
        alert('Failed to start audio capture. Please grant microphone permissions.');
      }
    }
  };

  const handleSync = async () => {
    if (!sensorServiceRef.current) return;
    await sensorServiceRef.current.syncData();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BioSys: Swift</Text>
        <Text style={styles.subtitle}>Swift Parrot Bioacoustic Sensor</Text>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Radio color={stats.isRunning ? '#10b981' : '#6b7280'} size={24} />
          <Text style={styles.statusText}>
            {stats.isRunning ? 'Monitoring Active' : 'Monitoring Stopped'}
          </Text>
        </View>
        {deviceId && (
          <Text style={styles.deviceId}>Device: {deviceId}</Text>
        )}
        {currentLocation && (
          <View style={styles.locationInfo}>
            <MapPin size={14} color="#6b7280" />
            <Text style={styles.locationText}>
              {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.controlCard}>
        <TouchableOpacity
          style={[
            styles.mainButton,
            stats.isRunning ? styles.stopButton : styles.startButton,
          ]}
          onPress={handleStartStop}
          disabled={!isInitialized}>
          {stats.isRunning ? (
            <>
              <Pause color="#fff" size={24} />
              <Text style={styles.buttonText}>Stop Monitoring</Text>
            </>
          ) : (
            <>
              <Play color="#fff" size={24} />
              <Text style={styles.buttonText}>Start Monitoring</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSync}
          disabled={!isInitialized || stats.pendingUploads === 0}>
          <Upload color="#10b981" size={20} />
          <Text style={styles.syncButtonText}>Sync Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalSegmentsProcessed}</Text>
          <Text style={styles.statLabel}>Segments Analyzed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalDetections}</Text>
          <Text style={styles.statLabel}>Detections</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.pendingUploads}</Text>
          <Text style={styles.statLabel}>Pending Uploads</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {stats.currentConfidence ? (stats.currentConfidence * 100).toFixed(1) + '%' : '--'}
          </Text>
          <Text style={styles.statLabel}>Last Confidence</Text>
        </View>
      </View>

      {stats.lastDetection && (
        <View style={styles.lastDetection}>
          <Text style={styles.lastDetectionLabel}>Last Detection:</Text>
          <Text style={styles.lastDetectionTime}>
            {stats.lastDetection.toLocaleString()}
          </Text>
        </View>
      )}
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
  statusCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  deviceId: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
  },
  controlCard: {
    margin: 16,
    marginTop: 0,
    gap: 12,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 18,
    borderRadius: 12,
  },
  startButton: {
    backgroundColor: '#10b981',
  },
  stopButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: 16,
    marginTop: 0,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  lastDetection: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  lastDetectionLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 4,
  },
  lastDetectionTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
