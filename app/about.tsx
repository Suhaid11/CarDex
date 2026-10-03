import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeContext';
import { HardwareHeader } from '../src/components/HardwareHeader';
import { HardwareNavBar } from '../src/components/HardwareNavBar';

export default function AboutScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.hardwareBg }]} edges={['top', 'left', 'right']}>
      <HardwareHeader title="CARDEX" statusText="FIELD GUIDE // ABOUT" />

      <ScrollView contentContainerStyle={styles.scrollContent} style={[styles.container, { backgroundColor: theme.screenBg }]}>
        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <View style={styles.badgeRow}>
            <View style={[styles.modelPill, { backgroundColor: theme.hardwareBg }]}>
              <Text style={styles.modelPillText}>FIELD GUIDE</Text>
            </View>
            <View style={[styles.versionPill, { backgroundColor: theme.hardwareBevel }]}>
              <Text style={styles.versionText}>v1.0</Text>
            </View>
          </View>
          <Text style={[styles.heroTitle, { color: theme.cardText }]}>CARDEX</Text>
          <Text style={[styles.heroTagline, { color: theme.accentBlue }]}>
            A field guide for the cars you come across.
          </Text>
        </View>

        {/* Short Description */}
        <View style={[styles.infoCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.cardText }]}>DISCOVER & COLLECT</Text>
          <Text style={[styles.cardBody, { color: theme.cardTextMuted }]}>
            Scan a car, discover what it is, and keep your favourites in your Garage.
          </Text>
        </View>

        {/* Built For Car Lovers */}
        <View style={[styles.infoCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.cardText }]}>BUILT FOR CAR LOVERS</Text>
          <Text style={[styles.cardBody, { color: theme.cardTextMuted }]}>
            A small way to keep track of the cars that catch your eye.
          </Text>
        </View>

        {/* Helpful Tip */}
        <View style={[styles.noteCard, { backgroundColor: theme.displayBg, borderColor: theme.displayBorder }]}>
          <Text style={styles.noteIcon}>📸</Text>
          <Text style={[styles.noteText, { color: theme.displayTextMuted }]}>
            For best results, align a single car clearly in good daylight.
          </Text>
        </View>
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
    padding: 16,
    gap: 14,
  },
  heroCard: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 18,
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modelPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  modelPillText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  versionPill: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  versionText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
  },
  heroTagline: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    gap: 6,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    gap: 10,
  },
  noteIcon: {
    fontSize: 16,
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
});
