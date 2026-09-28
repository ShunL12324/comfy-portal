import { AppBar } from '@/components/layout/app-bar';
import { SettingRow } from '@/components/self-ui/setting-row';
import { Action, Copy, useDesign } from '@/components/ui/design-system/primitives';
import { ScrollView } from '@/components/ui/scroll-view';
import { View } from '@/components/ui/view';
import { designTokens as t } from '@/constants/design-tokens';
import { useThemeStore, type ThemePreference } from '@/store/theme';
import * as Linking from 'expo-linking';
import { type Href } from 'expo-router';
import {
  BookOpen,
  Cloud,
  CodeXml,
  FileText,
  Moon,
  Shield,
  Sparkles,
  Star,
  Sun,
  SunMoon,
  type LucideIcon,
} from '@/constants/icons';

type SettingEntry = {
  icon: LucideIcon;
  label: string;
  href?: Href;
  url?: string;
};

/** One continuous list; the rows are the structure, so nothing divides them. */
const ENTRIES: SettingEntry[] = [
  { icon: Sparkles, label: 'AI assistant', href: '/settings/ai-assistant' },
  { icon: Cloud, label: 'Cloud accounts & keys', href: '/settings/cloud-gpu' },
  { icon: BookOpen, label: 'Connection guide', href: '/guide' },
  { icon: Shield, label: 'Privacy policy', href: '/legal/privacy' },
  { icon: FileText, label: 'Terms of service', href: '/legal/terms' },
  { icon: Star, label: 'Rate Comfy Portal', url: 'https://apps.apple.com/us/app/comfy-portal/id6741044736' },
  { icon: CodeXml, label: 'Source code', url: 'https://github.com/ShunL12324/comfy-portal' },
];

/** One switcher walks all three modes, so the icon names the mode itself. */
const THEME_DISPLAY: Record<ThemePreference, { icon: LucideIcon; name: string }> = {
  system: { icon: SunMoon, name: 'System' },
  light: { icon: Sun, name: 'Light' },
  dark: { icon: Moon, name: 'Dark' },
};

export default function SettingScreen() {
  const preference = useThemeStore((s) => s.preference);
  const cyclePreference = useThemeStore((s) => s.cyclePreference);
  const c = useDesign();
  const theme = THEME_DISPLAY[preference];
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <AppBar
        title="Settings"
        rightElement={
          // Announce the mode, not just the action: with one control cycling
          // three states, "switch theme" alone would never say where you are.
          <Action icon={theme.icon} label={`Theme: ${theme.name}. Switch theme`} onPress={cyclePreference} />
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: t.layout.gutter, paddingBottom: t.layout.section }}>
        <View style={{ gap: t.layout.joined }}>
          {ENTRIES.map((entry) => (
            <SettingRow
              key={entry.label}
              icon={entry.icon}
              label={entry.label}
              href={entry.href}
              onPress={entry.url ? () => void Linking.openURL(entry.url as string) : undefined}
            />
          ))}
        </View>
        <Copy muted size="micro" style={{ textAlign: 'center', paddingTop: t.layout.field }}>
          Comfy Portal · A mobile workspace for ComfyUI
        </Copy>
      </ScrollView>
    </View>
  );
}
