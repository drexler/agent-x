
import * as agentService from './agent.service';
import * as pSettle from 'p-settle';
import { Context, ScheduledEvent, SNSEvent, SNSEventRecord, SNSMessage} from 'aws-lambda';
import * as notificationService from './notification';

import * as request from 'superagent';

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
      const errorMessage = `RDS Instance error. Endpoint: ${instance}`;
      console.error(`${errorMessage}. Reason: ${error}`);
      notificationService.publishMessage(errorMessage);
      return error;
    });

    invocations.push(update);
  });

  // Perform parallel execcutions on respective RDS instances
  try {
    await pSettle(invocations);
  } catch (error) {
    console.error(error);
    await notificationService.publishMessage(error);
  } finally {
    const hrEnd = process.hrtime(hrStart);
    console.log('Execution Time (hr): %ds %dms', hrEnd[0], hrEnd[1] / 1000000);
    console.log(`Execution Timeout Window left: ${context.getRemainingTimeInMillis()}ms`);
  }

}

/**
 * Sends an SNS notification message to Slack
 * @param {SNSEvent} event: The SNS event invoking the function
 * @param {Context} context: The lambda execution context
 */
export function slackNotify(event: SNSEvent, context: Context) {
  console.info('handler.slackNotify');

  (event.Records || []).forEach(async (record: SNSEventRecord) => {
     if (record.Sns) {
       try {
          await request
            .post(process.env.slackWebIntegrationUrl)
            .send(JSON.stringify({text: record.Sns.Message}))
            .set('Content-Type', 'application/json');

          context.succeed('posted to Slack');
       } catch (error) {
          console.error(`unable to dispatch to slack. Reason: ${error}`);
          context.fail(error);
       }

     }
  });

}
