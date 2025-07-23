import { initializeRAGComponents } from '../config/rag.config.js';
import VectorStoreService from './vectorstore.service.js';
import CibilService from './cibil.service.js';
import { ApiError } from '../utils/ApiError.js';

class AdvancedRecommendationService {
  constructor() {
    this.llm = null;
    this.vectorStoreService = new VectorStoreService();
    this.cibilService = new CibilService();
    this.userProfiles = new Map(); // Store user interaction history
    this.cardFeatures = new Map(); // Store card feature vectors
    this.similarityMatrix = new Map(); // Store card-to-card similarity
  }

  async initialize() {
    try {
      const { llm } = await initializeRAGComponents();
      this.llm = llm;
      await this.vectorStoreService.initialize();
      await this.buildCardFeatureMatrix();
    } catch (error) {
      throw new ApiError(500, 'Failed to initialize advanced recommendation service');
    }
  }

  // Content-Based Filtering inspired by product recommendation systems
  async getContentBasedRecommendations(customerProfile) {
    try {
      if (!this.llm) {
        await this.initialize();
      }

      // Extract customer feature vector
      const customerVector = this.extractCustomerFeatures(customerProfile);
      
      // Calculate similarity with all credit cards
      const cardSimilarities = await this.calculateCardSimilarities(customerVector);
      
      // Get top matching cards
      const topCards = cardSimilarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10);

      // Generate detailed recommendations
      const recommendations = await this.generateDetailedRecommendations(
        customerProfile, 
        topCards
      );
      
      return recommendations;
    } catch (error) {
      console.error('Error in content-based recommendations:', error);
      throw new ApiError(500, 'Failed to generate content-based recommendations');
    }
  }

  // Collaborative Filtering approach
  async getCollaborativeRecommendations(userId, customerProfile) {
    try {
      // Find users with similar profiles
      const similarUsers = await this.findSimilarUsers(customerProfile);
      
      // Get cards preferred by similar users
      const collaborativeCards = this.getCardsFromSimilarUsers(similarUsers);
      
      // Filter by customer eligibility
      const eligibleCards = this.filterByEligibility(collaborativeCards, customerProfile);
      
      return eligibleCards.slice(0, 5);
    } catch (error) {
      console.error('Error in collaborative filtering:', error);
      return [];
    }
  }

  // Hybrid Recommendation System
  async getHybridRecommendations(userId, customerProfile) {
    try {
      // Get content-based recommendations (70% weight)
      const contentRecs = await this.getContentBasedRecommendations(customerProfile);
      
      // Get collaborative recommendations (30% weight)
      const collaborativeRecs = await this.getCollaborativeRecommendations(userId, customerProfile);
      
      // Combine recommendations with weighted scoring
      const hybridRecs = this.combineRecommendations(
        contentRecs, 
        collaborativeRecs, 
        { contentWeight: 0.7, collaborativeWeight: 0.3 }
      );
      
      return hybridRecs;
    } catch (error) {
      console.error('Error in hybrid recommendations:', error);
      return await this.getContentBasedRecommendations(customerProfile);
    }
  }

  // Build feature matrix for all credit cards
  async buildCardFeatureMatrix() {
    try {
      // Get all indexed cards from vector store
      const allCards = await this.vectorStoreService.searchSimilarCards('credit card', 100);
      
      for (const card of allCards) {
        const features = this.extractCardFeatures(card);
        this.cardFeatures.set(card.metadata.cardName, features);
      }
      
      // Build similarity matrix between cards
      await this.buildCardSimilarityMatrix();
    } catch (error) {
      console.error('Error building card feature matrix:', error);
    }
  }

  // Extract numerical features from customer profile
  extractCustomerFeatures(profile) {
    const features = {
      // Demographic features
      income: this.normalizeIncome(profile.income || 0),
      age: this.normalizeAge(profile.age || 30),
      creditScore: this.normalizeCreditScore(profile.creditScore || 650),
      
      // Behavioral features
      spendingDining: this.hasSpendingCategory(profile.spendingCategories, 'dining'),
      spendingShopping: this.hasSpendingCategory(profile.spendingCategories, 'shopping'),
      spendingTravel: this.hasSpendingCategory(profile.spendingCategories, 'travel'),
      spendingFuel: this.hasSpendingCategory(profile.spendingCategories, 'fuel'),
      spendingGrocery: this.hasSpendingCategory(profile.spendingCategories, 'grocery'),
      
      // Preference features
      prefersCashback: this.hasRewardPreference(profile.preferredRewards, 'cashback'),
      prefersPoints: this.hasRewardPreference(profile.preferredRewards, 'points'),
      prefersTravel: this.hasRewardPreference(profile.preferredRewards, 'travel'),
      
      // Fee tolerance
      feeToleranceScore: this.normalizeFeePreference(profile.annualFeeTolerance),
      
      // Employment type
      isSalaried: profile.employmentType === 'salaried' ? 1 : 0,
      isSelfEmployed: profile.employmentType === 'self-employed' ? 1 : 0,
    };
    
    return features;
  }

  // Extract features from credit card content
  extractCardFeatures(card) {
    const content = card.pageContent.toLowerCase();
    const metadata = card.metadata || {};
    
    const features = {
      // Card tier features
      isBasic: this.hasKeyword(content, ['basic', 'starter', 'entry']),
      isGold: this.hasKeyword(content, ['gold', 'premium']),
      isPlatinum: this.hasKeyword(content, ['platinum', 'exclusive']),
      
      // Reward features
      hasCashback: this.hasKeyword(content, ['cashback', 'cash back']),
      hasPoints: this.hasKeyword(content, ['points', 'reward points']),
      hasTravelRewards: this.hasKeyword(content, ['travel', 'miles', 'airline']),
      
      // Category rewards
      diningRewards: this.hasKeyword(content, ['dining', 'restaurant', 'food']),
      shoppingRewards: this.hasKeyword(content, ['shopping', 'retail', 'online']),
      fuelRewards: this.hasKeyword(content, ['fuel', 'petrol', 'gas']),
      travelRewards: this.hasKeyword(content, ['travel', 'hotel', 'flight']),
      
      // Fee structure
      hasAnnualFee: this.hasKeyword(content, ['annual fee', 'yearly fee']),
      noAnnualFee: this.hasKeyword(content, ['no annual fee', 'zero fee', 'free']),
      
      // Income requirements
      lowIncomeReq: this.hasKeyword(content, ['minimum income', 'low income', '25000', '30000']),
      mediumIncomeReq: this.hasKeyword(content, ['50000', '75000', '1 lakh']),
      highIncomeReq: this.hasKeyword(content, ['5 lakh', '10 lakh', 'high income']),
      
      // Special features
      hasLounge: this.hasKeyword(content, ['lounge', 'airport lounge']),
      hasInsurance: this.hasKeyword(content, ['insurance', 'protection']),
      hasWelcomeBonus: this.hasKeyword(content, ['welcome', 'joining bonus']),
    };
    
    return features;
  }

  // Calculate cosine similarity between customer and cards
  async calculateCardSimilarities(customerVector) {
    const similarities = [];
    
    for (const [cardName, cardFeatures] of this.cardFeatures) {
      const similarity = this.cosineSimilarity(customerVector, cardFeatures);
      similarities.push({
        cardName,
        similarity,
        features: cardFeatures
      });
    }
    
    return similarities;
  }

  // Cosine similarity calculation
  cosineSimilarity(vectorA, vectorB) {
    const keysA = Object.keys(vectorA);
    const keysB = Object.keys(vectorB);
    const commonKeys = keysA.filter(key => keysB.includes(key));
    
    if (commonKeys.length === 0) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (const key of commonKeys) {
      const valueA = vectorA[key] || 0;
      const valueB = vectorB[key] || 0;
      
      dotProduct += valueA * valueB;
      normA += valueA * valueA;
      normB += valueB * valueB;
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Generate detailed recommendations with explanations
  async generateDetailedRecommendations(customerProfile, topCards) {
    const cardDetails = await Promise.all(
      topCards.map(async (card) => {
        const cardInfo = await this.vectorStoreService.searchSimilarCards(card.cardName, 1);
        return {
          ...card,
          content: cardInfo[0]?.pageContent || '',
          metadata: cardInfo[0]?.metadata || {}
        };
      })
    );

    const prompt = `
You are an expert financial advisor with deep knowledge of credit cards and customer profiling. 
Analyze the customer profile and provide personalized credit card recommendations.

Customer Profile:
- Income: ₹${customerProfile.income || 'Not specified'} annually
- Credit Score: ${customerProfile.creditScore || 'Not specified'}
- Age: ${customerProfile.age || 'Not specified'}
- Employment: ${customerProfile.employmentType || 'Not specified'}
- Spending Categories: ${customerProfile.spendingCategories?.join(', ') || 'Not specified'}
- Preferred Rewards: ${customerProfile.preferredRewards?.join(', ') || 'Not specified'}
- Fee Tolerance: ${customerProfile.annualFeeTolerance || 'Not specified'}

Top Matching Credit Cards (with similarity scores):
${cardDetails.map((card, index) => `
${index + 1}. ${card.cardName} (Similarity: ${(card.similarity * 100).toFixed(1)}%)
${card.content}
`).join('\n')}

Provide recommendations in this JSON format:
{
  "recommendations": [
    {
      "rank": 1,
      "cardName": "Card Name",
      "matchScore": "95%",
      "similarityScore": ${topCards[0]?.similarity || 0},
      "whyRecommended": "Detailed explanation based on customer profile and similarity analysis",
      "keyBenefits": ["benefit1", "benefit2", "benefit3"],
      "rewardStructure": "Detailed reward structure explanation",
      "eligibilityAssessment": "Assessment of customer's eligibility",
      "feesAndCharges": "Complete fee structure",
      "expectedValue": "Estimated annual value/savings",
      "riskFactors": ["risk1", "risk2"],
      "alternativeOptions": "Other cards to consider",
      "applicationStrategy": "Best approach for application"
    }
  ],
  "portfolioStrategy": "Overall credit card portfolio strategy",
  "marketComparison": "How these recommendations compare to market alternatives",
  "futureConsiderations": "Cards to consider as profile evolves"
}
`;

    try {
      const response = await this.llm.invoke(prompt);
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const recommendations = JSON.parse(jsonMatch[0]);
        
        // Add similarity scores to recommendations
        recommendations.recommendations = recommendations.recommendations.map((rec, index) => ({
          ...rec,
          algorithmicScore: topCards[index]?.similarity || 0,
          recommendationSource: 'content-based-filtering'
        }));
        
        return recommendations;
      } else {
        return this.getFallbackRecommendations(customerProfile);
      }
    } catch (error) {
      console.error('Error generating detailed recommendations:', error);
      return this.getFallbackRecommendations(customerProfile);
    }
  }

  // Build similarity matrix between cards (for collaborative filtering)
  async buildCardSimilarityMatrix() {
    const cardNames = Array.from(this.cardFeatures.keys());
    
    for (let i = 0; i < cardNames.length; i++) {
      for (let j = i + 1; j < cardNames.length; j++) {
        const cardA = cardNames[i];
        const cardB = cardNames[j];
        
        const featuresA = this.cardFeatures.get(cardA);
        const featuresB = this.cardFeatures.get(cardB);
        
        const similarity = this.cosineSimilarity(featuresA, featuresB);
        
        this.similarityMatrix.set(`${cardA}-${cardB}`, similarity);
        this.similarityMatrix.set(`${cardB}-${cardA}`, similarity);
      }
    }
  }

  // Find similar users based on profile characteristics
  async findSimilarUsers(customerProfile) {
    // In a real implementation, this would query a user database
    // For now, return mock similar users based on profile characteristics
    const mockUsers = [
      {
        userId: 'user1',
        profile: { income: 500000, creditScore: 720, spendingCategories: ['dining', 'shopping'] },
        similarity: 0.85
      },
      {
        userId: 'user2', 
        profile: { income: 450000, creditScore: 700, spendingCategories: ['travel', 'dining'] },
        similarity: 0.78
      }
    ];
    
    return mockUsers;
  }

  // Get cards preferred by similar users
  getCardsFromSimilarUsers(similarUsers) {
    // Mock implementation - in reality, this would query user application/preference data
    return [
      { cardName: 'ICICI Platinum Card', userRating: 4.5, applicationCount: 15 },
      { cardName: 'ICICI Coral Card', userRating: 4.2, applicationCount: 12 },
      { cardName: 'ICICI Rubyx Card', userRating: 4.0, applicationCount: 8 }
    ];
  }

  // Filter cards by customer eligibility
  filterByEligibility(cards, customerProfile) {
    return cards.filter(card => {
      // Basic eligibility checks
      const minIncome = this.getMinIncomeRequirement(card.cardName);
      const minCreditScore = this.getMinCreditScore(card.cardName);
      
      const incomeEligible = !customerProfile.income || customerProfile.income >= minIncome;
      const creditEligible = !customerProfile.creditScore || customerProfile.creditScore >= minCreditScore;
      
      return incomeEligible && creditEligible;
    });
  }

  // Combine content-based and collaborative recommendations
  combineRecommendations(contentRecs, collaborativeRecs, weights) {
    // Weighted combination of recommendations
    const combinedRecs = { ...contentRecs };
    
    if (collaborativeRecs.length > 0) {
      // Adjust scores based on collaborative data
      combinedRecs.recommendations = combinedRecs.recommendations.map(rec => ({
        ...rec,
        hybridScore: (rec.algorithmicScore * weights.contentWeight) + 
                    (this.getCollaborativeScore(rec.cardName, collaborativeRecs) * weights.collaborativeWeight),
        recommendationSource: 'hybrid-filtering'
      }));
    }
    
    return combinedRecs;
  }

  // Utility methods
  normalizeIncome(income) {
    return Math.min(income / 2000000, 1); // Normalize to 0-1 scale
  }

  normalizeAge(age) {
    return Math.min((age - 18) / 47, 1); // Age 18-65 normalized to 0-1
  }

  normalizeCreditScore(score) {
    return Math.min((score - 300) / 550, 1); // Score 300-850 normalized to 0-1
  }

  normalizeFeePreference(preference) {
    const feeMap = { 'none': 0, 'low': 0.3, 'moderate': 0.6, 'high': 1 };
    return feeMap[preference] || 0.5;
  }

  hasSpendingCategory(categories, category) {
    return categories?.includes(category) ? 1 : 0;
  }

  hasRewardPreference(rewards, reward) {
    return rewards?.includes(reward) ? 1 : 0;
  }

  hasKeyword(content, keywords) {
    return keywords.some(keyword => content.includes(keyword)) ? 1 : 0;
  }

  getMinIncomeRequirement(cardName) {
    // Mock implementation - in reality, this would be from card database
    const incomeReqs = {
      'ICICI Platinum Card': 500000,
      'ICICI Gold Card': 300000,
      'ICICI Basic Card': 200000
    };
    return incomeReqs[cardName] || 250000;
  }

  getMinCreditScore(cardName) {
    // Mock implementation
    const scoreReqs = {
      'ICICI Platinum Card': 750,
      'ICICI Gold Card': 700,
      'ICICI Basic Card': 650
    };
    return scoreReqs[cardName] || 650;
  }

  getCollaborativeScore(cardName, collaborativeRecs) {
    const card = collaborativeRecs.find(c => c.cardName === cardName);
    return card ? (card.userRating / 5) : 0;
  }

  getFallbackRecommendations(customerProfile) {
    return {
      recommendations: [
        {
          rank: 1,
          cardName: "ICICI Basic Credit Card",
          matchScore: "70%",
          whyRecommended: "Suitable starter card based on available information",
          keyBenefits: ["No annual fee", "Basic rewards", "Easy approval"],
          eligibilityAssessment: "Good match for your profile",
          feesAndCharges: "No annual fee for first year",
          recommendationSource: 'fallback'
        }
      ],
      portfolioStrategy: "Start with a basic card to establish credit history",
      marketComparison: "Competitive option among entry-level cards"
    };
  }

  // Method to update user interaction data (for collaborative filtering)
  updateUserInteraction(userId, cardName, interactionType, rating = null) {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, { interactions: [], preferences: {} });
    }
    
    const userProfile = this.userProfiles.get(userId);
    userProfile.interactions.push({
      cardName,
      interactionType, // 'viewed', 'applied', 'approved', 'rejected'
      rating,
      timestamp: new Date()
    });
    
    // Update preferences based on interaction
    if (interactionType === 'applied' || interactionType === 'approved') {
      userProfile.preferences[cardName] = (userProfile.preferences[cardName] || 0) + 1;
    }
  }

  // A/B Testing for different recommendation algorithms
  async getRecommendationsWithABTest(userId, customerProfile, testGroup = 'A') {
    const testGroups = {
      'A': () => this.getContentBasedRecommendations(customerProfile),
      'B': () => this.getHybridRecommendations(userId, customerProfile),
      'C': () => this.getCollaborativeRecommendations(userId, customerProfile)
    };
    
    const recommendationMethod = testGroups[testGroup] || testGroups['A'];
    const recommendations = await recommendationMethod();
    
    // Log A/B test data
    console.log(`A/B Test - Group: ${testGroup}, User: ${userId}, Recommendations: ${recommendations.recommendations?.length || 0}`);
    
    return {
      ...recommendations,
      testGroup,
      timestamp: new Date().toISOString()
    };
  }
}

export default AdvancedRecommendationService;