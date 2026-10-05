import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Glass, Icon, LABEL, LABEL_SECONDARY, tap } from './Glass';

type MenuProps = {
  open: boolean;
  /** Where the menu sits on screen, e.g. { top: 120, left: 16 }. */
  position: StyleProp<ViewStyle>;
  /** Corner the menu grows out of, e.g. 'top left'. */
  origin: string;
  children: React.ReactNode;
};

/**
 * Glass pop-up menu (Figma "Menu - iPhone": 250 wide, 34 corner radius).
 * Grows with a spring instead of fading: glass doesn't render while its
 * parent is fully transparent.
 */
export function Menu({ open, position, origin, children }: MenuProps) {
  // Always mounted; closed menus sit at scale 0 and ignore touches.
  const [scale] = useState(() => new Animated.Value(open ? 1 : 0));

  useEffect(() => {
    if (open) Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 7 }).start();
    else Animated.timing(scale, { toValue: 0, duration: 140, useNativeDriver: true }).start();
  }, [open, scale]);

  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      style={[styles.wrap, position, { transformOrigin: origin, transform: [{ scale }] }]}
    >
      <Glass style={styles.menu}>{children}</Glass>
    </Animated.View>
  );
}

type ItemProps = {
  title: string;
  subtitle?: string;
  /** Leading content: a checkmark slot, an icon or a color dot. */
  leading?: React.ReactNode;
  chevron?: boolean;
  onPress: () => void;
};

export function MenuItem({ title, subtitle, leading, chevron, onPress }: ItemProps) {
  return (
    <Pressable
      onPress={() => { tap(); onPress(); }}
      accessibilityRole="menuitem"
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      {leading !== undefined && <View style={styles.leading}>{leading}</View>}
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {chevron && <Icon name="chevron.right" size={13} glyph="›" />}
    </Pressable>
  );
}

export const Check = ({ on }: { on: boolean }) => (on ? <Icon name="checkmark" size={16} glyph="✓" /> : null);
export const Dot = ({ color }: { color: string }) => <View style={[styles.dot, { backgroundColor: color }]} />;
export const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', width: 250, zIndex: 20 },
  menu: { borderRadius: 34, paddingVertical: 10, paddingHorizontal: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 6, paddingRight: 8, borderRadius: 12 },
  itemPressed: { backgroundColor: 'rgba(0,0,0,0.06)' },
  leading: { width: 24, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, paddingVertical: 10, gap: 2 },
  title: { fontSize: 17, lineHeight: 20, letterSpacing: -0.43, color: LABEL },
  subtitle: { fontSize: 13, lineHeight: 18, color: LABEL_SECONDARY },
  dot: { width: 17, height: 17, borderRadius: 9 },
  separator: { height: 1, backgroundColor: '#E6E6E6', marginVertical: 10, marginHorizontal: 8 },
});
