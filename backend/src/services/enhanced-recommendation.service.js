import { initializeRAGComponents } from '../config/rag.config.js';
import VectorStoreService from './vectorstore.service.js';
import { ApiError } from '../utils/ApiError.js';

class EnhancedRecommendationService {
  constructor() {
    this.llm = null;
    this.vectorStoreService = new VectorStoreService();
    this.userPreferences = new Map(); // Store user preferences for personalization
    this.interactionHistory = new Map(); // Track user interactions
  }

  async initialize() {
    try {
      const { llm } = await initializeRAGComponents();
      this.llm = llm;
      await this.vectorStoreService.initialize();
    } catch (error) {
      throw new ApiError(500, 'Failed to initialize enhanced recommendation service');
    }
  }

  // Content-based filtering inspired by the product recommendation system
  async getContentBasedRecommendations(customerProfile) {
    try {
      if (!this.llm) {
        await this.initialize();
      }

      // Create feature vector from customer profile
      const customerFeatures = this.extractCustomerFeatures(customerProfile);
      
      // Search for similar credit cards based on features
      const searchQuery = this.createEnhancedSearchQuery(customerFeatures);
      const relevantCards = await this.vectorStoreService.searchWithScore(searchQuery, 15, 0.5);
      
      if (relevantCards.length === 0) {
        return this.getFallbackRecommendations(customerProfile);
      }

      // Calculate similarity scores for each card
      const scoredCards = await this.calculateCardSimilarity(relevantCards, customerFeatures);
      
      // Generate personalized recommendations
      const recommendations = await this.generatePersonalizedRecommendations(
        customerProfile, 
        scoredCards.slice(0, 5)
      );
      
      return recommendations;
    } catch (error) {
      console.error('Error in content-based recommendations:', error);
      throw new ApiError(500, 'Failed to generate content-based recommendations');
    }
  }

  // Collaborative filtering approach
  async getCollaborativeRecommendations(userId, customerProfile) {
    try {
      // Find similar users based on profile characteristics
      const similarUsers = await this.findSimilarUsers(customerProfile);
      
      // Get cards preferred by similar users
      const collaborativeCards = await this.getCardsFromSimilarUsers(similarUsers);
      
      // Filter out cards that don't match basic eligibility
      const eligibleCards = this.filterByEligibility(collaborativeCards, customerProfile);
      
      return eligibleCards.slice(0, 3);
    } catch (error) {
      console.error('Error in collaborative recommendations:', error);
      return [];
    }
  }

  // Hybrid recommendation system combining content-based and collaborative
  async getHybridRecommendations(userId, customerProfile) {
    try {
      // Get content-based recommendations
      const contentRecommendations = await this.getContentBasedRecommendations(customerProfile);
      
      // Get collaborative recommendations
      const collaborativeRecommendations = await this.getCollaborativeRecommendations(userId, customerProfile);
      
      // Combine and weight the recommendations
      const hybridRecommendations = this.combineRecommendations(
        contentRecommendations,
        collaborativeRecommendations,
        customerProfile
      );
      
      return hybridRecommendations;
    } catch (error) {
      console.error('Error in hybrid recommendations:', error);
      return await this.getContentBasedRecommendations(customerProfile);
    }
  }

  // Extract meaningful features from customer profile
  extractCustomerFeatures(profile) {
    const features = {
      incomeRange: this.categorizeIncome(profile.income),
      creditScoreRange: this.categorizeCreditScore(profile.creditScore),
      spendingCategories: profile.spendingCategories || [],
      preferredRewards: profile.preferredRewards || [],
      feePreference: profile.annualFeeTolerance || 'moderate',
      employmentType: profile.employmentType || 'salaried',
      age: profile.age || 30,
      desiredFeatures: profile.desiredFeatures || []
    };
    
    return features;
  }

