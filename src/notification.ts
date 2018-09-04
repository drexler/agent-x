import * as aws from 'aws-sdk';

/**
 * Publishes a message to an SNS topic
 * @param {string} message: The message to publish
 * @param {Promise}: Promise of message publication result
 */
export async function publishMessage(message: string): Promise<any> {
    console.info('notification.publishMessage');

    const sns = new aws.SNS();
    const params = {
        Message: message,
        Subject: 'Message from Agent-X',
        TopicArn: `${process.env.notificationTopicArn}`,
    };

    sns.publish(params).promise();
}
