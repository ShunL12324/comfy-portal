import { MotiView } from 'moti';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomActionPanelProps {
  isOpen: boolean;
  children: React.ReactNode;
  pb?: number;
}

export const BottomActionPanel = React.memo(({ isOpen, children, pb }: BottomActionPanelProps) => {
  const insets = useSafeAreaInsets();
  const paddingBottom = pb ?? insets.bottom;

  return (
    <MotiView
      animate={{
        translateY: isOpen ? 0 : 200,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{
        type: 'timing',
        duration: 200,
      }}
      className="absolute bottom-0 left-0 right-0 border-t-[0.5px] border-t-background-100 bg-background-0"
    >
      <View style={{ paddingBottom }} className="px-4 py-4">
        {children}
      </View>
    </MotiView>
  );
});
