// Centralized type utilities for compatibility and casting rules
import { TYPES } from './language-definition.js';

export function isExecIO(ioLike) {
  if (!ioLike) return false;
  const name = (ioLike.name || ioLike);
  const type = ioLike.type || name;
  return String(type).toLowerCase() === 'exec' || String(name).toLowerCase() === 'exec';
}

function findTypeMeta(typeName) {
  if (!typeName) return null;
  const t = String(typeName);
  const groups = [TYPES.PRIMITIVE, TYPES.COMPLEX, TYPES.SPECIAL, TYPES.CONTROL];
  for (const group of groups) {
    if (group && Object.prototype.hasOwnProperty.call(group, t)) return group[t];
  }
  return null;
}

// Strict type equality with allowance for identical aliases (currently none)
export function isSameType(a, b) {
  if (!a || !b) return false;
  return String(a).toLowerCase() === String(b).toLowerCase();
}

// Whether we can cast from -> to according to language definition compatibility lists
export function canCast(fromType, toType) {
  if (!fromType || !toType) return false;
  const a = String(fromType).toLowerCase();
  const b = String(toType).toLowerCase();
  if (isSameType(a, b)) return true; // trivial cast
  // Exec never casts
  if (a === 'exec' || b === 'exec') return false;
  // mixed is universal
  if (a === 'mixed' || b === 'mixed') return true;
  // null can cast to anything (nullable semantics)
  if (a === 'null') return true;
  const fromMeta = findTypeMeta(a);
  const toMeta = findTypeMeta(b);
  if (!fromMeta || !toMeta) return false;
  // If language definition marks from compatible with to, allow
  if (Array.isArray(fromMeta.compatible) && fromMeta.compatible.includes(b)) return true;
  // Symmetric compatibility (helpful when lists are asymmetric)
  if (Array.isArray(toMeta.compatible) && toMeta.compatible.includes(a)) return true;
  return false;
}
