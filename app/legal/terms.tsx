import { AppBar } from '@/components/layout/app-bar';
import { View } from '@/components/ui/view';
import { WebView } from 'react-native-webview';

export default function TermsScreen() {
  return (
    <View className="flex-1 bg-background-0">
      <AppBar title="Terms of Service" />
      <WebView
        className="flex-1"
        source={{
          uri: 'https://shunl12324.github.io/comfy-portal/terms.html',
        }}
      />
    </View>
  );
}
