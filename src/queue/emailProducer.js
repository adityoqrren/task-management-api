import { getChannel } from "./queueService.js";

const QUEUE_NAME = "email.queue";
const EMAIL_RETRY_QUEUE = "email.retry.queue";

export async function sendEmailMessage(payload) {
  const channel = getChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true, deadLetterExchange: "", deadLetterRoutingKey: EMAIL_RETRY_QUEUE, });
  channel.sendToQueue(
    QUEUE_NAME,
    Buffer.from(JSON.stringify(payload)),
    {
      persistent: true, // message is persistent
      headers: {
        "x-retry-count": 0, // retry indicator
      },
    }
  );
  console.log("Email message queued:", payload);
}
