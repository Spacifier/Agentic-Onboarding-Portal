import ICICIScrapingService from '../services/scraping.service.js';
import VectorStoreService from '../services/vectorstore.service.js';
import RecommendationService from '../services/recommendation.service.js';
import AdvancedRecommendationService from '../services/advanced-recommendation.service.js';
import RecommendationAnalyticsService from '../services/recommendation-analytics.service.js';
import CibilService from '../services/cibil.service.js';
import OCRService from '../services/ocr.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Initialize services
const scrapingService = new ICICIScrapingService();
const vectorStoreService = new VectorStoreService();
const recommendationService = new RecommendationService();
const advancedRecommendationService = new AdvancedRecommendationService();
const analyticsService = new RecommendationAnalyticsService();
const cibilService = new CibilService();
const ocrService = new OCRService();

// Scrape and index ICICI credit card data
export const scrapeAndIndexData = asyncHandler(async (req, res) => {
  try {
    console.log('Starting ICICI credit card data scraping...');
    
    // Scrape credit card data
    const creditCards = await scrapingService.scrapeCreditCardData();
    
    if (creditCards.length === 0) {
      throw new ApiError(404, 'No credit card data found');
    }

    console.log(`Scraped ${creditCards.length} credit cards`);
    
    // Index data in vector store
    const indexResult = await vectorStoreService.indexCreditCardData(creditCards);
    
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          scrapedCards: creditCards.length,
          indexedDocuments: indexResult.documentsIndexed,
          cards: creditCards.map(card => ({
            name: card.name,
            url: card.url,
            featuresCount: card.features.length,
            benefitsCount: card.benefits.length,
          })),
        },
        'Credit card data scraped and indexed successfully'
      )
    );
  } catch (error) {
    console.error('Scraping and indexing error:', error);
    throw new ApiError(500, error.message || 'Failed to scrape and index data');
  }
});

// Get credit card recommendations
export const getRecommendations = asyncHandler(async (req, res) => {
  try {
    const {
      income,
      employmentType,
      creditScore,
      spendingCategories,
      preferredRewards,
      annualFeeTolerance,
      desiredFeatures,
      panNumber,
      userId,
      recommendationType = 'advanced', // 'basic', 'advanced', 'hybrid'
      testGroup = 'A'
    } = req.body;

    // Validate required fields
    if (!income || !employmentType) {
      throw new ApiError(400, 'Income and employment type are required');
    }

    let cibilData = null;
    
    // Get CIBIL score if PAN is provided
    if (panNumber) {
      try {
        cibilData = await cibilService.getCibilScore(panNumber, {
          income,
          employmentType,
        });
      } catch (error) {
        console.warn('CIBIL score fetch failed, continuing without it:', error.message);
      }
    }

    // Prepare customer profile
    const customerProfile = {
      income,
      employmentType,
      creditScore: cibilData?.cibilScore || creditScore,
      spendingCategories: Array.isArray(spendingCategories) ? spendingCategories : [],
      preferredRewards: Array.isArray(preferredRewards) ? preferredRewards : [],
      annualFeeTolerance,
      desiredFeatures: Array.isArray(desiredFeatures) ? desiredFeatures : [],
      age: req.body.age || 30,
    };

    // Get recommendations based on type
    let recommendations;
    const recommendationId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    switch (recommendationType) {
      case 'advanced':
        recommendations = await advancedRecommendationService.getContentBasedRecommendations(customerProfile);
        break;
      case 'hybrid':
        recommendations = await advancedRecommendationService.getHybridRecommendations(customerProfile.userId, customerProfile);
        break;
      case 'ab_test':
        recommendations = await advancedRecommendationService.getRecommendationsWithABTest(customerProfile.userId, customerProfile, testGroup);
        break;
      default:
        recommendations = await recommendationService.getRecommendations(customerProfile);
    }
    
    // Track recommendation serving
    analyticsService.trackUserInteraction(customerProfile.userId, recommendationId, {
      type: 'view',
      recommendationType,
      testGroup,
      recommendationCount: recommendations.recommendations?.length || 0
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          recommendationId,
          customerProfile,
          cibilData,
          recommendations,
          recommendationType,
          testGroup,
          timestamp: new Date().toISOString(),
        },
        'Recommendations generated successfully'
      )
    );
  } catch (error) {
    console.error('Recommendation error:', error);
    throw new ApiError(500, error.message || 'Failed to generate recommendations');
  }
});

// Get CIBIL score
export const getCibilScore = asyncHandler(async (req, res) => {
  try {
    const { panNumber, fullName, dob, mobile, income, employmentType } = req.body;

    if (!panNumber) {
      throw new ApiError(400, 'PAN number is required');
    }

    const personalDetails = {
      fullName,
      dob,
      mobile,
      income,
      employmentType,
    };

    const cibilData = await cibilService.getCibilScore(panNumber, personalDetails);
    const eligibility = await cibilService.getCreditEligibility(
      cibilData.cibilScore,
      income,
      employmentType
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          ...cibilData,
          eligibility,
        },
        'CIBIL score retrieved successfully'
      )
    );
  } catch (error) {
    console.error('CIBIL score error:', error);
    throw new ApiError(500, error.message || 'Failed to get CIBIL score');
  }
});

