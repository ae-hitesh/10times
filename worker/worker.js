const { advancedEventScraper } = require('./scraper');

const url = "https://10times.com/florida-home-show";

const workingProxies = [
    '208.110.81.34:17045',
];

async function main() {
    try {
        console.log("Testing proxies...");

        const result = await advancedEventScraper(url, workingProxies);
        console.log("Result:", result);
        console.log("Completed");
    } catch (error) {
        console.error("Error:", error);
    }
}

main();