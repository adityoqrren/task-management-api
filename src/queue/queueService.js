import amqp from "amqplib";

let connection;
let channel;

export async function initRabbit() {
  connection = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await connection.createChannel();
  console.log("RabbitMQ connected");
  return channel;
}

export function getChannel() {
  if (!channel) throw new Error("RabbitMQ not initialized");
  return channel;
}
