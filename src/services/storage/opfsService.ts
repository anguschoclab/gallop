/**
 * OPFS (Origin Private File System) Abstraction Layer
 * Provides file-based storage for large game state data
 */

let opfsRoot: FileSystemDirectoryHandle | null = null;
let isOPFSAvailable: boolean = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the OPFS root directory.
 *
 * This function checks for browser support and retrieves the root directory handle.
 * It uses a promise-locking mechanism to ensure initialization only happens once.
 *
 * @returns {Promise<void>} A promise that resolves when OPFS is ready for use.
 */
export async function initOPFS(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      // Check if we are in a browser environment
      if (typeof navigator === "undefined") {
        isOPFSAvailable = false;
        return;
      }

      // Check if OPFS is available
      if (!("storage" in navigator) || !("getDirectory" in navigator.storage)) {
        console.warn("OPFS not available in this browser");
        isOPFSAvailable = false;
        return;
      }

      // Get OPFS root directory
      opfsRoot = await navigator.storage.getDirectory();
      isOPFSAvailable = true;
    } catch (error) {
      console.error("Failed to initialize OPFS:", error);
      isOPFSAvailable = false;
    }
  })();

  return initPromise;
}

/**
 * Check if OPFS is currently available and initialized.
 *
 * @returns {Promise<boolean>} True if OPFS is supported and root is accessible.
 */
export async function checkOPFSAvailable(): Promise<boolean> {
  await initOPFS();
  return isOPFSAvailable;
}

/**
 * Write JSON-serializable data to a specific file in OPFS.
 *
 * @param {string} filename - The name of the file to write to.
 * @param {unknown} data - The data to be serialized and stored.
 * @throws {Error} If OPFS is not available or if the storage quota is exceeded.
 * @returns {Promise<void>} A promise that resolves when the write operation completes.
 */
export async function writeFile(filename: string, data: unknown): Promise<void> {
  if (!isOPFSAvailable || !opfsRoot) {
    throw new Error("OPFS not available");
  }

  try {
    const fileHandle = await opfsRoot.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    const json = JSON.stringify(data);
    await writable.write(json);
    await writable.close();
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      throw new Error("Storage quota exceeded");
    }
    throw error;
  }
}

/**
 * Read and parse JSON data from a specific file in OPFS.
 *
 * @template T
 * @param {string} filename - The name of the file to read.
 * @returns {Promise<T | null>} The parsed data, or null if the file is missing or OPFS is unavailable.
 */
export async function readFile<T>(filename: string): Promise<T | null> {
  if (!isOPFSAvailable || !opfsRoot) {
    return null;
  }

  try {
    const fileHandle = await opfsRoot.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return null;
    }
    console.error(`Failed to read file ${filename}:`, error);
    return null;
  }
}

/**
 * Permanently delete a file from the OPFS root.
 *
 * @param {string} filename - The name of the file to remove.
 * @returns {Promise<void>} A promise that resolves when the file is removed or verified missing.
 */
export async function deleteFile(filename: string): Promise<void> {
  if (!isOPFSAvailable || !opfsRoot) {
    return;
  }

  try {
    await opfsRoot.removeEntry(filename);
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      // File doesn't exist, that's fine
      return;
    }
    console.error(`Failed to delete file ${filename}:`, error);
  }
}

/**
 * List all filenames currently stored in the OPFS root directory.
 *
 * @returns {Promise<string[]>} An array of filenames. Returns empty array if OPFS is unavailable.
 */
export async function listFiles(): Promise<string[]> {
  if (!isOPFSAvailable || !opfsRoot) {
    return [];
  }

  try {
    const files: string[] = [];
    // Iterate through directory entries
    for await (const entry of opfsRoot as unknown as AsyncIterable<FileSystemHandle>) {
      if (entry.kind === "file") {
        files.push(entry.name);
      }
    }
    return files;
  } catch (error) {
    console.error("Failed to list files:", error);
    return [];
  }
}

/**
 * Clear all files from the OPFS root directory.
 *
 * Iterates through all entries and removes them individually.
 *
 * @returns {Promise<void>} A promise that resolves when the directory is empty.
 */
export async function clearAll(): Promise<void> {
  if (!isOPFSAvailable || !opfsRoot) {
    return;
  }

  try {
    // Collect all file names first
    const fileNames: string[] = [];
    for await (const entry of opfsRoot as unknown as AsyncIterable<FileSystemHandle>) {
      if (entry.kind === "file") {
        fileNames.push(entry.name);
      }
    }
    // Then delete them in parallel — allSettled so one failure doesn't skip remaining files
    const results = await Promise.allSettled(fileNames.map((name) => opfsRoot!.removeEntry(name)));
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "rejected") {
        const error = result.reason;
        if (error instanceof DOMException && error.name === "NotFoundError") {
          continue;
        }
        console.error(`Failed to delete file ${fileNames[i]}:`, error);
      }
    }
  } catch (error) {
    console.error("Failed to clear OPFS:", error);
  }
}

/**
 * Reset the internal module state.
 *
 * Internal helper intended for use in test suites to ensure a clean state between tests.
 *
 * @returns {void}
 */
export function _resetForTest(): void {
  opfsRoot = null;
  isOPFSAvailable = false;
  initPromise = null;
}
