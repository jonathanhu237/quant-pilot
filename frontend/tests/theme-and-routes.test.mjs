import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

import { getThemedSheetOptions, getThemedStackOptions } from '../lib/navigation.ts';
import {
  HOME_NEW_TRADE_ROUTE,
  HOME_SIGNAL_HISTORY_ROUTE,
  MARKET_ADD_SYMBOL_ROUTE,
  PAPER_TRADING_NEW_TRADE_ROUTE,
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

  assert.deepEqual(getThemeVariables('dark'), {
    '--color-accent': '94 106 210',
    '--color-background': '15 15 20',
    '--color-divider': '255 255 255',
    '--color-down': '0 196 140',
    '--color-error': '255 77 77',
    '--color-primary': '255 255 255',
    '--color-secondary': '139 139 158',
    '--color-surface': '26 26 36',
    '--color-up': '255 77 77',
  });
});

test('modal and sheet routes are absolute and unambiguous', () => {
  assert.equal(MARKET_ADD_SYMBOL_ROUTE, '/(tabs)/market/add-symbol');
  assert.equal(PAPER_TRADING_NEW_TRADE_ROUTE, '/(tabs)/paper-trading/new-trade');
  assert.equal(HOME_SIGNAL_HISTORY_ROUTE, '/(tabs)/(home)/signal-history');
  assert.equal(HOME_NEW_TRADE_ROUTE, '/(tabs)/(home)/new-trade');
});

test('large-title navigation options are only enabled when a stack opts in', () => {
  const defaultStackOptions = getThemedStackOptions(true);
  const largeTitleStackOptions = getThemedStackOptions(true, true);
  const sheetOptions = getThemedSheetOptions(true, 'Sheet');

  assert.ok(!('headerLargeTitle' in defaultStackOptions));
  assert.ok(!('headerLargeStyle' in defaultStackOptions));
  assert.ok(!('headerLargeTitleStyle' in defaultStackOptions));

  assert.equal(largeTitleStackOptions.headerLargeTitle, true);
  assert.equal(largeTitleStackOptions.headerLargeStyle.backgroundColor, '#0F0F14');
  assert.equal(largeTitleStackOptions.headerLargeTitleStyle.color, '#FFFFFF');
  assert.equal(largeTitleStackOptions.headerLargeTitleStyle.fontSize, 34);

  assert.ok(!('headerLargeTitle' in sheetOptions));
  assert.ok(!('headerLargeStyle' in sheetOptions));
  assert.ok(!('headerLargeTitleStyle' in sheetOptions));
});

test('tab stack layouts opt into large titles at the parent stack level', () => {
  const layoutPaths = [
    '../app/(tabs)/(home)/_layout.tsx',
    '../app/(tabs)/market/_layout.tsx',
    '../app/(tabs)/strategy/_layout.tsx',
    '../app/(tabs)/paper-trading/_layout.tsx',
  ];

  for (const layoutPath of layoutPaths) {
    const layoutSource = readFileSync(new URL(layoutPath, import.meta.url), 'utf8');
    assert.match(layoutSource, /screenOptions=\{getThemedStackOptions\(isDark, true\)\}/);
  }
});

test('root layout keeps the themed wrapper in the native tree for large-title registration', () => {
  const rootLayoutSource = readFileSync(new URL('../app/_layout.tsx', import.meta.url), 'utf8');

  assert.match(rootLayoutSource, /collapsable=\{false\}/);
  assert.match(rootLayoutSource, /style=\{\[\{ flex: 1 \}, themeVars\]\}/);
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
