function getBackgroundColor(isDark: boolean) {
  return isDark ? '#0F0F14' : '#F5F5F7';
}

function getTextColor(isDark: boolean) {
  return isDark ? '#FFFFFF' : '#0F0F14';
}

export function getThemedStackOptions(isDark: boolean) {
  const backgroundColor = getBackgroundColor(isDark);
  const textColor = getTextColor(isDark);

  return {
    contentStyle: {
      backgroundColor,
    },
    headerBackTitleVisible: false,
    headerLargeStyle: {
      backgroundColor,
    },
    headerLargeTitleStyle: {
      color: textColor,
      fontWeight: '700' as const,
    },
    headerShadowVisible: false,
    headerStyle: {
      backgroundColor,
    },
    headerTintColor: textColor,
    headerTitleStyle: {
      color: textColor,
      fontWeight: '700' as const,
    },
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
