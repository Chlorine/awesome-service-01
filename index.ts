import { Core } from './src/core';

(async () => {
  const core = new Core();
  await core.init();
})().catch(err => {
  console.error('Service init failed', err);
  process.exit(1);
});
