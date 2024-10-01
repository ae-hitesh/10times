const amqp = require("amqplib");

/**
 * Pushes a message to a specified RabbitMQ queue.
 *
 * @param {string} message - The message to be sent to the queue.
 * @param {string} [queueName='10times_events'] - The name of the queue (default is '10times_events').
 *
 * @returns {Promise<void>} A promise that resolves when the message is sent successfully.
 *
 * @throws {Error} If there's an error during the connection, channel creation, or message sending process.
 */
async function pushMessageToQueue(message, queueName = "10times_events") {
  const url = "amqp://rabuser:test@104.236.207.192";

  let connection;
  let channel;

  try {
    // Create a connection
    connection = await amqp.connect(url);

    // Create a channel
    channel = await connection.createChannel();

    // Make sure the queue exists
    await channel.assertQueue(queueName, { durable: true });

    // Send the message
    channel.sendToQueue(queueName, Buffer.from(message), { persistent: true });

    console.log(`Message sent to queue '${queueName}': ${message}`);
  } catch (error) {
    console.error("Error in pushMessageToQueue:", error);
  } finally {
    // Close the channel and connection when done
    if (channel) await channel.close();
    if (connection) await connection.close();
  }
}


/**
* Retrieves a message from a specified RabbitMQ queue.
*
* @param {string} [queueName='10times_events'] - The name of the queue to retrieve the message from (default is '10times_events').
*
* @returns {Promise<string|null>} A promise that resolves to the message content as a string if a message is available, or null if the queue is empty.
*
* @throws {Error} If there's an error during the connection, channel creation, or message retrieval process.
*/
async function getMessageFromQueue(queueName = "10times_events") {
  const url = "amqp://rabuser:test@104.236.207.192";

  let connection;
  let channel;

  try {
    // Create a connection
    connection = await amqp.connect(url);

    // Create a channel
    channel = await connection.createChannel();

    // Make sure the queue exists
    await channel.assertQueue(queueName, { durable: true });

    // Get a message from the queue
    const message = await channel.get(queueName, { noAck: false });

    if (message) {
      console.log(
        `Received message from queue '${queueName}':`,
        message.content.toString(),
      );

      return message.content.toString();
    } else {
      console.log(`No message available in queue '${queueName}'`);
      return null;
    }
  } catch (error) {
    console.error("Error in getMessageFromQueue:", error);
    throw error;
  } finally {
    // Close the channel and connection when done
    if (channel) await channel.close();
    if (connection) await connection.close();
  }
}

const axios = require('axios');

/**
 * This Function will check if the event is already imported or not.
 *
 * @param {string} affiliate_id - The affiliate ID.
 * @param {string} source_event_id - The source event ID.
 * @returns {Promise<string|null>} The ae_event_id if the event is present, null otherwise.
 */
async function checkIfEventAlreadyPresent(affiliate_id, source_event_id) {
  const payload = JSON.stringify({
    affiliate_id: affiliate_id,
    source_event_id: source_event_id
  });

  try {
    const response = await axios({
      method: 'post',
      url: 'https://allevents.in/api/external/events/check_event_source',
      headers: {
        'Content-Type': 'application/json',
        'api-key': 'd6f917000010000018f365929838148a4b29e854a0'
      },
      data: payload
    });

    const responseData = response.data;
    const event_id = responseData.ae_event_id;
    return event_id;
  } catch (error) {
    console.error('Error checking event presence:', error);
    return null;
  }
}

/**
 * This Function will rutern the city data.
 *
 * @param {string} cityName - cityName.
 * @returns {Promise<array|null>} The array of that city geo data by city name.
 */
async function getCityData(cityName) {
  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `https://allevents.in/api/geo/web/city_suggestions_full/${cityName}`,
    headers: {
      'Cookie': 'PHPSESSID=ci6ml7qo03d1jvb23cpg35j29f'
    }
  };

  return axios.request(config)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.error('Error fetching city data:', error);
      throw error;
    });
}

/**
 * Fetches nearby locations based on given latitude, longitude, and limit.
 * 
 * @param {number} latitude - The latitude coordinate.
 * @param {number} longitude - The longitude coordinate.
 * @param {number} limit - The maximum number of locations to return.
 * @returns {Promise<Array>} A promise that resolves to an array of nearby locations.
 */
