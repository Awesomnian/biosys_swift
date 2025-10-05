import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Upload, Radio, MapPin, Smartphone, CircleAlert as AlertCircle } from 'lucide-react-native';
import { SensorService, SensorStats } from '../../services/sensorService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationService } from '../../services/locationService';

function WebOnlyMessage() {
  return (
    <View style={styles.webContainer}>
      <View style={styles.webContent}>
        <Smartphone size={64} color="#10b981" />
        <Text style={styles.webTitle}>Mobile App Only</Text>
        <Text style={styles.webText}>
          BioSys: Swift is a mobile bioacoustic monitoring app that requires native device features like microphone access and GPS.
        </Text>
        <Text style={styles.webText}>
          Please scan the QR code with your mobile device to use this app.
        </Text>
      </View>
    </View>
  );
}

function MobileMonitorScreen() {
  const [stats, setStats] = useState<SensorStats>({
    isRunning: false,
    totalSegmentsProcessed: 0,
    totalDetections: 0,
    pendingUploads: 0,
  });
  const [deviceId, setDeviceId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const sensorServiceRef = useRef<SensorService | null>(null);
  const locationServiceRef = useRef<LocationService>(new LocationService());

  useEffect(() => {
    initializeSensor();
  }, []);

  useEffect(() => {
    if (stats.isRunning && isStarting) {
      setIsStarting(false);
    }
    if (!stats.isRunning && isStopping) {
      setIsStopping(false);
    }
  }, [stats.isRunning]);

  const initializeSensor = async () => {
    let currentStep = 'Starting';
    try {
      // Step 1: Device ID
      currentStep = 'Device ID creation';
      console.log('🔧 INIT Step 1: Device ID...');
      
      let id = await AsyncStorage.getItem('device_id');
      if (!id) {
        id = `sensor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('device_id', id);
      }
      setDeviceId(id);
      console.log('✅ Device ID OK:', id);

      // Step 2: Location (with timeout)
      currentStep = 'Location service';
      console.log('🔧 INIT Step 2: Location (5s timeout)...');
      try {
        const locationPromise = (async () => {
          await locationServiceRef.current.requestPermission();
          return await locationServiceRef.current.getCurrentLocation();
        })();
        
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Location timeout')), 5000)
        );
        
        const location = await Promise.race([locationPromise, timeoutPromise]) as any;
        if (location && location.latitude) {
          setCurrentLocation({ latitude: location.latitude, longitude: location.longitude });
          console.log('✅ Location OK:', location.latitude, location.longitude);
        } else {
          console.log('⚠️ No location, using defaults');
        }
      } catch (locationError) {
        console.warn('⚠️ Location failed (using defaults):', locationError instanceof Error ? locationError.message : String(locationError));
      }

      // Step 3: Threshold
      currentStep = 'Threshold retrieval';
      const threshold = await AsyncStorage.getItem('threshold');
      console.log('🔧 Threshold:', threshold || '0.9 (default)');

      // Step 4: SensorService creation
      currentStep = 'SensorService creation';
      console.log('🔧 INIT Step 3: Creating SensorService...');
      console.log('  📋 With config:', {
        deviceId: id,
        segmentDuration: 5000,
        threshold: threshold ? parseFloat(threshold) : 0.9,
        lat: currentLocation?.latitude || -42.8821,
        lon: currentLocation?.longitude || 147.3272
      });
      
      let sensor;
      try {
        sensor = new SensorService(
          {
            deviceId: id,
            segmentDuration: 5000,
            detectionThreshold: threshold ? parseFloat(threshold) : 0.9,
            latitude: currentLocation?.latitude || -42.8821,
            longitude: currentLocation?.longitude || 147.3272,
          },
          setStats
        );
        console.log('✅ SensorService created, object type:', typeof sensor);
      } catch (sensorError) {
        console.error('❌ FAILED at SensorService creation:', sensorError);
        throw new Error(`SensorService creation failed: ${sensorError instanceof Error ? sensorError.message : String(sensorError)}`);
      }

      // Step 5: Model initialization
      currentStep = 'Model initialization';
      console.log('🔧 INIT Step 4: Initializing model...');
      console.log('  🔧 About to call sensor.initialize()...');
      try {
        console.log('  ⏳ Calling initialize()...');
        await sensor.initialize();
        console.log('  ✅ initialize() returned successfully');
        console.log('✅ Model initialized successfully');
      } catch (modelError) {
        console.error('❌ FAILED at model initialization:', modelError);
        throw new Error(`Model initialization failed: ${modelError instanceof Error ? modelError.message : String(modelError)}`);
      }
      
      // Step 6: Final setup
      console.log('🔧 INIT Step 5: Final setup...');
      console.log('  📦 Setting sensorServiceRef.current...');
      sensorServiceRef.current = sensor;
      console.log('  ✅ sensorServiceRef.current set');
      
      console.log('  🎛️ Calling setIsInitialized(true)...');
      setIsInitialized(true);
      console.log('  ✅ setIsInitialized called');
      
      console.log('🎉 INITIALIZATION COMPLETE - App ready!');
      console.log('  📊 Final state: isInitialized should now be TRUE');
      
    } catch (error: unknown) {
      console.error('❌ INITIALIZATION CRASHED at:', currentStep);
      console.error('Error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Show detailed alert
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`❌ Initialization Failed at: ${currentStep}\n\nError: ${errorMsg}\n\nCheck terminal logs for details.`);
      
      // Set initialized anyway so UI is responsive
      setIsInitialized(true);
    }
  };

  const handleStartStop = async () => {
    if (!sensorServiceRef.current) return;

    if (stats.isRunning) {
      setIsStopping(true);
      try {
        sensorServiceRef.current.stop();
      } finally {
        setIsStopping(false);
      }
    } else {
      setIsStarting(true);
      try {
        await sensorServiceRef.current.start();
      } catch (error: unknown) {
        alert('Failed to start audio capture. Please grant microphone permissions.');
        setIsStarting(false);
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
          <Radio
            color={
              isStarting ? '#f59e0b' :
              stats.isRunning ? '#ef4444' :
              '#6b7280'
            }
            size={24}
          />
          <Text style={styles.statusText}>
            {isStarting ? 'Initiating...' :
             isStopping ? 'Stopping...' :
             stats.isRunning ? 'Monitoring Active' :
             'Monitoring Stopped'}
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
            isStarting ? styles.initiatingButton :
            stats.isRunning ? styles.activeButton :
            styles.startButton,
          ]}
          onPress={handleStartStop}
          disabled={!isInitialized || isStarting || isStopping}>
          {isStarting ? (
            <>
              <Radio color="#fff" size={24} />
              <Text style={styles.buttonText}>Initiating...</Text>
            </>
          ) : isStopping ? (
            <>
              <Pause color="#fff" size={24} />
              <Text style={styles.buttonText}>Stopping...</Text>
            </>
          ) : stats.isRunning ? (
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

      {stats.lastError && (
        <View style={styles.errorCard}>
          <View style={styles.errorHeader}>
            <AlertCircle color="#ef4444" size={20} />
            <Text style={styles.errorTitle}>Connection Issue</Text>
          </View>
          <Text style={styles.errorText}>{stats.lastError}</Text>
          {(stats.consecutiveErrors ?? 0) > 0 && (
            <Text style={styles.errorCount}>
              {stats.consecutiveErrors} consecutive error{stats.consecutiveErrors === 1 ? '' : 's'}
            </Text>
          )}
          {stats.lastError.includes('BirdNET') && (
            <View style={styles.errorHint}>
              <Text style={styles.errorHintText}>
                Make sure your BirdNET server is accessible from this device. If using ngrok, the URL must be reachable from your mobile network.
              </Text>
            </View>
          )}
        </View>
      )}

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
  initiatingButton: {
    backgroundColor: '#f59e0b',
  },
  activeButton: {
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
  webContainer: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  webContent: {
    maxWidth: 500,
    alignItems: 'center',
    gap: 20,
  },
  webTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
  },
  webText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  errorText: {
    fontSize: 14,
    color: '#fca5a5',
    lineHeight: 20,
  },
  errorCount: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  errorHint: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  errorHintText: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
});

export default function MonitorScreen() {
  if (Platform.OS === 'web') {
    return <WebOnlyMessage />;
  }
  return <MobileMonitorScreen />;
}
