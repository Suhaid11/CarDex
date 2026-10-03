import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { HardwareHeader } from '../src/components/HardwareHeader';
import { HardwareNavBar } from '../src/components/HardwareNavBar';
import { VehicleIdentificationResult, SavedCar } from '../src/types/vehicle';
import {
  saveVehicleToGarage,
  removeVehicleFromGarage,
  isVehicleSaved,
  resolveColourHex,
  getGarageCarById,
} from '../src/services/garageStorage';

export default function ResultScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ data?: string; imageUri?: string; id?: string; savedCarId?: string }>();

  const [savedCarRecord, setSavedCarRecord] = useState<SavedCar | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  // Load car from storage if opened via id from Garage, Palette, or Home
  useEffect(() => {
    const targetId = params.id || params.savedCarId;
    if (targetId) {
      getGarageCarById(targetId).then((car) => {
        if (car) {
          setSavedCarRecord(car);
          setIsSaved(true);
        }
      });
    }
  }, [params.id, params.savedCarId]);

  // Parse live result if received from scan flow
  let parsedData: (VehicleIdentificationResult & Partial<SavedCar>) | null = null;
  if (params.data) {
    try {
      parsedData = JSON.parse(params.data);
    } catch {
      parsedData = null;
    }
  }

  // Fallback sample vehicle for previewing without live scan
  const sampleVehicle: VehicleIdentificationResult = {
    make: 'BMW',
    model: '3 SERIES',
    variant: '330i M Sport',
    colour_name: 'Deep Blue',
    confidence: 0.92,
    top3: [
      { make: 'BMW', model: '3 Series', confidence: 0.92 },
      { make: 'BMW', model: '4 Series Gran Coupe', confidence: 0.05 },
      { make: 'Audi', model: 'A4', confidence: 0.03 },
    ],
    car_bbox: { x: 0.12, y: 0.18, width: 0.76, height: 0.64 },
  };

  const vehicle = savedCarRecord || parsedData || sampleVehicle;
  const isLive = savedCarRecord !== null || parsedData !== null;
  const imageUri = savedCarRecord?.imageUri || params.imageUri || (parsedData as SavedCar)?.imageUri;
  const confidencePercent = Math.round(vehicle.confidence * 100);
  const isUncertain = vehicle.confidence < 0.60;
  const colourHex = (vehicle as SavedCar).colour_hex || resolveColourHex(vehicle.colour_name);

  const carId = savedCarRecord?.id || (vehicle as SavedCar)?.id;
  const [justAdded, setJustAdded] = useState<boolean>(false);

  // Check if car is already saved in AsyncStorage
  useEffect(() => {
    if (savedCarRecord || carId) {
      setIsSaved(true);
      return;
    }
    isVehicleSaved(carId, imageUri)
      .then((saved) => setIsSaved(saved))
      .catch(() => {});
  }, [carId, imageUri, savedCarRecord]);

  // Handle Add to Garage action
  const handleAddToGarage = async () => {
    if (isSaved || saveLoading) return;
    setSaveLoading(true);
    try {
      const saved = await saveVehicleToGarage(vehicle, imageUri || '');
      setSavedCarRecord(saved);
      setIsSaved(true);
      setJustAdded(true);
    } catch {
      //
    } finally {
      setSaveLoading(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Handle Remove from Garage action with confirmation
  const handleConfirmDelete = async () => {
    const targetId = savedCarRecord?.id || (vehicle as SavedCar)?.id || params.id || params.savedCarId;
    if (!targetId) {
      setShowDeleteModal(false);
      return;
    }

    setDeleteLoading(true);
    try {
      await removeVehicleFromGarage(targetId);
      setIsSaved(false);
      setSavedCarRecord(null);
      setJustAdded(false);
      setShowDeleteModal(false);
      router.replace('/garage');
    } catch {
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.hardwareBg }]} edges={['top', 'left', 'right']}>
      <HardwareHeader title="CARDEX" statusText={isLive ? 'FIELD ENTRY' : 'PREVIEW'} />

      <ScrollView contentContainerStyle={styles.scrollContent} style={[styles.container, { backgroundColor: theme.screenBg }]}>
        {/* Main Collectible Card Container */}
        <View style={[styles.cardChassis, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          {/* Card Meta Header */}
          <View style={styles.cardMetaRow}>
            <View style={[styles.badgePill, { backgroundColor: theme.hardwareBevel }]}>
              <Text style={styles.badgeText}>FIELD ENTRY</Text>
            </View>
            <Text style={[styles.dateText, { color: theme.cardTextMuted }]}>
              {(vehicle as SavedCar).createdAt
                ? new Date((vehicle as SavedCar).createdAt).toLocaleDateString()
                : 'SCANNED TODAY'}
            </Text>
          </View>

          {/* Hero Vehicle Photo Viewport */}
          <View style={[styles.heroViewport, { backgroundColor: theme.displayBg, borderColor: theme.displayBorder }]}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.carPhoto} resizeMode="contain" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.placeholderEmoji}>🏎️</Text>
                <Text style={[styles.placeholderText, { color: theme.accentBlue }]}>OPTICAL CAPTURE</Text>
              </View>
            )}
          </View>

          {/* Primary Identity Section */}
          <View style={styles.identityBlock}>
            <Text style={[styles.makeLabel, { color: theme.accentBlue }]}>{vehicle.make.toUpperCase()}</Text>
            <Text style={[styles.modelTitle, { color: theme.cardText }]}>{vehicle.model.toUpperCase()}</Text>
            {vehicle.variant ? (
              <Text style={[styles.variantText, { color: theme.cardTextMuted }]}>{vehicle.variant}</Text>
            ) : null}
          </View>

          {/* Prominent Primary Action: ADD TO GARAGE */}
          <Pressable
            onPress={handleAddToGarage}
            disabled={isSaved || saveLoading}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? (justAdded ? 'Added to Garage' : 'In Garage') : 'Add to Garage'}
            style={({ pressed }) => [
              styles.garageBtn,
              {
                backgroundColor: isSaved ? theme.success : theme.hardwareBg,
                borderColor: isSaved ? theme.success : theme.hardwareBorder,
                transform: [{ scale: pressed && !isSaved ? 0.98 : 1 }],
                opacity: isSaved ? 0.95 : 1,
              },
            ]}
          >
            <Text style={styles.garageBtnText}>
              {saveLoading
                ? 'SAVING...'
                : justAdded
                ? '✓ ADDED TO GARAGE'
                : isSaved
                ? '✓ IN GARAGE'
                : '+ ADD TO GARAGE'}
            </Text>
          </Pressable>

          {/* Remove from Garage action if saved */}
          {isSaved && (
            <Pressable
              onPress={() => setShowDeleteModal(true)}
              disabled={deleteLoading}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${vehicle.make} ${vehicle.model} from Garage`}
              style={({ pressed }) => [
                styles.removeGarageBtn,
                {
                  backgroundColor: theme.screenBg,
                  borderColor: theme.cardBorder,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={styles.removeGarageBtnText}>🗑 REMOVE FROM GARAGE</Text>
            </Pressable>
          )}

          {/* Colour Swatch Section */}
          <View style={[styles.specPanel, { backgroundColor: theme.screenBg, borderColor: theme.cardBorder }]}>
            <Text style={[styles.specSectionTitle, { color: theme.cardTextMuted }]}>COLOUR PROFILE</Text>
            <View style={styles.colourRow}>
              <View
                style={[
                  styles.colourSwatch,
                  {
                    backgroundColor: colourHex,
                    borderColor: colourHex === '#F8FAFC' ? theme.cardBorder : 'rgba(0,0,0,0.15)',
                  },
                ]}
              />
              <View style={styles.colourTextCol}>
                <Text style={[styles.colourName, { color: theme.cardText }]}>{vehicle.colour_name}</Text>
                <Text style={[styles.colourHex, { color: theme.cardTextMuted }]}>{colourHex.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* Identification Confidence Section */}
          <View style={[styles.specPanel, { backgroundColor: theme.screenBg, borderColor: theme.cardBorder }]}>
            <Text style={[styles.specSectionTitle, { color: theme.cardTextMuted }]}>IDENTIFICATION</Text>
            <View style={styles.confidenceRow}>
              <Text style={[styles.confidenceMainText, { color: isUncertain ? theme.ledYellow : theme.cardText }]}>
                {isUncertain ? 'NOT COMPLETELY SURE' : `${confidencePercent}% CONFIDENT`}
              </Text>
            </View>

            {/* Low Confidence Fallback Matches */}
            {isUncertain && vehicle.top3 && vehicle.top3.length > 0 && (
              <View style={styles.uncertainBlock}>
                <Text style={[styles.uncertainLead, { color: theme.cardText }]}>
                  Most likely: <Text style={{ fontWeight: '800' }}>{vehicle.make} {vehicle.model}</Text>
                </Text>
                <Text style={[styles.altTitle, { color: theme.cardTextMuted }]}>Possible matches:</Text>
                {vehicle.top3.slice(0, 3).map((match, i) => (
                  <Text key={i} style={[styles.altItem, { color: theme.cardText }]}>
                    {i + 1}. {match.make} {match.model}
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* Secondary Actions Row */}
          <View style={styles.secondaryActions}>
            <Pressable
              onPress={() => router.push('/scan')}
              accessibilityRole="button"
              accessibilityLabel="Scan another car"
              style={({ pressed }) => [
                styles.actionBtnSecondary,
                {
                  backgroundColor: theme.btnSecondaryBg,
                  borderColor: theme.cardBorder,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.actionBtnSecondaryText, { color: theme.btnSecondaryText }]}>
                📷 SCAN ANOTHER CAR
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/garage')}
              accessibilityRole="button"
              accessibilityLabel="View Garage"
              style={({ pressed }) => [
                styles.actionBtnSecondary,
                {
                  backgroundColor: theme.btnSecondaryBg,
                  borderColor: theme.cardBorder,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.actionBtnSecondaryText, { color: theme.btnSecondaryText }]}>
                ⊞ MY GARAGE
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Lightweight Remove Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalEmoji}>⚠️</Text>
              <Text style={[styles.modalTitle, { color: theme.cardText }]}>REMOVE THIS VEHICLE?</Text>
            </View>

            <Text style={[styles.modalBody, { color: theme.cardTextMuted }]}>
              Remove <Text style={{ fontWeight: '800', color: theme.cardText }}>{vehicle.make} {vehicle.model}</Text> from your CarDex garage collection?
            </Text>

            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
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
                disabled={deleteLoading}
                accessibilityRole="button"
                accessibilityLabel="Confirm removal"
                style={({ pressed }) => [
                  styles.modalDeleteBtn,
                  { opacity: pressed || deleteLoading ? 0.75 : 1 },
                ]}
              >
                <Text style={styles.modalDeleteBtnText}>
                  {deleteLoading ? 'REMOVING...' : 'REMOVE'}
                </Text>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  cardChassis: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 16,
    gap: 14,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgePill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  dateText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroViewport: {
    height: 220,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  carPhoto: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: 6,
  },
  placeholderEmoji: {
    fontSize: 56,
  },
  placeholderText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  identityBlock: {
    gap: 2,
  },
  makeLabel: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  modelTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  variantText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  garageBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  garageBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  removeGarageBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  removeGarageBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  specPanel: {
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 12,
    gap: 8,
  },
  specSectionTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  colourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colourSwatch: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  colourTextCol: {
    gap: 2,
  },
  colourName: {
    fontSize: 15,
    fontWeight: '800',
  },
  colourHex: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceMainText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  uncertainBlock: {
    marginTop: 4,
    gap: 3,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 8,
  },
  uncertainLead: {
    fontSize: 12,
    lineHeight: 16,
  },
  altTitle: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  altItem: {
    fontSize: 11,
    fontWeight: '700',
    paddingLeft: 4,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondaryText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
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
