import { Tenant, MenuItem, TenantUser, HistoryRecord, ActiveShiftDraft, AuditLogEntry } from '../types/saas.ts';

const IDB_NAME = 'fechacaixa_persistent_db';
const IDB_VERSION = 1;
const STORE_CLOSINGS = 'closings_by_tenant';
const STORE_DELETED_CLOSINGS = 'deleted_closings_by_tenant';
const STORE_DRAFTS = 'drafts_by_tenant';
const STORE_AUDIT = 'audit_logs_by_tenant';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openPersistenceDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_CLOSINGS)) {
          db.createObjectStore(STORE_CLOSINGS);
        }
        if (!db.objectStoreNames.contains(STORE_DELETED_CLOSINGS)) {
          db.createObjectStore(STORE_DELETED_CLOSINGS);
        }
        if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
          db.createObjectStore(STORE_DRAFTS);
        }
        if (!db.objectStoreNames.contains(STORE_AUDIT)) {
          db.createObjectStore(STORE_AUDIT);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        console.warn('IndexedDB indisponível, usando fallback localStorage:', req.error);
        resolve(null);
      };
    } catch (e) {
      console.warn('Erro ao abrir IndexedDB:', e);
      resolve(null);
    }
  });

  return dbPromise;
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openPersistenceDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet<T>(storeName: string, key: string, value: T): Promise<boolean> {
  const db = await openPersistenceDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbDelete(storeName: string, key: string): Promise<boolean> {
  const db = await openPersistenceDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// --- GERENCIAMENTO DE IDs DE FECHAMENTOS EXCLUÍDOS PELO USUÁRIO ---
export function getDeletedClosingIdsSync(tenantId: string): number[] {
  if (!tenantId) return [];
  try {
    const raw = localStorage.getItem(`fechacaixa_deleted_closings_${tenantId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number).filter((n) => !isNaN(n)) : [];
  } catch {
    return [];
  }
}

export async function getDeletedClosingIdsAsync(tenantId: string): Promise<number[]> {
  if (!tenantId) return [];
  const syncIds = getDeletedClosingIdsSync(tenantId);
  const idbIds = await idbGet<number[]>(STORE_DELETED_CLOSINGS, tenantId);
  const combined = Array.from(new Set([...syncIds, ...(Array.isArray(idbIds) ? idbIds : [])]));
  if (combined.length !== syncIds.length) {
    try {
      localStorage.setItem(`fechacaixa_deleted_closings_${tenantId}`, JSON.stringify(combined));
    } catch {}
  }
  return combined;
}

export async function addDeletedClosingId(tenantId: string, closingId: number): Promise<number[]> {
  if (!tenantId || !closingId) return [];
  const current = await getDeletedClosingIdsAsync(tenantId);
  const updated = Array.from(new Set([...current, Number(closingId)]));
  try {
    localStorage.setItem(`fechacaixa_deleted_closings_${tenantId}`, JSON.stringify(updated));
  } catch {}
  await idbSet(STORE_DELETED_CLOSINGS, tenantId, updated);
  return updated;
}

// --- SALVAMENTO QUOTA-SAFE NO LOCALSTORAGE + COMPLETO NO INDEXEDDB ---
function stripHeavyBase64Attachments(records: HistoryRecord[]): HistoryRecord[] {
  return records.map((rec) => {
    if (!rec.attachments || rec.attachments.length === 0) return rec;
    const lightAttachments = rec.attachments.filter(
      (att) => typeof att === 'string' && !att.startsWith('data:') && att.length < 2048
    );
    return {
      ...rec,
      attachments: lightAttachments.length > 0 ? lightAttachments : undefined,
    };
  });
}

export function saveClosingsToLocalStorageSafe(tenantId: string, records: HistoryRecord[]): void {
  if (!tenantId) return;
  const localKey = `fechacaixa_closings_${tenantId}`;
  try {
    localStorage.setItem(localKey, JSON.stringify(records));
  } catch {
    // Se estourar o limite de 5MB do localStorage por causa de fotos em Base64,
    // salva os registros completos sem os blobs pesados no localStorage (as fotos completas ficam no IndexedDB e no Servidor)
    try {
      const lightRecords = stripHeavyBase64Attachments(records);
      localStorage.setItem(localKey, JSON.stringify(lightRecords));
    } catch {
      try {
        // Último fallback: mantém os 50 fechamentos mais recentes sem fotos no localStorage
        const compact = stripHeavyBase64Attachments(records).slice(0, 50);
        localStorage.setItem(localKey, JSON.stringify(compact));
      } catch (err) {
        console.warn('Não foi possível gravar espelho de fechamentos no localStorage:', err);
      }
    }
  }
}

export async function saveClosingsForTenant(
  tenantId: string,
  records: HistoryRecord[]
): Promise<void> {
  if (!tenantId) return;
  const normalized = (Array.isArray(records) ? records : [])
    .filter((r) => r && (r.tenantId === tenantId || !r.tenantId))
    .map((r) => ({ ...r, tenantId }))
    .sort((a, b) => (b.id || 0) - (a.id || 0));

  saveClosingsToLocalStorageSafe(tenantId, normalized);
  await idbSet(STORE_CLOSINGS, tenantId, normalized);
}

export function getClosingsFromLocalStorageSync(tenantId: string): HistoryRecord[] {
  if (!tenantId) return [];
  const deletedSet = new Set(getDeletedClosingIdsSync(tenantId));
  const localKey = `fechacaixa_closings_${tenantId}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r: HistoryRecord) =>
          r &&
          !deletedSet.has(Number(r.id)) &&
          (r.tenantId === tenantId || (!r.tenantId && tenantId === 'tenant_flordebrasa'))
      )
      .map((r: HistoryRecord) => ({ ...r, tenantId }));
  } catch {
    return [];
  }
}

// Chave semântica para evitar duplicação de fechamentos de fábrica ou re-sincronizados
function getClosingSemanticSignature(r: HistoryRecord): string {
  const datePart = String(r.date || '').trim();
  const opPart = String(r.operator || '')
    .trim()
    .toLowerCase();
  const getnetPart = Number(r.getnet || 0).toFixed(2);
  const jclanPart = Number(r.jclan || 0).toFixed(2);
  return `${r.tenantId || ''}::${datePart}::${opPart}::${getnetPart}::${jclanPart}`;
}

function pickRicherRecord(a: HistoryRecord, b: HistoryRecord, tenantId: string): HistoryRecord {
  const aAttachments = a.attachments?.length || 0;
  const bAttachments = b.attachments?.length || 0;
  const aAudit = a.auditTrail?.length || 0;
  const bAudit = b.auditTrail?.length || 0;

  return {
    ...b,
    ...a,
    id: a.id || b.id,
    tenantId,
    attachments: aAttachments >= bAttachments ? a.attachments || b.attachments : b.attachments,
    auditTrail: aAudit >= bAudit ? a.auditTrail || b.auditTrail : b.auditTrail,
    selectedExclusionOptions: a.selectedExclusionOptions || b.selectedExclusionOptions,
    comments: a.comments || b.comments,
    closingDateKey: a.closingDateKey || b.closingDateKey,
  };
}

export function mergeClosingRecordLists(
  tenantId: string,
  lists: HistoryRecord[][],
  deletedIds: number[] = []
): HistoryRecord[] {
  const deletedSet = new Set(deletedIds.map(Number));
  const byId = new Map<number, HistoryRecord>();
  const sigToId = new Map<string, number>();

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const rawItem of list) {
      if (!rawItem) continue;
      if (
        rawItem.tenantId &&
        rawItem.tenantId !== tenantId &&
        !(tenantId === 'tenant_flordebrasa' && !rawItem.tenantId)
      ) {
        continue;
      }
      const item: HistoryRecord = { ...rawItem, tenantId };
      const numericId = Number(item.id);
      if (!numericId || deletedSet.has(numericId)) continue;

      const sig = getClosingSemanticSignature(item);
      const existingIdBySig = sigToId.get(sig);

      if (byId.has(numericId)) {
        const existing = byId.get(numericId)!;
        byId.set(numericId, pickRicherRecord(existing, item, tenantId));
      } else if (existingIdBySig !== undefined && byId.has(existingIdBySig)) {
        const existing = byId.get(existingIdBySig)!;
        const merged = pickRicherRecord(existing, item, tenantId);
        byId.set(existingIdBySig, merged);
      } else {
        byId.set(numericId, item);
        sigToId.set(sig, numericId);
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) => (b.id || 0) - (a.id || 0));
}

