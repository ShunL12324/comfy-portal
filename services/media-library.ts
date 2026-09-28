import { Asset } from 'expo-media-library';
export { requestPermissionsAsync, usePermissions } from 'expo-media-library';

export async function saveToLibraryAsync(uri: string): Promise<void> {
  await Asset.create(uri);
}
