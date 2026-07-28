import { readFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
export const formatRegistry = Object.freeze(
  JSON.parse(readFileSync(join(root, 'v1', 'format-handlers.json'), 'utf8')),
);

function startsWithHex(bytes, hex) {
  const prefix = Buffer.from(hex, 'hex');
  return bytes.byteLength >= prefix.byteLength && prefix.every((value, index) => bytes[index] === value);
}

function extensionOf(fileName) {
  return extname(fileName ?? '').slice(1).toLowerCase();
}

function normalizeMime(mimeType) {
  return (mimeType ?? '').split(';', 1)[0].trim().toLowerCase();
}

function findByExtension(handlers, extension) {
  return extension ? handlers.find((handler) => handler.extensions.includes(extension)) ?? null : null;
}

function findByMime(handlers, mimeType) {
  return mimeType ? handlers.find((handler) => handler.mimeTypes.includes(mimeType)) ?? null : null;
}

function binaryControlRatio(bytes) {
  if (bytes.byteLength === 0) return 0;
  let controls = 0;
  for (const byte of bytes) {
    if (byte === 0) return 1;
    if ((byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0c && byte !== 0x0d) || byte === 0x7f) {
      controls += 1;
    }
  }
  return controls / bytes.byteLength;
}

function decode(bytes, label, encoding) {
  try {
    return { text: new TextDecoder(label, { fatal: true }).decode(bytes), encoding };
  } catch {
    return null;
  }
}

export function decodeTextBytes(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.byteLength === 0) return { text: '', encoding: 'utf-8' };
  if (startsWithHex(bytes, 'efbbbf')) return decode(bytes.subarray(3), 'utf-8', 'utf-8-bom');
  if (startsWithHex(bytes, 'fffe')) return decode(bytes.subarray(2), 'utf-16le', 'utf-16le-bom');
  if (startsWithHex(bytes, 'feff')) return decode(bytes.subarray(2), 'utf-16be', 'utf-16be-bom');
  if (binaryControlRatio(bytes) > 0.02) return null;
  return decode(bytes, 'utf-8', 'utf-8') ?? decode(bytes, 'gbk', 'gbk');
}

function isJson(text) {
  if (text.trim() === '') return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function resultFor(handler, bytes, encoding, source, warnings) {
  const common = {
    formatId: handler.formatId,
    reader: handler.reader,
    mobileAction: handler.mobileAction,
    encoding,
    source,
    warnings: Object.freeze([...warnings]),
    capabilities: handler.capabilities,
  };
  if (bytes.byteLength > handler.limits.maxMobileReadBytes) {
    return Object.freeze({ status: 'rejected', errorCode: 'E_FILE_TOO_LARGE', ...common });
  }
  return Object.freeze({ status: handler.mobileAction === 'read' ? 'supported' : 'preview_or_collect', ...common });
}

export function detectFormat({ fileName = '', mimeType = '', bytes: input, registry = formatRegistry }) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const handlers = registry.handlers;
  const extension = extensionOf(fileName);
  const mime = normalizeMime(mimeType);
  const extensionHandler = findByExtension(handlers, extension);
  const mimeHandler = findByMime(handlers, mime);
  const warnings = [];

  const signatureHandlers = handlers.filter((handler) => ['signature', 'zip_container'].includes(handler.detection.kind));
  const matchingSignatures = signatureHandlers.filter((handler) =>
    handler.detection.hexPrefixes.some((prefix) => startsWithHex(bytes, prefix)),
  );
  if (matchingSignatures.length > 0) {
    const exact = matchingSignatures.find((handler) => handler === extensionHandler)
      ?? matchingSignatures.find((handler) => handler === mimeHandler);
    const selected = exact ?? (matchingSignatures.length === 1 ? matchingSignatures[0] : null);
    if (!selected) {
      return Object.freeze({ status: 'rejected', errorCode: 'E_UNSUPPORTED_FORMAT', formatId: null, reader: 'none', encoding: null, source: 'signature', warnings: Object.freeze(['W_AMBIGUOUS_BINARY_CONTAINER']) });
    }
    if (extensionHandler && extensionHandler.formatId !== selected.formatId) warnings.push('W_EXTENSION_CONTENT_MISMATCH');
    if (mimeHandler && mimeHandler.formatId !== selected.formatId) warnings.push('W_MIME_MISMATCH');
    return resultFor(selected, bytes, null, 'signature', warnings);
  }

  const decoded = decodeTextBytes(bytes);
  if (!decoded) {
    return Object.freeze({ status: 'rejected', errorCode: 'E_BINARY_CONTENT', formatId: null, reader: 'none', encoding: null, source: 'content', warnings: Object.freeze([]) });
  }

  if (extensionHandler && ['text', 'json'].includes(extensionHandler.detection.kind)) {
    if (mimeHandler && mimeHandler.formatId !== extensionHandler.formatId) warnings.push('W_MIME_MISMATCH');
    if (!extensionHandler.limits.encodings.includes(decoded.encoding)) {
      return Object.freeze({ status: 'rejected', errorCode: 'E_DECODE_FAILED', formatId: extensionHandler.formatId, reader: extensionHandler.reader, encoding: decoded.encoding, source: 'extension', warnings: Object.freeze(warnings) });
    }
    if (extensionHandler.detection.kind === 'json' && !isJson(decoded.text)) warnings.push('W_INVALID_JSON');
    if (extensionHandler.detection.kind === 'text' && extensionHandler.formatId !== 'json' && isJson(decoded.text)) warnings.push('W_CONTENT_LOOKS_JSON');
    return resultFor(extensionHandler, bytes, decoded.encoding, 'extension', warnings);
  }

  if (mimeHandler && ['text', 'json'].includes(mimeHandler.detection.kind)) {
    if (mimeHandler.detection.kind === 'json' && !isJson(decoded.text)) {
      warnings.push('W_MIME_MISMATCH');
    } else if (mimeHandler.limits.encodings.includes(decoded.encoding)) {
      return resultFor(mimeHandler, bytes, decoded.encoding, 'mime', warnings);
    }
  }

  const jsonHandler = handlers.find((handler) => handler.detection.kind === 'json');
  if (jsonHandler && isJson(decoded.text) && jsonHandler.limits.encodings.includes(decoded.encoding)) {
    return resultFor(jsonHandler, bytes, decoded.encoding, 'content', warnings);
  }

  const fallback = handlers.find((handler) => handler.formatId === registry.fallbackFormatId);
  if (!fallback || fallback.detection.kind !== 'text') {
    return Object.freeze({ status: 'rejected', errorCode: 'E_UNSUPPORTED_FORMAT', formatId: null, reader: 'none', encoding: decoded.encoding, source: 'fallback', warnings: Object.freeze(warnings) });
  }
  if (!fallback.limits.encodings.includes(decoded.encoding)) {
    return Object.freeze({ status: 'rejected', errorCode: 'E_DECODE_FAILED', formatId: fallback.formatId, reader: fallback.reader, encoding: decoded.encoding, source: 'fallback', warnings: Object.freeze(warnings) });
  }
  return resultFor(fallback, bytes, decoded.encoding, 'fallback', warnings);
}
