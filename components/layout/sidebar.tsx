import { useThemeColor } from '@/hooks/useThemeColor';
import { Images, LayoutTemplate, Server, Settings2 } from '@/constants/icons';
import { MotiView } from 'moti';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HStack } from '../ui/hstack';
import { Icon } from '../ui/icon';
import { Pressable } from '../ui/pressable';
import { Copy } from '../ui/design-system/primitives';
import { VStack } from '../ui/vstack';
import { type TabRoute } from './tab-bar';
import { designTokens as t } from '@/constants/design-tokens';

interface SidebarItemProps {
  icon: typeof Server;
  label: string;
  isActive: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColor>;
}

interface SidebarProps {
  activeTab: TabRoute;
  onChangeTab: (tab: TabRoute) => void;
}

const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 320;
const SIDEBAR_WIDTH_RATIO = 0.25;

const SidebarItem = ({ icon, label, isActive, onPress, colors }: SidebarItemProps) => {
  return (
    <Pressable onPress={onPress} className="rounded-lg">
      <MotiView
        animate={{
          backgroundColor: isActive ? colors.background[100] : 'transparent',
        }}
        transition={{ type: 'timing', duration: 200 }}
        style={{ borderRadius: t.radius.control }}
      >
        <HStack space="md" className="px-3 py-2.5 items-center">
          <Icon as={icon} size="sm" className={isActive ? 'text-content-primary' : 'text-content-tertiary'} />
          <Copy muted={!isActive} style={{ fontWeight: '500' }}>
            {label}
          </Copy>
        </HStack>
      </MotiView>
    </Pressable>
  );
};

export const Sidebar = ({ activeTab, onChangeTab }: SidebarProps) => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColor();
  const { width } = useWindowDimensions();
  const sidebarWidth = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width * SIDEBAR_WIDTH_RATIO));

  return (
    <VStack
      className="border-stroke-hairline bg-surface-card border-r"
      style={{ width: sidebarWidth, paddingTop: insets.top }}
    >
      {/* Navigation items */}
      <VStack space="xs" className="px-3 pt-4">
        <SidebarItem
          icon={Server}
          label="Servers"
          isActive={activeTab === 'server'}
          onPress={() => onChangeTab('server')}
          colors={colors}
        />
        <SidebarItem
          icon={Images}
          label="Gallery"
          isActive={activeTab === 'gallery'}
          onPress={() => onChangeTab('gallery')}
          colors={colors}
        />
        <SidebarItem
          icon={LayoutTemplate}
          label="Environments"
          isActive={activeTab === 'explore'}
          onPress={() => onChangeTab('explore')}
          colors={colors}
        />
        <SidebarItem
          icon={Settings2}
          label="Settings"
          isActive={activeTab === 'setting'}
          onPress={() => onChangeTab('setting')}
          colors={colors}
        />
      </VStack>

      {/* Bottom safe area padding */}
      <VStack style={{ height: insets.bottom }} />
    </VStack>
  );
};
