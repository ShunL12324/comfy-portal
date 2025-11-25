import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/store/theme';
import { AnimatePresence, MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  anchor?: 'left' | 'right' | 'top' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'full';
}

export const Drawer = ({
  isOpen,
  onClose,
  children,
  anchor = 'right',
  size = 'md',
}: DrawerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const dimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const activeTheme = theme ?? 'light';

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  const handleExitComplete = () => {
    setIsVisible(false);
  };

  const getSizeValue = () => {
    const sizeMap = {
      sm: 0.25,
      md: 0.5,
      lg: 0.75,
      full: 1,
    };
    const ratio = sizeMap[size];

    if (anchor === 'left' || anchor === 'right') {
      return dimensions.width * ratio;
    }
    return dimensions.height * ratio;
  };

  const drawerSize = getSizeValue();

  const getAnimationProps = () => {
    switch (anchor) {
      case 'left':
        return {
          from: { translateX: -drawerSize },
          animate: { translateX: 0 },
          exit: { translateX: -drawerSize },
        };
      case 'right':
        return {
          from: { translateX: drawerSize },
          animate: { translateX: 0 },
          exit: { translateX: drawerSize },
        };
      case 'top':
        return {
          from: { translateY: -drawerSize },
          animate: { translateY: 0 },
          exit: { translateY: -drawerSize },
        };
      case 'bottom':
        return {
          from: { translateY: drawerSize },
          animate: { translateY: 0 },
          exit: { translateY: drawerSize },
        };
    }
  };

  const getPositionStyles = () => {
    switch (anchor) {
      case 'left':
        return { top: 0, bottom: 0, left: 0, width: drawerSize };
      case 'right':
        return { top: 0, bottom: 0, right: 0, width: drawerSize };
      case 'top':
        return { left: 0, right: 0, top: 0, height: drawerSize };
      case 'bottom':
        return { left: 0, right: 0, bottom: 0, height: drawerSize };
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1">
        {/* Backdrop */}
        <AnimatePresence>
          {isOpen && (
            <MotiView
              key="backdrop"
              from={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'timing', duration: 300 }}
              className="absolute inset-0 bg-black"
            >
              <Pressable style={{ flex: 1 }} onPress={onClose} />
            </MotiView>
          )}
        </AnimatePresence>

        {/* Content */}
        <AnimatePresence onExitComplete={handleExitComplete}>
          {isOpen && (
            <MotiView
              key="content"
              {...getAnimationProps()}
              transition={{ type: 'timing', duration: 300 }}
              style={[
                {
                  position: 'absolute',
                  backgroundColor: Colors[activeTheme].background[0],
                  ...getPositionStyles(),
                },
              ]}
              className="bg-background-0 shadow-2xl"
            >
              {children}
            </MotiView>
          )}
        </AnimatePresence>
      </View>
    </Modal>
  );
};

// Helper components for layout
export const DrawerHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <View className={`flex-row items-center justify-between px-4 py-3 ${className || ''}`}>
    {children}
  </View>
);

export const DrawerBody = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <View className={`flex-1 p-4 ${className || ''}`}>
    {children}
  </View>
);

export const DrawerFooter = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <View className={`flex-row items-center justify-end p-4 ${className || ''}`}>
    {children}
  </View>
);
