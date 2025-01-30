import { View } from '@/components/ui/view';
import { WebView } from 'react-native-webview';

export default function PrivacyScreen() {
  return (
    <View className="flex-1 bg-background-0">
      <WebView
        className="flex-1"
        source={{
          uri: 'https://shunl12324.github.io/comfy-portal/privacy',
        }}
        cacheEnabled={false}
        cacheMode="LOAD_NO_CACHE"
        incognito={true}
      />
    </View>
  );
}
