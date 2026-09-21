import assert from 'node:assert/strict';
import { localDateKey } from '../src/lib/local-date.ts';
assert.equal(localDateKey(new Date('2026-09-17T16:00:00Z')), '2026-09-18');
assert.equal(localDateKey(new Date('2026-09-17T15:59:59Z')), '2026-09-17');
console.log('Shanghai midnight traffic date regression PASS');
