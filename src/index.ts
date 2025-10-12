import { telegram } from './services/telegram';
import { whaleWatcher } from './services/whaleWatcher';

async function main() {
  telegram.attachWatcher(whaleWatcher);
  telegram.start();
  await whaleWatcher.start();
}

main().catch((err) => {
  // Final catch-all to avoid unhandled rejections
  console.error(
    JSON.stringify({
      level: 'error',
      msg: 'fatal',
      err: String(err),
      time: new Date().toISOString(),
    }),
  );
});
