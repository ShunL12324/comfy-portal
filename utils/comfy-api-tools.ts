import { useServersStore } from "@/store/servers";
import * as FileSystem from 'expo-file-system';
import { buildServerUrl } from "./network";

interface UploadImageResponse {
  name: string;
  subfolder: string;
  type: string;
  previewUrl: string;
}

export const uploadImage = async (fileUri: string, fileName: string, serverId: string): Promise<UploadImageResponse> => {
  try {
    const server = useServersStore.getState().servers.find((server) => server.id === serverId);
    if (!server) {
      throw new Error('server not found');
    }
    const url = await buildServerUrl(server.useSSL, server.host, server.port, '/upload/image');

    const uploadResult = await FileSystem.uploadAsync(url, fileUri, {
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'image',
      parameters: {
        subfolder: 'temp',
        type: 'input',
        overwrite: 'true',
      },
      mimeType: 'image/jpeg',
      httpMethod: 'POST',
    });

    if (uploadResult.status !== 200) {
      throw new Error('Failed to upload image');
    }

    const data = JSON.parse(uploadResult.body);
    const baseUrl = await buildServerUrl(server.useSSL, server.host, server.port, '/view');
    const params = new URLSearchParams();
    params.append('filename', data.name);
    if (data.subfolder) {
      params.append('subfolder', data.subfolder);
    }
    if (data.type) {
      params.append('type', data.type);
    }
    params.append('preview', 'webp;90');
    params.append('channel', 'rgba');
    const previewUrl = `${baseUrl}?${params.toString()}`;
    return {
      name: data.name,
      subfolder: data.subfolder,
      type: data.type,
      previewUrl,
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};
