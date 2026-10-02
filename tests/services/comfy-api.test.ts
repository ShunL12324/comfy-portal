import { File } from 'expo-file-system';
import { uploadImage } from '@/services/comfy-api';

/** The upload task the last `createUploadTask` call returned. */
let mockTask: any;
jest.mock('expo-file-system', () => ({
  UploadType: { BINARY_CONTENT: 0, MULTIPART: 1 },
  File: jest.fn().mockImplementation((uri: string) => ({
    uri,
    createUploadTask: jest.fn((url: string, options: any) => {
      let settle!: { resolve: (result: unknown) => void; reject: (error: unknown) => void };
      mockTask = {
        url,
        options,
        uploadAsync: jest.fn(() => new Promise((resolve, reject) => (settle = { resolve, reject }))),
        cancel: jest.fn(() => settle.reject(new Error('Upload was cancelled'))),
        release: jest.fn(),
        respond: (status: number, body: string) => settle.resolve({ status, body, headers: {} }),
        fail: (message: string) => settle.reject(new Error(message)),
      };
      return mockTask;
    }),
  })),
}));
jest.mock('@/services/network', () => ({
  buildServerUrl: jest.fn(
    async (_ssl: unknown, host: string, port: string, path: string) => `http://${host}:${port}${path}`,
  ),
  fetchWithAuth: jest.fn(),
}));
jest.mock('@/features/server/stores/server-store', () => ({
  useServersStore: {
    getState: () => ({
      servers: [{ id: 'server', host: 'comfy', port: '8188', useSSL: 'Auto', token: 'secret' }],
    }),
  },
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  mockTask = undefined;
  jest.mocked(File).mockClear();
});

test('an upload posts the file as multipart with its token, reporting progress', async () => {
  const onProgress = jest.fn();
  const { promise } = uploadImage('file:///picked/photo.jpg', 'photo.jpg', 'server', 'image/jpeg', onProgress);
  await flush();

  expect(jest.mocked(File)).toHaveBeenCalledWith('file:///picked/photo.jpg');
  expect(mockTask.url).toBe('http://comfy:8188/upload/image?token=secret');
  expect(mockTask.options).toMatchObject({
    uploadType: 1,
    sessionType: 'background',
    fieldName: 'image',
    parameters: { type: 'input', overwrite: 'true' },
    headers: { Authorization: 'Bearer secret' },
    mimeType: 'image/jpeg',
    httpMethod: 'POST',
  });

  mockTask.options.onProgress({ bytesSent: 0, totalBytes: 0 });
  mockTask.options.onProgress({ bytesSent: 50, totalBytes: 200 });
  mockTask.options.onProgress({ bytesSent: 210, totalBytes: 200 }); // multipart framing
  expect(onProgress.mock.calls.map(([progress]) => progress)).toEqual([0.25, 1]);

  mockTask.respond(200, JSON.stringify({ name: 'photo.jpg', subfolder: '', type: 'input' }));
  const result = await promise;
  expect(result).toMatchObject({ name: 'photo.jpg', type: 'input' });
  const preview = new URL(result.previewUrl);
  expect(preview.pathname).toBe('/view');
  expect(preview.searchParams.get('filename')).toBe('photo.jpg');
  expect(preview.searchParams.get('token')).toBe('secret');
  expect(mockTask.release).toHaveBeenCalled();
});

test('a non-200 response is an error carrying the status and the start of the body', async () => {
  const { promise } = uploadImage('file:///picked/photo.jpg', 'photo.jpg', 'server');
  await flush();
  mockTask.respond(400, 'Bad request: invalid image');
  await expect(promise).rejects.toThrow('Failed to upload image (400): Bad request: invalid image');
});

test('a transport failure is passed on', async () => {
  const { promise } = uploadImage('file:///picked/photo.jpg', 'photo.jpg', 'server');
  await flush();
  mockTask.fail('Unable to upload a file: The network connection was lost.');
  await expect(promise).rejects.toThrow('network connection was lost');
});

test('cancelling rejects with the wording callers treat as a cancellation', async () => {
  const { promise, cancel } = uploadImage('file:///picked/photo.jpg', 'photo.jpg', 'server');
  await flush();
  await cancel();
  expect(mockTask.cancel).toHaveBeenCalled();
  await expect(promise).rejects.toThrow('canceled');
});

test('cancelling before the request starts uploads nothing', async () => {
  const { promise, cancel } = uploadImage('file:///picked/photo.jpg', 'photo.jpg', 'server');
  await cancel();
  await expect(promise).rejects.toThrow('canceled');
  expect(mockTask).toBeUndefined();
});

test('an unknown server is rejected', async () => {
  await expect(uploadImage('file:///a.jpg', 'a.jpg', 'missing').promise).rejects.toThrow('server not found');
});
