import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { channels, wcag, type SliderMode } from '../color';
import { Glass, Icon, LABEL, LABEL_SECONDARY, tap, tick } from './Glass';

const MODES: SliderMode[] = ['OKLCH', 'HSB', 'RGB'];
const WCAG_STEPS = [3, 4.5, 7];
const KNOB = 36;
const HIDDEN = 500; // px below its resting place when closed

type Props = {
  open: boolean;
  editing: 'fg' | 'bg';
  colors: { bg: string; fg: string };
  mode: SliderMode;
  onModeChange: (m: SliderMode) => void;
  onChange: (hex: string) => void;
  onClose: () => void;
};

/** Figma "color selected": glass sheet with a grabber, close button, mode tabs and three sliders. */
export function EditSheet({ open, editing, colors, mode, onModeChange, onChange, onClose }: Props) {
  // Always mounted; when closed it rests below the screen and ignores touches.
  const [y] = useState(() => new Animated.Value(open ? 0 : HIDDEN));

  useEffect(() => {
    if (open) Animated.spring(y, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 2 }).start();
    else Animated.timing(y, { toValue: HIDDEN, duration: 220, useNativeDriver: true }).start();
  }, [open, y]);

  const hex = colors[editing];
  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      style={[styles.wrap, { transform: [{ translateY: y }] }]}
    >
      <Glass style={styles.sheet}>
        <View style={styles.grabber} />
        <View style={styles.head}>
          <Pressable onPress={() => { tap(); onClose(); }} style={styles.close} accessibilityLabel="Close" hitSlop={8}>
            <Icon name="xmark" size={17} color={LABEL_SECONDARY} glyph="✕" />
          </Pressable>
          <Text style={styles.title}>{editing === 'fg' ? 'Edit Foreground' : 'Edit Background'}</Text>
        </View>

        <View style={styles.segment}>
          {MODES.map(m => (
            <Pressable key={m} onPress={() => { tick(); onModeChange(m); }} style={[styles.segItem, m === mode && styles.segOn]}>
              <Text style={[styles.segText, m === mode && styles.segTextOn]}>{m}</Text>
            </Pressable>
          ))}
        </View>

        {channels(hex, mode).map((c, i) => (
          <View key={`${mode}-${i}`} style={styles.row}>
            <Text style={styles.channel}>{c.label}</Text>
            <Slider
              position={c.position}
              stops={c.stops}
              onChange={t => {
                const next = c.apply(t);
                // Light tap when the pair crosses a WCAG level (3, 4.5 or 7).
                const other = editing === 'fg' ? colors.bg : colors.fg;
                const before = wcag(hex, other), after = wcag(next, other);
                if (WCAG_STEPS.some(s => (before - s) * (after - s) < 0)) tick();
                onChange(next);
              }}
            />
            <Text style={styles.value}>{c.display}</Text>
          </View>
        ))}
      </Glass>
    </Animated.View>
  );
}

/** Gradient track (Figma "_Slider": 40 tall, fully rounded) with a 36pt white-ring knob. */
function Slider({ position, stops, onChange }: { position: number; stops: string[]; onChange: (t: number) => void }) {
  const track = useRef<View>(null);
  const geometry = useRef({ pageX: 0, width: 1 });
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Knob position 0–1 for a finger at pageX (only used in touch handlers).
  const toT = (pageX: number) => {
    const g = geometry.current;
    return Math.min(1, Math.max(0, (pageX - g.pageX - KNOB / 2 - 2) / (g.width - KNOB - 4)));
  };

  const left = 2 + (width - KNOB - 4) * Math.min(1, Math.max(0, position));
  return (
    <View
      ref={track}
      style={styles.track}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={e => {
        const x = e.nativeEvent.pageX;
        setDragging(true);
        track.current?.measure((_x, _y, w, _h, pageX) => {
          geometry.current = { pageX, width: w };
          onChange(toT(x));
        });
      }}
      onResponderMove={e => onChange(toT(e.nativeEvent.pageX))}
      onResponderRelease={() => setDragging(false)}
      onResponderTerminate={() => setDragging(false)}
    >
      <LinearGradient colors={stops as [string, string, ...string[]]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.knob, { left, transform: [{ scale: dragging ? 1.12 : 1 }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 6, right: 6, bottom: 6, zIndex: 30 },
  sheet: { borderRadius: 44, paddingBottom: 26, paddingHorizontal: 16, overflow: 'hidden' },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: '#CCCCCC', marginTop: 5, marginBottom: 6 },
  head: { height: 44, justifyContent: 'center', marginBottom: 10 },
  close: { position: 'absolute', left: 0, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(120,120,128,0.16)', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  title: { textAlign: 'center', fontSize: 17, fontWeight: '600', letterSpacing: -0.43, color: LABEL },
  segment: { flexDirection: 'row', height: 36, padding: 2, gap: 4, borderRadius: 18, backgroundColor: 'rgba(118,118,128,0.12)', marginBottom: 24 },
  segItem: { flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  segText: { fontSize: 13.3, fontWeight: '500', color: '#000' },
  segTextOn: { fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  channel: { width: 40, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#000' },
  value: { width: 64, textAlign: 'right', paddingRight: 4, fontSize: 17, fontWeight: '600', fontFamily: 'Menlo', color: '#000' },
  track: { flex: 1, height: 40, borderRadius: 20, overflow: 'hidden', justifyContent: 'center' },
  knob: { position: 'absolute', top: 2, width: KNOB, height: KNOB, borderRadius: KNOB / 2, borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 1.5 },
});
