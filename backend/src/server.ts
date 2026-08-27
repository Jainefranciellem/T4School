import cron from 'node-cron';
import { buildApp } from './app.js';
import { env } from './env.js';
import { runReminderJob } from './jobs/reminders.job.js';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }

  cron.schedule(env.REMINDER_JOB_CRON, async () => {
    try {
      const result = await runReminderJob(app.prisma, app.log);
      app.log.info(result, 'Job de lembretes executado');
    } catch (error) {
      app.log.error(error, 'Job de lembretes falhou');
    }
  });
}

main();
