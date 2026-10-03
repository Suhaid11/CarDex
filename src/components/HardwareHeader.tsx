import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';

interface HardwareHeaderProps {
  title?: string;
  statusText?: string;
}

export const HardwareHeader: React.FC<HardwareHeaderProps> = ({
  title = 'CARDEX',
  statusText,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.hardwareBg, borderBottomColor: theme.hardwareBorder }]}>
      {/* Left: Signature Optical Sensor Lens & Miniature LEDs */}
      <View style={styles.leftCluster}>
        <View style={styles.mainLensOuter}>
          <Image
            source={require('../../assets/images/splash-icon.png')}
            style={styles.brandMarkImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.ledArray}>
          <View style={[styles.led, { backgroundColor: theme.ledRed }]} />
          <View style={[styles.led, { backgroundColor: theme.ledYellow }]} />
          <View style={[styles.led, { backgroundColor: theme.ledGreen }]} />
        </View>
      </View>

      {/* Center: Device Title & Status */}
      <View style={styles.centerCluster}>
        <Text style={styles.brandTitle}>{title}</Text>
        {statusText ? <Text style={styles.statusText}>{statusText}</Text> : null}
      </View>

      {/* Right: Controls (Theme Toggle + Info) */}
      <View style={styles.rightCluster}>
        <Pressable
          onPress={toggleTheme}
          accessibilityLabel={`Toggle theme. Current theme is ${isDark ? 'Dark' : 'Light'}`}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: theme.hardwareBevel, borderColor: theme.hardwareBorder, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Text style={styles.iconBtnText}>{isDark ? '🌙' : '☀️'}</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/about')}
          accessibilityLabel="About CarDex"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: theme.hardwareBevel, borderColor: theme.hardwareBorder, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Text style={styles.iconBtnText}>ⓘ</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 2.5,
  },
  leftCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 70,
  },
  mainLensOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  brandMarkImage: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  ledArray: {
    flexDirection: 'row',
    gap: 4,
  },
  led: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  centerCluster: {
    alignItems: 'center',
    flex: 1,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 70,
    justifyContent: 'flex-end',
  },
  iconBtn: {
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 6,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
