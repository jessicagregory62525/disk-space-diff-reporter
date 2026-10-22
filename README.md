# disk-space-diff-reporter

Compares two directory snapshots (each a list of paths with sizes and a `file`/`folder` type) and reports which entries grew, shrank, appeared, or vanished.

```js
import { diffSnapshots } from 'disk-space-diff-reporter';

const before = [
  { path: 'src/index.js', size: 1200, type: 'file' },
  { path: 'logs', size: 4500, type: 'folder' },
];

const after = [
  { path: 'src/index.js', size: 1400, type: 'file' },
  { path: 'logs', size: 4500, type: 'folder' },
  { path: 'src/new.js', size: 80, type: 'file' },
];

const report = diffSnapshots(before, after);
// [
//   { path: 'src/index.js', status: 'grew', beforeSize: 1200, afterSize: 1400, ... },
//   { path: 'src/new.js', status: 'appeared', ... }
// ]
```

## Why this exists

I kept getting "disk is full" alerts on a build server and needed to see what actually changed between two points in time. The existing tools either produced a huge flat listing or a single total. This library takes two snapshots you already gathered and tells you, per path, whether it grew, shrank, appeared, or vanished — nothing more.

The trade-off: this library does not walk the filesystem. You hand it snapshots; it compares them. That keeps it zero-dependency and testable without touching disk state, but it means you need another step to produce the snapshots.

## Edge cases

- If a path is listed as a `file` in one snapshot and a `folder` in the other, the status is `changed` rather than `grew`/`shrank`. Mixing types for the same path is ambiguous and we pick one clear label rather than trying to also report a size delta.
- If a snapshot contains the same path twice, the last entry wins. This is deliberate: some snapshot generators emit folder entries before their contents and may correct themselves.
- Entries whose size is identical in both snapshots are omitted from the report. The report is about changes, not the full state.

## Exports

- `diffSnapshots(beforeEntries, afterEntries)` — returns an array of diff objects sorted by path. Each object has `path`, `status` (one of `grew`, `shrank`, `appeared`, `vanished`, `changed`), `beforeSize`, `afterSize`, `beforeType`, `afterType`.
- `compareEntries(before, after)` — compares a single pair of entries (either may be `undefined`) and returns one diff object. Useful when you only care about one path.