export async function loadClosingsForTenantAsync(tenantId: string): Promise<HistoryRecord[]> {
  if (!tenantId) return [];
  const [deletedIds, idbRecords] = await Promise.all([
    getDeletedClosingIdsAsync(tenantId),
    idbGet<HistoryRecord[]>(STORE_CLOSINGS, tenantId),
  ]);
  const lsRecords = getClosingsFromLocalStorageSync(tenantId);
  const merged = mergeClosingRecordLists(
    tenantId,
    [Array.isArray(idbRecords) ? idbRecords : [], lsRecords],
    deletedIds
  );

  // Garante que o IndexedDB e o localStorage fiquem alinhados
  if (merged.length > 0) {
    saveClosingsToLocalStorageSafe(tenantId, merged);
    await idbSet(STORE_CLOSINGS, tenantId, merged);
  }
  return merged;
}

export async function clearAllPersistenceForTenant(tenantId: string): Promise<void> {
  if (!tenantId) return;
  try {
    localStorage.removeItem(`fechacaixa_closings_${tenantId}`);
    localStorage.removeItem(`fechacaixa_deleted_closings_${tenantId}`);
    localStorage.removeItem(`fechacaixa_draft_${tenantId}`);
    localStorage.removeItem(`fechacaixa_audit_logs_${tenantId}`);
  } catch {}
  await Promise.all([
    idbDelete(STORE_CLOSINGS, tenantId),
    idbDelete(STORE_DELETED_CLOSINGS, tenantId),
    idbDelete(STORE_DRAFTS, tenantId),
    idbDelete(STORE_AUDIT, tenantId),
  ]);
}