  // Enhanced search query creation with weighted features
  createEnhancedSearchQuery(features) {
    const queryParts = [];
    
    // Weight different features based on importance
    const weights = {
      incomeRange: 3,
      creditScoreRange: 3,
      spendingCategories: 2,
      preferredRewards: 2,
      feePreference: 1,
      employmentType: 1
    };
    
    Object.entries(features).forEach(([key, value]) => {
      if (value && weights[key]) {
        const weight = weights[key];
        const repeatedValue = Array(weight).fill(value).join(' ');
        queryParts.push(repeatedValue);
      }
    });
    
    return queryParts.join(' ');
  }

  // Calculate similarity between cards and customer features
  async calculateCardSimilarity(cards, customerFeatures) {
    const scoredCards = [];
    
    for (const cardResult of cards) {
      const card = cardResult.document;
      const baseScore = cardResult.score;
      
      // Calculate feature-based similarity
      const featureScore = this.calculateFeatureScore(card, customerFeatures);
      
      // Combine vector similarity with feature similarity
      const combinedScore = (baseScore * 0.6) + (featureScore * 0.4);
      
      scoredCards.push({
        ...cardResult,
        combinedScore,
        featureScore,
        reasons: this.generateReasoningFactors(card, customerFeatures)
      });
    }
    
    // Sort by combined score
    return scoredCards.sort((a, b) => b.combinedScore - a.combinedScore);
  }

  // Calculate feature-based similarity score
  calculateFeatureScore(card, customerFeatures) {
    let score = 0;
    let maxScore = 0;
    
    const cardContent = card.pageContent.toLowerCase();
    const cardMetadata = card.metadata || {};
    
    // Income compatibility
    maxScore += 3;
    if (this.checkIncomeCompatibility(cardContent, customerFeatures.incomeRange)) {
      score += 3;
    }
    
    // Credit score compatibility
    maxScore += 3;
    if (this.checkCreditScoreCompatibility(cardContent, customerFeatures.creditScoreRange)) {
      score += 3;
    }
    
    // Spending categories match
    maxScore += 2;
    const spendingMatch = this.calculateSpendingMatch(cardContent, customerFeatures.spendingCategories);
    score += spendingMatch * 2;
    
    // Rewards preference match
    maxScore += 2;
    const rewardsMatch = this.calculateRewardsMatch(cardContent, customerFeatures.preferredRewards);
    score += rewardsMatch * 2;
    
    // Fee preference
    maxScore += 1;
    if (this.checkFeeCompatibility(cardContent, customerFeatures.feePreference)) {
      score += 1;
    }
    
    return maxScore > 0 ? score / maxScore : 0;
  }

  // Generate reasoning factors for recommendations
  generateReasoningFactors(card, customerFeatures) {
    const reasons = [];
    const cardContent = card.pageContent.toLowerCase();
    
    if (this.checkIncomeCompatibility(cardContent, customerFeatures.incomeRange)) {
      reasons.push(`Matches your ${customerFeatures.incomeRange} income range`);
    }
    
    if (customerFeatures.spendingCategories.length > 0) {
      const matchingCategories = customerFeatures.spendingCategories.filter(category =>
        cardContent.includes(category.toLowerCase())
      );
      if (matchingCategories.length > 0) {
        reasons.push(`Offers rewards for ${matchingCategories.join(', ')} spending`);
      }
    }
    
    if (customerFeatures.preferredRewards.length > 0) {
      const matchingRewards = customerFeatures.preferredRewards.filter(reward =>
        cardContent.includes(reward.toLowerCase())
      );
      if (matchingRewards.length > 0) {
        reasons.push(`Provides ${matchingRewards.join(', ')} rewards you prefer`);
      }
    }
    
    return reasons;
  }

