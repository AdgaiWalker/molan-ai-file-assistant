import React from 'react';
import { strings } from '../../constants/strings';
import type { DeleteScope, DesktopDocumentFamilySnapshot, DesktopInboxDocument } from '../../shared/sync';
import { formatBytes, formatTimestamp, needsConversion, statusText } from './presentation';

interface DocumentCardActions {
  openDocument: (documentId: string, readable: boolean) => Promise<unknown>;
  queueConvert: (document: DesktopInboxDocument) => Promise<unknown>;
  setAiAccess: (scopeType: 'document', scopeKey: string, allowed: boolean) => Promise<unknown>;
  toggleFamily: (documentId: string) => Promise<void>;
  archiveDocument: (documentId: string) => Promise<unknown>;
  deleteDocument: (documentId: string, scope: DeleteScope) => Promise<unknown>;
  openPath: (path: string) => Promise<void>;
}

interface Props {
  document: DesktopInboxDocument;
  family: DesktopDocumentFamilySnapshot | null;
  isExpanded: boolean;
  busy: boolean;
  actions: DocumentCardActions;
}

export function InboxDocumentCard({ document, family, isExpanded, busy, actions }: Props) {
  const confirmDelete = (scope: DeleteScope, confirmation: string) => {
    if (window.confirm(confirmation)) actions.deleteDocument(document.id, scope);
  };

  return (
    <article className="inbox-item">
      <div className="inbox-item-head">
        <div className="inbox-item-main">
          <strong>{document.title}</strong>
          <span>
            {document.originalFormat.toUpperCase()} · {formatBytes(document.sizeBytes)} · {statusText(document.state)}
          </span>
        </div>
      </div>

      <div className="workflow-steps" aria-label={strings.inboxTitle}>
        <span className="complete">{strings.inboxWorkflowSynced}</span>
        <span className={document.readableFormat ? 'complete' : 'waiting'}>{strings.inboxWorkflowReadable}</span>
        <span className={document.aiReadStatus.allowed ? 'complete' : 'waiting'}>{strings.inboxWorkflowAuthorized}</span>
      </div>

      <div className="inbox-primary-actions">
        <button
          className="btn-primary"
          disabled={busy}
          onClick={() => actions.openDocument(document.id, document.readableFormat !== null)}
        >
          {document.readableFormat ? strings.openReadableDocument : strings.openDocument}
        </button>
        {needsConversion(document) && (
          <button className="btn-secondary" disabled={busy} onClick={() => actions.queueConvert(document)}>
            {strings.convertDocument}
          </button>
        )}
        <button
          className={`btn-secondary permission-button ${document.aiReadStatus.allowed ? 'authorized' : ''}`}
          disabled={busy}
          onClick={() => actions.setAiAccess('document', document.id, !document.aiReadStatus.allowed)}
        >
          {document.aiReadStatus.allowed ? strings.revokeDocument : strings.authorizeDocument}
        </button>
      </div>

      <details className="inbox-more-actions">
        <summary>{strings.inboxMoreActions}</summary>
        <div className="inbox-more-content">
          {document.readableFormat && (
            <button className="btn-ghost" disabled={busy} onClick={() => actions.openDocument(document.id, false)}>
              {strings.openDocument}
            </button>
          )}
          <button className="btn-ghost" disabled={busy} onClick={() => actions.toggleFamily(document.id)}>
            {isExpanded ? strings.hideRelations : strings.viewRelations}
          </button>

          <TechnicalDetails document={document} />

          <details className="danger-disclosure">
            <summary>{strings.inboxDangerActions}</summary>
            <div>
              <button
                className="btn-secondary"
                disabled={busy || document.state === 'archived'}
                onClick={() => actions.archiveDocument(document.id)}
              >
                {strings.archiveDocument}
              </button>
              <button
                className="btn-ghost"
                onClick={() => confirmDelete('current_device', strings.confirmCurrentDeviceDelete)}
              >
                {strings.removeCurrentDevice}
              </button>
              <button className="btn-ghost" onClick={() => confirmDelete('cloud', strings.confirmCloudDelete)}>
                {strings.deleteCloud}
              </button>
              <button className="btn-danger" onClick={() => confirmDelete('all_devices', strings.confirmAllDelete)}>
                {strings.deleteAllDevices}
              </button>
            </div>
          </details>
        </div>
      </details>

      {isExpanded && family?.document.id === document.id && (
        <FamilyDetails family={family} openPath={actions.openPath} />
      )}
    </article>
  );
}

