import * as aws from 'aws-sdk';

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
