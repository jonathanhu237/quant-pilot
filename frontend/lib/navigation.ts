function getBackgroundColor(isDark: boolean) {
  return isDark ? '#0F0F14' : '#F5F5F7';
}

function getTextColor(isDark: boolean) {
  return isDark ? '#FFFFFF' : '#0F0F14';
}

export function getThemedStackOptions(isDark: boolean, largeTitle = false) {
  const backgroundColor = getBackgroundColor(isDark);
  const textColor = getTextColor(isDark);

  return {
    headerBackButtonDisplayMode: 'minimal' as const,
    contentStyle: {
      backgroundColor,
    },
    headerShadowVisible: false,
    // On iOS 26, setting headerStyle.backgroundColor hides the large title text.
    // When largeTitle is enabled, leave headerStyle unset so native-stack can
    // fall back to a transparent nav bar background (required for large titles).
    ...(largeTitle
      ? null
      : {
          headerStyle: {
            backgroundColor,
          },
        }),
    headerTintColor: textColor,
    headerTitleStyle: {
      color: textColor,
      fontWeight: '700' as const,
    },
    ...(largeTitle
      ? {
          headerLargeTitle: true,
          headerLargeTitleStyle: {
            color: textColor,
            fontSize: 34,
            fontWeight: '700' as const,
          },
        }
      : null),
  };
}

export function getThemedSheetOptions(isDark: boolean, title: string) {
  const baseOptions = getThemedStackOptions(isDark);
  const isIos = process.env.EXPO_OS === 'ios';

  return {
    ...baseOptions,
    ...(isIos
      ? {
          presentation: 'formSheet' as const,
          sheetAllowedDetents: [0.55, 0.9],
          sheetGrabberVisible: true,
        }
      : {
          presentation: 'modal' as const,
        }),
    contentStyle: {
      backgroundColor: isDark ? '#1A1A24' : '#F5F5F7',
    },
    title,
  };
}
