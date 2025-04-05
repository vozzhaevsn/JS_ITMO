
import { bench, run } from 'mitata';
import crypto from 'node:crypto';

const data = 'test data';

bench('createHash', () => {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  hash.digest('hex');
});

bench('createHash (chained)', () => {
  crypto.createHash('sha256').update(data).digest('hex');
});

await run();
