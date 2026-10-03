import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { HardwareHeader } from '../src/components/HardwareHeader';
import { HardwareNavBar } from '../src/components/HardwareNavBar';
import { getGarageCars, getGarageColours } from '../src/services/garageStorage';
import { SavedCar, CollectedColour } from '../src/types/vehicle';

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [recentCars, setRecentCars] = useState<SavedCar[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [colours, setColours] = useState<CollectedColour[]>([]);

  const loadGaragePreview = useCallback(async () => {
    const [cars, cols] = await Promise.all([getGarageCars(), getGarageColours()]);
    setTotalCount(cars.length);
    setRecentCars(cars.slice(0, 3));
    setColours(cols);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGaragePreview();
    }, [loadGaragePreview])
  );

  const formatCount = (count: number) => {
    return count < 10 ? `0${count}` : `${count}`;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.hardwareBg }]} edges={['top', 'left', 'right']}>
      <HardwareHeader title="CARDEX" statusText="FIELD GUIDE READY" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={[styles.container, { backgroundColor: theme.screenBg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Device Dashboard Cockpit Panel */}
        <View style={[styles.chassisCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <View style={[styles.displayPanel, { backgroundColor: theme.displayBg, borderColor: theme.displayBorder }]}>
            {/* Header Telemetry Bar */}
            <View style={styles.displayHeader}>
              <View style={styles.statusIndicator}>
                <View style={[styles.ledDot, { backgroundColor: theme.ledGreen }]} />
                <Text style={[styles.systemStatusText, { color: theme.displayText }]}>DATABASE ONLINE</Text>
              </View>
              <Text style={[styles.fieldIdText, { color: theme.displayTextMuted }]}>FIELD GUIDE v1.0</Text>
            </View>

            {/* Field Guide Overview Text */}
            <View style={styles.dashboardHero}>
              <Text style={[styles.dashboardTitle, { color: theme.displayText }]}>
                Automotive Field Guide
              </Text>
              <Text style={[styles.dashboardSubtitle, { color: theme.displayTextMuted }]}>
                Your personal specimen log of identified vehicles, paint finishes, and automotive specifications.
              </Text>
            </View>

            {/* Telemetry Quick Counters */}
            <View style={styles.telemetryGrid}>
              <Pressable
                onPress={() => router.push('/garage')}
                accessibilityRole="button"
                accessibilityLabel={`View Garage. ${totalCount} vehicles registered.`}
                style={({ pressed }) => [
                  styles.telemetryTile,
                  {
                    backgroundColor: theme.screenBg,
                    borderColor: theme.displayBorder,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.tileHeader}>
                  <Text style={[styles.tileNumber, { color: theme.accentBlue }]}>
                    {formatCount(totalCount)}
                  </Text>
                  <Text style={styles.tileIcon}>🚗</Text>
                </View>
                <Text style={[styles.tileLabel, { color: theme.displayText }]}>
                  VEHICLES REGISTERED
                </Text>
                <Text style={[styles.tileSubtext, { color: theme.displayTextMuted }]}>
                  OPEN GARAGE →
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/palette')}
                accessibilityRole="button"
                accessibilityLabel={`View Palette. ${colours.length} paint finishes archived.`}
                style={({ pressed }) => [
                  styles.telemetryTile,
                  {
                    backgroundColor: theme.screenBg,
                    borderColor: theme.displayBorder,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.tileHeader}>
                  <Text style={[styles.tileNumber, { color: theme.ledYellow }]}>
                    {formatCount(colours.length)}
                  </Text>
                  <Text style={styles.tileIcon}>🎨</Text>
                </View>
                <Text style={[styles.tileLabel, { color: theme.displayText }]}>
                  PAINTS ARCHIVED
                </Text>
                <Text style={[styles.tileSubtext, { color: theme.displayTextMuted }]}>
                  VIEW PALETTE →
                </Text>
              </Pressable>
            </View>

            {/* Direct Optical Scanner Action CTA */}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/scan',
                  params: { startScan: 'camera' },
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Scan a car immediately with camera"
              style={({ pressed }) => [
                styles.scanCtaBtn,
                {
                  backgroundColor: theme.hardwareBg,
                  borderColor: theme.hardwareBorder,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Text style={styles.scanCtaIcon}>📸</Text>
              <View style={styles.scanCtaTextGroup}>
                <Text style={styles.scanCtaTitle}>SCAN A CAR</Text>
                <Text style={styles.scanCtaSubtitle}>POINT CAMERA TO IDENTIFY SPECIMEN</Text>
              </View>
              <Text style={styles.scanCtaArrow}>⚡</Text>
            </Pressable>
          </View>
        </View>

        {/* Populated Content or Empty Onboarding */}
        {totalCount > 0 ? (
          <>
            {/* Section 1: Recent Discoveries */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleGroup}>
                  <Text style={[styles.sectionTitle, { color: theme.cardText }]}>
                    RECENT DISCOVERIES
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.cardTextMuted }]}>
                    LATEST IDENTIFIED SPECIMENS
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push('/garage')}
                  accessibilityRole="button"
                  accessibilityLabel="View complete garage collection"
                  style={({ pressed }) => [
                    styles.viewAllBtn,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.viewAllText, { color: theme.accentBlue }]}>
                    VIEW GARAGE ({totalCount}) →
                  </Text>
                </Pressable>
              </View>

              <View style={styles.recentList}>
                {recentCars.map((car) => (
                  <Pressable
                    key={car.id}
                    onPress={() =>
                      router.push({
                        pathname: '/result',
                        params: { id: car.id },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`View details for ${car.make} ${car.model}`}
                    style={({ pressed }) => [
                      styles.recentCard,
                      {
                        backgroundColor: theme.cardBg,
                        borderColor: theme.cardBorder,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: car.imageUri }}
                      style={styles.recentThumb}
                      resizeMode="cover"
                    />
                    <View style={styles.recentInfo}>
                      <Text style={[styles.recentMake, { color: theme.accentBlue }]}>
                        {car.make.toUpperCase()}
                      </Text>
                      <Text style={[styles.recentModel, { color: theme.cardText }]} numberOfLines={1}>
                        {car.model.toUpperCase()}
                      </Text>
                      {car.variant ? (
                        <Text style={[styles.recentVariant, { color: theme.cardTextMuted }]} numberOfLines={1}>
                          {car.variant.toUpperCase()}
                        </Text>
                      ) : null}
                      <View style={styles.recentTagRow}>
                        <View style={[styles.swatchDot, { backgroundColor: car.colour_hex }]} />
                        <Text style={[styles.recentColourName, { color: theme.cardTextMuted }]} numberOfLines={1}>
                          {car.colour_name.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.recentArrow, { color: theme.cardTextMuted }]}>→</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Section 2: Paint Archive Preview */}
            {colours.length > 0 ? (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleGroup}>
                    <Text style={[styles.sectionTitle, { color: theme.cardText }]}>
                      PAINT ARCHIVE
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.cardTextMuted }]}>
                      COLLECTED COLOR SPECTRUM
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => router.push('/palette')}
                    accessibilityRole="button"
                    accessibilityLabel="View all collected paint swatches"
                    style={({ pressed }) => [
                      styles.viewAllBtn,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={[styles.viewAllText, { color: theme.accentBlue }]}>
                      VIEW PALETTE →
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.palettePreviewGrid}>
                  {colours.slice(0, 4).map((c) => (
                    <Pressable
                      key={c.name}
                      onPress={() => router.push('/palette')}
                      accessibilityRole="button"
                      accessibilityLabel={`${c.name} paint finish`}
                      style={({ pressed }) => [
                        styles.paletteCard,
                        {
                          backgroundColor: theme.cardBg,
                          borderColor: theme.cardBorder,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <View style={[styles.swatchBlock, { backgroundColor: c.hex }]} />
                      <View style={styles.swatchMeta}>
                        <Text style={[styles.swatchName, { color: theme.cardText }]} numberOfLines={1}>
                          {c.name.toUpperCase()}
                        </Text>
                        <Text style={[styles.swatchCount, { color: theme.cardTextMuted }]}>
                          {c.count} {c.count === 1 ? 'VEHICLE' : 'VEHICLES'}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Section 3: Tactical Field Notice */}
            <View style={[styles.noticeCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <View style={styles.noticeHeader}>
                <View style={[styles.ledDot, { backgroundColor: theme.accentBlue }]} />
                <Text style={[styles.noticeTag, { color: theme.cardText }]}>FIELD GUIDE LOGISTICS</Text>
              </View>
              <Text style={[styles.noticeBody, { color: theme.cardTextMuted }]}>
                Switch to the SCAN tab anytime to identify new specimens in the wild. Identified vehicles, models, and color palettes are stored locally on your device.
              </Text>
            </View>
          </>
        ) : (
          /* Empty Onboarding State */
          <View style={[styles.emptyChassis, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.emptyHeader}>
              <View style={styles.emptyTagRow}>
                <View style={[styles.ledDot, { backgroundColor: theme.ledYellow }]} />
                <Text style={[styles.emptyTagText, { color: theme.cardText }]}>FIELD GUIDE EMPTY</Text>
              </View>
              <Text style={[styles.emptyCountBadge, { color: theme.cardTextMuted }]}>0 SPECIMENS</Text>
            </View>

            {/* Target Reticle Graphic */}
            <View style={[styles.emptyGraphic, { borderColor: theme.cardBorder }]}>
              <View style={[styles.cornerTL, { borderColor: theme.accentBlue }]} />
              <View style={[styles.cornerTR, { borderColor: theme.accentBlue }]} />
              <View style={[styles.cornerBL, { borderColor: theme.accentBlue }]} />
              <View style={[styles.cornerBR, { borderColor: theme.accentBlue }]} />
              <Text style={styles.emptyGraphicIcon}>🔍</Text>
              <Text style={[styles.emptyGraphicLabel, { color: theme.cardTextMuted }]}>
                READY FOR FIRST OBSERVATION
              </Text>
            </View>

            <View style={styles.emptyBody}>
              <Text style={[styles.emptyTitle, { color: theme.cardText }]}>
                START YOUR AUTOMOTIVE CATALOG
              </Text>
              <Text style={[styles.emptyDesc, { color: theme.cardTextMuted }]}>
                Photograph any car in the wild. CarDex identifies its make, model, variant, and paint finish, assigning collectible rarity and indexing it into your garage archive.
              </Text>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/scan',
                    params: { startScan: 'camera' },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel="Start discovering vehicles"
                style={({ pressed }) => [
                  styles.startDiscoveringBtn,
                  {
                    backgroundColor: theme.hardwareBg,
                    borderColor: theme.hardwareBorder,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Text style={styles.startDiscoveringText}>START DISCOVERING →</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

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
    padding: 14,
    gap: 16,
    paddingBottom: 24,
  },
  chassisCard: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 10,
  },
  displayPanel: {
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  displayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ledDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  systemStatusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  fieldIdText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  dashboardHero: {
    gap: 4,
    paddingTop: 2,
  },
  dashboardTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  dashboardSubtitle: {
    fontSize: 11,
    lineHeight: 16,
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  telemetryTile: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1.2,
    padding: 10,
    gap: 4,
  },
  tileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tileNumber: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tileIcon: {
    fontSize: 16,
  },
  tileLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  tileSubtext: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  scanCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    gap: 12,
    marginTop: 6,
  },
  scanCtaIcon: {
    fontSize: 22,
  },
  scanCtaTextGroup: {
    flex: 1,
  },
  scanCtaTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scanCtaSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  scanCtaArrow: {
    fontSize: 16,
    color: '#FDE047',
  },
  sectionContainer: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionTitleGroup: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  viewAllBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  viewAllText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  recentList: {
    gap: 8,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 12,
  },
  recentThumb: {
    width: 64,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#0F172A',
  },
  recentInfo: {
    flex: 1,
    gap: 2,
  },
  recentMake: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  recentModel: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  recentVariant: {
    fontSize: 9,
    fontWeight: '600',
  },
  recentTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  swatchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  recentColourName: {
    fontSize: 9,
    fontWeight: '700',
  },
  recentArrow: {
    fontSize: 15,
    fontWeight: '800',
    paddingRight: 4,
  },
  palettePreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paletteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48.5%',
    borderRadius: 8,
    borderWidth: 1.2,
    padding: 8,
    gap: 8,
  },
  swatchBlock: {
    width: 28,
    height: 28,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  swatchMeta: {
    flex: 1,
    gap: 2,
  },
  swatchName: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  swatchCount: {
    fontSize: 8,
    fontWeight: '700',
  },
  noticeCard: {
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 12,
    gap: 6,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noticeTag: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  noticeBody: {
    fontSize: 10,
    lineHeight: 15,
  },
  emptyChassis: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 14,
    gap: 12,
  },
  emptyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  emptyTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyTagText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  emptyCountBadge: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptyGraphic: {
    height: 90,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: 4,
  },
  emptyGraphicIcon: {
    fontSize: 20,
  },
  emptyGraphicLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cornerTL: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTR: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 8,
    height: 8,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 8,
    height: 8,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  emptyBody: {
    gap: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptyDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  startDiscoveringBtn: {
    borderRadius: 8,
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  startDiscoveringText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
