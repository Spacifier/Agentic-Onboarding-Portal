import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { ragConfig } from '../config/rag.config.js';
import { ApiError } from '../utils/ApiError.js';

// Configure axios with retry logic
axiosRetry(axios, { 
  retries: 3, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status >= 500;
  }
});

class ICICIScrapingService {
  constructor() {
    this.baseUrl = ragConfig.scraping.baseUrl;
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeCreditCardData() {
    try {
      await this.initBrowser();
      const creditCards = [];

      for (const path of ragConfig.scraping.creditCardPaths) {
        try {
          const cardData = await this.scrapeCardPage(path);
          if (cardData) {
            creditCards.push(cardData);
          }
        } catch (error) {
          console.error(`Error scraping ${path}:`, error.message);
          continue;
        }
      }

      return creditCards;
    } catch (error) {
      throw new ApiError(500, `Scraping failed: ${error.message}`);
    } finally {
      await this.closeBrowser();
    }
  }

  async scrapeCardPage(path) {
    const page = await this.browser.newPage();
    
    try {
      await page.setUserAgent(ragConfig.scraping.userAgent);
      await page.setViewport({ width: 1920, height: 1080 });
      
      const url = `${this.baseUrl}${path}`;
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: ragConfig.scraping.timeout 
      });

      // Wait for content to load
      await page.waitForTimeout(3000);

      const content = await page.content();
      const $ = cheerio.load(content);

      // Extract credit card information
      const cardData = {
        url: url,
        name: this.extractCardName($),
        features: this.extractFeatures($),
        eligibility: this.extractEligibility($),
        fees: this.extractFees($),
        rewards: this.extractRewards($),
        benefits: this.extractBenefits($),
        interestRates: this.extractInterestRates($),
        description: this.extractDescription($),
        scrapedAt: new Date().toISOString(),
      };

      return cardData;
    } catch (error) {
      console.error(`Error scraping page ${path}:`, error.message);
      return null;
    } finally {
      await page.close();
    }
  }

  extractCardName($) {
    const selectors = [
      'h1.card-title',
      'h1.product-title',
      '.card-name h1',
      'h1',
      '.page-title h1'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        return element.text().trim();
      }
    }
    return 'ICICI Credit Card';
  }

  extractFeatures($) {
    const features = [];
    const selectors = [
      '.features li',
      '.key-features li',
      '.card-features li',
      '.benefits-list li',
      '.feature-item'
    ];

    selectors.forEach(selector => {
      $(selector).each((i, elem) => {
        const text = $(elem).text().trim();
        if (text && !features.includes(text)) {
          features.push(text);
        }
      });
    });

    return features;
  }

  extractEligibility($) {
    const eligibility = [];
    const selectors = [
      '.eligibility li',
      '.eligibility-criteria li',
      '.requirements li'
    ];

    selectors.forEach(selector => {
      $(selector).each((i, elem) => {
        const text = $(elem).text().trim();
        if (text && !eligibility.includes(text)) {
          eligibility.push(text);
        }
      });
    });

    return eligibility;
  }

  extractFees($) {
    const fees = {};
    const feeSelectors = {
      annual: ['.annual-fee', '.yearly-fee'],
      joining: ['.joining-fee', '.one-time-fee'],
      processing: ['.processing-fee'],
      late_payment: ['.late-payment-fee', '.overdue-fee']
    };

    Object.entries(feeSelectors).forEach(([feeType, selectors]) => {
      selectors.forEach(selector => {
        const element = $(selector);
        if (element.length) {
          fees[feeType] = element.text().trim();
        }
      });
    });

    return fees;
  }

  extractRewards($) {
    const rewards = [];
    const selectors = [
      '.rewards li',
      '.reward-points li',
      '.cashback li',
      '.reward-structure li'
    ];

    selectors.forEach(selector => {
      $(selector).each((i, elem) => {
        const text = $(elem).text().trim();
        if (text && !rewards.includes(text)) {
          rewards.push(text);
        }
      });
    });

    return rewards;
  }

  extractBenefits($) {
    const benefits = [];
    const selectors = [
      '.benefits li',
      '.card-benefits li',
      '.additional-benefits li',
      '.privilege li'
    ];

    selectors.forEach(selector => {
      $(selector).each((i, elem) => {
        const text = $(elem).text().trim();
        if (text && !benefits.includes(text)) {
          benefits.push(text);
        }
      });
    });

    return benefits;
  }

  extractInterestRates($) {
    const rates = {};
    const rateSelectors = {
      purchase: ['.purchase-rate', '.retail-rate'],
      cash_advance: ['.cash-advance-rate'],
      balance_transfer: ['.balance-transfer-rate']
    };

    Object.entries(rateSelectors).forEach(([rateType, selectors]) => {
      selectors.forEach(selector => {
        const element = $(selector);
        if (element.length) {
          rates[rateType] = element.text().trim();
        }
      });
    });

    return rates;
  }

  extractDescription($) {
    const selectors = [
      '.card-description',
      '.product-description',
      '.overview',
      '.card-overview p'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        return element.text().trim();
      }
    }
    return '';
  }
}

export default ICICIScrapingService;