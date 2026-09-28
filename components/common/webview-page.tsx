import { Action, Copy, useDesign } from '@/components/ui/design-system/primitives';
import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { View } from '@/components/ui/view';
import * as Linking from 'expo-linking';
import { ExternalLink, RefreshCw } from '@/constants/icons';
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
  const c = useDesign();
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
    <View className="bg-surface-base flex-1">
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
        <View className="inset-0 bg-surface-base px-6 absolute items-center justify-center">
          {status === 'error' ? (
            <View className="bg-surface-raised px-5 py-6 w-full max-w-[360px] items-center rounded-xl">
              <Copy size="section" className="text-center" style={{ fontWeight: '600' }}>
                {errorTitle}
              </Copy>
              <Copy className="mt-2 text-center" style={{ color: c.secondary }}>
                {errorMessage}
              </Copy>
              <View className="mt-5 flex-row items-center">
                <Action kind="secondary" icon={RefreshCw} onPress={retry}>
                  Retry
                </Action>
                <Action kind="text" icon={ExternalLink} onPress={openInBrowser}>
                  Open browser
                </Action>
              </View>
            </View>
          ) : (
            <View className="items-center">
              <RotatingSpinner size="sm" preset="subtle" />
              <Copy size="section" className="mt-3" style={{ fontWeight: '500' }}>
                {status === 'slow-loading' ? slowLoadingTitle : loadingTitle}
              </Copy>
              <Copy className="mt-1 text-center" style={{ color: c.secondary }}>
                {status === 'slow-loading' ? slowLoadingDescription : 'Please wait a moment.'}
              </Copy>
              {status === 'slow-loading' && (
                <Action kind="text" icon={ExternalLink} onPress={openInBrowser}>
                  Open browser
                </Action>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
