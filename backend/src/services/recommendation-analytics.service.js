import { ApiError } from '../utils/ApiError.js';

class RecommendationAnalyticsService {
  constructor() {
    this.userInteractions = new Map(); // Store user interaction data
    this.recommendationMetrics = new Map(); // Store recommendation performance
    this.abTestResults = new Map(); // Store A/B test results
    this.cardPerformance = new Map(); // Store card recommendation performance
  }

  // Track user interactions with recommendations
  trackUserInteraction(userId, recommendationId, interactionData) {
    const interaction = {
      userId,
      recommendationId,
      timestamp: new Date(),
      ...interactionData
    };

    if (!this.userInteractions.has(userId)) {
      this.userInteractions.set(userId, []);
    }
    
    this.userInteractions.get(userId).push(interaction);
    this.updateRecommendationMetrics(recommendationId, interactionData);
  }

  // Update recommendation performance metrics
  updateRecommendationMetrics(recommendationId, interactionData) {
    if (!this.recommendationMetrics.has(recommendationId)) {
      this.recommendationMetrics.set(recommendationId, {
        views: 0,
        clicks: 0,
        applications: 0,
        approvals: 0,
        rejections: 0,
        ctr: 0, // Click-through rate
        conversionRate: 0,
        approvalRate: 0
      });
    }

    const metrics = this.recommendationMetrics.get(recommendationId);
    
    switch (interactionData.type) {
      case 'view':
        metrics.views++;
        break;
      case 'click':
        metrics.clicks++;
        break;
      case 'application':
        metrics.applications++;
        break;
      case 'approval':
        metrics.approvals++;
        break;
      case 'rejection':
        metrics.rejections++;
        break;
    }

    // Calculate rates
    metrics.ctr = metrics.views > 0 ? (metrics.clicks / metrics.views) * 100 : 0;
    metrics.conversionRate = metrics.views > 0 ? (metrics.applications / metrics.views) * 100 : 0;
    metrics.approvalRate = metrics.applications > 0 ? (metrics.approvals / metrics.applications) * 100 : 0;

    this.recommendationMetrics.set(recommendationId, metrics);
  }

  // Track A/B test performance
  trackABTestResult(testGroup, userId, recommendationData, outcome) {
    const testKey = `${testGroup}_${new Date().toISOString().split('T')[0]}`;
    
    if (!this.abTestResults.has(testKey)) {
      this.abTestResults.set(testKey, {
        testGroup,
        date: new Date().toISOString().split('T')[0],
        totalUsers: 0,
        totalRecommendations: 0,
        totalClicks: 0,
        totalApplications: 0,
        totalApprovals: 0,
        avgSatisfactionScore: 0,
        satisfactionScores: []
      });
    }

    const testData = this.abTestResults.get(testKey);
    testData.totalUsers++;
    testData.totalRecommendations += recommendationData.recommendationCount || 0;
    
    if (outcome.clicked) testData.totalClicks++;
    if (outcome.applied) testData.totalApplications++;
    if (outcome.approved) testData.totalApprovals++;
    if (outcome.satisfactionScore) {
      testData.satisfactionScores.push(outcome.satisfactionScore);
      testData.avgSatisfactionScore = testData.satisfactionScores.reduce((a, b) => a + b, 0) / testData.satisfactionScores.length;
    }

    this.abTestResults.set(testKey, testData);
  }

  // Get recommendation performance analytics
  getRecommendationAnalytics(timeframe = '7d') {
    const analytics = {
      totalRecommendations: this.recommendationMetrics.size,
      avgCTR: 0,
      avgConversionRate: 0,
      avgApprovalRate: 0,
      topPerformingCards: [],
      lowPerformingCards: [],
      userEngagementTrends: this.getUserEngagementTrends(timeframe),
      recommendationAccuracy: this.calculateRecommendationAccuracy()
    };

    // Calculate averages
    const metrics = Array.from(this.recommendationMetrics.values());
    if (metrics.length > 0) {
      analytics.avgCTR = metrics.reduce((sum, m) => sum + m.ctr, 0) / metrics.length;
      analytics.avgConversionRate = metrics.reduce((sum, m) => sum + m.conversionRate, 0) / metrics.length;
      analytics.avgApprovalRate = metrics.reduce((sum, m) => sum + m.approvalRate, 0) / metrics.length;
    }

    // Get top and low performing cards
    const cardPerformance = Array.from(this.cardPerformance.entries())
      .map(([cardName, perf]) => ({ cardName, ...perf }))
      .sort((a, b) => b.conversionRate - a.conversionRate);

    analytics.topPerformingCards = cardPerformance.slice(0, 5);
    analytics.lowPerformingCards = cardPerformance.slice(-5);

    return analytics;
  }

  // Get A/B test results comparison
  getABTestResults() {
    const results = {};
    
    for (const [testKey, data] of this.abTestResults) {
      const [testGroup, date] = testKey.split('_');
      
      if (!results[date]) {
        results[date] = {};
      }
      
      results[date][testGroup] = {
        ...data,
        ctr: data.totalUsers > 0 ? (data.totalClicks / data.totalUsers) * 100 : 0,
        conversionRate: data.totalUsers > 0 ? (data.totalApplications / data.totalUsers) * 100 : 0,
        approvalRate: data.totalApplications > 0 ? (data.totalApprovals / data.totalApplications) * 100 : 0
      };
    }
    
    return results;
  }

