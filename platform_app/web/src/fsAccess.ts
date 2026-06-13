export interface FsWritable {
  write(data: BlobPart): Promise<void>;
  close(): Promise<void>;
}

export interface FsFileHandle {
  kind?: "file";
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<FsWritable>;
  queryPermission?(options: { mode: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission?(options: { mode: "read" | "readwrite" }): Promise<PermissionState>;
}

export interface RecentFileMeta {
  id: string;
  name: string;
  updated: number;
}

interface RecentFileRecord extends RecentFileMeta {
  handle: FsFileHandle;
}

interface FsWindow extends Window {
  showOpenFilePicker?: (options?: unknown) => Promise<FsFileHandle[]>;
  showSaveFilePicker?: (options?: unknown) => Promise<FsFileHandle>;
}

const DB_NAME = "ucp-file-handles";
const STORE = "recent";
const MAX_RECENT = 5;

const FILE_TYPES = [{
  description: "UCP project files",
  accept: {
    "application/json": [".ucp"],
    "text/plain": [".net", ".kicad_sch", ".kicad_sym"],
  },
}];

export function hasFileSystemAccess(): boolean {
  const win = globalThis.window as FsWindow | undefined;
  return !!win?.showOpenFilePicker && !!win.showSaveFilePicker && typeof indexedDB !== "undefined";
}

export async function pickOpenHandle(): Promise<FsFileHandle | null> {
  const win = window as FsWindow;
  if (!win.showOpenFilePicker) return null;
  const handles = await win.showOpenFilePicker({ types: FILE_TYPES, multiple: false });
  return handles[0] ?? null;
}

export async function pickSaveHandle(suggestedName: string): Promise<FsFileHandle | null> {
  const win = window as FsWindow;
  if (!win.showSaveFilePicker) return null;
  return win.showSaveFilePicker({
    suggestedName,
    types: [{ description: "UCP project", accept: { "application/json": [".ucp"] } }],
  });
}

export async function writeHandle(handle: FsFileHandle, text: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

export async function ensureHandlePermission(handle: FsFileHandle, mode: "read" | "readwrite"): Promise<boolean> {
  const options = { mode };
  if (handle.queryPermission && await handle.queryPermission(options) === "granted") return true;
  if (handle.requestPermission) return await handle.requestPermission(options) === "granted";
  return true;
}

export async function listRecentFiles(): Promise<RecentFileMeta[]> {
  try {
    const records = await getAllRecords();
    return records
      .sort((a, b) => b.updated - a.updated)
      .slice(0, MAX_RECENT)
      .map(({ id, name, updated }) => ({ id, name, updated }));
  } catch {
    return [];
  }
}

export async function rememberRecentFile(handle: FsFileHandle): Promise<RecentFileMeta[]> {
  try {
    const db = await openDb();
    const record: RecentFileRecord = { id: handle.name, name: handle.name, updated: Date.now(), handle };
    await requestToPromise(db.transaction(STORE, "readwrite").objectStore(STORE).put(record));
    const records = await getAllRecords(db);
    const stale = records.sort((a, b) => b.updated - a.updated).slice(MAX_RECENT);
    if (stale.length) {
      const tx = db.transaction(STORE, "readwrite");
      for (const item of stale) tx.objectStore(STORE).delete(item.id);
    }
    return listRecentFiles();
  } catch {
    return listRecentFiles();
  }
}

export async function getRecentFileHandle(id: string): Promise<FsFileHandle | null> {
  try {
    const db = await openDb();
    const record = await requestToPromise<RecentFileRecord | undefined>(
      db.transaction(STORE, "readonly").objectStore(STORE).get(id),
    );
    return record?.handle ?? null;
  } catch {
    return null;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllRecords(db?: IDBDatabase): Promise<RecentFileRecord[]> {
  const owned = db ?? await openDb();
  return requestToPromise<RecentFileRecord[]>(
    owned.transaction(STORE, "readonly").objectStore(STORE).getAll(),
  );
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
