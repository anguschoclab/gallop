/**
 * OPFS (Origin Private File System) Abstraction Layer
 * Provides file-based storage for large game state data
 */

let opfsRoot: FileSystemDirectoryHandle | null = null;
let isOPFSAvailable: boolean = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize OPFS directory.
 *
 * @returns Promise resolving when OPFS is initialized
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
 * Check if OPFS is available.
 *
 * @returns Promise resolving to availability status
 */
export async function checkOPFSAvailable(): Promise<boolean> {
  await initOPFS();
  return isOPFSAvailable;
}

/**
 * Write JSON data to OPFS file.
 *
 * @param filename - Destination filename
 * @param data - Serialized JSON data
 * @returns Promise resolving when write is complete
 */
export async function writeFile(filename: string, data: unknown): Promise<void> {
  if (!isOPFSAvailable || !opfsRoot) {
    // Silent no-op in headless/SSR environments
    return;
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
 * Read JSON data from OPFS file.
 *
 * @param filename - Target filename
 * @returns Promise resolving to deserialized data or null if not found
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
 * Delete file from OPFS.
 *
 * @param filename - Target filename
 * @returns Promise resolving to success status
 */
export async function deleteFile(filename: string): Promise<boolean> {
  if (!isOPFSAvailable || !opfsRoot) {
    return false;
  }

  try {
    await opfsRoot.removeEntry(filename);
    return true;
  } catch (error) {
    console.warn(`Could not delete ${filename} from OPFS:`, error);
    return false;
  }
}

/**
 * List all files in OPFS directory.
 *
 * @returns Promise resolving to array of filenames
 */
export async function listFiles(): Promise<string[]> {
  if (!isOPFSAvailable || !opfsRoot) {
    return [];
  }

  try {
    const files: string[] = [];
    // Iterate through directory entries
    for await (const entry of opfsRoot) {
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
 * Clear all OPFS data.
 *
 * @returns Promise resolving when all files are cleared
 */
export async function clearAll(): Promise<void> {
  if (!isOPFSAvailable || !opfsRoot) {
    return;
  }

  try {
    // Collect all file names first
    const fileNames: string[] = [];
    for await (const entry of opfsRoot) {
      if (entry.kind === "file") {
        fileNames.push(entry.name);
      }
    }
    // Then delete them
    for (const name of fileNames) {
      await opfsRoot.removeEntry(name);
    }
  } catch (error) {
    console.error("Failed to clear OPFS:", error);
  }
}
