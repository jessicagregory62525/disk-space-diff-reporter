import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { diffSnapshots, compareEntries } from '../src/core.js';

describe('diffSnapshots', () => {
  it('reports a file that grew', () => {
    const before = [{ path: 'a.txt', size: 10, type: 'file' }];
    const after = [{ path: 'a.txt', size: 20, type: 'file' }];
    const result = diffSnapshots(before, after);
    assert.deepEqual(result, [{
      path: 'a.txt',
      status: 'grew',
      beforeSize: 10,
      afterSize: 20,
      beforeType: 'file',
      afterType: 'file',
    }]);
  });

  it('reports a file that shrank', () => {
    const before = [{ path: 'a.txt', size: 50, type: 'file' }];
    const after = [{ path: 'a.txt', size: 5, type: 'file' }];
    const result = diffSnapshots(before, after);
    assert.deepEqual(result, [{
      path: 'a.txt',
      status: 'shrank',
      beforeSize: 50,
      afterSize: 5,
      beforeType: 'file',
      afterType: 'file',
    }]);
  });

  it('reports a file that appeared', () => {
    const after = [{ path: 'new.txt', size: 7, type: 'file' }];
    const result = diffSnapshots([], after);
    assert.deepEqual(result, [{
      path: 'new.txt',
      status: 'appeared',
      beforeSize: undefined,
      afterSize: 7,
      beforeType: undefined,
      afterType: 'file',
    }]);
  });

  it('reports a file that vanished', () => {
    const before = [{ path: 'gone.txt', size: 99, type: 'file' }];
    const result = diffSnapshots(before, []);
    assert.deepEqual(result, [{
      path: 'gone.txt',
      status: 'vanished',
      beforeSize: 99,
      afterSize: undefined,
      beforeType: 'file',
      afterType: undefined,
    }]);
  });

  it('omits unchanged files from the report', () => {
    const before = [{ path: 'a.txt', size: 10, type: 'file' }];
    const after = [{ path: 'a.txt', size: 10, type: 'file' }];
    const result = diffSnapshots(before, after);
    assert.deepEqual(result, []);
  });

  it('handles folders the same as files', () => {
    const before = [{ path: 'src', size: 100, type: 'folder' }];
    const after = [{ path: 'src', size: 250, type: 'folder' }];
    const result = diffSnapshots(before, after);
    assert.deepEqual(result, [{
      path: 'src',
      status: 'grew',
      beforeSize: 100,
      afterSize: 250,
      beforeType: 'folder',
      afterType: 'folder',
    }]);
  });

  it('treats a type change (file to folder) as "changed"', () => {
    const before = [{ path: 'thing', size: 10, type: 'file' }];
    const after = [{ path: 'thing', size: 40, type: 'folder' }];
    const result = diffSnapshots(before, after);
    assert.deepEqual(result, [{
      path: 'thing',
      status: 'changed',
      beforeSize: 10,
      afterSize: 40,
      beforeType: 'file',
      afterType: 'folder',
    }]);
  });

  it('returns results sorted by path', () => {
    const before = [
      { path: 'z.txt', size: 1, type: 'file' },
      { path: 'a.txt', size: 1, type: 'file' },
      { path: 'm.txt', size: 1, type: 'file' },
    ];
    const after = [
      { path: 'z.txt', size: 2, type: 'file' },
      { path: 'a.txt', size: 2, type: 'file' },
      { path: 'm.txt', size: 2, type: 'file' },
    ];
    const result = diffSnapshots(before, after);
    assert.deepEqual(result.map(r => r.path), ['a.txt', 'm.txt', 'z.txt']);
  });

  it('combines grows, shrinks, appears, vanishes, and sames in one pass', () => {
    const before = [
      { path: 'grew.txt', size: 10, type: 'file' },
      { path: 'shrank.txt', size: 10, type: 'file' },
      { path: 'same.txt', size: 10, type: 'file' },
      { path: 'gone.txt', size: 10, type: 'file' },
    ];
    const after = [
      { path: 'grew.txt', size: 20, type: 'file' },
      { path: 'shrank.txt', size: 5, type: 'file' },
      { path: 'same.txt', size: 10, type: 'file' },
      { path: 'new.txt', size: 8, type: 'file' },
    ];
    const result = diffSnapshots(before, after);
    assert.deepEqual(result.map(r => r.path), ['gone.txt', 'grew.txt', 'new.txt', 'shrank.txt']);
    assert.deepEqual(result.map(r => r.status), ['vanished', 'grew', 'appeared', 'shrank']);
  });

  it('treats zero-size growth as "same", not "grew"', () => {
    const before = [{ path: 'empty', size: 0, type: 'file' }];
    const after = [{ path: 'empty', size: 0, type: 'file' }];
    const result = diffSnapshots(before, after);
    assert.deepEqual(result, []);
  });

  it('deduplicates duplicate paths in the same snapshot by last entry', () => {
    // A snapshot generator might accidentally emit a path twice. We pick
    // the last entry seen for each path — this is the documented behaviour.
    const before = [
      { path: 'a.txt', size: 5, type: 'file' },
      { path: 'a.txt', size: 10, type: 'file' },
    ];
    const after = [{ path: 'a.txt', size: 15, type: 'file' }];
    const result = diffSnapshots(before, after);
    assert.deepEqual(result, [{
      path: 'a.txt',
      status: 'grew',
      beforeSize: 10,
      afterSize: 15,
      beforeType: 'file',
      afterType: 'file',
    }]);
  });

  it('handles an empty pair of snapshots', () => {
    assert.deepEqual(diffSnapshots([], []), []);
  });
});

describe('compareEntries', () => {
  it('returns "appeared" when before is undefined', () => {
    const after = { path: 'x', size: 1, type: 'file' };
    assert.deepEqual(compareEntries(undefined, after), {
      path: 'x',
      status: 'appeared',
      beforeSize: undefined,
      afterSize: 1,
      beforeType: undefined,
      afterType: 'file',
    });
  });

  it('returns "vanished" when after is undefined', () => {
    const before = { path: 'x', size: 1, type: 'folder' };
    assert.deepEqual(compareEntries(before, undefined), {
      path: 'x',
      status: 'vanished',
      beforeSize: 1,
      afterSize: undefined,
      beforeType: 'folder',
      afterType: undefined,
    });
  });
});
