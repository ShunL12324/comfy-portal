import { WebViewPage } from '@/components/common/webview-page';

export default function TermsScreen() {
  return (
    <WebViewPage
      uri="https://shunl12324.github.io/comfy-portal/terms"
      loadingTitle="Loading Terms of Service..."
      slowLoadingTitle="Terms of Service is taking longer than expected"
    />
  );
}