  // Enhanced recommendation generation with explanations
  async generatePersonalizedRecommendations(customerProfile, scoredCards) {
    const context = scoredCards.map(card => ({
      content: card.document.pageContent,
      score: card.combinedScore,
      reasons: card.reasons
    }));
    
    const prompt = `
You are an expert financial advisor specializing in credit card recommendations. Based on the customer profile and scored credit card options, provide highly personalized recommendations.

Customer Profile:
- Income: ${customerProfile.income || 'Not specified'} (${this.categorizeIncome(customerProfile.income)})
- Credit Score: ${customerProfile.creditScore || 'Not specified'} (${this.categorizeCreditScore(customerProfile.creditScore)})
- Employment: ${customerProfile.employmentType || 'Not specified'}
- Spending Categories: ${customerProfile.spendingCategories?.join(', ') || 'Not specified'}
- Preferred Rewards: ${customerProfile.preferredRewards?.join(', ') || 'Not specified'}
- Fee Tolerance: ${customerProfile.annualFeeTolerance || 'Not specified'}
- Age: ${customerProfile.age || 'Not specified'}

Available Credit Cards (with similarity scores):
${context.map((card, index) => `
Card ${index + 1} (Score: ${card.score.toFixed(2)}):
${card.content}
Matching Reasons: ${card.reasons.join(', ')}
`).join('\n')}

Provide recommendations in this JSON format:
{
  "recommendations": [
    {
      "rank": 1,
      "cardName": "Card Name",
      "matchScore": "95%",
      "confidenceLevel": "High",
      "whyRecommended": "Detailed explanation based on customer profile",
      "keyBenefits": ["benefit1", "benefit2", "benefit3"],
      "personalizedFeatures": ["feature1", "feature2"],
      "eligibilityMatch": "Excellent/Good/Fair",
      "expectedApprovalChance": "90%",
      "feesAndCharges": "Summary of fees",
      "potentialSavings": "Estimated annual savings",
      "considerations": "Important points to consider",
      "nextBestAlternative": "Alternative card name if this doesn't work"
    }
  ],
  "overallStrategy": "Personalized financial strategy advice",
  "riskAssessment": "Risk factors and mitigation strategies",
  "timelineRecommendation": "When to apply and in what order"
}
`;

    try {
      const response = await this.llm.invoke(prompt);
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const recommendations = JSON.parse(jsonMatch[0]);
        
        // Store user interaction for future collaborative filtering
        this.storeUserInteraction(customerProfile, recommendations);
        
        return recommendations;
      } else {
        return {
          recommendations: [],
          overallStrategy: response.content,
          riskAssessment: "Unable to assess risk at this time",
          timelineRecommendation: "Please consult with a financial advisor"
        };
      }
    } catch (error) {
      console.error('Error generating personalized recommendations:', error);
      throw new ApiError(500, 'Failed to generate personalized recommendations');
    }
  }

  // Utility methods for feature matching
  categorizeIncome(income) {
    if (!income) return 'unknown';
    if (income < 300000) return 'low';
    if (income < 600000) return 'medium';
    if (income < 1000000) return 'high';
    return 'premium';
  }

  categorizeCreditScore(score) {
    if (!score) return 'unknown';
    if (score < 600) return 'poor';
    if (score < 650) return 'fair';
    if (score < 700) return 'good';
    if (score < 750) return 'very-good';
    return 'excellent';
  }

  checkIncomeCompatibility(cardContent, incomeRange) {
    const incomeKeywords = {
      'low': ['basic', 'starter', 'entry-level', 'minimum income'],
      'medium': ['standard', 'regular', 'middle income'],
      'high': ['premium', 'gold', 'high income'],
      'premium': ['platinum', 'exclusive', 'premium', 'high net worth']
    };
    
    const keywords = incomeKeywords[incomeRange] || [];
    return keywords.some(keyword => cardContent.includes(keyword));
  }

  checkCreditScoreCompatibility(cardContent, scoreRange) {
    const scoreKeywords = {
      'poor': ['secured', 'bad credit', 'credit building'],
      'fair': ['fair credit', 'average credit'],
      'good': ['good credit', 'standard'],
      'very-good': ['very good credit', 'preferred'],
      'excellent': ['excellent credit', 'premium', 'platinum']
    };
    
    const keywords = scoreKeywords[scoreRange] || [];
    return keywords.some(keyword => cardContent.includes(keyword));
  }

  calculateSpendingMatch(cardContent, spendingCategories) {
    if (!spendingCategories.length) return 0;
    
    const matches = spendingCategories.filter(category =>
      cardContent.includes(category.toLowerCase())
    );
    
    return matches.length / spendingCategories.length;
  }

  calculateRewardsMatch(cardContent, preferredRewards) {
    if (!preferredRewards.length) return 0;
    
    const matches = preferredRewards.filter(reward =>
      cardContent.includes(reward.toLowerCase())
    );
    
    return matches.length / preferredRewards.length;
  }

  checkFeeCompatibility(cardContent, feePreference) {
    const feeKeywords = {
      'none': ['no annual fee', 'zero fee', 'free'],
      'low': ['low fee', 'minimal fee', 'affordable'],
      'moderate': ['reasonable fee', 'standard fee'],
      'high': ['premium fee', 'high fee']
    };
    
    const keywords = feeKeywords[feePreference] || [];
    return keywords.some(keyword => cardContent.includes(keyword));
  }

  // Collaborative filtering methods
  async findSimilarUsers(customerProfile) {
    // This would typically query a database of user profiles
    // For now, return mock similar users
    return [
      { userId: 'user1', similarity: 0.85 },
      { userId: 'user2', similarity: 0.78 },
      { userId: 'user3', similarity: 0.72 }
    ];
  }

  async getCardsFromSimilarUsers(similarUsers) {
    // This would query user preferences/applications
    // Return mock data for now
    return [
      { cardName: 'ICICI Platinum Card', preference: 0.9 },
      { cardName: 'ICICI Coral Card', preference: 0.8 }
    ];
  }

  filterByEligibility(cards, customerProfile) {
    // Filter cards based on basic eligibility criteria
    return cards.filter(card => {
      // Add eligibility logic here
      return true; // Simplified for now
    });
  }

  combineRecommendations(contentRecs, collaborativeRecs, customerProfile) {
    // Combine content-based and collaborative recommendations
    // Weight content-based more heavily for new users
    const contentWeight = 0.7;
    const collaborativeWeight = 0.3;
    
    // This is a simplified combination - in practice, you'd merge and re-rank
    return contentRecs;
  }

  getFallbackRecommendations(customerProfile) {
    return {
      recommendations: [
        {
          rank: 1,
          cardName: "ICICI Basic Credit Card",
          matchScore: "60%",
          whyRecommended: "Suitable for building credit history",
          keyBenefits: ["No annual fee", "Basic rewards", "Easy approval"],
          eligibilityMatch: "Good",
          feesAndCharges: "No annual fee",
          considerations: "Limited rewards program"
        }
      ],
      overallStrategy: "Start with a basic card to build credit history",
      riskAssessment: "Low risk option for credit building"
    };
  }

  storeUserInteraction(customerProfile, recommendations) {
    // Store interaction data for future collaborative filtering
    const userId = customerProfile.userId || 'anonymous';
    
    if (!this.interactionHistory.has(userId)) {
      this.interactionHistory.set(userId, []);
    }
    
    this.interactionHistory.get(userId).push({
      timestamp: new Date(),
      profile: customerProfile,
      recommendations: recommendations,
      action: 'viewed_recommendations'
    });
  }

  // Method to update user preferences based on actions
  updateUserPreferences(userId, action, cardName) {
    if (!this.userPreferences.has(userId)) {
      this.userPreferences.set(userId, {});
    }
    
    const preferences = this.userPreferences.get(userId);
    
    if (action === 'applied') {
      preferences[cardName] = (preferences[cardName] || 0) + 2;
    } else if (action === 'viewed') {
      preferences[cardName] = (preferences[cardName] || 0) + 0.5;
    }
    
    this.userPreferences.set(userId, preferences);
  }

  // A/B testing for recommendation algorithms
  async getRecommendationsWithABTest(userId, customerProfile, testGroup = 'A') {
    if (testGroup === 'A') {
      return await this.getContentBasedRecommendations(customerProfile);
    } else {
      return await this.getHybridRecommendations(userId, customerProfile);
    }
  }
}

export default EnhancedRecommendationService;