
import * as agentService from './agent.service';
import * as pSettle from 'p-settle';
import { Context, ScheduledEvent } from 'aws-lambda';
import * as notificationService from './notification';

/**
 * Executes queries against RDS instances' databases' concurrently
 * @param {ScheduledEvent} event: The event invoking the function
 * @param {Context} context: The lambda execution context
 */
export async function executeQueries(event: ScheduledEvent, context: Context) {
  console.info('handler.executeQueries');
  const hrStart = process.hrtime();

  const invocations: Array<Promise<void>> = [];

  const rdsInstanceEndpoints = process.env.dbEndpoints.split(',');
  rdsInstanceEndpoints.forEach((endpoint) => {
    const instance = endpoint.trim();
    const update = agentService.executeQueries(instance);

    // Preemptively handle error to allow other database updates executions to go ahead.
    update.catch((error) => {
      console.error(`RDS Instance error. Endpoint: ${instance}`);
      console.error(error);
      return error;
    });

    invocations.push(update);
  });

  // Perform parallel execcutions on respective RDS instances
  try {
    await pSettle(invocations);
  } catch (error) {
    console.error(error);
  } finally {
    await notificationService.publishMessage('hello there');
    const hrEnd = process.hrtime(hrStart);
    console.log('Execution Time (hr): %ds %dms', hrEnd[0], hrEnd[1] / 1000000);
    console.log(`Execution Timeout Window left: ${context.getRemainingTimeInMillis()}ms`);
  }

}