// --- RASCUNHOS E AUDITORIA NO INDEXEDDB ---
export async function saveDraftToPersistence(
  tenantId: string,
  draft: ActiveShiftDraft
): Promise<void> {
  if (!tenantId || !draft) return;
  try {
    localStorage.setItem(`fechacaixa_draft_${tenantId}`, JSON.stringify(draft));
  } catch {}
  await idbSet(STORE_DRAFTS, tenantId, draft);
}

export async function loadDraftFromPersistence(
  tenantId: string
): Promise<ActiveShiftDraft | null> {
  if (!tenantId) return null;
  let lsDraft: ActiveShiftDraft | null = null;
  try {
    const raw = localStorage.getItem(`fechacaixa_draft_${tenantId}`);
    if (raw) lsDraft = JSON.parse(raw);
  } catch {}
  const idbDraft = await idbGet<ActiveShiftDraft>(STORE_DRAFTS, tenantId);
  if (idbDraft && lsDraft) {
    return (idbDraft.updatedAt || 0) >= (lsDraft.updatedAt || 0) ? idbDraft : lsDraft;
  }
  return idbDraft || lsDraft || null;
}

export async function clearDraftFromPersistence(tenantId: string): Promise<void> {
  if (!tenantId) return;
  try {
    localStorage.removeItem(`fechacaixa_draft_${tenantId}`);
  } catch {}
  await idbDelete(STORE_DRAFTS, tenantId);
}

export async function saveAuditLogsToPersistence(
  tenantId: string,
  logs: AuditLogEntry[]
): Promise<void> {
  if (!tenantId) return;
  const trimmed = (Array.isArray(logs) ? logs : []).slice(0, 150);
  try {
    localStorage.setItem(`fechacaixa_audit_logs_${tenantId}`, JSON.stringify(trimmed));
  } catch {}
  await idbSet(STORE_AUDIT, tenantId, trimmed);
}

