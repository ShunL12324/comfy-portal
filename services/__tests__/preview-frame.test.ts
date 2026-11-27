import { Buffer } from 'buffer';
import { decodePreviewFrame } from '../preview-frame';

function frame(event: number, header: number, bytes: Uint8Array): ArrayBuffer {
  const data = new ArrayBuffer(8 + bytes.length);
  const view = new DataView(data);
  view.setUint32(0, event);
  view.setUint32(4, header);
  new Uint8Array(data, 8).set(bytes);
  return data;
}

const jpeg = Uint8Array.from([255, 216, 255, 217]);
const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

test('decodes legacy JPEG and PNG without the protocol header', () => {
  expect(decodePreviewFrame(frame(1, 1, jpeg))?.uri).toBe('data:image/jpeg;base64,' + Buffer.from(jpeg).toString('base64'));
  expect(decodePreviewFrame(frame(1, 2, png))?.uri).toBe('data:image/png;base64,' + Buffer.from(png).toString('base64'));
});

test('routes metadata previews by prompt ID', () => {
  const meta = Buffer.from(JSON.stringify({ prompt_id: 'prompt-a', image_type: 'image/jpeg' }));
  expect(decodePreviewFrame(frame(4, meta.length, Buffer.concat([meta, jpeg])))).toEqual({
    promptId: 'prompt-a', uri: 'data:image/jpeg;base64,' + Buffer.from(jpeg).toString('base64'),
  });
});

test('ignores malformed, truncated and unrelated binary frames', () => {
  expect(decodePreviewFrame(new ArrayBuffer(4))).toBeNull();
  expect(decodePreviewFrame(frame(3, 1, jpeg))).toBeNull();
  expect(decodePreviewFrame(frame(4, 999, jpeg))).toBeNull();
  expect(decodePreviewFrame(frame(1, 2, jpeg))).toBeNull();
});
