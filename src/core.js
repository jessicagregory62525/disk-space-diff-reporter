/**
 * A file or folder entry within a snapshot.
 *
 * `path` is the POSIX-style relative path (e.g. "src/index.js"). For folders
 * the size is the total size in bytes of the files under that folder — not
 * a per-folder byte count — because the reporter compares totals.
 *
 * `type` is either "file" or "folder".
 */
/**
 * @typedef {Object} Entry
 * @property {string} path
 * @property {number} size
 * @property {"file"|"folder"} type
 */

/**
 * Build a map of path -> Entry from an iterable of raw entries.
 *
 * @param {Iterable<Entry>} entries
 * @returns {Map<string, Entry>}
 */
export function indexEntries(entries) {
  const map = new Map();
  for (const e of entries) {
    map.set(e.path, { path: e.path, size: e.size, type: e.type });
  }
  return map;
}

/**
 * Compare two entries at the same path.
 *
 * Returns one of: "grew", "shrank", "same" (size unchanged but present in
 * both), "appeared" (only in `after`), or "vanished" (only in `before".
 *
 * If both snapshots list the path but disagree on type, we treat that as
 * "changed" — the path existed before and after but is now a different kind
 * of thing. This is a single clear interpretation rather than trying to
 * pick whether to also report grew/shrank.
 *
 * @param {Entry|undefined} before
 * @param {Entry|undefined} after
 * @returns {{path: string, status: string, beforeSize: number|undefined, afterSize: number|undefined, beforeType: string|undefined, afterType: string|undefined}}
 */
export function compareEntries(before, after) {
  if (before && after) {
    if (before.type !== after.type) {
      return {
        path: before.path,
        status: 'changed',
        beforeSize: before.size,
        afterSize: after.size,
        beforeType: before.type,
        afterType: after.type,
      };
    }
    if (after.size > before.size) {
      return {
        path: before.path,
        status: 'grew',
        beforeSize: before.size,
        afterSize: after.size,
        beforeType: before.type,
        afterType: after.type,
      };
    }
    if (after.size < before.size) {
      return {
        path: before.path,
        status: 'shrank',
        beforeSize: before.size,
        afterSize: after.size,
        beforeType: before.type,
        afterType: after.type,
      };
    }
    return {
      path: before.path,
      status: 'same',
      beforeSize: before.size,
      afterSize: after.size,
      beforeType: before.type,
      afterType: after.type,
    };
  }
  if (after) {
    return {
      path: after.path,
      status: 'appeared',
      beforeSize: undefined,
      afterSize: after.size,
      beforeType: undefined,
      afterType: after.type,
    };
  }
  return {
    path: before.path,
    status: 'vanished',
    beforeSize: before.size,
    afterSize: undefined,
    beforeType: before.type,
    afterType: undefined,
  };
}

/**
 * Compare two snapshots represented as iterables of entries and return a
 * list of differences sorted by path.
 *
 * Entries with status "same" are omitted — the report is about what
 * changed.
 *
 * @param {Iterable<Entry>} beforeEntries
 * @param {Iterable<Entry>} afterEntries
 * @returns {Array<Object>}
 */
export function diffSnapshots(beforeEntries, afterEntries) {
  const before = indexEntries(beforeEntries);
  const after = indexEntries(afterEntries);

  const allPaths = new Set();
  for (const p of before.keys()) allPaths.add(p);
  for (const p of after.keys()) allPaths.add(p);

  const results = [];
  for (const path of allPaths) {
    const cmp = compareEntries(before.get(path), after.get(path));
    if (cmp.status === 'same') continue;
    results.push(cmp);
  }

  results.sort((a, b) => {
    if (a.path < b.path) return -1;
    if (a.path > b.path) return 1;
    return 0;
  });

  return results;
}
