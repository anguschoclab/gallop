/**
 * OPFS (Origin Private File System) Abstraction Layer
 * Provides file-based storage for large game state data
 */

let opfsRoot: FileSystemDirectoryHandle | null = null;
let isOPFSAvailable: boolean = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize OPFS directory
 */
export async function initOPFS(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      // Check if OPFS is available
      if (!("storage" in navigator) || !("getDirectory" in navigator.storage)) {
        console.warn("OPFS not available in this browser");
        isOPFSAvailable = false;
        return;
      }

      // Get OPFS root directory
      opfsRoot = await navigator.storage.getDirectory();
      isOPFSAvailable = true;
      console.log("OPFS initialized successfully");
    } catch (error) {
      console.error("Failed to initialize OPFS:", error);
      isOPFSAvailable = false;
    }
  })();

  return initPromise;
}

/**
 * Check if OPFS is available
 */
export async function checkOPFSAvailable(): Promise<boolean> {
  await initOPFS();
  return isOPFSAvailable;
}

/**
 * Write JSON data to OPFS file
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
 * Read JSON data from OPFS file
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
 * Delete file from OPFS
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
 * List all files in OPFS directory
 */
export async function listFiles(): Promise<string[]> {
  if (!isOPFSAvailable || !opfsRoot) {
    return [];
  }

  try {
    const files: string[] = [];
    // Iterate through directory entries
    for await (const entry of opfsRoot as any) {
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
 * Clear all OPFS data
 */
export async function clearAll(): Promise<void> {
  if (!isOPFSAvailable || !opfsRoot) {
    return;
  }

  try {
    // Collect all file names first
    const fileNames: string[] = [];
    for await (const entry of opfsRoot as any) {
      if (entry.kind === "file") {
        fileNames.push(entry.name);
      }
    }
    // Then delete them
    for (const name of fileNames) {
      await opfsRoot.removeEntry(name);
    }
    console.log("OPFS cleared successfully");
  } catch (error) {
    console.error("Failed to clear OPFS:", error);
  }
}
