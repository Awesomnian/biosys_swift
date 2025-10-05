import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { MapPin, Calendar, TrendingUp, Smartphone } from 'lucide-react-native';
import { supabase, Detection } from '../../lib/supabase';

function WebOnlyMessage() {
  return (
    <View style={styles.webContainer}>
      <View style={styles.webContent}>
        <Smartphone size={64} color="#10b981" />
        <Text style={styles.webTitle}>Mobile App Only</Text>
        <Text style={styles.webText}>
          The Detections screen shows Swift Parrot detections recorded on your mobile device. This feature requires mobile device hardware and native storage.
        </Text>
        <Text style={styles.webText}>
          Please scan the QR code with your mobile device to view detections.
        </Text>
      </View>
    </View>
  );
}

function MobileDetectionsScreen() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetections();
  }, []);

  const fetchDetections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('detections')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      setDetections(data || []);
    } catch (error) {
      console.error('Failed to fetch detections:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDetection = ({ item }: { item: Detection }) => (
    <View style={styles.detectionCard}>
      <View style={styles.detectionHeader}>
        <View style={styles.confidenceBadge}>
          <TrendingUp size={16} color="#10b981" />
          <Text style={styles.confidenceText}>
            {(item.confidence * 100).toFixed(1)}%
          </Text>
        </View>
        <Text style={styles.modelName}>{item.model_name}</Text>
      </View>

      <View style={styles.detectionInfo}>
        <View style={styles.infoRow}>
          <Calendar size={16} color="#9ca3af" />
          <Text style={styles.infoText}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>

        {item.latitude && item.longitude && (
          <View style={styles.infoRow}>
            <MapPin size={16} color="#9ca3af" />
            <Text style={styles.infoText}>
              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.detectionFooter}>
        <Text style={styles.deviceId}>{item.device_id}</Text>
        {item.audio_file_url && (
          <TouchableOpacity
            onPress={() => {
              console.log('Play audio:', item.audio_file_url);
            }}>
            <Text style={styles.playButton}>Play</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Detection History</Text>
        <Text style={styles.subtitle}>
          {detections.length} detection{detections.length !== 1 ? 's' : ''} recorded
        </Text>
      </View>

      <FlatList
        data={detections}
        renderItem={renderDetection}
        keyExtractor={(item) => item.id || ''}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchDetections}
            tintColor="#10b981"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No detections yet</Text>
            <Text style={styles.emptySubtext}>
              Start monitoring to detect Swift Parrot calls
            </Text>
          </View>
        }
      />
    </View>
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
  listContent: {
    padding: 16,
  },
  detectionCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  detectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b98120',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  modelName: {
    fontSize: 12,
    color: '#6b7280',
  },
  detectionInfo: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#d1d5db',
  },
  detectionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  deviceId: {
    fontSize: 12,
    color: '#6b7280',
  },
  playButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#4b5563',
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
});

export default function DetectionsScreen() {
  if (Platform.OS === 'web') {
    return <WebOnlyMessage />;
  }
  return <MobileDetectionsScreen />;
}
