/**
 * DOM type declarations for browser APIs
 */

declare global {
  interface FileSystemDirectoryHandle {
    [Symbol.asyncIterator](): AsyncIterator<FileSystemHandle, void, unknown>;
  }
}

export {};
