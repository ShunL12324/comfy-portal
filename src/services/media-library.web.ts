import { useCallback } from 'react';
import type { PermissionResponse } from 'expo-media-library';

const permission: PermissionResponse = {
  status: 'granted' as PermissionResponse['status'],
  granted: true,
  canAskAgain: true,
  expires: 'never',
};

// Browser downloads do not require native photo-library permissions.
export async function requestPermissionsAsync(): Promise<PermissionResponse> {
  return permission;
}

export function usePermissions() {
  const request = useCallback(requestPermissionsAsync, []);
  return [permission, request, request] as const;
}

export async function saveToLibraryAsync(uri: string): Promise<void> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Media download failed: ${response.status}`);
  const blobUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = uri.split('/').pop()?.split('?')[0] || 'download';
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }
}
