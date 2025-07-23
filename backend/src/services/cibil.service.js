import axios from 'axios';
import { ApiError } from '../utils/ApiError.js';

class CibilService {
  constructor() {
    // Mock CIBIL API configuration
    this.apiUrl = process.env.CIBIL_API_URL || 'https://api.cibil.com/v1';
    this.apiKey = process.env.CIBIL_API_KEY;
    this.mockMode = process.env.CIBIL_MOCK_MODE === 'true' || !this.apiKey;
  }

  async getCibilScore(panNumber, personalDetails = {}) {
    try {
      if (this.mockMode) {
        return this.getMockCibilScore(panNumber, personalDetails);
      }

      // Real CIBIL API implementation
      const response = await axios.post(`${this.apiUrl}/credit-score`, {
        pan: panNumber,
        name: personalDetails.fullName,
        dob: personalDetails.dob,
        mobile: personalDetails.mobile,
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      return {
        success: true,
        cibilScore: response.data.score,
        scoreRange: this.getScoreRange(response.data.score),
        factors: response.data.factors || [],
        recommendations: response.data.recommendations || [],
        lastUpdated: response.data.lastUpdated,
        reportId: response.data.reportId,
      };
    } catch (error) {
      console.error('CIBIL API Error:', error.message);
      
      // Fallback to mock if real API fails
      if (!this.mockMode) {
        console.log('Falling back to mock CIBIL score');
        return this.getMockCibilScore(panNumber, personalDetails);
      }
      
      throw new ApiError(500, 'Failed to fetch CIBIL score');
    }
  }

  getMockCibilScore(panNumber, personalDetails = {}) {
    // Generate deterministic score based on PAN
    const panSum = panNumber.split('').reduce((sum, char) => {
      return sum + (isNaN(char) ? char.charCodeAt(0) : parseInt(char));
    }, 0);
    
    // Generate score between 300-850
    const baseScore = 300 + (panSum % 551);
    
    // Add some randomness based on personal details
    let adjustedScore = baseScore;
    
    if (personalDetails.income) {
      const income = parseInt(personalDetails.income);
      if (income > 1000000) adjustedScore += 50;
      else if (income > 500000) adjustedScore += 30;
      else if (income > 300000) adjustedScore += 15;
    }
    
    if (personalDetails.employmentType === 'salaried') {
      adjustedScore += 20;
    } else if (personalDetails.employmentType === 'self-employed') {
      adjustedScore += 10;
    }
    
    // Ensure score is within valid range
    const finalScore = Math.min(850, Math.max(300, adjustedScore));
    
    return {
      success: true,
      cibilScore: finalScore,
      scoreRange: this.getScoreRange(finalScore),
      factors: this.getMockFactors(finalScore),
      recommendations: this.getMockRecommendations(finalScore),
      lastUpdated: new Date().toISOString(),
      reportId: `MOCK_${panNumber}_${Date.now()}`,
      isMock: true,
    };
  }

  getScoreRange(score) {
    if (score >= 750) return 'Excellent';
    if (score >= 700) return 'Good';
    if (score >= 650) return 'Fair';
    if (score >= 600) return 'Poor';
    return 'Very Poor';
  }

  getMockFactors(score) {
    const allFactors = [
      'Payment history',
      'Credit utilization ratio',
      'Length of credit history',
      'Types of credit accounts',
      'Recent credit inquiries',
      'Outstanding debt',
      'Credit mix',
      'Account age',
    ];

    const positiveFactors = [];
    const negativeFactors = [];

    if (score >= 750) {
      positiveFactors.push('Excellent payment history', 'Low credit utilization', 'Long credit history');
      negativeFactors.push('Recent credit inquiry');
    } else if (score >= 700) {
      positiveFactors.push('Good payment history', 'Moderate credit utilization');
      negativeFactors.push('Limited credit history', 'High credit utilization');
    } else if (score >= 650) {
      positiveFactors.push('Some positive payment history');
      negativeFactors.push('High credit utilization', 'Recent missed payments');
    } else {
      negativeFactors.push('Poor payment history', 'Very high credit utilization', 'Multiple missed payments');
    }

    return {
      positive: positiveFactors,
      negative: negativeFactors,
    };
  }

  getMockRecommendations(score) {
    if (score >= 750) {
      return [
        'Maintain your excellent credit habits',
        'Consider premium credit cards with better rewards',
        'You may qualify for the best interest rates',
      ];
    } else if (score >= 700) {
      return [
        'Keep making timely payments',
        'Try to reduce credit utilization below 30%',
        'Consider increasing credit limits',
      ];
    } else if (score >= 650) {
      return [
        'Focus on making all payments on time',
        'Reduce credit card balances',
        'Avoid applying for new credit',
      ];
    } else {
      return [
        'Make all payments on time consistently',
        'Pay down existing debt',
        'Consider secured credit cards to rebuild credit',
        'Monitor your credit report regularly',
      ];
    }
  }

  async getCreditEligibility(cibilScore, income, employmentType) {
    const eligibility = {
      creditCards: [],
      loans: [],
      overallRating: 'Poor',
    };

    if (cibilScore >= 750) {
      eligibility.overallRating = 'Excellent';
      eligibility.creditCards = [
        'Premium Credit Cards',
        'Rewards Credit Cards',
        'Travel Credit Cards',
        'Cashback Credit Cards',
      ];
      eligibility.loans = [
        'Personal Loans at best rates',
        'Home Loans at competitive rates',
        'Car Loans with minimal documentation',
      ];
    } else if (cibilScore >= 700) {
      eligibility.overallRating = 'Good';
      eligibility.creditCards = [
        'Standard Credit Cards',
        'Rewards Credit Cards',
        'Cashback Credit Cards',
      ];
      eligibility.loans = [
        'Personal Loans',
        'Home Loans',
        'Car Loans',
      ];
    } else if (cibilScore >= 650) {
      eligibility.overallRating = 'Fair';
      eligibility.creditCards = [
        'Basic Credit Cards',
        'Secured Credit Cards',
      ];
      eligibility.loans = [
        'Personal Loans with higher interest',
        'Secured Loans',
      ];
    } else {
      eligibility.overallRating = 'Poor';
      eligibility.creditCards = [
        'Secured Credit Cards',
      ];
      eligibility.loans = [
        'Secured Loans only',
      ];
    }

    return eligibility;
  }
}

export default CibilService;