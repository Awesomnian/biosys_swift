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
  // Permission API hangs - manually granted in Android settings
  console.log('Location permission assumed (manually granted)');
  this.permissionGranted = true;
  return true;
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
