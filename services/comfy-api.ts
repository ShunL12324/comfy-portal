import { useServersStore } from "@/features/server/stores/server-store";
import * as FileSystem from 'expo-file-system';
import { buildServerUrl, fetchWithAuth } from "./network";

interface UploadImageResponse {
  name: string;
  subfolder: string;
  type: string;
  previewUrl: string;
}

export interface ServerWorkflowFile {
  filename: string;
  size: number;
  modified: number;
  raw_content?: string;
}

interface ListWorkflowsResponse {
  status: string;
  workflows: ServerWorkflowFile[];
}

export const uploadImage = (
  fileUri: string,
  fileName: string,
  serverId: string,
  onProgress?: (progress: number) => void
): { promise: Promise<UploadImageResponse>; cancel: () => Promise<void> } => {
  const server = useServersStore.getState().servers.find((server) => server.id === serverId);
  if (!server) {
    return {
      promise: Promise.reject(new Error('server not found')),
      cancel: async () => { },
    };
  }

  let task: FileSystem.UploadTask | null = null;

  const promise = (async () => {
    const url = await buildServerUrl(server.useSSL, server.host, server.port, '/upload/image');

    task = FileSystem.createUploadTask(
      url,
      fileUri,
      {
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'image',
        parameters: {
          type: 'input',
          overwrite: 'true',
        },
        mimeType: 'image/jpeg',
        httpMethod: 'POST',
      },
      (data) => {
        if (onProgress && data.totalBytesExpectedToSend > 0) {
          onProgress(data.totalBytesSent / data.totalBytesExpectedToSend);
        }
      }
    );

    const uploadResult = await task.uploadAsync();

    if (!uploadResult || uploadResult.status !== 200) {
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
  })();

  return {
    promise,
    cancel: async () => {
      if (task) {
        await task.cancelAsync();
      }
    },
  };
};

export const listWorkflows = async (serverId: string): Promise<ServerWorkflowFile[]> => {
  try {
    const server = useServersStore.getState().servers.find((s) => s.id === serverId);
    if (!server) {
      throw new Error('Server not found');
    }

    const url = await buildServerUrl(server.useSSL, server.host, server.port, '/api/cpe/workflow/list');
    const response = await fetchWithAuth(url, server.token, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to list workflows: ${response.status} ${errorText}`);
    }

    const data: ListWorkflowsResponse = await response.json();

    if (data.status !== 'success') {
      throw new Error('Failed to list workflows: Server reported an error');
    }

    return data.workflows;
  } catch (error) {
    console.warn('Error listing workflows:', error);
    throw error;
  }
};

// Interface for the expected response from /cpe/workflow/get-and-convert
interface GetAndConvertWorkflowSuccessResponse {
  status: 'success';
  message: string;
  filename: string;
  data: { workflow: any }; // Assuming the converted workflow is an object under data.workflow
}

interface GetAndConvertWorkflowErrorResponse {
  status: 'error';
  message: string;
  details?: string;
}

type GetAndConvertWorkflowResponse = GetAndConvertWorkflowSuccessResponse | GetAndConvertWorkflowErrorResponse;

export const getAndConvertWorkflow = async (serverId: string, filename: string): Promise<any> => {
  try {
    const server = useServersStore.getState().servers.find((s) => s.id === serverId);
    if (!server) {
      throw new Error('Server not found');
    }

    const params = new URLSearchParams();
    params.append('filename', filename);

    const url = await buildServerUrl(server.useSSL, server.host, server.port, `/cpe/workflow/get-and-convert?${params.toString()}`);

    const response = await fetchWithAuth(url, server.token, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetails = errorText;
      try {
        const errorJson: GetAndConvertWorkflowErrorResponse = JSON.parse(errorText);
        errorDetails = errorJson.message || errorText;
        if (errorJson.details) {
          errorDetails += ` (Details: ${errorJson.details})`;
        }
      } catch (e) {
        // Not a JSON error response, use the raw text
      }
      throw new Error(`Failed to get and convert workflow: ${response.status} ${errorDetails}`);
    }

    const data: GetAndConvertWorkflowResponse = await response.json();

    if (data.status !== 'success') {
      const errorResponse = data as GetAndConvertWorkflowErrorResponse;
      let errorMessage = `Failed to get and convert workflow: ${errorResponse.message}`;
      if (errorResponse.details) {
        errorMessage += ` (Details: ${errorResponse.details})`;
      }
      throw new Error(errorMessage);
    }
    // Assuming the actual converted workflow is nested under data.workflow
    if (!data.data || typeof data.data.workflow === 'undefined') {
      throw new Error('Converted workflow data is missing in the response');
    }

    return data.data.workflow;
  } catch (error) {
    console.warn('Error getting and converting workflow:', error);
    throw error;
  }
};
