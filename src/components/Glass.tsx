import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

// Real Liquid Glass on iOS 26+. Elsewhere (older iOS, Android, web) a soft
// translucent panel stands in, so the layout still reads correctly.
const LIQUID_GLASS = isLiquidGlassAvailable();

export const LABEL = '#1A1A1A';           // labels / vibrant / primary
export const LABEL_SECONDARY = '#727272'; // labels / vibrant / secondary

type GlassProps = {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  interactive?: boolean;
};

export function Glass({ style, children, interactive }: GlassProps) {
  if (LIQUID_GLASS) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive={interactive} style={style}>
        {children}
      </GlassView>
    );
  }
  return <View style={[styles.fallback, style]}>{children}</View>;
}

/** SF Symbol on iOS; a plain glyph elsewhere. */
export function Icon({ name, size = 20, color = LABEL, glyph }: { name: SymbolViewProps['name']; size?: number; color?: string; glyph: string }) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      weight="medium"
      fallback={<Text style={{ fontSize: size, color, lineHeight: size * 1.2 }}>{glyph}</Text>}
    />
  );
}

export const tap = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};
export const tick = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
};

type GlassButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
};

/** A floating glass control, like Figma's "Button - Liquid Glass" and "_Button - Bottom". */
export function GlassButton({ onPress, children, style, accessibilityLabel }: GlassButtonProps) {
  return (
    <Pressable
      onPress={() => { tap(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <Glass interactive style={[styles.button, style]}>{children}</Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: 'rgba(247,247,247,0.82)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  button: {
    height: 48,
    minWidth: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
