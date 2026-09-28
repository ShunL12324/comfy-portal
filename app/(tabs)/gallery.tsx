import { View } from 'react-native';
import { AppBar } from '@/components/layout/app-bar';
import { useDesign } from '@/components/ui/design-system/primitives';
import { designTokens as t } from '@/constants/design-tokens';
import { Gallery } from '@/features/gallery/components/gallery';
export default function GalleryScreen() {
  const c = useDesign();
  return <View style={{ flex: 1, backgroundColor: c.paper }}>
    <AppBar title="Gallery" />
    <View style={{ flex: 1, paddingHorizontal: t.layout.gutter }}><Gallery /></View>
  </View>;
}
