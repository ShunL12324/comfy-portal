import { Icon } from '@/components/ui/icon';
import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface OverlayButtonProps extends TouchableOpacityProps {
  icon: LucideIcon;
  iconColor?: string;
}

export const OverlayButton = React.memo(({ icon, iconColor = 'white', style, ...props }: OverlayButtonProps) => {
  return (
    <TouchableOpacity
      activeOpacity={0.5}
      style={[
        {
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: 8,
          padding: 8,
        },
        style,
      ]}
      {...props}
    >
      <Icon as={icon} size="sm" className={iconColor === 'white' ? 'text-white' : ''} style={iconColor !== 'white' ? { color: iconColor } : undefined} />
    </TouchableOpacity>
  );
});
