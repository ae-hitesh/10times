const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

const popularUserAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
];

const getRandomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
const getRandomUserAgent = () => popularUserAgents[Math.floor(Math.random() * popularUserAgents.length)];

async function retry(fn, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      const delay = BASE_DELAY * Math.pow(2, i);
      console.log(`Attempt ${i + 1} failed. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function getPublicIP() {
  try {
    const response = await axios.get("https://ipv4.webshare.io/", {
      proxy: {
        protocol: 'http',
        host: "p.webshare.io",
        port: 80,
        auth: {
          username: "owqvekkf-rotate",
          password: "12cvzre3ddzc",
        },
      },
    });
    console.log("Current IP Address:", response.data);
  } catch (error) {
    console.error("Failed to retrieve IP address:", error.message);
  }
}

async function scrapeWithAxios(url) {
  const userAgent = getRandomUserAgent();
  const axiosConfig = {
    headers: {
      "User-Agent": userAgent,
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

  try {
    console.log("Axios: Sending request with User-Agent:", userAgent);
    const response = await axios.get(url, axiosConfig);
    console.log("Axios: Response received with status code:", response.status);
    return response.data;
  } catch (error) {
    console.error("Axios scraping failed:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    }
    throw error;
  }
}

async function scrapeWithPuppeteer(url) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ],
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.authenticate({
      username: "rI5x2n-ttl-0",
      password: "Z9rSg4KSOj0FS9e",
    });

    await page.setViewport({
      width: 1920 + Math.floor(Math.random() * 100),
      height: 1080 + Math.floor(Math.random() * 100),
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: false,
      isMobile: false,
    });

    await page.setUserAgent(getRandomUserAgent());
    await page.setJavaScriptEnabled(true);
    await page.setDefaultNavigationTimeout(60000);

    await page.goto(url, { waitUntil: 'networkidle2' });

    // Check for CAPTCHA
    const captchaText = await page.evaluate(() => {
      const elements = Array.from(document.body.getElementsByTagName('*'));
      for (const element of elements) {
        if (element.textContent.includes('Verify you are human')) {
          return element.textContent;
        }
      }
      return null;
    });

    if (captchaText) {
      console.log('CAPTCHA detected. Waiting for manual solve...');
      // Wait for navigation after CAPTCHA solve
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 300000 }); // 5 minutes timeout
    } else {
      console.log('No CAPTCHA detected. Proceeding with scraping.');
    }

    await page.reload();

    console.log("Puppeteer: Page loaded successfully");

    const content = await page.content();
    return content;
  } catch (error) {
    console.error("Puppeteer scraping failed:", error.message);
    throw error;
  } finally {
    // if (browser) await browser.close();
  }
}

async function parseHtml(html) {
  const $ = cheerio.load(html);

  // Extract JSON-LD data
  let jsonLdData = [];
  $('script[type="application/ld+json"]').each((index, element) => {
    try {
      const jsonData = JSON.parse($(element).html());
      jsonLdData.push(jsonData);
    } catch (error) {
      console.error("Error parsing JSON-LD:", error);
    }
  });

  // Extract meta tag data
  let metaTagsData = {};
  $("meta").each((index, element) => {
    const key = $(element).attr("property") || $(element).attr("name");
    const content = $(element).attr("content");
    if (key && content) {
      metaTagsData[key] = content;
    }
  });

  let formattedEvents = jsonLdData.map((schema) => {
    let banner_url;
    if (schema["image"]) {
      if (typeof schema["image"] === 'string') {
        banner_url = schema["image"];
      } else if (Array.isArray(schema["image"])) {
        banner_url = schema["image"][0];
      } else if (typeof schema["image"] === 'object') {
        if (schema["image"]["@type"] === 'ImageObject' && schema["image"].url) {
          banner_url = schema["image"].url;
        } else {
          banner_url = schema["image"].url || schema["image"].src || schema["image"].href;
        }
      }
    }

    let eventData = {
      banner_url: banner_url,
      eventname: schema["name"],
      description: schema["description"],
      start_time: schema["startDate"],
      end_time: schema["endDate"],
      venue: schema["location"] ? schema["location"]["name"] : undefined,
      address: schema["location"] ? schema["location"]["address"] : undefined,
      city:
        schema["location"] && schema["location"]["address"]
          ? schema["location"]["address"]["addressLocality"]
          : undefined,
      state:
        schema["location"] && schema["location"]["address"]
          ? schema["location"]["address"]["addressRegion"]
          : undefined,
      country:
        schema["location"] && schema["location"]["address"]
          ? schema["location"]["address"]["addressCountry"]
          : undefined,
      ticket_url: schema["url"],
      video_url: schema["video"],
      organizer_id: schema["organizer"]
        ? schema["organizer"]["@id"]
        : undefined,
      latitude:
        schema["location"] && schema["location"]["geo"]
          ? schema["location"]["geo"]["latitude"]
          : undefined,
      longitude:
        schema["location"] && schema["location"]["geo"]
          ? schema["location"]["geo"]["longitude"]
          : undefined,
    };

    // If banner_url is not in schema, get it from meta tags
    if (!eventData.banner_url) {
      eventData.banner_url = metaTagsData["og:image"];
    }

    // If description is not in schema, get it from meta tags
    if (!eventData.description) {
      eventData.description =
        metaTagsData["og:description"] ||
        metaTagsData["twitter:description"] ||
        metaTagsData["description"];
    }

    // For eventname, prioritize schema, then h1, then meta tags
    if (!eventData.eventname) {
      eventData.eventname = $("h1").first().text();
      // metaTagsData["og:title"] ||
      // metaTagsData["twitter:title"];
    }

    // Remove text after "|" in eventname
    // if (eventData.eventname) {
    //   eventData.eventname = eventData.eventname.split("|")[0].trim();
    // }

    // Fill in other missing data from meta tags
    if (!eventData.start_time)
      eventData.start_time = metaTagsData["event:start_time"];
    if (!eventData.end_time)
      eventData.end_time = metaTagsData["event:end_time"];
    if (!eventData.state)
      eventData.state =
        metaTagsData["og:region"] || metaTagsData["place:region"];
    if (!eventData.country)
      eventData.country =
        metaTagsData["og:country-name"] || metaTagsData["place:country"];
    if (!eventData.latitude)
      eventData.latitude = metaTagsData["place:location:latitude"];
    if (!eventData.longitude)
      eventData.longitude = metaTagsData["place:location:longitude"];
    if (!eventData.banner_url)
      eventData.banner_url = metaTagsData["og:image"];

    // If we still don't have coordinates, try to parse from a combined meta tag
    if (!eventData.latitude || !eventData.longitude) {
      const geoposition = metaTagsData["geo.position"] || metaTagsData["ICBM"];
      if (geoposition) {
        const [lat, long] = geoposition.split(";");
        eventData.latitude = eventData.latitude || lat;
        eventData.longitude = eventData.longitude || long;
      }
    }

    return eventData;
  });

  let parsedEventData = formattedEvents[0];

  return parsedEventData;
}

async function advancedEventScraper(url) {
  let html;

  // Attempt to scrape with Axios first
  try {
    html = await retry(() => scrapeWithAxios(url));
  } catch (error) {
    console.log("Axios scraping failed. Falling back to Puppeteer.");
    html = await retry(() => scrapeWithPuppeteer(url));
  }

  const result = await parseHtml(html);
  return result;
}

module.exports = {
  advancedEventScraper
}
