import 'dotenv/config';
import { createDb } from '@clinvo/shared';
import { env } from './env.js';
import { createApp } from './app.js';
import { startCronJobs } from './cron/expireJob.js';

const db = createDb(env.DATABASE_URL);
const app = createApp(db);

startCronJobs(db);

app.listen(env.PORT, () => {
  console.log(`✅ License service running on port ${env.PORT}`);
});
