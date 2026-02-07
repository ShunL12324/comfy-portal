import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import * as Linking from 'expo-linking';
import { ExternalLink, RefreshCw } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';

const SLOW_LOADING_DELAY_MS = 4000;

type WebViewStatus = 'loading' | 'slow-loading' | 'ready' | 'error';

interface WebViewPageProps {
  uri: string;
  loadingTitle: string;
  slowLoadingTitle?: string;
  slowLoadingDescription?: string;
  errorTitle?: string;
}

export function WebViewPage({
  uri,
  loadingTitle,
  slowLoadingTitle = 'Network is slow',
  slowLoadingDescription = 'You can keep waiting or open this page in your browser.',
  errorTitle = 'Failed to load this page',
}: WebViewPageProps) {
  const [status, setStatusState] = useState<WebViewStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const statusRef = useRef<WebViewStatus>('loading');

  const setStatus = useCallback((nextStatus: WebViewStatus) => {
    statusRef.current = nextStatus;
    setStatusState(nextStatus);
  }, []);

  useEffect(() => {
    if (status !== 'loading') {
      return;
    }

    const timer = setTimeout(() => {
      if (statusRef.current === 'loading') {
        setStatus('slow-loading');
      }
    }, SLOW_LOADING_DELAY_MS);

    return () => clearTimeout(timer);
  }, [status, setStatus]);

  const retry = useCallback(() => {
    setErrorMessage('');
    setStatus('loading');
    setReloadKey((prev) => prev + 1);
  }, [setStatus]);

  const openInBrowser = useCallback(() => {
    Linking.openURL(uri);
  }, [uri]);

  return (
    <View className="flex-1 bg-background-0">
      <WebView
        key={reloadKey}
        className="flex-1"
        source={{ uri }}
        cacheEnabled={false}
        cacheMode="LOAD_NO_CACHE"
        incognito={true}
        style={{ backgroundColor: 'transparent' }}
        onLoadStart={() => {
          setErrorMessage('');
          setStatus('loading');
        }}
        onLoadEnd={() => {
          if (statusRef.current !== 'error') {
            setStatus('ready');
          }
        }}
        onError={(event) => {
          setErrorMessage(event.nativeEvent.description || 'Please check your network connection and try again.');
          setStatus('error');
        }}
        onHttpError={(event) => {
          setErrorMessage(`HTTP ${event.nativeEvent.statusCode}`);
          setStatus('error');
        }}
      />

      {status !== 'ready' && (
        <View className="absolute inset-0 items-center justify-center bg-background-0 px-6">
          {status === 'error' ? (
            <View className="w-full max-w-[360px] items-center rounded-2xl border border-outline-200 bg-background-50 px-5 py-6">
              <Text className="text-center text-base font-semibold text-typography-900">{errorTitle}</Text>
              <Text className="mt-2 text-center text-sm text-typography-500">{errorMessage}</Text>
              <View className="mt-5 flex-row items-center">
                <Button size="sm" variant="outline" onPress={retry} className="rounded-lg border-outline-300 bg-background-0">
                  <ButtonIcon as={RefreshCw} />
                  <ButtonText>Retry</ButtonText>
                </Button>
                <Button size="sm" variant="link" onPress={openInBrowser} className="ml-2">
                  <ButtonIcon as={ExternalLink} />
                  <ButtonText>Open in Browser</ButtonText>
                </Button>
              </View>
            </View>
          ) : (
            <View className="items-center">
              <RotatingSpinner size="sm" preset="subtle" />
              <Text className="mt-3 text-base font-medium text-typography-900">
                {status === 'slow-loading' ? slowLoadingTitle : loadingTitle}
              </Text>
              <Text className="mt-1 text-center text-sm text-typography-500">
                {status === 'slow-loading' ? slowLoadingDescription : 'Please wait a moment.'}
              </Text>
              {status === 'slow-loading' && (
                <Button size="sm" variant="link" onPress={openInBrowser} className="mt-2">
                  <ButtonIcon as={ExternalLink} />
                  <ButtonText>Open in Browser</ButtonText>
                </Button>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
