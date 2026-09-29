import { WebViewPage } from '@/components/common/webview-page';
import { AppBar } from '@/components/layout/app-bar';
import { View } from '@/components/ui/view';

export default function PrivacyScreen() {
  return (
    <View className="bg-surface-base flex-1">
      <AppBar title="Privacy policy" showBack />
      <WebViewPage
        uri="https://shunl12324.github.io/comfy-portal/privacy"
        loadingTitle="Loading Privacy Policy..."
        slowLoadingTitle="Privacy Policy is taking longer than expected"
      />
    </View>
  );
}
