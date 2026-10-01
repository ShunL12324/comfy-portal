import { View } from 'react-native';
import { useDesign } from '@/components/ui/design-system/primitives';
import { Gallery } from '@/features/gallery/components/gallery';
export default function GalleryScreen() {
  const c = useDesign();
  // The Gallery owns its app bar: it turns into the selection bar while selecting.
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <Gallery />
    </View>
  );
}
