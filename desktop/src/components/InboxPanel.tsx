import React, { useMemo, useState } from 'react';
import { strings } from '../constants/strings';
import type { ConvertTask } from '../shared/ipc';
import { InboxDocumentCard } from './inbox/InboxDocumentCard';
import {
  buildInboxSummary,
  formatTimestamp,
  inboxFilterOptions,
  matchesFilter,
  matchesQuery,
  type InboxFilter,
} from './inbox/presentation';
import { defaultSyncServerUrl, useInboxController } from './inbox/useInboxController';

interface Props {
  onConvertRequested?: (tasks: ConvertTask[]) => void;
}

export default function InboxPanel({ onConvertRequested }: Props) {
  const controller = useInboxController(onConvertRequested);
  const [serverUrl, setServerUrl] = useState(defaultSyncServerUrl);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');

  const visibleDocuments = useMemo(() => {
    if (!controller.snapshot) return [];
    return controller.snapshot.documents.filter((document) =>
      matchesQuery(document, query) && matchesFilter(document, filter));
  }, [controller.snapshot, filter, query]);

  const summary = useMemo(
    () => buildInboxSummary(
      controller.snapshot?.documents ?? [],
      controller.snapshot?.conflicts.length ?? 0,
    ),
    [controller.snapshot],
  );

  if (!controller.snapshot) {
    return (
      <section className="panel-shell inbox-panel">
        <div className="empty-state loading-state">
          <span className="loading-spinner" aria-hidden="true" />
          <strong>{strings.loadingInbox}</strong>
        </div>
      </section>
    );
  }

  const { snapshot, busy } = controller;

  return (
    <section className="panel-shell inbox-panel" aria-busy={busy}>
      <header className="panel-hero inbox-header">
        <div>
          <span className="panel-eyebrow">{strings.inboxEyebrow}</span>
          <h1>{strings.inboxTitle}</h1>
          <p>{strings.inboxPrivacy}</p>
        </div>
        <span className={`connection-pill ${snapshot.status.loggedIn ? 'connected' : ''}`}>
          <span aria-hidden="true" />
          {snapshot.status.loggedIn ? strings.inboxConnected : strings.inboxLoginTitle}
        </span>
      </header>

      {controller.failure && <div className="reader-error" role="alert">{controller.failure}</div>}

      {!snapshot.status.loggedIn ? (
        <section className="sync-login-card">
          <div className="login-card-copy">
            <strong>{strings.inboxLoginTitle}</strong>
            <p>{strings.inboxLoginDescription}</p>
          </div>
          <div className="login-fields">
            <label>
              <span>{strings.phoneNumber}</span>
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="+8613800000000"
                inputMode="tel"
              />
            </label>
            <label>
              <span>{strings.loginCode}</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={strings.loginCode}
                type="password"
                inputMode="numeric"
              />
            </label>
            <details className="server-settings">
              <summary>{strings.serverUrl}</summary>
              <label>
                <span>{strings.serverUrl}</span>
                <input
                  value={serverUrl}
                  onChange={(event) => setServerUrl(event.target.value)}
                  placeholder={strings.serverUrl}
                />
              </label>
            </details>
          </div>
          <button
            className="btn-primary"
            disabled={busy || !serverUrl || !phoneNumber || !code}
            onClick={() => controller.login({ serverUrl, phoneNumber, code })}
          >
            {busy ? strings.loggingIn : strings.login}
          </button>
        </section>
      ) : (
        <section className="sync-session-card">
          <div>
            <strong>{strings.inboxConnected}</strong>
            <small>
              {strings.lastSync}：{snapshot.status.lastSyncAt
                ? formatTimestamp(snapshot.status.lastSyncAt)
                : strings.neverSynced}
            </small>
            <details className="technical-details">
              <summary>{strings.loggedInDevice}</summary>
              <span>{snapshot.status.deviceId}</span>
            </details>
          </div>
          <div className="action-bar">
            <button className="btn-primary" disabled={busy} onClick={controller.syncNow}>
              {busy ? strings.syncing : strings.syncNow}
            </button>
            <button className="btn-danger" disabled={busy} onClick={controller.logout}>
              {strings.logout}
            </button>
          </div>
        </section>
      )}

      <section className="inbox-summary" aria-label={strings.inboxTitle}>
        <SummaryItem value={summary.all} label={strings.inboxSummaryAll} />
        <SummaryItem value={summary.readable} label={strings.inboxSummaryReadable} tone="success" />
        <SummaryItem value={summary.waiting} label={strings.inboxSummaryWaiting} tone="warning" />
        <SummaryItem value={summary.conflicts} label={strings.inboxSummaryConflicts} tone="danger" />
      </section>

      {snapshot.status.loggedIn && (
        <details className="permission-panel">
          <summary>{strings.inboxPermissionTitle}</summary>
          <div>
            <p>{strings.inboxPermissionDescription}</p>
            <div className="inbox-header-actions">
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() => confirmCollectionAccess(true, strings.confirmAuthorizeAll, controller.setAiAccess)}
              >
                {strings.authorizeAll}
              </button>
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() => confirmCollectionAccess(false, strings.confirmRevokeAll, controller.setAiAccess)}
              >
                {strings.revokeAll}
              </button>
            </div>
          </div>
        </details>
      )}

      <section className="inbox-toolbar">
        <input
          aria-label={strings.inboxSearch}
          className="inbox-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={strings.inboxSearch}
        />
        <div className="inbox-filters">
          {inboxFilterOptions.map((option) => (
            <button
              key={option.value}
              className={filter === option.value ? 'active' : ''}
              onClick={() => setFilter(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {snapshot.documents.length === 0 ? (
        <div className="inbox-empty">{strings.inboxEmpty}</div>
      ) : visibleDocuments.length === 0 ? (
        <div className="inbox-empty">{strings.inboxNoMatch}</div>
      ) : (
        <div className="inbox-list">
          {visibleDocuments.map((document) => (
            <InboxDocumentCard
              key={document.id}
              document={document}
              family={controller.family}
              isExpanded={controller.expandedDocumentId === document.id}
              busy={busy}
              actions={controller}
            />
          ))}
        </div>
      )}

      {snapshot.deviceDeletedDocuments.length > 0 && (
        <section className="inbox-secondary-section">
          <h3>{strings.deviceDeletedTitle}</h3>
          {snapshot.deviceDeletedDocuments.map((document) => (
            <article className="inbox-item" key={document.id}>
              <div className="inbox-item-main"><strong>{document.title}</strong></div>
              <button
                className="btn-secondary"
                onClick={() => controller.restoreDocument(document.id, 'current_device')}
              >
                {strings.restoreCurrentDevice}
              </button>
            </article>
          ))}
        </section>
      )}

      {snapshot.conflicts.length > 0 && (
        <section className="inbox-secondary-section">
          <h3>{strings.conflictTitle}</h3>
          {snapshot.conflicts.map((conflict) => (
            <article className="inbox-item" key={conflict.id}>
              <div className="inbox-item-main">
                <strong>{conflict.documentId}</strong>
                <small>{conflict.localVersionId} / {conflict.remoteVersionId}</small>
              </div>
              <div className="inbox-item-actions">
                <button
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() => controller.exportConflictVersion(conflict.localVersionId)}
                >
                  {strings.exportLocalVersion}
                </button>
                <button
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() => controller.exportConflictVersion(conflict.remoteVersionId)}
                >
                  {strings.exportRemoteVersion}
                </button>
                <button className="btn-secondary" onClick={() => controller.resolveConflict(conflict.id, 'keep_local')}>
                  {strings.keepLocal}
                </button>
                <button className="btn-secondary" onClick={() => controller.resolveConflict(conflict.id, 'keep_remote')}>
                  {strings.keepRemote}
                </button>
                <button className="btn-secondary" onClick={() => controller.resolveConflict(conflict.id, 'save_copy')}>
                  {strings.keepBoth}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}

function confirmCollectionAccess(
  allowed: boolean,
  confirmation: string,
  setAiAccess: (scopeType: 'document' | 'collection', scopeKey: string, allowed: boolean) => Promise<unknown>,
) {
  if (window.confirm(confirmation)) setAiAccess('collection', 'all', allowed);
}

function SummaryItem(props: { value: number; label: string; tone?: 'success' | 'warning' | 'danger' }) {
  return (
    <div className={`summary-item ${props.tone ?? ''}`}>
      <strong>{props.value}</strong>
      <span>{props.label}</span>
    </div>
  );
}
