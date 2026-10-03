import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { HardwareHeader } from '../src/components/HardwareHeader';
import { HardwareNavBar } from '../src/components/HardwareNavBar';
import { getGarageColours, getGarageCars } from '../src/services/garageStorage';
import { CollectedColour, SavedCar } from '../src/types/vehicle';

export default function PaletteScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const [colours, setColours] = useState<CollectedColour[]>([]);
  const [allCars, setAllCars] = useState<SavedCar[]>([]);
  const [selectedColour, setSelectedColour] = useState<CollectedColour | null>(null);

  const loadData = useCallback(async () => {
    const [cList, carList] = await Promise.all([getGarageColours(), getGarageCars()]);
    setColours(cList);
    setAllCars(carList);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const associatedCars = selectedColour
    ? allCars.filter((car) => selectedColour.carIds.includes(car.id))
    : [];

  const handleColourPress = (colour: CollectedColour) => {
    if (colour.carIds.length === 1) {
      router.push({
        pathname: '/result',
        params: { id: colour.carIds[0] },
      });
    } else {
      setSelectedColour(colour);
    }
  };

  const renderColourItem = ({ item }: { item: CollectedColour }) => (
    <Pressable
      onPress={() => handleColourPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} paint swatch, used by ${item.count} car${item.count > 1 ? 's' : ''}`}
      style={({ pressed }) => [
        styles.swatchCard,
        {
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={[styles.swatchBlock, { backgroundColor: item.hex }]}>
        <View style={styles.swatchGlossHighlight} />
      </View>

      <View style={styles.swatchInfo}>
        <Text style={[styles.colourName, { color: theme.cardText }]} numberOfLines={1}>
          {item.name.toUpperCase()}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.hexCode, { color: theme.accentBlue }]}>{item.hex.toUpperCase()}</Text>
          <View style={[styles.countBadge, { backgroundColor: theme.displayBg }]}>
            <Text style={[styles.countText, { color: theme.cardTextMuted }]}>
              {item.count} {item.count === 1 ? 'CAR' : 'CARS'}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyDisplay, { backgroundColor: theme.displayBg, borderColor: theme.displayBorder }]}>
        <View style={[styles.emptyWheel, { borderColor: theme.accentBlue }]}>
          <View style={styles.miniSwatchGrid}>
            <View style={[styles.miniDot, { backgroundColor: '#EF4444' }]} />
            <View style={[styles.miniDot, { backgroundColor: '#3B82F6' }]} />
            <View style={[styles.miniDot, { backgroundColor: '#10B981' }]} />
            <View style={[styles.miniDot, { backgroundColor: '#F59E0B' }]} />
          </View>
        </View>

        <Text style={[styles.emptyTitle, { color: theme.displayText }]}>NO COLOURS ARCHIVED</Text>
        <Text style={[styles.emptySubtitle, { color: theme.displayTextMuted }]}>
          Scan vehicles and add them to your Garage to register their paint swatches in your collection.
        </Text>
      </View>

      <Pressable
        onPress={() => router.push('/scan')}
        accessibilityRole="button"
        accessibilityLabel="Scan a car to collect colours"
        style={({ pressed }) => [
          styles.actionBtn,
          {
            backgroundColor: theme.hardwareBg,
            borderColor: theme.hardwareBorder,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <Text style={styles.actionBtnIcon}>◈</Text>
        <Text style={styles.actionBtnText}>SCAN A CAR</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.hardwareBg }]} edges={['top', 'left', 'right']}>
      <HardwareHeader title="PAINT PALETTE" statusText="COLOURS FROM YOUR GARAGE" />

      <View style={[styles.container, { backgroundColor: theme.screenBg }]}>
        {colours.length > 0 && (
          <View style={[styles.statusBar, { backgroundColor: theme.displayBg, borderColor: theme.displayBorder }]}>
            <View style={styles.statusLeft}>
              <View style={[styles.statusDot, { backgroundColor: theme.ledGreen }]} />
              <Text style={[styles.statusCount, { color: theme.displayText }]}>
                {colours.length} {colours.length === 1 ? 'SWATCH REGISTERED' : 'SWATCHES REGISTERED'}
              </Text>
            </View>
            <Text style={[styles.statusHint, { color: theme.displayTextMuted }]}>TAP TO VIEW VEHICLES</Text>
          </View>
        )}

        <FlatList
          data={colours}
          keyExtractor={(item) => item.name}
          renderItem={renderColourItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[styles.listContent, colours.length === 0 && styles.listContentEmpty]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Associated Cars Modal */}
      <Modal
        visible={selectedColour !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedColour(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={[styles.modalSwatchDot, { backgroundColor: selectedColour?.hex }]} />
                <Text style={[styles.modalTitle, { color: theme.cardText }]}>
                  {selectedColour?.name.toUpperCase()}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedColour(null)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={[styles.closeBtnText, { color: theme.cardTextMuted }]}>✕</Text>
              </Pressable>
            </View>

            <Text style={[styles.modalSub, { color: theme.cardTextMuted }]}>
              {associatedCars.length} {associatedCars.length === 1 ? 'VEHICLE' : 'VEHICLES'} IN THIS COLOUR
            </Text>

            <FlatList
              data={associatedCars}
              keyExtractor={(car) => car.id}
              renderItem={({ item: car }) => (
                <Pressable
                  onPress={() => {
                    setSelectedColour(null);
                    router.push({
                      pathname: '/result',
                      params: { id: car.id },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.carRow,
                    {
                      backgroundColor: theme.screenBg,
                      borderColor: theme.cardBorder,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                >
                  <Image source={{ uri: car.imageUri }} style={styles.carRowThumb} />
                  <View style={styles.carRowDetails}>
                    <Text style={[styles.carRowMake, { color: theme.cardText }]}>{car.make.toUpperCase()}</Text>
                    <Text style={[styles.carRowModel, { color: theme.accentBlue }]}>{car.model.toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.carRowArrow, { color: theme.cardTextMuted }]}>→</Text>
                </Pressable>
              )}
              contentContainerStyle={styles.carListContent}
            />
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
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusCount: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusHint: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  listContent: {
    padding: 12,
    gap: 10,
  },
  listContentEmpty: {
    paddingTop: 16,
  },
  columnWrapper: {
    gap: 10,
    justifyContent: 'space-between',
  },
  swatchCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  swatchBlock: {
    height: 96,
    width: '100%',
    position: 'relative',
  },
  swatchGlossHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  swatchInfo: {
    padding: 10,
    gap: 6,
  },
  colourName: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hexCode: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  countText: {
    fontSize: 9,
    fontWeight: '800',
  },
  emptyContainer: {
    padding: 16,
    gap: 16,
  },
  emptyDisplay: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyWheel: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniSwatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 24,
    gap: 4,
    justifyContent: 'center',
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptySubtitle: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    maxWidth: 240,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 14,
  },
  actionBtnIcon: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 16,
    maxHeight: '75%',
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalSwatchDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  carListContent: {
    gap: 8,
    paddingTop: 4,
  },
  carRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  carRowThumb: {
    width: 50,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#0F172A',
  },
  carRowDetails: {
    flex: 1,
  },
  carRowMake: {
    fontSize: 11,
    fontWeight: '800',
  },
  carRowModel: {
    fontSize: 12,
    fontWeight: '900',
  },
  carRowArrow: {
    fontSize: 14,
    fontWeight: '800',
    paddingRight: 6,
  },
});

