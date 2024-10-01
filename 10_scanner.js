const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const amqp = require('amqplib');

// RabbitMQ connection URL
const rabbitmqUrl = "amqp://rabuser:test@104.236.207.192";
const queueName = "10times_events";

let connection;
let channel;

const cityUrls = [
  // Existing URLs
  'https://10times.com/washington-us',
  'https://10times.com/chicago-us',
  'https://10times.com/toronto-ca',
  'https://10times.com/new-york-us',
  'https://10times.com/los-angeles-us',
  'https://10times.com/lasvegas-us',
  'https://10times.com/san-francisco-us',
  'https://10times.com/dubai-ae',
  'https://10times.com/mumbai-in',
  'https://10times.com/fukuoka-jp',  
  'https://10times.com/london-gb',
  'https://10times.com/paris-fr',
  'https://10times.com/berlin-de',
  'https://10times.com/madrid-es',
  'https://10times.com/rome-it',
  'https://10times.com/amsterdam-nl',
  'https://10times.com/vienna-at',
  'https://10times.com/moscow-ru',
  'https://10times.com/stockholm-se',
  'https://10times.com/copenhagen-dk',
  'https://10times.com/oslo-no',
  'https://10times.com/helsinki-fi',
  'https://10times.com/warsaw-pl',
  'https://10times.com/prague-cz',
  'https://10times.com/budapest-hu',
  'https://10times.com/athens-gr',
  'https://10times.com/istanbul-tr',
  'https://10times.com/beijing-cn',
  'https://10times.com/shanghai-cn',
  'https://10times.com/guangzhou-cn',
  'https://10times.com/shenzhen-cn',
  'https://10times.com/hong-kong-hk',
  'https://10times.com/tokyo-jp',
  'https://10times.com/osaka-jp',
  'https://10times.com/seoul-kr',
  'https://10times.com/singapore-sg',
  'https://10times.com/bangkok-th',
  'https://10times.com/kuala-lumpur-my',
  'https://10times.com/jakarta-id',
  'https://10times.com/manila-ph',
  'https://10times.com/ho-chi-minh-city-vn',
  'https://10times.com/hanoi-vn',
  'https://10times.com/new-delhi-in',
  'https://10times.com/bangalore-in',
  'https://10times.com/chennai-in',
  'https://10times.com/kolkata-in',
  'https://10times.com/hyderabad-in',
  'https://10times.com/ahmedabad-in',
  'https://10times.com/pune-in',
  'https://10times.com/karachi-pk',
  'https://10times.com/lahore-pk',
  'https://10times.com/dhaka-bd',
  'https://10times.com/colombo-lk',
  'https://10times.com/sydney-au',
  'https://10times.com/melbourne-au',
  'https://10times.com/brisbane-au',
  'https://10times.com/perth-au',
  'https://10times.com/auckland-nz',
  'https://10times.com/wellington-nz',
  'https://10times.com/johannesburg-za',
  'https://10times.com/cape-town-za',
  'https://10times.com/durban-za',
  'https://10times.com/cairo-eg',
  'https://10times.com/alexandria-eg',
  'https://10times.com/casablanca-ma',
  'https://10times.com/lagos-ng',
  'https://10times.com/nairobi-ke',
  'https://10times.com/addis-ababa-et',
  'https://10times.com/accra-gh',
  'https://10times.com/dakar-sn',
  'https://10times.com/boston-us',
  'https://10times.com/miami-us',
  'https://10times.com/houston-us',
  'https://10times.com/dallas-us',
  'https://10times.com/philadelphia-us',
  'https://10times.com/phoenix-us',
  'https://10times.com/san-diego-us',
  'https://10times.com/seattle-us',
  'https://10times.com/denver-us',
  'https://10times.com/atlanta-us',
  'https://10times.com/detroit-us',
  'https://10times.com/montreal-ca',
  'https://10times.com/vancouver-ca',
  'https://10times.com/calgary-ca',
  'https://10times.com/ottawa-ca',
  'https://10times.com/mexico-city-mx',
  'https://10times.com/guadalajara-mx',
  'https://10times.com/monterrey-mx',
  'https://10times.com/sao-paulo-br',
  'https://10times.com/rio-de-janeiro-br',
  'https://10times.com/brasilia-br',
  'https://10times.com/buenos-aires-ar',
  'https://10times.com/santiago-cl',
  'https://10times.com/lima-pe',
  'https://10times.com/bogota-co',
  'https://10times.com/caracas-ve',
  'https://10times.com/quito-ec',
  'https://10times.com/panama-city-pa',
  'https://10times.com/san-jose-cr',
  'https://10times.com/havana-cu',
  'https://10times.com/abu-dhabi-ae',
  'https://10times.com/riyadh-sa',
  'https://10times.com/jeddah-sa',
  'https://10times.com/doha-qa',
  'https://10times.com/manama-bh',
  'https://10times.com/kuwait-city-kw',
  'https://10times.com/muscat-om',
  'https://10times.com/tel-aviv-il'
];

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function setupRabbitMQ() {
  try {
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });
    console.log('RabbitMQ connection and channel established');
  } catch (error) {
    console.error('Error setting up RabbitMQ:', error);
    throw error;
  }
}