// Process document with OCR
export const processDocument = asyncHandler(async (req, res) => {
  try {
    const { documentType } = req.body;
    const file = req.file;

    if (!file) {
      throw new ApiError(400, 'Document file is required');
    }

    if (!documentType) {
      throw new ApiError(400, 'Document type is required');
    }

    const validDocumentTypes = ['aadhaar', 'pan', 'passport', 'voterid', 'payslip', 'bankstatement'];
    if (!validDocumentTypes.includes(documentType.toLowerCase())) {
      throw new ApiError(400, `Invalid document type. Supported types: ${validDocumentTypes.join(', ')}`);
    }

    // Process document with OCR
    const ocrResult = await ocrService.processDocument(file.path, documentType);

    // Clean up uploaded file
    if (file.path) {
      try {
        const fs = await import('fs');
        fs.unlinkSync(file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded file:', cleanupError.message);
      }
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        ocrResult,
        'Document processed successfully'
      )
    );
  } catch (error) {
    console.error('Document processing error:', error);
    throw new ApiError(500, error.message || 'Failed to process document');
  }
});

// Explain specific recommendation
export const explainRecommendation = asyncHandler(async (req, res) => {
  try {
    const { cardName } = req.params;
    const customerProfile = req.body;

    if (!cardName) {
      throw new ApiError(400, 'Card name is required');
    }

    const explanation = await recommendationService.explainRecommendation(cardName, customerProfile);

    return res.status(200).json(
      new ApiResponse(
        200,
        explanation,
        'Recommendation explanation generated successfully'
      )
    );
  } catch (error) {
    console.error('Explanation error:', error);
    throw new ApiError(500, error.message || 'Failed to explain recommendation');
  }
});

// Search credit cards
export const searchCreditCards = asyncHandler(async (req, res) => {
  try {
    const { query, limit = 5 } = req.query;

    if (!query) {
      throw new ApiError(400, 'Search query is required');
    }

    const results = await vectorStoreService.searchWithScore(query, parseInt(limit), 0.5);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          query,
          results: results.map(result => ({
            content: result.document.pageContent,
            metadata: result.document.metadata,
            score: result.score,
          })),
          count: results.length,
        },
        'Search completed successfully'
      )
    );
  } catch (error) {
    console.error('Search error:', error);
    throw new ApiError(500, error.message || 'Search failed');
  }
});

// Health check for RAG system
export const healthCheck = asyncHandler(async (req, res) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      services: {
        vectorStore: 'checking...',
        llm: 'checking...',
        ocr: 'checking...',
        cibil: 'checking...',
      },
    };

    // Check vector store
    try {
      await vectorStoreService.initialize();
      status.services.vectorStore = 'healthy';
    } catch (error) {
      status.services.vectorStore = `error: ${error.message}`;
    }

    // Check recommendation service (LLM)
    try {
      await recommendationService.initialize();
      status.services.llm = 'healthy';
    } catch (error) {
      status.services.llm = `error: ${error.message}`;
    }

    // OCR service is always available
    status.services.ocr = 'healthy';

    // CIBIL service check
    try {
      const testResult = await cibilService.getMockCibilScore('ABCDE1234F');
      status.services.cibil = testResult.success ? 'healthy' : 'error';
    } catch (error) {
      status.services.cibil = `error: ${error.message}`;
    }

    const allHealthy = Object.values(status.services).every(service => service === 'healthy');

    return res.status(allHealthy ? 200 : 503).json(
      new ApiResponse(
        allHealthy ? 200 : 503,
        status,
        allHealthy ? 'All services are healthy' : 'Some services have issues'
      )
    );
  } catch (error) {
    console.error('Health check error:', error);
    throw new ApiError(500, 'Health check failed');
  }
});

// Get recommendation analytics
export const getRecommendationAnalytics = asyncHandler(async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    
    const analytics = analyticsService.getRecommendationAnalytics(timeframe);
    const insights = analyticsService.generateInsights();
    const realtimeMetrics = analyticsService.getRealtimeMetrics();
    
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          analytics,
          insights,
          realtimeMetrics,
          timestamp: new Date().toISOString()
        },
        'Analytics retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Analytics error:', error);
    throw new ApiError(500, 'Failed to retrieve analytics');
  }
});

// Track user interaction with recommendations
export const trackUserInteraction = asyncHandler(async (req, res) => {
  try {
    const {
      recommendationId,
      interactionType, // 'click', 'application', 'approval', 'rejection', 'feedback'
      cardName,
      rating,
      feedback
    } = req.body;
    
    const userId = req.user._id;
    
    if (!recommendationId || !interactionType) {
      throw new ApiError(400, 'Recommendation ID and interaction type are required');
    }
    
    analyticsService.trackUserInteraction(userId, recommendationId, {
      type: interactionType,
      cardName,
      rating,
      feedback
    });
    
    // Update advanced recommendation service with user interaction
    if (cardName && ['application', 'approval', 'rejection'].includes(interactionType)) {
      advancedRecommendationService.updateUserInteraction(userId, cardName, interactionType, rating);
    }
    
    return res.status(200).json(
      new ApiResponse(
        200,
        { tracked: true },
        'User interaction tracked successfully'
      )
    );
  } catch (error) {
    console.error('Interaction tracking error:', error);
    throw new ApiError(500, 'Failed to track user interaction');
  }
});

// Get A/B test results
export const getABTestResults = asyncHandler(async (req, res) => {
  try {
    const abTestResults = analyticsService.getABTestResults();
    
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          abTestResults,
          timestamp: new Date().toISOString()
        },
        'A/B test results retrieved successfully'
      )
    );
  } catch (error) {
    console.error('A/B test results error:', error);
    throw new ApiError(500, 'Failed to retrieve A/B test results');
  }
});