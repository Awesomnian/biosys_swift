import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export class LocationService {
  private currentLocation: LocationData | null = null;
  private permissionGranted: boolean = false;

  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      this.permissionGranted = status === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  async getCurrentLocation(): Promise<LocationData | null> {
    if (!this.permissionGranted) {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('Location permission not granted');
        return null;
      }
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };

      return this.currentLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  getLastKnownLocation(): LocationData | null {
    return this.currentLocation;
  }

  async startTracking(): Promise<void> {
    await this.getCurrentLocation();
  }

  hasPermission(): boolean {
    return this.permissionGranted;
  }
}
