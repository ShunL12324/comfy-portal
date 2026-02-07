import { WebViewPage } from '@/components/common/webview-page';

export default function PrivacyScreen() {
  return (
    <WebViewPage
      uri="https://shunl12324.github.io/comfy-portal/privacy"
      loadingTitle="Loading Privacy Policy..."
      slowLoadingTitle="Privacy Policy is taking longer than expected"
    />
  );
}
