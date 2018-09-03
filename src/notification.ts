import * as aws from 'aws-sdk';

export async function publishMessage(message: any): Promise<any> {
    console.info('notification.publishMessage');

    const sns = new aws.SNS();
    const params = {
        Message: JSON.stringify(message),
        Subject: 'Test SNS From Lambda',
        TopicArn: `${process.env.notificationTopicArn}`,
    };

    sns.publish(params).promise();
}
