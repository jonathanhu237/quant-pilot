import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

import { getThemedSheetOptions, getThemedStackOptions } from '../lib/navigation.ts';
import {
  HOME_NEW_TRADE_ROUTE,
  HOME_SIGNAL_HISTORY_ROUTE,
  MARKET_ADD_SYMBOL_ROUTE,
  MARKET_DETAIL_ROUTE_PATTERN,
  PAPER_TRADING_NEW_TRADE_ROUTE,
  STRATEGY_DETAIL_ROUTE_PATTERN,
  getStrategyDetailRoute,
} from '../lib/routes.ts';
import {
  getThemePalette,
  getThemeVariables,
  getToggledThemeMode,
  normalizeThemeMode,
} from '../lib/theme.ts';

function unwrapReturnedExpression(expression) {
  let current = expression;

  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }

  return current;
}

function getReturnedJsxTagName(expression) {
  const current = unwrapReturnedExpression(expression);

  if (ts.isJsxElement(current)) {
    return current.openingElement.tagName.getText();
  }

  if (ts.isJsxSelfClosingElement(current)) {
    return current.tagName.getText();
  }

  if (ts.isJsxFragment(current)) {
    return '<>';
  }

  return null;
}

function getDefaultExportRootReturnTags(relativePath) {
  const sourceText = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  const sourceFile = ts.createSourceFile(
    relativePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const component = sourceFile.statements.find(
    (statement) =>
      ts.isFunctionDeclaration(statement) &&
      statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
  );

  assert.ok(component?.body, `Expected default-exported component in ${relativePath}`);

  const returnTags = [];

  function visit(node) {
    if (ts.isFunctionLike(node) && node !== component) {
      return;
    }

    if (ts.isReturnStatement(node) && node.expression) {
      const tagName = getReturnedJsxTagName(node.expression);

      if (tagName) {
        returnTags.push(tagName);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(component.body);

  return {
    returnTags,
    sourceText,
  };
}

test('normalizeThemeMode defaults invalid values to dark', () => {
  assert.equal(normalizeThemeMode(undefined), 'dark');
  assert.equal(normalizeThemeMode(null), 'dark');
  assert.equal(normalizeThemeMode('system'), 'dark');
  assert.equal(normalizeThemeMode('light'), 'light');
});

test('theme helpers expose dark-first palette and toggle deterministically', () => {
  assert.equal(getToggledThemeMode('dark'), 'light');
  assert.equal(getToggledThemeMode('light'), 'dark');

  const darkPalette = getThemePalette('dark');
  const lightPalette = getThemePalette('light');

  assert.equal(darkPalette.background, '#0F0F14');
  assert.equal(darkPalette.placeholder, '#8B8B9E');
  assert.equal(lightPalette.background, '#F5F5F7');
  assert.equal(lightPalette.placeholder, '#6B6B7E');
  const darkVars = getThemeVariables('dark');
  assert.equal(darkVars['--color-accent'], '94 106 210');
  assert.equal(darkVars['--color-background'], '15 15 20');
  assert.equal(darkVars['--color-primary'], '255 255 255');
  assert.equal(darkVars['--color-surface'], '26 26 36');
});

test('modal and sheet routes are absolute and unambiguous', () => {
  assert.equal(MARKET_ADD_SYMBOL_ROUTE, '/(tabs)/market/add-symbol');
  assert.equal(MARKET_DETAIL_ROUTE_PATTERN, '/(tabs)/market/[symbol]');
  assert.equal(PAPER_TRADING_NEW_TRADE_ROUTE, '/(tabs)/paper-trading/new-trade');
  assert.equal(HOME_SIGNAL_HISTORY_ROUTE, '/(tabs)/(home)/signal-history');
  assert.equal(HOME_NEW_TRADE_ROUTE, '/(tabs)/(home)/new-trade');
});

test('large-title navigation options include explicit large-title chrome styling', () => {
  const stackOptions = getThemedStackOptions(true, true);
  const sheetOptions = getThemedSheetOptions(true, 'Sheet');

  assert.equal(stackOptions.headerLargeTitle, true);
  assert.equal(stackOptions.headerLargeTitleStyle.color, '#FFFFFF');
  assert.equal(stackOptions.headerLargeTitleStyle.fontSize, 34);
  assert.equal('headerStyle' in stackOptions, false);
  assert.equal(sheetOptions.title, 'Sheet');
});

test('tab stack layouts opt into large titles in their screen definitions', () => {
  const layoutPaths = [
    '../app/(tabs)/(home)/_layout.tsx',
    '../app/(tabs)/market/_layout.tsx',
    '../app/(tabs)/strategy/_layout.tsx',
    '../app/(tabs)/paper-trading/_layout.tsx',
  ];

  for (const layoutPath of layoutPaths) {
    const layoutSource = readFileSync(new URL(layoutPath, import.meta.url), 'utf8');
    assert.match(layoutSource, /getThemedStackOptions\(isDark,\s*true\)/);
  }
});

test('root layout keeps the themed wrapper in the native tree for large-title registration', () => {
  const rootLayoutSource = readFileSync(new URL('../app/_layout.tsx', import.meta.url), 'utf8');

  assert.match(rootLayoutSource, /collapsable=\{false\}/);
  assert.match(rootLayoutSource, /style=\{\[\{ flex: 1 \}, themeVars\]\}/);
});

test('root layout mounts GestureHandlerRootView for gesture-driven chart screens', () => {
  const rootLayoutSource = readFileSync(new URL('../app/_layout.tsx', import.meta.url), 'utf8');

  assert.match(rootLayoutSource, /import \{ GestureHandlerRootView \} from 'react-native-gesture-handler'/);
  assert.match(rootLayoutSource, /<GestureHandlerRootView style=\{\{ flex: 1 \}\}>/);
});

test('theme variables expose semantic non-color tokens for primitives', () => {
  const darkVars = getThemeVariables('dark');

  assert.equal(darkVars['--color-surface-raised'], '255 255 255');
  assert.equal(darkVars['--radius-card'], '24px');
  assert.equal(darkVars['--radius-pill'], '999px');
  assert.equal(darkVars['--border-hairline'], '1px');
  assert.equal(darkVars['--spacing-card-x'], '16px');
  assert.equal(darkVars['--font-size-heading'], '20px');
  assert.equal(darkVars['--line-height-heading'], '28px');
});

test('primitive UI library files exist', () => {
  const requiredFiles = [
    '../components/ui/README.md',
    '../components/ui/badge.tsx',
    '../components/ui/button.tsx',
    '../components/ui/card.tsx',
    '../components/ui/divider.tsx',
    '../components/ui/list-row.tsx',
    '../components/ui/typography.tsx',
  ];

  for (const relativePath of requiredFiles) {
    const fileUrl = new URL(relativePath, import.meta.url);
    assert.equal(existsSync(fileUrl), true, `${relativePath} should exist`);
  }
});

test('tab screens keep one top-level ScrollView alive across loading and loaded states', () => {
  const screenPaths = [
    '../app/(tabs)/(home)/index.tsx',
    '../app/(tabs)/market/index.tsx',
    '../app/(tabs)/strategy/index.tsx',
    '../app/(tabs)/paper-trading/index.tsx',
  ];

  for (const screenPath of screenPaths) {
    const { returnTags, sourceText } = getDefaultExportRootReturnTags(screenPath);

    assert.deepEqual(returnTags, ['ScrollView'], `${screenPath} should only return one root ScrollView`);
    assert.equal(
      (sourceText.match(/contentInsetAdjustmentBehavior="automatic"/g) ?? []).length,
      1,
      `${screenPath} should configure automatic inset adjustment on exactly one ScrollView`
    );
  }
});

test('refreshable tab screens keep pull-to-refresh on the shared root ScrollView', () => {
  const refreshableScreenPaths = [
    '../app/(tabs)/(home)/index.tsx',
    '../app/(tabs)/market/index.tsx',
    '../app/(tabs)/paper-trading/index.tsx',
  ];

  for (const screenPath of refreshableScreenPaths) {
    const sourceText = readFileSync(new URL(screenPath, import.meta.url), 'utf8');
    assert.match(sourceText, /refreshControl=\{/);
  }
});

test('button primitive keeps filled variants readable and 44pt tall', () => {
  const sourceText = readFileSync(new URL('../components/ui/button.tsx', import.meta.url), 'utf8');

  assert.match(sourceText, /primary:\s*'onAccent'/);
  assert.match(sourceText, /destructive:\s*'onAccent'/);
  assert.match(sourceText, /sm:\s*'min-h-11 px-3 py-2'/);
  assert.doesNotMatch(sourceText, /resolvedTextTone === 'up'/);
});

test('pill selector defaults selected text to on-accent and documents the text-color rule', () => {
  const sourceText = readFileSync(new URL('../components/pill-selector.tsx', import.meta.url), 'utf8');

  assert.match(sourceText, /Text color lives on the <Text> child, not the wrapper\./);
  assert.match(sourceText, /selectedLabelClassName = 'text-on-accent'/);
});

test('input primitive relies on tokenized body typography instead of inline font sizing', () => {
  const sourceText = readFileSync(new URL('../components/ui/input.tsx', import.meta.url), 'utf8');

  assert.match(sourceText, /borderCurve: 'continuous'/);
  assert.doesNotMatch(sourceText, /fontSize:\s*16/);
  assert.doesNotMatch(sourceText, /lineHeight:\s*undefined/);
});

test('tab header actions use one secondary-button chrome language across tabs', () => {
  const homeLayout = readFileSync(new URL('../app/(tabs)/(home)/_layout.tsx', import.meta.url), 'utf8');
  const marketLayout = readFileSync(new URL('../app/(tabs)/market/_layout.tsx', import.meta.url), 'utf8');
  const paperLayout = readFileSync(
    new URL('../app/(tabs)/paper-trading/_layout.tsx', import.meta.url),
    'utf8'
  );

  assert.match(homeLayout, /<View className="flex-row items-center gap-2">/);
  assert.equal(homeLayout.match(/variant="secondary"/g)?.length, 2);
  assert.match(marketLayout, /variant="secondary"/);
  assert.match(marketLayout, /color=\{palette\.accent\}/);
  assert.match(paperLayout, /variant="secondary"/);
  assert.doesNotMatch(paperLayout, /size="sm"/);
});

test('market detail route file exists and is registered in the market stack layout', () => {
  const detailFile = new URL('../app/(tabs)/market/[symbol].tsx', import.meta.url);
  const layoutSource = readFileSync(new URL('../app/(tabs)/market/_layout.tsx', import.meta.url), 'utf8');

  assert.equal(existsSync(detailFile), true, 'market detail route file should exist');
  assert.match(layoutSource, /<Stack\.Screen\s+name="\[symbol\]"/);
});

test('market list rows navigate to the stock detail route when pressed', () => {
  const sourceText = readFileSync(new URL('../app/(tabs)/market/index.tsx', import.meta.url), 'utf8');

  assert.match(sourceText, /onPress=\{\(\)\s*=>\s*\{/);
  assert.match(sourceText, /getMarketDetailRoute\(item\.symbol\)/);
});

test('market detail screen uses pill range selection and wagmi charts with 1M default', () => {
  const sourceText = readFileSync(new URL('../app/(tabs)/market/[symbol].tsx', import.meta.url), 'utf8');

  assert.match(sourceText, /from 'react-native-wagmi-charts'/);
  assert.match(sourceText, /<PillSelector/);
  assert.match(sourceText, /useState<KlineRange>\('1M'\)/);
});

test('strategy detail route pattern and helper are exported', () => {
  assert.equal(STRATEGY_DETAIL_ROUTE_PATTERN, '/(tabs)/strategy/[id]');
  assert.equal(typeof getStrategyDetailRoute, 'function');
  const routesSource = readFileSync(new URL('../lib/routes.ts', import.meta.url), 'utf8');
  assert.match(routesSource, /STRATEGY_DETAIL_ROUTE_PATTERN\s*=\s*'\/\(tabs\)\/strategy\/\[id\]'/);
  assert.match(routesSource, /export function getStrategyDetailRoute/);
});

test('strategy detail route file exists and is registered in the strategy stack layout', () => {
  const detailFile = new URL('../app/(tabs)/strategy/[id].tsx', import.meta.url);
  const layoutSource = readFileSync(
    new URL('../app/(tabs)/strategy/_layout.tsx', import.meta.url),
    'utf8'
  );
  assert.equal(existsSync(detailFile), true, 'strategy detail route file should exist');
  assert.match(layoutSource, /<Stack\.Screen\s+name="\[id\]"/);
});

test('strategy list rows navigate to the strategy detail route when pressed', () => {
  const sourceText = readFileSync(
    new URL('../app/(tabs)/strategy/index.tsx', import.meta.url),
    'utf8'
  );
  assert.match(sourceText, /getStrategyDetailRoute\(/);
  assert.match(sourceText, /router\.push\(/);
});

test('strategy detail screen wires up wagmi LineChart against the equity curve', () => {
  const sourceText = readFileSync(
    new URL('../app/(tabs)/strategy/[id].tsx', import.meta.url),
    'utf8'
  );
  assert.match(sourceText, /from 'react-native-wagmi-charts'/);
  assert.match(sourceText, /LineChart/);
  assert.match(sourceText, /result\.equity_curve/);
});

test('home signal rows keep the signal-history tap target stretched across the leading column', () => {
  const sourceText = readFileSync(new URL('../app/(tabs)/(home)/index.tsx', import.meta.url), 'utf8');

  assert.match(sourceText, /pathname:\s*HOME_SIGNAL_HISTORY_ROUTE/);
  assert.match(sourceText, /className="flex-1 gap-1 active:opacity-80"/);
  assert.match(sourceText, /trailing=\{\s*<View className="items-end gap-2">/);
  assert.match(sourceText, /<View className="items-end gap-1">/);
  assert.doesNotMatch(sourceText, /<View className="flex-row flex-wrap justify-end gap-2">/);
});
