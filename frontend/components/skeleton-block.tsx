import { useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type SkeletonBlockProps = {
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBlock({ className, style }: SkeletonBlockProps) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(opacity);
      opacity.value = 0.5;
      return;
    }

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, {
          duration: 600,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.7, {
          duration: 600,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(opacity);
    };
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      className={`bg-surface ${className ?? ''}`}
      style={[animatedStyle, style]}
    />
  );
}