function TechnicalDetails({ document }: { document: DesktopInboxDocument }) {
  return (
    <details className="technical-details">
      <summary>{strings.inboxTechnicalDetails}</summary>
      <dl>
        <div><dt>{strings.sourceDevice}</dt><dd>{document.sourceDeviceId}</dd></div>
        <div><dt>{strings.relationVersions}</dt><dd>{document.versionCount}</dd></div>
        <div><dt>{strings.relationArtifacts}</dt><dd>{document.derivedArtifactCount}</dd></div>
        <div><dt>{strings.relationResults}</dt><dd>{document.aiResultCount}</dd></div>
        <div><dt>{strings.lastSync}</dt><dd>{formatTimestamp(document.updatedAt)}</dd></div>
        <div><dt>{strings.grantedAt}</dt><dd>{document.aiReadStatus.grantedAt ?? strings.notGranted}</dd></div>
        <div>
          <dt>{strings.lastAiRead}</dt>
          <dd>{document.aiReadStatus.lastReadAt
            ? `${document.aiReadStatus.lastReadAt} / ${document.aiReadStatus.lastReadVia ?? 'unknown'}`
            : strings.neverRead}</dd>
        </div>
        {document.aiReadStatus.lastErrorCode && (
          <div><dt>{strings.inboxLatestError}</dt><dd>{document.aiReadStatus.lastErrorCode}</dd></div>
        )}
      </dl>
    </details>
  );
}

function FamilyDetails(props: {
  family: DesktopDocumentFamilySnapshot;
  openPath: (path: string) => Promise<void>;
}) {
  const { family, openPath } = props;
  return (
    <div className="inbox-family">
      <DetailSection title={strings.relationVersions} empty={family.versions.length === 0}>
        {family.versions.map((version) => (
          <article className="inbox-family-item" key={version.id}>
            <div className="inbox-family-main">
              <strong>{version.originalFormat.toUpperCase()}</strong>
              <small>{version.id}</small>
              <small>{formatBytes(version.sizeBytes)} · {version.createdAt}</small>
            </div>
            <button className="btn-ghost" onClick={() => openPath(version.localPath)}>{strings.openPath}</button>
          </article>
        ))}
      </DetailSection>
      <DetailSection title={strings.relationArtifacts} empty={family.derivedArtifacts.length === 0}>
        {family.derivedArtifacts.map((artifact) => (
          <article className="inbox-family-item" key={artifact.id}>
            <div className="inbox-family-main">
              <strong>{artifact.format.toUpperCase()}</strong>
              <small>{artifact.id}</small>
              <small>{artifact.generatorName} {artifact.generatorVersion} · {artifact.createdAt}</small>
              <small>{strings.warnings}：{artifact.warnings.length > 0 ? artifact.warnings.join('；') : strings.noWarnings}</small>
            </div>
            <button className="btn-ghost" onClick={() => openPath(artifact.localPath)}>{strings.openPath}</button>
          </article>
        ))}
      </DetailSection>
      <DetailSection title={strings.relationResults} empty={family.aiResults.length === 0}>
        {family.aiResults.map((result) => (
          <article className="inbox-family-item" key={result.id}>
            <div className="inbox-family-main">
              <strong>{result.resultType}</strong>
              <small>{result.id}</small>
              <small>{result.generatorName} {result.generatorVersion} · {result.createdAt}</small>
            </div>
            <button className="btn-ghost" onClick={() => openPath(result.localPath)}>{strings.openPath}</button>
          </article>
        ))}
      </DetailSection>
    </div>
  );
}

function DetailSection(props: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <section className="inbox-family-section">
      <h4>{props.title}</h4>
      {props.empty ? <div className="inbox-family-empty">{strings.relationNone}</div> : props.children}
    </section>
  );
}
