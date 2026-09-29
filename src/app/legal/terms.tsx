import { WebViewPage } from '@/components/common/webview-page';
import { AppBar } from '@/components/layout/app-bar';
import { View } from '@/components/ui/view';

export default function TermsScreen() {
  return (
    <View className="bg-surface-base flex-1">
      <AppBar title="Terms of service" showBack />
      <WebViewPage
        uri="https://shunl12324.github.io/comfy-portal/terms"
        loadingTitle="Loading Terms of Service..."
        slowLoadingTitle="Terms of Service is taking longer than expected"
      />
    </View>
  );
}