async function getNearbyLocations(latitude, longitude, limit) {
  try {
    const response = await axios({
      method: 'post',
      url: `https://allevents.in/api/geo/nearby_locations`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        latitude,
        longitude,
        limit
      }
    });

    const locations = response.data;

    return (Array.isArray(locations) && locations.length > 0) ? locations[0] : location;
  } catch (error) {
    console.error('Error fetching nearby locations:', error);
    throw error;
  }
}

async function updateEventDataWithCityInfo(eventData, cityInfo) {

  eventData.city = cityInfo.city || eventData.city;
  eventData.state = cityInfo.region_code || eventData.state;
  eventData.country = cityInfo.country || eventData.country;
  eventData.latitude = cityInfo.latitude || eventData.latitude;
  eventData.longitude = cityInfo.longitude || eventData.longitude;

  let addressComponents = [
    eventData.venue,
    eventData.city,
    eventData.state,
    eventData.country
  ];

  eventData.address = addressComponents.filter(Boolean).join(", ");

  eventData.organizer_id = "";

}

async function alreadyImportedFromTicketmaster(ticketURL) {
  if (!ticketURL) throw new Error("ticketURL is required");

  // Prepare request data
  const requestData = {
    ticket_url: ticketURL,
  };

  // Make POST request to the API
  const response = await axios.post(
    "https://allevents.in/api/external/spotify/events/is_ticket_master_event_imported",
    requestData,
  );

  if (response.error > 0) throw new Error(response.message);

  return response.data.data;
}

async function hasEmptyRequiredFields(eventData) {
  const requiredFields = ['eventname'];
  return requiredFields.some(field => empty(eventData[field]));
}

function processTicketUrl(url) {
  if ((url.includes('livenation') || url.includes('ticketmaster')) && url.includes('u=')) {
    const uIndex = url.lastIndexOf('u=');
    if (uIndex !== -1) {
      const decodedUrl = decodeURIComponent(url.slice(uIndex + 2));
      return `${AFFILIATE_PREFIX}${decodedUrl}`;
    }
  }
  return url;
}

function empty(value) {
  if (value == null || Number.isNaN(value)) return true;
  if (typeof value === 'string' && value.trim().length === 0) return true;
  if (value === 0 || value === '0') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  if (value === false) return true;
  return false;
}

// Function to convert time to ISO 8601 format
async function convertToISO8601(dateString, timeString, timezoneOffset) {
  const [datePart] = dateString.split('T'); // Extract date part from ISO string
  const [timePart, meridiem] = timeString.split(/\s+/);
  let [hours, minutes] = timePart.split(':');
  hours = parseInt(hours);

  // Convert to 24-hour format
  if (meridiem.toLowerCase() === 'pm' && hours !== 12) {
    hours += 12;
  } else if (meridiem.toLowerCase() === 'am' && hours === 12) {
    hours = 0;
  }

  // Pad hours and minutes with leading zeros if necessary
  hours = hours.toString().padStart(2, '0');
  minutes = minutes.padStart(2, '0');

  return `${datePart}T${hours}:${minutes}:00${timezoneOffset}`;
}

async function createEvent(eventData) {
  try {
    const payload = JSON.stringify(eventData);
    console.log("Event Payload: ", payload);
    const response = await axios.post(
      "https://allevents.in/api/external/events/create",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": "d6f917000010000018f365929838148a4b29e854a0",
        },
      },
    );

    const responseData = response.data;
    const event_id =
      responseData.data && responseData.data.event_id
        ? responseData.data.event_id
        : "";

    console.log("Event Response: ", responseData);
    console.log("Event Created: ", event_id);

    return event_id;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
}

// async function fetchLocations() {
//   try {
//       let a = await getNearbyLocations("23.033863", "72.585022", 1);
//       console.log(a);
//   } catch (error) {
//       console.error('Error fetching locations:', error);
//   }
// }

// fetchLocations();


module.exports = {
  checkIfEventAlreadyPresent,
  getNearbyLocations,
  getCityData,
  updateEventDataWithCityInfo,
  alreadyImportedFromTicketmaster,
  hasEmptyRequiredFields,
  processTicketUrl,
  convertToISO8601,
  createEvent
};