  // Calculate user engagement trends
  getUserEngagementTrends(timeframe) {
    const trends = {
      dailyActiveUsers: {},
      avgSessionDuration: {},
      recommendationsPerUser: {},
      userRetention: {}
    };

    const days = parseInt(timeframe.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    for (const [userId, interactions] of this.userInteractions) {
      const recentInteractions = interactions.filter(
        interaction => new Date(interaction.timestamp) >= startDate
      );

      if (recentInteractions.length > 0) {
        const date = recentInteractions[0].timestamp.toISOString().split('T')[0];
        
        trends.dailyActiveUsers[date] = (trends.dailyActiveUsers[date] || 0) + 1;
        trends.recommendationsPerUser[userId] = recentInteractions.length;
      }
    }

    return trends;
  }

  // Calculate recommendation accuracy based on user feedback
  calculateRecommendationAccuracy() {
    let totalRecommendations = 0;
    let accurateRecommendations = 0;

    for (const [userId, interactions] of this.userInteractions) {
      const recommendationInteractions = interactions.filter(
        interaction => interaction.type === 'recommendation_feedback'
      );

      totalRecommendations += recommendationInteractions.length;
      accurateRecommendations += recommendationInteractions.filter(
        interaction => interaction.rating >= 4
      ).length;
    }

    return totalRecommendations > 0 ? (accurateRecommendations / totalRecommendations) * 100 : 0;
  }

  // Generate recommendation insights
  generateInsights() {
    const analytics = this.getRecommendationAnalytics();
    const abTestResults = this.getABTestResults();
    
    const insights = {
      performanceInsights: [],
      userBehaviorInsights: [],
      recommendationOptimizations: [],
      abTestInsights: []
    };

    // Performance insights
    if (analytics.avgCTR < 5) {
      insights.performanceInsights.push({
        type: 'low_ctr',
        message: 'Click-through rate is below 5%. Consider improving recommendation relevance.',
        severity: 'medium'
      });
    }

    if (analytics.avgConversionRate < 2) {
      insights.performanceInsights.push({
        type: 'low_conversion',
        message: 'Conversion rate is below 2%. Review recommendation quality and user experience.',
        severity: 'high'
      });
    }

    // User behavior insights
    const avgRecommendationsPerUser = Object.values(analytics.userEngagementTrends.recommendationsPerUser)
      .reduce((sum, count) => sum + count, 0) / Object.keys(analytics.userEngagementTrends.recommendationsPerUser).length;

    if (avgRecommendationsPerUser > 10) {
      insights.userBehaviorInsights.push({
        type: 'high_engagement',
        message: 'Users are highly engaged with recommendations. Consider expanding recommendation types.',
        severity: 'positive'
      });
    }

    // A/B test insights
    const latestTestResults = Object.values(abTestResults)[0];
    if (latestTestResults) {
      const bestPerformingGroup = Object.entries(latestTestResults)
        .sort(([,a], [,b]) => b.conversionRate - a.conversionRate)[0];
      
      insights.abTestInsights.push({
        type: 'best_algorithm',
        message: `Test group ${bestPerformingGroup[0]} shows ${bestPerformingGroup[1].conversionRate.toFixed(2)}% conversion rate.`,
        severity: 'positive'
      });
    }

    return insights;
  }

  // Export analytics data for external analysis
  exportAnalyticsData(format = 'json') {
    const data = {
      userInteractions: Array.from(this.userInteractions.entries()),
      recommendationMetrics: Array.from(this.recommendationMetrics.entries()),
      abTestResults: Array.from(this.abTestResults.entries()),
      cardPerformance: Array.from(this.cardPerformance.entries()),
      exportTimestamp: new Date().toISOString()
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return JSON.stringify(data, null, 2);
  }

  // Convert data to CSV format
  convertToCSV(data) {
    // Simplified CSV conversion for user interactions
    const headers = ['userId', 'recommendationId', 'timestamp', 'type', 'cardName', 'rating'];
    const rows = [];

    for (const [userId, interactions] of data.userInteractions) {
      for (const interaction of interactions) {
        rows.push([
          userId,
          interaction.recommendationId || '',
          interaction.timestamp,
          interaction.type || '',
          interaction.cardName || '',
          interaction.rating || ''
        ]);
      }
    }

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  // Real-time recommendation monitoring
  getRealtimeMetrics() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentInteractions = [];
    for (const [userId, interactions] of this.userInteractions) {
      const recent = interactions.filter(
        interaction => new Date(interaction.timestamp) >= oneHourAgo
      );
      recentInteractions.push(...recent);
    }

    return {
      activeUsers: new Set(recentInteractions.map(i => i.userId)).size,
      totalInteractions: recentInteractions.length,
      recommendationsServed: recentInteractions.filter(i => i.type === 'view').length,
      applicationsStarted: recentInteractions.filter(i => i.type === 'application').length,
      timestamp: now.toISOString()
    };
  }
}

export default RecommendationAnalyticsService;