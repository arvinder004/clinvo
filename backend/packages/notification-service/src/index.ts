import 'dotenv/config';
import { env } from './env.js';
import { createApp } from './app.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`✅ Notification service running on port ${env.PORT}`);
});
