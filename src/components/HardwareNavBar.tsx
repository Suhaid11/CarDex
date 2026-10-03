import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';

export const HardwareNavBar: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  // 4-pillar product navigation
  const navItems = [
    { label: 'HOME', path: '/', icon: '⌂' },
    { label: 'SCAN', path: '/scan', icon: '⌕' },
    { label: 'GARAGE', path: '/garage', icon: '⊞' },
    { label: 'PALETTE', path: '/palette', icon: '◈' },
  ];

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.hardwareBg, borderTopColor: theme.hardwareBorder }]}>
      <View style={styles.navRow}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Pressable
              key={item.path}
              onPress={() => router.push(item.path as any)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Navigate to ${item.label}`}
              style={({ pressed }) => [
                styles.navTab,
                {
                  backgroundColor: active ? theme.displayBg : theme.hardwareBevel,
                  borderColor: active ? theme.accentBlue : theme.hardwareBorder,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ translateY: active ? -2 : 0 }],
                },
              ]}
            >
              <Text
                style={[
                  styles.navIcon,
                  { color: active ? theme.accentBlue : 'rgba(255,255,255,0.7)' },
                ]}
              >
                {item.icon}
              </Text>
              <Text
                style={[
                  styles.navLabel,
                  { color: active ? '#FFFFFF' : 'rgba(255,255,255,0.8)', fontWeight: active ? '900' : '700' },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 22,
    borderTopWidth: 2.5,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  navTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
  },
  navIcon: {
    fontSize: 17,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 10,
    letterSpacing: 1,
  },
});
