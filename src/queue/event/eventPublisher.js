import { getChannel } from "../queueService.js"

async function publishEvent(event) {
  if (!event || !event.type || !event.id) {
    throw new Error('Invalid event format')
  }

  console.log(`event id : ${event.id}`);

  const channel = await getChannel()
  const routingKey = event.type

  await channel.assertExchange(
    'domain-events',
    'topic',
    { durable: true }
  )

  console.log(`event route : ${routingKey}`);

  channel.publish(
    'domain-events',
    routingKey,
    Buffer.from(JSON.stringify(event)),
    {
      persistent: true,
      contentType: 'application/json',
      messageId: event.id
    }
  )
}

export default publishEvent;