export async function loadAuditLogsFromPersistence(tenantId: string): Promise<AuditLogEntry[]> {
  if (!tenantId) return [];
  let lsLogs: AuditLogEntry[] = [];
  try {
    const raw = localStorage.getItem(`fechacaixa_audit_logs_${tenantId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) lsLogs = parsed;
    }
  } catch {}
  const idbLogs = await idbGet<AuditLogEntry[]>(STORE_AUDIT, tenantId);
  if (Array.isArray(idbLogs) && idbLogs.length >= lsLogs.length) {
    return idbLogs;
  }
  return lsLogs;
}

// --- BACKUP PERIÓDICO AUTOMÁTICO EM ARQUIVO JSON (REDUNDÂNCIA CONTRA LIMPEZA DE CACHE) ---
export type AutoBackupFrequency = 'every_closing' | 'daily' | 'weekly';

export interface AutoBackupSettings {
  enabled: boolean;
  frequency: AutoBackupFrequency;
  autoDownloadOnClosing: boolean;
  lastBackupAt: number | null;
  snoozedUntil: number | null;
  lastBackedUpClosingsTotal: number;
}

const AUTO_BACKUP_STORAGE_KEY = 'fechacaixa_auto_backup_settings';

export function getAutoBackupSettings(): AutoBackupSettings {
  const defaults: AutoBackupSettings = {
    enabled: true,
    frequency: 'daily',
    autoDownloadOnClosing: true,
    lastBackupAt: null,
    snoozedUntil: null,
    lastBackedUpClosingsTotal: 0,
  };
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...parsed,
    };
  } catch {
    return defaults;
  }
}

export function saveAutoBackupSettings(
  updates: Partial<AutoBackupSettings>
): AutoBackupSettings {
  const current = getAutoBackupSettings();
  const next: AutoBackupSettings = {
    ...current,
    ...updates,
  };
  try {
    localStorage.setItem(AUTO_BACKUP_STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export async function buildFullRedundantBackupPayload(
  tenants: Tenant[],
  activeTenant?: Tenant | null
): Promise<{
  payload: {
    version: string;
    exportedAt: string;
    activeTenantId?: string;
    activeTenantName?: string;
    tenants: Tenant[];
    closingsByTenant: Record<string, HistoryRecord[]>;
    menusByTenant: Record<string, MenuItem[]>;
    usersByTenant: Record<string, TenantUser[]>;
    auditLogsByTenant: Record<string, AuditLogEntry[]>;
  };
  totalClosingsCount: number;
}> {
  const closingsByTenant: Record<string, HistoryRecord[]> = {};
  const menusByTenant: Record<string, MenuItem[]> = {};
  const usersByTenant: Record<string, TenantUser[]> = {};
  const auditLogsByTenant: Record<string, AuditLogEntry[]> = {};
  let totalClosingsCount = 0;

  await Promise.all(
    tenants.map(async (t) => {
      if (!t || !t.id) return;
      const closings = await loadClosingsForTenantAsync(t.id);
      if (closings.length > 0) {
        closingsByTenant[t.id] = closings;
        totalClosingsCount += closings.length;
      }
      const audit = await loadAuditLogsFromPersistence(t.id);
      if (audit.length > 0) {
        auditLogsByTenant[t.id] = audit;
      }
      try {
        const mRaw = localStorage.getItem(`fechacaixa_menu_${t.id}`);
        if (mRaw) {
          const mParsed = JSON.parse(mRaw);
          if (Array.isArray(mParsed) && mParsed.length > 0) menusByTenant[t.id] = mParsed;
        }
        const uRaw = localStorage.getItem(`fechacaixa_users_${t.id}`);
        if (uRaw) {
          const uParsed = JSON.parse(uRaw);
          if (Array.isArray(uParsed) && uParsed.length > 0) usersByTenant[t.id] = uParsed;
        }
      } catch {}
    })
  );

  return {
    payload: {
      version: '2.1',
      exportedAt: new Date().toISOString(),
      activeTenantId: activeTenant?.id,
      activeTenantName: activeTenant?.name,
      tenants,
      closingsByTenant,
      menusByTenant,
      usersByTenant,
      auditLogsByTenant,
    },
    totalClosingsCount,
  };
}

export async function triggerFullRedundantBackupDownload(
  tenants: Tenant[],
  activeTenant?: Tenant | null,
  reasonLabel = 'manual'
): Promise<{ filename: string; totalClosingsCount: number }> {
  const { payload, totalClosingsCount } = await buildFullRedundantBackupPayload(
    tenants,
    activeTenant
  );

  const now = new Date();
  const datePart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const timePart = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(
    2,
    '0'
  )}`;
  const slugPart = activeTenant?.slug ? `_${activeTenant.slug}` : '';
  const filename = `fechacaixa_backup${slugPart}_${datePart}_${timePart}.json`;

  const blob = new Blob([JSON.stringify({ ...payload, backupReason: reasonLabel }, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  saveAutoBackupSettings({
    lastBackupAt: Date.now(),
    snoozedUntil: null,
    lastBackedUpClosingsTotal: totalClosingsCount,
  });

  return { filename, totalClosingsCount };
}

