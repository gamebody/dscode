import React, { useEffect, useState } from 'react';
import { Text, Box, useInput } from 'ink';
import { Colors } from '../utils/colors';
import TextInput from './InkTextInput';
import Spinner from 'ink-spinner';

export interface SuggestionsSelectItem<T> {
  label: string;
  value: T;
  disabled?: boolean;
  themeNameDisplay?: string;
  themeTypeDisplay?: string;
}


export interface SuggestionsSelectProps<T> {
  items: Array<SuggestionsSelectItem<T>>;
  initialIndex?: number;
  onSelect: (value: T) => void;
  onHighlight?: (value: T) => void;
  isFocused?: boolean;
  showScrollArrows?: boolean;
  maxItemsToShow?: number;
  filterable?: boolean
  placeholder?: string
  loading?: boolean
}


export function SuggestionsSelect<T>({
  items: originItems,
  initialIndex = 0,
  onSelect,
  onHighlight,
  isFocused,
  showScrollArrows = false,
  maxItemsToShow = 10,
  filterable = false,
  placeholder = 'search...',
  loading = false,
}: SuggestionsSelectProps<T>): React.JSX.Element {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [scrollOffset, setScrollOffset] = useState(0);

  const [search, setSearch] = useState('')

  let items = originItems

  if (search) {
    items = originItems.filter(item => {
      return JSON.stringify(item).includes(search)
    })
  }


  useEffect(() => {
    if (search) {
      const hasLength = originItems.filter(item => {
        return JSON.stringify(item).includes(search)
      }).length != 0

      if (hasLength) {
        setActiveIndex(0)
        setScrollOffset(0)
      }
    }
  }, [search])

  useEffect(() => {
    const newScrollOffset = Math.max(
      0,
      Math.min(activeIndex - maxItemsToShow + 1, items.length - maxItemsToShow),
    );
    if (activeIndex < scrollOffset) {
      setScrollOffset(activeIndex);
    } else if (activeIndex >= scrollOffset + maxItemsToShow) {
      setScrollOffset(newScrollOffset);
    }
  }, [activeIndex, items.length, scrollOffset, maxItemsToShow]);

  useInput(
    (input, key) => {
      if (key.upArrow) {
        const newIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
        setActiveIndex(newIndex);
        onHighlight?.(items[newIndex]!.value);
      }
      if (key.downArrow) {
        const newIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
        setActiveIndex(newIndex);
        onHighlight?.(items[newIndex]!.value);
      }
      if (key.return) {
        onSelect(items[activeIndex]!.value);
      }

      // if (/^[1-9]$/.test(input)) {
      //   const targetIndex = Number.parseInt(input, 10) - 1;
      //   if (targetIndex >= 0 && targetIndex < visibleItems.length) {
      //     const selectedItem = visibleItems[targetIndex];
      //     if (selectedItem) {
      //       onSelect?.(selectedItem.value);
      //     }
      //   }
      // }
    },
    { isActive: isFocused && items.length > 0 },
  );

  const visibleItems = items.slice(scrollOffset, scrollOffset + maxItemsToShow);

  if (loading) {
    return <Spinner type='dots' />
  }

  return (
    <Box flexDirection="column">
      {
        filterable && (
          <TextInput
            placeholder={placeholder}
            value={search}
            onChange={value => {
              setSearch(value)
            }}/>
        )
      }
      {visibleItems.map((item, index) => {
        const itemIndex = scrollOffset + index;
        const isSelected = activeIndex === itemIndex;

        let textColor = Colors.Foreground;
        if (isSelected) {
          textColor = Colors.AccentGreen;
        } else if (item.disabled) {
          textColor = Colors.Gray;
        }

        return (
          <Box key={item.label}>
            {item.themeNameDisplay && item.themeTypeDisplay ? (
              <Text color={textColor} wrap="truncate">
                {item.themeNameDisplay}{' '}
                <Text color={Colors.Gray}>{item.themeTypeDisplay}</Text>
              </Text>
            ) : (
              <Text color={textColor} wrap="truncate">
                {item.label}
              </Text>
            )}
          </Box>
        );
      })}
      <Text color={Colors.AccentGreen}>
        - {activeIndex+1}/{items.length} -
      </Text>
    </Box>
  );
}
