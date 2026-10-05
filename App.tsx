import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Linking, Platform, Pressable, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { APCA_LEVELS, WCAG_LEVELS, bumpTo, relLum, score, type Algorithm, type SliderMode } from './src/color';
import { SAMPLES, fetchPhotos, type Photo } from './src/photos';
import { Glass, GlassButton, Icon, LABEL } from './src/components/Glass';
import { Check, Dot, Menu, MenuItem, Separator } from './src/components/Menu';
import { EditSheet } from './src/components/EditSheet';

type Panel = null | 'score' | 'adjust' | 'add' | 'sheet';

/** On web, `?open=sheet` (or score / adjust / add) starts with that screen open, like the web prototype. */
const initialPanel: Panel = (() => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const open = new URLSearchParams(window.location.search).get('open');
  return open === 'score' || open === 'adjust' || open === 'add' || open === 'sheet' ? open : null;
})();

export default function App() {
  const [fontsLoaded] = useFonts({
    DepartureMono: require('./assets/fonts/DepartureMono-Regular.otf'),
    InstrumentSerif_400Regular,
  });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#23425B' }} />;
  return (
    <SafeAreaProvider>
      <ColorShift />
    </SafeAreaProvider>
  );
}

function ColorShift() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [photos, setPhotos] = useState<Photo[]>(SAMPLES);
  const [live, setLive] = useState(false);
  const [index, setIndex] = useState(0);
  const [colors, setColors] = useState({ bg: SAMPLES[0].pair[0], fg: SAMPLES[0].pair[1] });
  const [algo, setAlgo] = useState<Algorithm>('WCAG');
  const [mode, setMode] = useState<SliderMode>('OKLCH');
  const [editing, setEditing] = useState<'fg' | 'bg'>('fg');
  const [panel, setPanel] = useState<Panel>(initialPanel);
  const [serif, setSerif] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const loading = useRef(false);

  const photo = photos[index];
  const { bg, fg } = colors;
  const current = score(bg, fg, algo);
  const darkBg = relLum(bg) < 0.18;

  /* ── Photos: load 10, refill when 3 remain (like Matt's buffer) ── */
  const loadMore = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const fresh = await fetchPhotos(10);
      if (!live) {
        setPhotos(fresh);
        setLive(true);
        setIndex(0);
        setColors({ bg: fresh[0].pair[0], fg: fresh[0].pair[1] });
      } else {
        setPhotos(prev => [...prev, ...fresh.filter(p => !prev.some(q => q.id === p.id))]);
      }
    } catch {
      if (!live) showToast('Live photos unavailable: showing samples');
    } finally {
      loading.current = false;
    }
  }, [live]);

  useEffect(() => { loadMore(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (next: number) => {
    const i = (next + photos.length) % photos.length;
    setIndex(i);
    setColors({ bg: photos[i].pair[0], fg: photos[i].pair[1] });
    if (live && i >= photos.length - 3) loadMore();
  };

  /* ── Small helpers ── */
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function showToast(message: string) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }
  const toggle = (p: Panel) => setPanel(cur => (cur === p ? null : p));
  const swap = () => setColors(c => ({ bg: c.fg, fg: c.bg }));
  const share = () =>
    Share.share({
      message: `Color Shift: text #${fg} on background #${bg}, ${current.label}` + (photo.url ? `\nPhoto by ${photo.photographer} on Unsplash` : ''),
    });

  /* ── "Aa" moves up when the sheet opens (Figma: 50% − 103 → 50% − 196) ── */
  const [specimenTop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(specimenTop, { toValue: panel === 'sheet' ? -93 : 0, useNativeDriver: true, speed: 16, bounciness: 3 }).start();
  }, [panel, specimenTop]);

  const levels = algo === 'WCAG' ? WCAG_LEVELS : APCA_LEVELS;
  const reached = levels.find(l => current.value >= l.value);
  const menuTop = insets.top + 6 + 48 + 8;

  return (
    <View style={styles.root}>
      <StatusBar style={darkBg ? 'light' : 'dark'} />

      {/* Color half */}
      <View style={[styles.half, { backgroundColor: '#' + bg }]} />

      {/* Photo half: the photo, faded into the color above it */}
      <View style={styles.half}>
        {photo.url ? (
          <Image source={{ uri: photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} accessibilityLabel={`Photo by ${photo.photographer}`} />
        ) : (
          <LinearGradient colors={photo.gradient as [string, string, ...string[]]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient colors={['#' + bg, '#' + bg + '00']} locations={[0, 0.5]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      </View>

      {/* Specimen */}
      <Animated.Text
        style={[
          styles.specimen,
          serif ? styles.serif : styles.mono,
          { color: '#' + fg, top: height / 2 - (serif ? 130 : 103), transform: [{ translateY: specimenTop }] },
        ]}
        accessibilityLabel={`Sample text in #${fg} on #${bg}`}
      >
        Aa
      </Animated.Text>

      {/* Top row: score pill · swap · more */}
      <View style={[styles.topRow, { top: insets.top + 6 }]}>
        <GlassButton onPress={() => toggle('score')} style={styles.pill} accessibilityLabel={`Contrast ${current.label}`}>
          <Text style={styles.pillText}>{current.label}</Text>
        </GlassButton>
        <View style={styles.row10}>
          <GlassButton onPress={swap} accessibilityLabel="Swap colors">
            <Icon name="arrow.left.arrow.right" glyph="⇄" />
          </GlassButton>
          <GlassButton onPress={() => toggle('adjust')} accessibilityLabel="More">
            <Icon name="ellipsis" glyph="•••" />
          </GlassButton>
        </View>
      </View>

      {/* Bottom row: share · ‹ › · + (hidden under the sheet, as in Figma "color selected") */}
      <View style={[styles.bottomRow, { bottom: insets.bottom + 16 }, panel === 'sheet' && styles.hidden]} pointerEvents={panel === 'sheet' ? 'none' : 'box-none'}>
        <GlassButton onPress={share} accessibilityLabel="Share">
          <Icon name="square.and.arrow.up" glyph="⇪" />
        </GlassButton>
        <Glass style={styles.arrows}>
          <Pressable onPress={() => goTo(index - 1)} style={styles.arrow} accessibilityLabel="Previous photo" hitSlop={6}>
            <Icon name="chevron.backward" glyph="‹" />
          </Pressable>
          <Pressable onPress={() => goTo(index + 1)} style={styles.arrow} accessibilityLabel="Next photo" hitSlop={6}>
            <Icon name="chevron.right" glyph="›" />
          </Pressable>
        </Glass>
        <GlassButton onPress={() => toggle('add')} accessibilityLabel="Add photo">
          <Icon name="plus" glyph="+" />
        </GlassButton>
      </View>

      {/* Photo credit (Unsplash requires linking photographer and Unsplash) */}
      <Text style={[styles.credit, { bottom: Math.max(insets.bottom - 14, 8) }, panel === 'sheet' && styles.hidden]} numberOfLines={1}>
        {photo.url ? (
          <>
            <Text onPress={() => Linking.openURL('https://unsplash.com/?utm_source=color_shift_prototype&utm_medium=referral')}>Unsplash</Text>
            {' / '}
            <Text onPress={() => photo.photographerUrl && Linking.openURL(photo.photographerUrl)}>{photo.photographer}</Text>
          </>
        ) : (
          `Sample gradient · ${photo.photographer}`
        )}
      </Text>

      {/* Tap outside a menu to close it */}
      {(panel === 'score' || panel === 'adjust' || panel === 'add') && (
        <Pressable style={[StyleSheet.absoluteFill, { zIndex: 15 }]} onPress={() => setPanel(null)} accessibilityLabel="Close menu" />
      )}

      {/* Score menu (Figma "APCA") */}
      <Menu open={panel === 'score'} position={{ top: menuTop, left: 16 }} origin="top left">
        {(['WCAG', 'APCA'] as const).map(a => (
          <MenuItem key={a} title={a} leading={<Check on={algo === a} />} onPress={() => setAlgo(a)} />
        ))}
        <Separator />
        {levels.map(l => (
          <MenuItem
            key={l.value}
            title={l.title}
            subtitle={l.subtitle}
            leading={<Check on={l === reached} />}
            onPress={() => setColors(c => ({ ...c, fg: bumpTo(c.bg, c.fg, l.value, algo) }))}
          />
        ))}
      </Menu>

      {/* Adjust menu (Figma "adjust") */}
      <Menu open={panel === 'adjust'} position={{ top: menuTop, right: 16 }} origin="top right">
        <MenuItem title={fg} subtitle="Foreground" leading={<Dot color={'#' + fg} />} chevron onPress={() => { setEditing('fg'); setPanel('sheet'); }} />
        <MenuItem title="Swap" leading={<Icon name="arrow.up.arrow.down" size={17} glyph="⇅" />} onPress={swap} />
        <MenuItem title={bg} subtitle="Background" leading={<Dot color={'#' + bg} />} chevron onPress={() => { setEditing('bg'); setPanel('sheet'); }} />
        <Separator />
        <MenuItem title="Font" subtitle={serif ? 'Instrument Serif' : 'Departure Mono'} chevron onPress={() => setSerif(s => !s)} />
        <MenuItem title="App Icon" subtitle="Instrument Serif" chevron onPress={() => showToast("App Icon isn't part of this build yet")} />
      </Menu>

      {/* Add menu (Figma "add") */}
      <Menu open={panel === 'add'} position={{ bottom: insets.bottom + 16 + 48 + 10, right: 16 }} origin="bottom right">
        <MenuItem title="Camera" leading={<Icon name="camera" size={17} glyph="◉" />} onPress={() => { setPanel(null); showToast("Camera isn't part of this build yet"); }} />
        <MenuItem title="Photo library" leading={<Icon name="photo" size={17} glyph="▣" />} onPress={() => { setPanel(null); showToast("Photo library isn't part of this build yet"); }} />
      </Menu>

      {/* Edit sheet (Figma "color selected") */}
      <EditSheet
        open={panel === 'sheet'}
        editing={editing}
        colors={colors}
        mode={mode}
        onModeChange={setMode}
        onChange={hex => setColors(c => ({ ...c, [editing]: hex }))}
        onClose={() => setPanel(null)}
      />

      {toast && (
        <View style={[styles.toastWrap, { bottom: insets.bottom + 90 }]} pointerEvents="none">
          <Glass style={styles.toast}>
            <Text style={styles.toastText}>{toast}</Text>
          </Glass>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#23425B' },
  hidden: { display: 'none' },
  half: { flex: 1 },
  specimen: { position: 'absolute', left: 0, right: 0, textAlign: 'center', zIndex: 3 },
  mono: { fontFamily: 'DepartureMono', fontSize: 100, letterSpacing: -10 },
  serif: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 140, letterSpacing: -2 },
  topRow: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  row10: { flexDirection: 'row', gap: 10 },
  pill: { paddingHorizontal: 20 },
  pillText: { fontSize: 17, fontWeight: '500', color: LABEL },
  bottomRow: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  arrows: { height: 48, borderRadius: 24, paddingHorizontal: 10, flexDirection: 'row', gap: 18, alignItems: 'center' },
  arrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  credit: { position: 'absolute', left: 16, right: 16, textAlign: 'center', fontSize: 13, fontWeight: '500', color: '#F6F6F7', zIndex: 11, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 40 },
  toast: { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10 },
  toastText: { fontSize: 15, color: LABEL },
});
