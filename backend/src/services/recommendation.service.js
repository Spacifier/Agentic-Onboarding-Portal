import { initializeRAGComponents } from '../config/rag.config.js';
import VectorStoreService from './vectorstore.service.js';
import { ApiError } from '../utils/ApiError.js';

class RecommendationService {
  constructor() {
    this.llm = null;
    this.vectorStoreService = new VectorStoreService();
  }

  async initialize() {
    try {
      const { llm } = await initializeRAGComponents();
      this.llm = llm;
      await this.vectorStoreService.initialize();
    } catch (error) {
      throw new ApiError(500, 'Failed to initialize recommendation service');
    }
  }

  async getRecommendations(customerProfile) {
    try {
      if (!this.llm) {
        await this.initialize();
      }

      // Create search query from customer profile
      const searchQuery = this.createSearchQuery(customerProfile);
      
      // Search for relevant credit cards
      const relevantCards = await this.vectorStoreService.searchWithScore(searchQuery, 10, 0.6);
      
      if (relevantCards.length === 0) {
        return {
          recommendations: [],
          explanation: "No suitable credit cards found based on your criteria. Please consider adjusting your requirements.",
        };
      }

      // Generate recommendations using LLM
      const recommendations = await this.generateRecommendations(customerProfile, relevantCards);
      
      return recommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw new ApiError(500, 'Failed to generate recommendations');
    }
  }

  createSearchQuery(profile) {
    const queryParts = [];
    
    if (profile.income) {
      queryParts.push(`income ${profile.income}`);
    }
    
    if (profile.employmentType) {
      queryParts.push(`employment ${profile.employmentType}`);
    }
    
    if (profile.creditScore) {
      queryParts.push(`credit score ${profile.creditScore}`);
    }
    
    if (profile.spendingCategories && profile.spendingCategories.length > 0) {
      queryParts.push(`spending ${profile.spendingCategories.join(' ')}`);
    }
    
    if (profile.preferredRewards && profile.preferredRewards.length > 0) {
      queryParts.push(`rewards ${profile.preferredRewards.join(' ')}`);
    }
    
    if (profile.desiredFeatures && profile.desiredFeatures.length > 0) {
      queryParts.push(`features ${profile.desiredFeatures.join(' ')}`);
    }
    
    if (profile.annualFeeTolerance) {
      queryParts.push(`annual fee ${profile.annualFeeTolerance}`);
    }

    return queryParts.join(' ');
  }

  async generateRecommendations(customerProfile, relevantCards) {
    const context = relevantCards.map(card => card.document.pageContent).join('\n\n');
    
    const prompt = `
You are an expert credit card advisor. Based on the customer profile and available credit cards, provide personalized recommendations.

Customer Profile:
- Income: ${customerProfile.income || 'Not specified'}
- Employment Type: ${customerProfile.employmentType || 'Not specified'}
- Credit Score Range: ${customerProfile.creditScore || 'Not specified'}
- Spending Categories: ${customerProfile.spendingCategories?.join(', ') || 'Not specified'}
- Preferred Rewards: ${customerProfile.preferredRewards?.join(', ') || 'Not specified'}
- Annual Fee Tolerance: ${customerProfile.annualFeeTolerance || 'Not specified'}
- Desired Features: ${customerProfile.desiredFeatures?.join(', ') || 'Not specified'}

Available Credit Cards Information:
${context}

Please provide:
1. Top 3 credit card recommendations ranked by suitability
2. For each recommendation, explain:
   - Why it matches the customer's profile
   - Key benefits and features
   - Eligibility requirements
   - Fees and charges
   - Potential drawbacks or considerations
3. Overall recommendation summary

Format your response as a JSON object with the following structure:
{
  "recommendations": [
    {
      "rank": 1,
      "cardName": "Card Name",
      "matchScore": "High/Medium/Low",
      "whyRecommended": "Explanation of why this card suits the customer",
      "keyBenefits": ["benefit1", "benefit2", "benefit3"],
      "eligibilityMatch": "How well customer meets eligibility",
      "feesAndCharges": "Summary of fees",
      "considerations": "Any drawbacks or things to consider"
    }
  ],
  "overallSummary": "Summary of recommendations and advice"
}
`;

    try {
      const response = await this.llm.invoke(prompt);
      
      // Parse the JSON response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const recommendations = JSON.parse(jsonMatch[0]);
        return recommendations;
      } else {
        // Fallback if JSON parsing fails
        return {
          recommendations: [],
          overallSummary: response.content,
        };
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw new ApiError(500, 'Failed to generate personalized recommendations');
    }
  }

  async explainRecommendation(cardName, customerProfile) {
    try {
      if (!this.llm) {
        await this.initialize();
      }

      // Search for specific card information
      const cardInfo = await this.vectorStoreService.searchSimilarCards(cardName, 3);
      
      if (cardInfo.length === 0) {
        throw new ApiError(404, 'Credit card information not found');
      }

      const context = cardInfo.map(doc => doc.pageContent).join('\n\n');
      
      const prompt = `
Provide a detailed explanation of why the ${cardName} credit card is or isn't suitable for this customer.

Customer Profile:
- Income: ${customerProfile.income || 'Not specified'}
- Employment Type: ${customerProfile.employmentType || 'Not specified'}
- Credit Score Range: ${customerProfile.creditScore || 'Not specified'}
- Spending Categories: ${customerProfile.spendingCategories?.join(', ') || 'Not specified'}
- Preferred Rewards: ${customerProfile.preferredRewards?.join(', ') || 'Not specified'}
- Annual Fee Tolerance: ${customerProfile.annualFeeTolerance || 'Not specified'}

Credit Card Information:
${context}

Please provide a comprehensive analysis covering:
1. Eligibility match
2. Reward structure alignment
3. Fee structure analysis
4. Feature compatibility
5. Overall suitability score (1-10)
6. Specific recommendations for this customer
`;

      const response = await this.llm.invoke(prompt);
      return {
        cardName: cardName,
        explanation: response.content,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error explaining recommendation:', error);
      throw new ApiError(500, 'Failed to explain recommendation');
    }
  }
}

export default RecommendationService;