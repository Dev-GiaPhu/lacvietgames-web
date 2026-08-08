/* LacVietGames compatibility layer for ZIP raw-DEFLATE entries. */
(() => {
  'use strict';
  const NativeDecompressionStream = window.DecompressionStream;
  if (typeof TransformStream === 'undefined' || typeof window.LVGInflateRaw !== 'function') return;

  class LVGDecompressionStream {
    constructor(format) {
      if (format !== 'deflate-raw') {
        if (!NativeDecompressionStream) throw new TypeError(`Unsupported compression format: ${format}`);
        return new NativeDecompressionStream(format);
      }

      const chunks = [];
      let total = 0;
      return new TransformStream({
        transform(chunk) {
          const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
          const copy = new Uint8Array(bytes.length);
          copy.set(bytes);
          chunks.push(copy);
          total += copy.length;
        },
        flush(controller) {
          const input = new Uint8Array(total);
          let offset = 0;
          for (const chunk of chunks) {
            input.set(chunk, offset);
            offset += chunk.length;
          }
          const output = window.LVGInflateRaw(input);
          controller.enqueue(output);
        }
      });
    }
  }

  window.DecompressionStream = LVGDecompressionStream;
})();
