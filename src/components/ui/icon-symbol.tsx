// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
export type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'bell.fill': 'notifications',
  'list.number': 'format-list-numbered',
  'person.fill': 'person',
  'person.2.fill': 'group',
  'theatermasks.fill': 'theater-comedy',
  'map.fill': 'map',
  'list.bullet': 'list',
  'plus': 'add',
  'xmark': 'close',
  'checkmark': 'check',
  'globe': 'public',
  'lock.fill': 'lock',
  'gearshape.fill': 'settings',
  'magnifyingglass': 'search',
  'envelope.fill': 'email',
  'pencil': 'edit',
  'exclamationmark.2': 'priority-high',
  'hand.thumbsup.fill': 'thumb-up',
  'minus.circle': 'trending-flat',
  'questionmark.circle.fill': 'help',
  'hand.thumbsdown.fill': 'thumb-down',
  'book.fill': 'book',
  'arrow.up.arrow.down': 'swap-vert',
  'plus.circle.fill': 'add-circle',
  'line.3.horizontal': 'menu',
  /** Missing mappings show as blank on Android / web — keep in sync with IconSymbol usages. */
  'trophy.fill': 'emoji-events',
  airplane: 'flight',
  'info.circle': 'info',
  'xmark.circle': 'cancel',
  'plus.circle': 'add-circle-outline',
  'person.fill.badge.plus': 'person-add',
  'tag.fill': 'label',
  'calendar.badge.exclamationmark': 'event-busy',
  'megaphone.fill': 'campaign',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const glyph = MAPPING[name];
  if (__DEV__ && glyph == null) {
    console.warn(
      `[IconSymbol] No MaterialIcons mapping for SF Symbol "${String(name)}". Add it in icon-symbol.tsx (Android/web).`,
    );
  }
  return (
    <MaterialIcons color={color} size={size} name={glyph ?? "help-outline"} style={style} />
  );
}
