import type { Gcdata } from './GameChanger.js';
import { assert } from './assert.js';
import {
  isBschemaObject,
  type Bschema,
  type BschemaConst,
  type Mote,
} from './types.js';

export function objectToMap<T>(obj: T): Map<keyof T, T[keyof T]> {
  const map = new Map<keyof T, T[keyof T]>();
  for (const key in obj) {
    map.set(key, obj[key]);
  }
  return map;
}

export function normalizePointer(pointer: string | string[]): string[] {
  if (Array.isArray(pointer)) {
    return pointer;
  }
  return pointer.split('/');
}

export function resolvePointer(pointer: string | string[], data: any) {
  pointer = normalizePointer(pointer);
  let current = data;
  for (let i = 0; i < pointer.length; i++) {
    if (typeof current !== 'object') {
      return;
    }
    current = current[pointer[i]];
  }
  return current;
}

function resolveOneOf(schema: Bschema, data: any): Bschema {
  if (!('oneOf' in schema) || !('discriminator' in schema)) {
    return schema;
  }
  const dataDescriminator = data[schema.discriminator!.propertyName];
  const matching = schema.oneOf!.find((subschema) => {
    if (!('properties' in subschema)) {
      return false;
    }
    const subschemaDescriminator = (
      subschema.properties![schema.discriminator!.propertyName] as BschemaConst
    ).bConst;
    if (subschemaDescriminator === dataDescriminator) {
      return true;
    }
    return false;
  });
  assert(matching, 'Could not find matching oneOf schema');
  return matching;
}

/**
 * Set the value at a pointer in a nested object. If a value along
 * the path is missing, it'll be created as an object.
 *
 * Only works with Bschema-style pointers.
 */
export function setValueAtPointer<T>(
  data: T,
  pointer: string | string[],
  value: any,
): T {
  // Ensure that the path to the value exists
  pointer = normalizePointer(pointer);
  let current = data as Record<string, any>;
  for (let i = 0; i < pointer.length; i++) {
    if (i === pointer.length - 1) {
      current[pointer[i]] = value;
    } else if ([undefined, null].includes(current[pointer[i]])) {
      current[pointer[i]] = {};
    } else if (typeof current[pointer[i]] !== 'object') {
      throw new Error(
        `Cannot set intermediate pointer at ${pointer
          .slice(0, i + 1)
          .join(
            '/',
          )}: a non-object value already exists there (${JSON.stringify(
          current[pointer[i]],
        )})`,
      );
    }
    current = current[pointer[i]];
  }
  return data;
}

/**
 * Given a Bschema pointer for mote data, resolve the schema definition
 * for that value.
 */
export function resolvePointerInSchema(
  pointer: string | string[],
  mote: Mote,
  gcData: Gcdata,
  /**
   * For cases where the mote data is incomplete and we need some
   * data to resolve the schema, provide that fallback value here.
   */
  moteFallback?: any,
): Bschema | undefined {
  pointer = normalizePointer(pointer);
  let current = gcData.getSchema(mote.schema_id)!;
  for (let i = 0; i < pointer.length; i++) {
    if ('$ref' in current) {
      current = gcData.getSchema(current.$ref)!;
    }
    const currentPointer = pointer.slice(0, i);
    const data =
      resolvePointer(currentPointer, mote.data) ??
      resolvePointer(currentPointer, moteFallback?.data);
    current = resolveOneOf(current, data);
    if ('properties' in current) {
      if (current.properties![pointer[i]]) {
        current = current.properties![pointer[i]];
        continue;
      }
    }
    if (
      'additionalProperties' in current &&
      typeof current.additionalProperties === 'object'
    ) {
      current = current.additionalProperties!;
      continue;
    }
    console.error(
      'Could not resolve pointer',
      pointer,
      'in schema',
      mote.schema_id,
    );
    return undefined;
  }
  return resolveOneOf(current, resolvePointer(pointer, mote.data));
}

export function capitalize(str: string) {
  return str[0].toUpperCase() + str.slice(1);
}

/**
 * Given some kind of data object, traverse it to generate all
 * of the terminal pointers through the data.
 * Optionally prefix each pointer with some string.
 */
export function computePointers(
  data: any,
  prefixWith?: string,
  collection = new Set<string>(),
  __basePointer: string[] = [],
): Set<string> {
  const addToCollection = () => {
    const pointer = [...__basePointer];
    collection.add(pointer.join('/'));
    return collection;
  };

  __basePointer = prefixWith
    ? [prefixWith, ...__basePointer]
    : [...__basePointer];

  if (typeof data === 'object') {
    for (const key in data) {
      const subdata = data[key];
      computePointers(subdata, undefined, collection, [...__basePointer, key]);
    }
  } else {
    addToCollection();
  }
  return collection;
}

/**
 * Get all Bschema-style data pointers defined by a schema.
 */
export function computeMotePointersFromSchema(
  gcData: Gcdata,
  schema: Bschema,
  collection = new Set<string>(),
  withDataPrefix = false,
  __basePointer: string[] = [],
): Set<string> {
  const addToCollection = (final?: string) => {
    const pointer = __basePointer.filter((p) => !p.startsWith('$$'));
    if (final) {
      pointer.push(final);
    }
    collection.add(pointer.join('/'));
    return collection;
  };

  __basePointer = withDataPrefix
    ? ['data', ...__basePointer]
    : [...__basePointer];

  addToCollection();

  if ('$ref' in schema) {
    const subschema = gcData.getSchema(schema.$ref)!;
    const refKey = `$$${schema.$ref}`;
    if (__basePointer.includes(refKey)) {
      __basePointer = [...__basePointer, '*'];
      return addToCollection(`recursion(${schema.$ref})`);
    }
    schema = subschema;
    __basePointer = [...__basePointer, refKey];
  }
  if (isBschemaObject(schema)) {
    for (const key in schema.oneOf || []) {
      computeMotePointersFromSchema(
        gcData,
        schema.oneOf![key],
        collection,
        false,
        __basePointer,
      );
    }
    for (const key in schema.properties) {
      const subSchema = schema.properties[key];
      computeMotePointersFromSchema(gcData, subSchema, collection, false, [
        ...__basePointer,
        key,
      ]);
    }
    if (schema.additionalProperties) {
      computeMotePointersFromSchema(
        gcData,
        schema.additionalProperties,
        collection,
        false,
        [...__basePointer, '*'],
      );
    }
  } else {
    // Then we're at a leaf node and can store it
    // addToCollection();
  }
  return collection;
}

export function isUndefined(value: any): value is undefined {
  return value === undefined;
}

export function isDefined<T>(value: T): value is Exclude<T, undefined> {
  return value !== undefined;
}

export function debugOnError<A extends any[], R, T extends (...args: A) => R>(
  fn: T,
  ...args: A
): R {
  for (let i = 0; i < 2; i++) {
    try {
      // eslint-disable-next-line no-debugger
      if (i === 1) debugger;
      return fn(...args);
    } catch (e) {
      if (i === 0) {
        console.error(e);
        continue;
      }
      throw e;
    }
  }
  throw new Error('Cannot happen. This is to satisfy the type checker.');
}
