import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors, spacing, typography } from '../src/theme';

export default function LocationPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string }>();

  const initialLat = params.latitude ? parseFloat(params.latitude) : 37.7749;
  const initialLng = params.longitude ? parseFloat(params.longitude) : -122.4194;

  const [selectedLocation, setSelectedLocation] = useState({
    latitude: initialLat,
    longitude: initialLng,
  });

  const [region, setRegion] = useState<Region>({
    latitude: initialLat,
    longitude: initialLng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    if (!params.latitude) {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setSelectedLocation(coords);
          setRegion((r) => ({ ...r, ...coords }));
        }
      })();
    }
  }, [params.latitude]);

  function handleConfirm() {
    router.navigate({
      pathname: '/swipe',
      params: {
        topic: 'food',
        pickedLatitude: selectedLocation.latitude.toString(),
        pickedLongitude: selectedLocation.longitude.toString(),
      },
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pick Location</Text>
        <TouchableOpacity onPress={handleConfirm}>
          <Text style={styles.confirmButton}>Done</Text>
        </TouchableOpacity>
      </View>
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        onPress={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
      >
        <Marker coordinate={selectedLocation} draggable onDragEnd={(e) => setSelectedLocation(e.nativeEvent.coordinate)} />
      </MapView>
      <Text style={styles.hint}>Tap or drag the pin to set your search center</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.subtitle,
  },
  backButton: {
    ...typography.body,
    color: colors.primary,
  },
  confirmButton: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  hint: {
    ...typography.caption,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
