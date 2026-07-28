import { useCallback, useEffect, useState } from 'react';
import { strings } from '../../constants/strings';
import type { ConvertTask } from '../../shared/ipc';
import type {
  ConflictResolution,
  DeleteScope,
  DesktopDocumentFamilySnapshot,
  DesktopInboxDocument,
  DesktopSyncLoginRequest,
  DesktopSyncSnapshot,
} from '../../shared/sync';
import { userFacingError } from '../../shared/userFacingError';
import { convertDirectionForFormat } from './presentation';

export const defaultSyncServerUrl = 'http://localhost:43120';

type SnapshotOperation = () => Promise<DesktopSyncSnapshot>;

export function useInboxController(onConvertRequested?: (tasks: ConvertTask[]) => void) {
  const [snapshot, setSnapshot] = useState<DesktopSyncSnapshot | null>(null);
  const [expandedDocumentId, setExpandedDocumentId] = useState<string | null>(null);
  const [family, setFamily] = useState<DesktopDocumentFamilySnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    window.api.syncSnapshot()
      .then(setSnapshot)
      .catch((error: unknown) => setFailure(userFacingError(error, strings.inboxFailed)));
  }, []);

  const perform = useCallback(async <T,>(operation: () => Promise<T>, commit?: (value: T) => void) => {
    setBusy(true);
    setFailure(null);
    try {
      const value = await operation();
      commit?.(value);
      return value;
    } catch (error) {
      setFailure(userFacingError(error, strings.inboxFailed));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);

  const runSnapshotOperation = useCallback(
    (operation: SnapshotOperation) => perform(operation, setSnapshot),
    [perform],
  );

  const login = useCallback(
    (request: DesktopSyncLoginRequest) => runSnapshotOperation(() => window.api.syncLogin(request)),
    [runSnapshotOperation],
  );

  const logout = useCallback(
    () => runSnapshotOperation(window.api.syncLogout),
    [runSnapshotOperation],
  );

  const syncNow = useCallback(
    () => runSnapshotOperation(window.api.syncRun),
    [runSnapshotOperation],
  );

  const setAiAccess = useCallback(
    (scopeType: 'document' | 'collection', scopeKey: string, allowed: boolean) =>
      runSnapshotOperation(() => window.api.syncSetAiAccess(scopeType, scopeKey, allowed)),
    [runSnapshotOperation],
  );

  const openDocument = useCallback(
    (documentId: string, readable: boolean) => runSnapshotOperation(async () => {
      if (readable) {
        await window.api.syncOpenReadableDocument(documentId);
      } else {
        await window.api.syncOpenDocument(documentId);
      }
      return window.api.syncSnapshot();
    }),
    [runSnapshotOperation],
  );

  const queueConvert = useCallback(
    (document: DesktopInboxDocument) => runSnapshotOperation(async () => {
      const familySnapshot = await window.api.syncDocumentFamily(document.id);
      const currentVersion = familySnapshot?.versions.find((item) => item.id === document.currentVersionId)
        ?? familySnapshot?.versions[0];
      if (!currentVersion) throw new Error(strings.inboxMissingSourceVersion);

      const direction = convertDirectionForFormat(currentVersion.originalFormat);
      if (!direction) throw new Error(strings.inboxUnsupportedDirectConversion);

      onConvertRequested?.([{
        id: `${Date.now()}-${document.id}`,
        inputPath: currentVersion.localPath,
        fileName: document.title,
        direction,
        status: 'pending',
      }]);
      return window.api.syncSnapshot();
    }),
    [onConvertRequested, runSnapshotOperation],
  );

  const toggleFamily = useCallback((documentId: string) => {
    if (expandedDocumentId === documentId) {
      setExpandedDocumentId(null);
      setFamily(null);
      return Promise.resolve();
    }

    return perform(
      () => window.api.syncDocumentFamily(documentId),
      (nextFamily) => {
        setFamily(nextFamily);
        setExpandedDocumentId(documentId);
      },
    ).then(() => undefined);
  }, [expandedDocumentId, perform]);

  const archiveDocument = useCallback(
    (documentId: string) => runSnapshotOperation(() => window.api.syncArchiveDocument(documentId)),
    [runSnapshotOperation],
  );

  const deleteDocument = useCallback(
    (documentId: string, scope: DeleteScope) =>
      runSnapshotOperation(() => window.api.syncDeleteDocument(documentId, scope)),
    [runSnapshotOperation],
  );

  const restoreDocument = useCallback(
    (documentId: string, scope: Exclude<DeleteScope, 'all_devices'>) =>
      runSnapshotOperation(() => window.api.syncRestoreDocument(documentId, scope)),
    [runSnapshotOperation],
  );

  const resolveConflict = useCallback(
    (conflictId: string, resolution: ConflictResolution) =>
      runSnapshotOperation(() => window.api.syncResolveConflict(conflictId, resolution)),
    [runSnapshotOperation],
  );

  const exportConflictVersion = useCallback(
    (versionId: string) => perform(() => window.api.syncExportConflictVersion(versionId)).then(() => undefined),
    [perform],
  );

  const openPath = useCallback((path: string) => window.api.openPath(path), []);

  return {
    snapshot,
    expandedDocumentId,
    family,
    busy,
    failure,
    login,
    logout,
    syncNow,
    setAiAccess,
    openDocument,
    queueConvert,
    toggleFamily,
    archiveDocument,
    deleteDocument,
    restoreDocument,
    resolveConflict,
    exportConflictVersion,
    openPath,
  };
}

export type InboxController = ReturnType<typeof useInboxController>;
