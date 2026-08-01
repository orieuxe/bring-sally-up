import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { moderateScale as ms, scale } from 'react-native-size-matters';
import { ACCENT, ACCENT_RGB } from '../../utils/color';

// react-native-web has no native animated module — the JS driver is the only
// option there, and it handles transform/opacity fine.
const NATIVE = Platform.OS !== 'web';

type Props = {
  onPress: () => void;
  /** Pulses while today's session is still to do; goes still once it's done. */
  pulsing: boolean;
};

export default function PlayButton({ onPress, pulsing }: Props) {
  const size = scale(118);
  const ringA = useRef(new Animated.Value(0)).current;
  const ringB = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulsing) {
      ringA.setValue(0);
      ringB.setValue(0);
      breath.setValue(0);
      return;
    }
    const ring = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: NATIVE,
          }),
        ]),
      );
    const anims = [
      ring(ringA, 0),
      ring(ringB, 1000),
      Animated.loop(
        Animated.sequence([
          Animated.timing(breath, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: NATIVE,
          }),
          Animated.timing(breath, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: NATIVE,
          }),
        ]),
      ),
    ];
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [pulsing, ringA, ringB, breath]);

  const toPress = (to: number) =>
    Animated.timing(press, {
      toValue: to,
      duration: 110,
      easing: Easing.out(Easing.quad),
      useNativeDriver: NATIVE,
    }).start();

  const scaleAnim = Animated.multiply(
    breath.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.05],
    }),
    press.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.93],
    }),
  );

  const halo = (v: Animated.Value) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    opacity: v.interpolate({
      inputRange: [0, 1],
      outputRange: [0.45, 0],
    }),
    transform: [{
      scale: v.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.75],
      }),
    }],
  });

  return (
    <View style={[styles.wrap, {
      width: size,
      height: size,
    }]}
    >
      {pulsing && (
        <>
          <Animated.View style={[styles.halo, halo(ringA)]} />
          <Animated.View style={[styles.halo, halo(ringB)]} />
        </>
      )}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="lancer la séance"
          onPress={onPress}
          onPressIn={() => toPress(1)}
          onPressOut={() => toPress(0)}
          style={[styles.btn, {
            width: size,
            height: size,
            borderRadius: size / 2,
          }, !pulsing && styles.btnDone]}
        >
          <Text style={[styles.icon, {
            fontSize: ms(38),
            lineHeight: size,
          }]}
          >
            {' ▶'}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    backgroundColor: ACCENT,
    pointerEvents: 'none',
  },
  btn: {
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 4px 16px rgba(${ACCENT_RGB},0.45)`,
    elevation: 8,
  },
  // Session already done: same button, dialed down so it stops shouting.
  btnDone: {
    opacity: 0.55,
    boxShadow: `0 2px 8px rgba(${ACCENT_RGB},0.2)`,
  },
  icon: { textAlign: 'center' },
});
