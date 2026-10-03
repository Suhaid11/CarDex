import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../src/theme/ThemeContext';
import { HardwareHeader } from '../src/components/HardwareHeader';
import { HardwareNavBar } from '../src/components/HardwareNavBar';
import { preprocessVehicleImage } from '../src/services/imageProcessor';
import { identifyVehicle, CarApiError } from '../src/services/carApi';

type ScannerState = 'IDLE' | 'PROCESSING' | 'IDENTIFYING' | 'ERROR';

interface ErrorDetails {
  title: string;
  message: string;
  status?: number;
}

export default function ScanScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ startScan?: string }>();

  const [state, setState] = useState<ScannerState>('IDLE');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);

  const isRequestInFlight = useRef(false);
  const hasAutoTriggeredRef = useRef(false);

  // Deterministic reset on entering/returning to Scan screen
  useFocusEffect(
    useCallback(() => {
      // If returning normally without startScan, reset state to clean IDLE
      if (!params.startScan) {
        setState('IDLE');
        setSelectedImageUri(null);
        setImageDimensions(null);
        setErrorDetails(null);
        isRequestInFlight.current = false;
        hasAutoTriggeredRef.current = false;
      }
    }, [params.startScan])
  );

  const runPipeline = async (uri: string, width?: number, height?: number) => {
    if (isRequestInFlight.current) return;
    isRequestInFlight.current = true;
    setErrorDetails(null);

    try {
      // Stage 1: Preprocess (orientation normalize + 1024px downscale)
      setState('PROCESSING');
      const processed = await preprocessVehicleImage(uri, width, height);

      // Stage 2: Gemini Vision API call via local Cloudflare Worker
      setState('IDENTIFYING');
      const result = await identifyVehicle(processed.base64, processed.mimeType);

      // Stage 3: Navigate to Result
      router.push({
        pathname: '/result',
        params: {
          data: JSON.stringify(result),
          imageUri: processed.uri,
        },
      });
    } catch (err: unknown) {
      setState('ERROR');
      if (err instanceof CarApiError) {
        setErrorDetails({
          title: err.title,
          message: err.message,
          status: err.status,
        });
      } else if (err instanceof Error) {
        setErrorDetails({
          title: 'CONNECTION PROBLEM',
          message: "Couldn't reach the CarDex scanner service. Check your connection and try again.",
          status: 500,
        });
      } else {
        setErrorDetails({
          title: "CARDEX COULDN'T COMPLETE THE SCAN",
          message: 'Something went wrong while identifying this vehicle.',
          status: 500,
        });
      }
    } finally {
      isRequestInFlight.current = false;
    }
  };

  const handleTakePhoto = async () => {
    if (isRequestInFlight.current) return;
    setErrorDetails(null);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setState('ERROR');
        setErrorDetails({
          title: 'CAMERA PERMISSION REQUIRED',
          message: 'Please enable camera access in your device settings to scan vehicles.',
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImageUri(asset.uri);
        setImageDimensions({ width: asset.width, height: asset.height });
        await runPipeline(asset.uri, asset.width, asset.height);
      }
    } catch {
      setState('ERROR');
      setErrorDetails({
        title: 'HARDWARE CAPTURE INTERRUPTED',
        message: 'Camera capture was interrupted. Please try again.',
      });
    }
  };

  const handleChooseGallery = async () => {
    if (isRequestInFlight.current) return;
    setErrorDetails(null);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setState('ERROR');
        setErrorDetails({
          title: 'PHOTO ACCESS REQUIRED',
          message: 'Please enable photo library access in your device settings to select images.',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImageUri(asset.uri);
        setImageDimensions({ width: asset.width, height: asset.height });
        await runPipeline(asset.uri, asset.width, asset.height);
      }
    } catch {
      setState('ERROR');
      setErrorDetails({
        title: 'PHOTO ACCESS INTERRUPTED',
        message: 'Could not load image from photo library.',
      });
    }
  };

  // Immediate startScan intent execution from Home CTA
  useEffect(() => {
    if (params.startScan === 'camera' && !hasAutoTriggeredRef.current && !isRequestInFlight.current) {
      hasAutoTriggeredRef.current = true;
      router.setParams({ startScan: undefined });
      handleTakePhoto();
    }
  }, [params.startScan]);

  const handleRetry = () => {
    if (selectedImageUri) {
      runPipeline(selectedImageUri, imageDimensions?.width, imageDimensions?.height);
    } else {
      handleTakePhoto();
    }
  };

  const handleResetToIdle = () => {
    setState('IDLE');
    setSelectedImageUri(null);
    setImageDimensions(null);
    setErrorDetails(null);
    isRequestInFlight.current = false;
  };

  const isBusy = state === 'PROCESSING' || state === 'IDENTIFYING';

  const getStatusLabel = () => {
    switch (state) {
      case 'PROCESSING':
        return 'SCANNING';
      case 'IDENTIFYING':
        return 'IDENTIFYING CAR';
      case 'ERROR':
        return 'SCAN FAILED';
      default:
        return 'READY TO SCAN';
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.hardwareBg }]} edges={['top', 'left', 'right']}>
      <HardwareHeader title="SCAN A CAR" statusText={getStatusLabel()} />

      <View style={[styles.container, { backgroundColor: theme.screenBg }]}>
        {/* Dominant Viewfinder Frame */}
        <View style={[styles.viewfinderChassis, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <View style={[styles.viewfinderScreen, { backgroundColor: theme.displayBg, borderColor: theme.displayBorder }]}>
            {/* Viewfinder Header */}
            <View style={styles.viewfinderHeader}>
              <View style={styles.tagGroup}>
                <View style={[styles.statusLed, { backgroundColor: isBusy ? theme.accentBlue : state === 'ERROR' ? theme.ledRed : theme.ledGreen }]} />
                <Text style={[styles.viewfinderTag, { color: theme.displayText }]}>
                  {state === 'IDLE' ? 'OPTICAL VIEWFINDER' : state === 'ERROR' ? 'DETECTION FAULT' : 'ACQUIRING TARGET'}
                </Text>
              </View>
              <View style={[styles.stagePill, { backgroundColor: isBusy ? theme.accentBlue : theme.hardwareBevel }]}>
                <Text style={styles.stagePillText}>
                  {state === 'PROCESSING' ? '01 / RESIZE' : state === 'IDENTIFYING' ? '02 / AI IDENTIFY' : state === 'ERROR' ? 'FAULT' : 'STANDBY'}
                </Text>
              </View>
            </View>

            {/* Viewfinder Target Area */}
            <View style={[styles.targetViewport, { borderColor: isBusy ? theme.accentBlue : 'rgba(56, 189, 248, 0.35)' }]}>
              {/* Corner reticle brackets */}
              <View style={[styles.reticleCorner, styles.tl, { borderColor: theme.accentBlue }]} />
              <View style={[styles.reticleCorner, styles.tr, { borderColor: theme.accentBlue }]} />
              <View style={[styles.reticleCorner, styles.bl, { borderColor: theme.accentBlue }]} />
              <View style={[styles.reticleCorner, styles.br, { borderColor: theme.accentBlue }]} />

              {selectedImageUri ? (
                <View style={styles.imageWrapper}>
                  <Image source={{ uri: selectedImageUri }} style={styles.fullImage} resizeMode="cover" />

                  {isBusy && (
                    <View style={styles.overlayShade}>
                      <ActivityIndicator size="large" color={theme.accentBlue} />
                      <Text style={[styles.overlayStatusText, { color: theme.displayText }]}>
                        {state === 'PROCESSING' ? 'SCANNING VEHICLE PIXELS...' : 'IDENTIFYING MAKE & MODEL...'}
                      </Text>
                    </View>
                  )}

                  {state === 'ERROR' && (
                    <View style={styles.errorOverlay}>
                      <Text style={styles.errorEmoji}>⚠️</Text>
                      <Text style={styles.errorHeadline}>
                        {errorDetails?.title || "CARDEX COULDN'T COMPLETE THE SCAN"}
                      </Text>
                      <Text style={styles.errorSubtitle}>
                        {errorDetails?.message || 'Something went wrong while identifying this vehicle.'}
                      </Text>

                      <View style={styles.errorBtnGroup}>
                        {errorDetails?.status === 422 ? (
                          <Pressable
                            onPress={handleResetToIdle}
                            accessibilityRole="button"
                            accessibilityLabel="Try another photo"
                            style={({ pressed }) => [
                              styles.primaryErrorBtn,
                              { backgroundColor: theme.hardwareBg, borderColor: theme.hardwareBorder, opacity: pressed ? 0.8 : 1 },
                            ]}
                          >
                            <Text style={styles.primaryErrorBtnText}>TRY ANOTHER PHOTO</Text>
                          </Pressable>
                        ) : (
                          <>
                            <Pressable
                              onPress={handleRetry}
                              accessibilityRole="button"
                              accessibilityLabel="Try scan again"
                              style={({ pressed }) => [
                                styles.primaryErrorBtn,
                                { backgroundColor: theme.hardwareBg, borderColor: theme.hardwareBorder, opacity: pressed ? 0.8 : 1 },
                              ]}
                            >
                              <Text style={styles.primaryErrorBtnText}>TRY AGAIN</Text>
                            </Pressable>

                            <Pressable
                              onPress={handleResetToIdle}
                              accessibilityRole="button"
                              accessibilityLabel="Choose another photo"
                              style={({ pressed }) => [
                                styles.secondaryErrorBtn,
                                { backgroundColor: theme.btnSecondaryBg, borderColor: theme.cardBorder, opacity: pressed ? 0.8 : 1 },
                              ]}
                            >
                              <Text style={[styles.secondaryErrorBtnText, { color: theme.btnSecondaryText }]}>
                                CHOOSE ANOTHER PHOTO
                              </Text>
                            </Pressable>
                          </>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.idlePrompt}>
                  <Text style={styles.idleEmoji}>🚘</Text>
                  <Text style={[styles.idleTitle, { color: theme.displayText }]}>ALIGN CAR IN VIEWFINDER</Text>
                  <Text style={[styles.idleSub, { color: theme.displayTextMuted }]}>
                    Take a clear photo or choose one from your photo library.
                  </Text>
                </View>
              )}
            </View>

            {/* Diagnostic Stage Ribbon */}
            <View style={styles.stageRibbon}>
              <View style={[styles.ribbonStep, { backgroundColor: state === 'PROCESSING' ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.06)' }]}>
                <Text style={[styles.ribbonStepNum, { color: state === 'PROCESSING' ? theme.accentBlue : theme.displayTextMuted }]}>01</Text>
                <Text style={[styles.ribbonStepText, { color: theme.displayTextMuted }]}>SCAN</Text>
              </View>
              <View style={[styles.ribbonStep, { backgroundColor: state === 'IDENTIFYING' ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.06)' }]}>
                <Text style={[styles.ribbonStepNum, { color: state === 'IDENTIFYING' ? theme.accentBlue : theme.displayTextMuted }]}>02</Text>
                <Text style={[styles.ribbonStepText, { color: theme.displayTextMuted }]}>IDENTIFY</Text>
              </View>
              <View style={[styles.ribbonStep, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                <Text style={[styles.ribbonStepNum, { color: theme.displayTextMuted }]}>03</Text>
                <Text style={[styles.ribbonStepText, { color: theme.displayTextMuted }]}>RESULT</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tactile Hardware Controls */}
        <View style={styles.controlsRow}>
          <Pressable
            disabled={isBusy}
            onPress={handleTakePhoto}
            accessibilityRole="button"
            accessibilityLabel="Take Photo with Camera"
            style={({ pressed }) => [
              styles.primaryControlBtn,
              {
                backgroundColor: theme.hardwareBg,
                borderColor: theme.hardwareBorder,
                opacity: isBusy ? 0.6 : pressed ? 0.85 : 1,
                transform: [{ scale: pressed && !isBusy ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={styles.controlIcon}>📸</Text>
            <View style={styles.controlTextGroup}>
              <Text style={styles.primaryControlTitle}>TAKE PHOTO</Text>
              <Text style={styles.controlSubtitle}>SNAP WITH YOUR CAMERA</Text>
            </View>
          </Pressable>

          <Pressable
            disabled={isBusy}
            onPress={handleChooseGallery}
            accessibilityRole="button"
            accessibilityLabel="Choose from photo library"
            style={({ pressed }) => [
              styles.secondaryControlBtn,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                opacity: isBusy ? 0.6 : pressed ? 0.85 : 1,
                transform: [{ scale: pressed && !isBusy ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={styles.controlIcon}>🖼️</Text>
            <View style={styles.controlTextGroup}>
              <Text style={[styles.secondaryControlTitle, { color: theme.cardText }]}>CHOOSE FROM GALLERY</Text>
              <Text style={[styles.controlSubtitle, { color: theme.cardTextMuted }]}>PICK FROM PHOTO LIBRARY</Text>
            </View>
          </Pressable>
        </View>

        {/* Compact Field Tip */}
        <View style={[styles.tipBanner, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <Text style={[styles.tipText, { color: theme.cardTextMuted }]}>
            💡 <Text style={{ fontWeight: '800', color: theme.cardText }}>Field Tip:</Text> Capture the full car in frame from a front or 3/4 angle in daylight.
          </Text>
        </View>
      </View>

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
    padding: 12,
    gap: 10,
    justifyContent: 'space-between',
  },
  viewfinderChassis: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    padding: 10,
    minHeight: 330,
  },
  viewfinderScreen: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 10,
    justifyContent: 'space-between',
    gap: 8,
  },
  viewfinderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLed: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  viewfinderTag: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  stagePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stagePillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  targetViewport: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleCorner: {
    position: 'absolute',
    width: 14,
    height: 14,
    zIndex: 10,
  },
  tl: {
    top: 4,
    left: 4,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  tr: {
    top: 4,
    right: 4,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  bl: {
    bottom: 4,
    left: 4,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  br: {
    bottom: 4,
    right: 4,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  overlayShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  overlayStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  errorEmoji: {
    fontSize: 28,
  },
  errorHeadline: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.6,
  },
  errorSubtitle: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    maxWidth: 260,
  },
  errorBtnGroup: {
    gap: 8,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  primaryErrorBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    minWidth: 180,
    alignItems: 'center',
  },
  primaryErrorBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  secondaryErrorBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.2,
    minWidth: 180,
    alignItems: 'center',
  },
  secondaryErrorBtnText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  idlePrompt: {
    alignItems: 'center',
    gap: 6,
    padding: 16,
  },
  idleEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  idleTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  idleSub: {
    fontSize: 10,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 14,
  },
  stageRibbon: {
    flexDirection: 'row',
    gap: 6,
  },
  ribbonStep: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
  },
  ribbonStepNum: {
    fontSize: 9,
    fontWeight: '900',
  },
  ribbonStepText: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: 1,
  },
  controlsRow: {
    gap: 8,
  },
  primaryControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    gap: 12,
  },
  secondaryControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 12,
  },
  controlIcon: {
    fontSize: 22,
  },
  controlTextGroup: {
    flex: 1,
  },
  primaryControlTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  secondaryControlTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  controlSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  tipBanner: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tipText: {
    fontSize: 10,
    lineHeight: 14,
  },
});
