const { exit } = require('process');
const { advancedEventScraper } = require('./scraper');
const {
  checkIfEventAlreadyPresent,
  alreadyImportedFromTicketmaster,
  processTicketUrl,
  createEvent
} = require('./utility.js');
const amqp = require('amqplib');
const { checkIfEventInSource } = require('../helper/functions.js')

const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://rabuser:test@104.236.207.192";
const queueName = process.env.QUEUE_NAME || "10times_events";
const affiliate_id = process.env.AFFILIATE_ID || 37;
const WAIT_TIME = 5000;

async function setupRabbitMQ() {
  try {
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });
    console.log('RabbitMQ connection and channel established');
    return { connection, channel };
  } catch (error) {
    console.log('Error setting up RabbitMQ:', error);
    throw error;
  }
}

async function processUrlFromQueue(channel) {
  try {
    const message = await channel.get(queueName, { noAck: false });
    if (!message) return false;

    const url = message.content.toString();
    console.log(`Processing URL: ${url}`);

    try {
      const eventData = await advancedEventScraper(url);
      if (!eventData) throw new Error('No event data retrieved');

      if (!eventData.city && !eventData.latitude && !eventData.longitude) {
        throw new Error('No geo data available');
      }

      if (!eventData.eventname) throw new Error('Event name is missing');

      const sourceEventId = eventData.sourceEventId ?? null;
      const event_id = await checkIfEventAlreadyPresent(affiliate_id, sourceEventId);
      if (event_id) throw new Error('Event already imported');

      const tmEventId = await alreadyImportedFromTicketmaster(eventData.ticket_url);
      if (tmEventId) throw new Error(`Already imported from Ticketmaster. ID: ${tmEventId}`);

      if (eventData.ticket_url.includes("allevents.in")) {
        throw new Error('Allevents.in source - skipping');
      }

      eventData.ticket_url = await processTicketUrl(eventData.ticket_url);
      eventData.organizer_id = process.env.ORGANIZER_ID || "24677319";
      eventData.notify_organizer = 0;

      const eventId = await createEvent(eventData);
      console.log(`Event created successfully. ID: ${eventId}`);

      channel.ack(message);
      return true;
    } catch (processError) {
      console.log(`Error processing URL ${url}: ${processError.message}`);
      channel.ack(message); // Acknowledge to remove from queue even if processing failed
      return true; // Continue to next message
    }
  } catch (queueError) {
    console.log("Error interacting with RabbitMQ:", queueError);
    return false;
  }
}

async function main() {
  let connection, channel;
  try {
    ({ connection, channel } = await setupRabbitMQ());

    console.log("Starting to process URLs from the queue...");
    while (true) {
      const processed = await processUrlFromQueue(channel);
      if (!processed) {
        console.log("No more URLs in the queue. Waiting before checking again...");
        await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
      }
    }
  } catch (error) {
    console.log("Critical error in main process:", error);
  } finally {
    if (channel) await channel.close().catch(err => console.log("Error closing channel:", err));
    if (connection) await connection.close().catch(err => console.log("Error closing connection:", err));
    console.log("RabbitMQ connection closed");
  }
}

main().catch(error => {
  console.log("Unhandled error in main function:", error);
  process.exit(1);
});