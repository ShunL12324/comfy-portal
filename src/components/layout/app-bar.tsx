import { designTokens as t } from '@/constants/design-tokens';
import { Action, AppBarActionProvider, Copy, useDesign } from '@/components/ui/design-system/primitives';
import { Heading } from '@/components/ui/heading';
import { View } from '@/components/ui/view';
import { useRouter } from 'expo-router';
import { ChevronLeft } from '@/constants/icons';
import { type ReactNode } from 'react';

interface AppBarProps {
  title: string;
  titleCount?: number;
  titleSize?: 'lg' | 'sm' | 'md' | 'xl' | '2xl' | 'xs' | '3xl' | '4xl' | '5xl';
  subtitle?: string;
  showBack?: boolean;
  centerTitle?: boolean;
  rightElement?: ReactNode;
  centerElement?: ReactNode;
  bottomElement?: ReactNode;
  className?: string;
  showBottomBorder?: boolean;
}

export function AppBar({
  title,
  titleCount,
  titleSize,
  subtitle,
  showBack,
  centerTitle,
  rightElement,
  centerElement,
  bottomElement,
  className,
  showBottomBorder,
}: AppBarProps) {
  const router = useRouter();
  const c = useDesign();
  const compact = titleSize === 'sm' || titleSize === 'xs' || (!titleSize && !!showBack);
  return (
    <View
      testID="app-bar"
      className={className}
      style={{
        backgroundColor: c.paper,
        paddingHorizontal: t.layout.gutter,
        paddingTop: t.layout.related,
        paddingBottom: t.layout.field,
        gap: t.layout.label,
        borderBottomWidth: showBottomBorder ? 1 : 0,
        borderColor: c.line,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.layout.field, minHeight: t.height.touch }}>
        {showBack && (
          <View testID="app-bar-leading" style={{ width: 20, height: t.height.touch }}>
            <View style={{ position: 'absolute', left: -(t.height.touch - 20) / 2 }}>
              <Action
                kind="text"
                icon={ChevronLeft}
                iconSize={t.icon.large}
                label="Go back"
                onPress={() => router.back()}
              />
            </View>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0, alignItems: centerTitle ? 'center' : 'flex-start' }}>
          {
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.layout.related, maxWidth: '100%' }}>
                <Heading
                  numberOfLines={1}
                  style={{
                    flexShrink: 1,
                    fontFamily: t.font.titleSemibold,
                    fontWeight: '400',
                    fontSize: compact ? t.type.heading : t.type.title,
                    lineHeight: compact ? t.leading.heading : t.leading.title,
                    color: c.ink,
                  }}
                >
                  {title}
                </Heading>
                {titleCount !== undefined && (
                  <View
                    accessibilityLabel={`${title}: ${titleCount}`}
                    style={{
                      minWidth: 24,
                      height: 20,
                      paddingHorizontal: t.layout.badgeX,
                      borderRadius: t.radius.small,
                      backgroundColor: c.well,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Copy mono size="metadata" style={{ color: c.secondary }}>
                      {titleCount}
                    </Copy>
                  </View>
                )}
              </View>
              {centerElement}
            </>
          }
        </View>
        {rightElement && (
          <AppBarActionProvider value={true}>
            <View testID="app-bar-trailing" style={{ flexShrink: 0, alignItems: 'flex-end' }}>
              {rightElement}
            </View>
          </AppBarActionProvider>
        )}
      </View>
      {subtitle && (
        <Copy
          size="metadata"
          muted
          numberOfLines={1}
          style={{ marginLeft: showBack ? t.icon.large + t.layout.field : 0 }}
        >
          {subtitle}
        </Copy>
      )}
      {bottomElement}
    </View>
  );
}
