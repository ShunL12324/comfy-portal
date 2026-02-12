import { Redirect } from 'expo-router';

/**
 * Catches the 'comfyportal://expo-sharing' deep link from the Share Extension.
 * Redirects to root immediately — useIncomingShare() in _layout.tsx handles the data.
 */
export default function SharingRoute() {
  return <Redirect href="/" />;
}
