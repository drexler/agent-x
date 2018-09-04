
/**
 * Builds a Slack message attachment
 * {@link https://api.slack.com/docs/message-attachments}
 * @param {string[]} messages: The messages to be added to Slack attachment
 * @returns {string}:  A formatted Slack message attachment
 */
export function buildMessageAttachment(messages: string[]): string {
    console.info('slack.buildMessageAttachment');

    const messageAttachment = {

        attachments: [
          {
            fallback: 'Summary of Failed Executions',
            color: '#36a64f',
            title: 'Agent-X Execution Error',
            text: messages.join(','),
            fields: [
                {
                    title: 'Priority',
                    value: 'Critical',
                    short: false,
                },
            ],
            footer: 'Drexler Skunkworks Inc',
            footer_icon: 'https://platform.slack-edge.com/img/default_application_icon.png',
            ts: 123456789,
          },
        ],
    };

    return JSON.stringify(messageAttachment);
}

/**
 * Builds a Slack message
 * @param {string} message: The message to be posted to a Slack channel
 * @returns {string}:  A formatted Slack message
 */
export function buildMessage(message: string): string {
    console.info('slack.buildMessage');

    return JSON.stringify({
        text: message,
    });
}
