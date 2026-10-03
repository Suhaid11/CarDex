import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { HardwareHeader } from '../src/components/HardwareHeader';
import { HardwareNavBar } from '../src/components/HardwareNavBar';
import { SavedCar } from '../src/types/vehicle';
import { getGarageCars, removeVehicleFromGarage, resolveColourHex } from '../src/services/garageStorage';

export default function GarageScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [cars, setCars] = useState<SavedCar[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [carToDelete, setCarToDelete] = useState<SavedCar | null>(null);

  // Reload saved cars every time screen gains focus
  const loadCars = useCallback(() => {
    let isMounted = true;
    getGarageCars().then((loaded) => {
      if (isMounted) {
        setCars(loaded);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(loadCars);

  const openCarDetail = (car: SavedCar) => {
    router.push({
      pathname: '/result',
      params: {
        data: JSON.stringify(car),
        imageUri: car.imageUri,
        id: car.id,
      },
    });
  };

  const handleConfirmDelete = async () => {
    if (!carToDelete) return;
    const targetId = carToDelete.id;
    setCarToDelete(null);
    await removeVehicleFromGarage(targetId);
    const updated = await getGarageCars();
    setCars(updated);
  };

  const renderCarTile = ({ item }: { item: SavedCar }) => {
    const swatchHex = item.colour_hex || resolveColourHex(item.colour_name);

    return (
      <Pressable
        onPress={() => openCarDetail(item)}
        accessibilityRole="button"
        accessibilityLabel={`View ${item.make} ${item.model}`}
        style={({ pressed }) => [
          styles.carTile,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        {/* Tile Image Viewport */}
        <View style={[styles.tileViewport, { backgroundColor: theme.displayBg }]}>
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={styles.tileImage} resizeMode="contain" />
          ) : (
            <Text style={styles.tileEmoji}>🚘</Text>
          )}
        </View>

        {/* Tile Metadata */}
        <View style={styles.tileInfo}>
          <View style={styles.tileHeaderRow}>
            <View style={styles.tileTitleCol}>
              <Text style={[styles.tileMake, { color: theme.accentBlue }]} numberOfLines={1}>
                {item.make.toUpperCase()}
              </Text>
              <Text style={[styles.tileModel, { color: theme.cardText }]} numberOfLines={1}>
                {item.model.toUpperCase()}
              </Text>
            </View>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                setCarToDelete(item);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.make} ${item.model}`}
              style={({ pressed }) => [
                styles.trashBtn,
                { opacity: pressed ? 0.5 : 0.75 },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.trashIcon}>🗑</Text>
            </Pressable>
          </View>

          {/* Swatch & Date Row */}
          <View style={styles.tileMetaRow}>
            <View style={styles.swatchPair}>
              <View style={[styles.swatchDot, { backgroundColor: swatchHex }]} />
              <Text style={[styles.swatchLabel, { color: theme.cardTextMuted }]} numberOfLines={1}>
                {item.colour_name}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.hardwareBg }]} edges={['top', 'left', 'right']}>
      <HardwareHeader
        title="MY GARAGE"
        statusText={cars.length > 0 ? `${cars.length} CAR${cars.length === 1 ? '' : 'S'} REGISTERED` : 'EMPTY'}
      />

      <View style={[styles.container, { backgroundColor: theme.screenBg }]}>
        {loading ? null : cars.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.displayBg, borderColor: theme.displayBorder }]}>
                <Text style={styles.emptyIcon}>🚘</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: theme.cardText }]}>MY GARAGE</Text>
              <Text style={[styles.emptyHeadline, { color: theme.accentBlue }]}>No cars here yet.</Text>
              <Text style={[styles.emptyBody, { color: theme.cardTextMuted }]}>
                Scan something worth remembering.
              </Text>

              <Pressable
                onPress={() => router.push({ pathname: '/scan', params: { startScan: 'camera' } })}
                accessibilityRole="button"
                accessibilityLabel="Scan a car"
                style={({ pressed }) => [
                  styles.emptyScanBtn,
                  {
                    backgroundColor: theme.hardwareBg,
                    borderColor: theme.hardwareBorder,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Text style={styles.emptyScanBtnText}>⚡ SCAN A CAR</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* Populated 2-Column Collection Grid */
          <FlatList
            data={cars}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.rowWrapper}
            contentContainerStyle={styles.listContent}
            renderItem={renderCarTile}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Lightweight Remove Confirmation Modal */}
      <Modal
        visible={carToDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCarToDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalEmoji}>⚠️</Text>
              <Text style={[styles.modalTitle, { color: theme.cardText }]}>REMOVE THIS VEHICLE?</Text>
            </View>

            <Text style={[styles.modalBody, { color: theme.cardTextMuted }]}>
              Remove <Text style={{ fontWeight: '800', color: theme.cardText }}>{carToDelete?.make} {carToDelete?.model}</Text> from your CarDex garage collection?
            </Text>

            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => setCarToDelete(null)}
                accessibilityRole="button"
                accessibilityLabel="Cancel removal"
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  { backgroundColor: theme.btnSecondaryBg, borderColor: theme.cardBorder, opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Text style={[styles.modalCancelBtnText, { color: theme.btnSecondaryText }]}>CANCEL</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmDelete}
                accessibilityRole="button"
                accessibilityLabel="Confirm removal"
                style={({ pressed }) => [
                  styles.modalDeleteBtn,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Text style={styles.modalDeleteBtnText}>REMOVE</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <HardwareNavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    gap: 12,
    paddingBottom: 24,
  },
  rowWrapper: {
    gap: 12,
    justifyContent: 'space-between',
  },
  carTile: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  tileViewport: {
    height: 110,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileEmoji: {
    fontSize: 40,
  },
  tileInfo: {
    padding: 10,
    gap: 2,
  },
  tileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  tileTitleCol: {
    flex: 1,
    paddingRight: 4,
  },
  trashBtn: {
    padding: 2,
    marginTop: -2,
  },
  trashIcon: {
    fontSize: 13,
  },
  tileMake: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tileModel: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  tileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  swatchPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  swatchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  swatchLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 16,
    paddingTop: 20,
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyIcon: {
    fontSize: 30,
  },
  emptyTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  emptyHeadline: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptyBody: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8,
  },
  emptyScanBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
  },
  emptyScanBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 14,
    borderWidth: 2,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalEmoji: {
    fontSize: 22,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modalBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