async function closeRabbitMQ() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('RabbitMQ connection and channel closed');
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error);
  }
}

async function scrapeWithAxios(url) {
  try {
    const axiosConfig = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
      },
      proxy: {
        protocol: 'http',
        host: "p.webshare.io",
        port: 80,
        auth: {
          username: "owqvekkf-rotate",
          password: "12cvzre3ddzc",
        },
      },
      timeout: 30000,
      maxRedirects: 5,
    };
    const response = await axios.get(url, axiosConfig);
    const $ = cheerio.load(response.data);
    const eventLinks = $('.event-card h2 a').map((i, el) => $(el).attr('href')).get();
    return eventLinks;
  } catch (error) {
    console.error(`Error scraping with Axios: ${url}`, error);
    return null;
  }
}

async function scrapeWithPuppeteer(url, retries = 3) {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    let allEventLinks = [];
    let hasNextPage = true;
    let pageNum = 1;

    while (hasNextPage) {
      console.log(`Scraping page ${pageNum} of ${url} with Puppeteer...`);

      await page.waitForSelector('.event-card', { timeout: 30000 });

      const eventLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.event-card h2 a')).map(a => a.href);
      });

      allEventLinks = allEventLinks.concat(eventLinks);

      const nextPageButton = await page.evaluate(() => {
        const paginationDiv = document.querySelector('.pagination');
        if (!paginationDiv) return null;

        const buttons = paginationDiv.querySelectorAll('span.btn');
        const lastButton = buttons[buttons.length - 1];

        if (lastButton && lastButton.textContent.trim() === '»') {
          return {
            dataPage: lastButton.getAttribute('data-page'),
            exists: true
          };
        }
        return { exists: false };
      });

      if (nextPageButton && nextPageButton.exists && nextPageButton.dataPage && parseInt(nextPageButton.dataPage) > pageNum) {
        await page.click('.pagination span.cursor-pointer:last-child');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
        pageNum++;
        await delay(Math.random() * 3000 + 2000);
      } else {
        hasNextPage = false;
      }
    }

    return allEventLinks;
  } catch (error) {
    console.error(`Error scraping ${url} with Puppeteer:`, error);
    if (retries > 0) {
      console.log(`Retrying ${url} with Puppeteer... (${retries} attempts left)`);
      await delay(5000);
      return scrapeWithPuppeteer(url, retries - 1);
    }
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

async function scrapeEventLinks(url) {
  console.log(`Starting to scrape: ${url}`);
  
  // First, try scraping with Axios
  let eventLinks = await scrapeWithAxios(url);
  
  // If Axios scraping fails or returns no results, fall back to Puppeteer
  if (!eventLinks || eventLinks.length === 0) {
    console.log(`Axios scraping failed for ${url}. Falling back to Puppeteer...`);
    eventLinks = await scrapeWithPuppeteer(url);
  }
  
  return eventLinks;
}

async function sendToQueue(data) {
  try {
    for (const url of data) {
      await channel.sendToQueue(queueName, Buffer.from(url), { persistent: true });
      console.log(`Sent to queue: ${url}`);
    }
    console.log(`All ${data.length} URLs sent to queue '${queueName}'`);
  } catch (error) {
    console.error('Error sending to queue:', error);
  }
}

async function main() {
  try {
    await setupRabbitMQ();

    for (const cityUrl of cityUrls) {
      try {
        let eventLinks = await scrapeEventLinks(cityUrl);

        console.log(`Total event links scraped for ${cityUrl}: ${eventLinks.length}`);

        if (eventLinks.length > 0) {
          await sendToQueue(eventLinks);
        } else {
          console.log(`No event links found for ${cityUrl}. Skipping...`);
        }

        await delay(5000);
      } catch (error) {
        console.error(`Error processing ${cityUrl}:`, error);
        console.log(`Skipping ${cityUrl} due to error. Moving to next city...`);
      }
    }
  } catch (error) {
    console.error('An error occurred in the main process:', error);
  } finally {
    await closeRabbitMQ();
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

main().catch(error => {
  console.error('Fatal error in main process:', error);
  process.exit(1);
});