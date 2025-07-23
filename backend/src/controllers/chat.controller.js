import RecommendationService from '../services/recommendation.service.js';
import CibilService from '../services/cibil.service.js';

const sessions = {};
const recommendationService = new RecommendationService();
const cibilService = new CibilService();

const getMockCibilScore = (pan) => {
    const sum = pan.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return 650 + (sum % 200); // CIBIL score between 650–850
};

const getMockProductOptions = (service, cibil) => {
    if (service === "credit_card") {
        if (cibil >= 750) {
        return [
            { label: "Platinum Credit Card", route: "/form?product=platinum-card" },
            { label: "Reward Credit Card", route: "/form?product=reward-card" },
        ];
        } else {
        return [
            { label: "Basic Credit Card", route: "/form?product=basic-card" },
        ];
        }
    }

    if (service === "loan") {
        if (cibil >= 750) {
        return [
            { label: "Personal Loan - ₹5 Lakhs @10%", route: "/loan?product=loan-5L" },
            { label: "Personal Loan - ₹3 Lakhs @11%", route: "/loan?product=loan-3L" },
        ];
        } else {
        return [
            { label: "Micro Loan - ₹1 Lakh @14%", route: "/loan?product=micro-loan" },
        ];
        }
    }

    if (service === "account") {
        return [
        { label: "Savings Account", route: "/account?product=savings" },
        { label: "Zero Balance Account", route: "/account?product=zero-balance" },
        ];
    }

    return [];
};

export const handleManualChat = async (req, res) => {
    const message = req.body.message?.trim();
    const userId = req.user?._id;
    const lowerMsg = message.toLowerCase();

    if (!sessions[userId] || lowerMsg === "restart" || lowerMsg === "hi") {
        sessions[userId] = {
        step: "init",
        service: null,
        pan: null,
        cibil: null,
        };
    }

    const session = sessions[userId];

    if (session.step === "init") {
        session.step = "awaiting_service";
        return res.json({
        reply: "Hi! I'm your Smart Financial Assistant powered by AI. I can help you with:\n\n🏦 Credit Card Recommendations (AI-powered)\n💰 Personal Loans\n📋 Account Opening\n📊 CIBIL Score Check\n\nWhat would you like to explore today?",
        });
    }

    if (session.step === "awaiting_service") {
        if (lowerMsg.includes("card") || lowerMsg.includes("credit")) {
        session.service = "credit_card";
        } else if (lowerMsg.includes("loan")) {
        session.service = "loan";
        } else if (lowerMsg.includes("account")) {
        session.service = "account";
        } else if (lowerMsg.includes("cibil") || lowerMsg.includes("credit score")) {
        session.step = "awaiting_pan_for_cibil";
        return res.json({
            reply: "I can help you check your CIBIL score instantly! Please provide your PAN number to get started.",
        });
        }

        if (session.service) {
        session.step = "awaiting_pan";
        return res.json({
            reply: `Great choice! For ${session.service.replace("_", " ")} recommendations, I'll need your PAN number to check your CIBIL score and provide personalized suggestions.`,
        });
        } else {
        return res.json({
            reply: "Please choose one of the following:\n• 'Credit Card' - for AI-powered recommendations\n• 'Loan' - for personal financing\n• 'Account' - for account opening\n• 'CIBIL' - to check your credit score",
        });
        }
    }

    if (session.step === "awaiting_pan") {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
        if (panRegex.test(message)) {
        session.pan = message.toUpperCase();
        
        try {
            // Get CIBIL score using the service
            const cibilData = await cibilService.getCibilScore(session.pan);
            session.cibil = cibilData.cibilScore;
            session.cibilData = cibilData;
            
            if (session.service === "credit_card") {
            session.step = "awaiting_preferences";
            return res.json({
                reply: `Excellent! Your CIBIL score is ${session.cibil} (${cibilData.scoreRange}). 
                
To provide you with the best credit card recommendations, please tell me about your preferences:

💰 What's your monthly income?
💳 What do you primarily spend on? (dining, shopping, travel, fuel, etc.)
🎁 What rewards do you prefer? (cashback, points, travel miles)
💸 Are you okay with annual fees?`,
            });
            } else {
            session.step = "recommend_product";
            const options = getMockProductOptions(session.service, session.cibil);
            return res.json({
                reply: `Thank you! Your CIBIL score is ${session.cibil} (${cibilData.scoreRange}). Here are your recommended ${session.service.replace("_", " ")} options:`,
                options: options,
            });
            }
        } catch (error) {
            console.error('CIBIL score error:', error);
            // Fallback to mock score
            session.cibil = getMockCibilScore(session.pan);
            session.step = "recommend_product";
            const options = getMockProductOptions(session.service, session.cibil);
            return res.json({
            reply: `Thank you! Your estimated CIBIL score is ${session.cibil}. Here are your recommended ${session.service.replace("_", " ")} options:`,
            options: options,
            });
        }
        } else {
        return res.json({
            reply: "❌ That doesn't seem to be a valid PAN. Please re-enter your PAN number (e.g., ABCDE1234F).",
        });
        }
    }

    if (session.step === "awaiting_pan_for_cibil") {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
        if (panRegex.test(message)) {
        try {
            const cibilData = await cibilService.getCibilScore(message.toUpperCase());
            const eligibility = await cibilService.getCreditEligibility(
            cibilData.cibilScore,
            null,
            null
            );
            
            return res.json({
            reply: `🎯 Your CIBIL Score: ${cibilData.cibilScore} (${cibilData.scoreRange})

📊 Score Analysis:
${cibilData.factors.positive?.map(f => `✅ ${f}`).join('\n') || ''}
${cibilData.factors.negative?.map(f => `❌ ${f}`).join('\n') || ''}

💡 Recommendations:
${cibilData.recommendations.map(r => `• ${r}`).join('\n')}

🏦 You're eligible for: ${eligibility.creditCards.join(', ')}

Would you like personalized credit card recommendations based on this score?`,
            });
        } catch (error) {
            return res.json({
            reply: "Sorry, I couldn't fetch your CIBIL score right now. Please try again later or contact support.",
            });
        }
        } else {
        return res.json({
            reply: "❌ Please enter a valid PAN number (format: ABCDE1234F).",
        });
        }
    }

    if (session.step === "awaiting_preferences") {
        // Parse user preferences from natural language
        const preferences = {
        income: null,
        spendingCategories: [],
        preferredRewards: [],
        annualFeeTolerance: null,
        };

        // Extract income
        const incomeMatch = message.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:k|thousand|lakh|lakhs?|crore|crores?)?/i);
        if (incomeMatch) {
        let income = parseFloat(incomeMatch[1].replace(/,/g, ''));
        if (message.toLowerCase().includes('lakh')) income *= 100000;
        if (message.toLowerCase().includes('crore')) income *= 10000000;
        if (message.toLowerCase().includes('k') || message.toLowerCase().includes('thousand')) income *= 1000;
        preferences.income = income;
        }

        // Extract spending categories
        const spendingKeywords = ['dining', 'shopping', 'travel', 'fuel', 'grocery', 'online', 'entertainment'];
        preferences.spendingCategories = spendingKeywords.filter(keyword => 
        lowerMsg.includes(keyword)
        );

        // Extract reward preferences
        if (lowerMsg.includes('cashback')) preferences.preferredRewards.push('cashback');
        if (lowerMsg.includes('points')) preferences.preferredRewards.push('points');
        if (lowerMsg.includes('miles') || lowerMsg.includes('travel')) preferences.preferredRewards.push('travel miles');

        // Extract fee tolerance
        if (lowerMsg.includes('no fee') || lowerMsg.includes('free')) {
        preferences.annualFeeTolerance = 'none';
        } else if (lowerMsg.includes('low fee')) {
        preferences.annualFeeTolerance = 'low';
        } else if (lowerMsg.includes('okay') || lowerMsg.includes('fine')) {
        preferences.annualFeeTolerance = 'moderate';
        }

        session.preferences = preferences;
        session.step = "generating_ai_recommendations";

        try {
        // Get AI-powered recommendations
        const customerProfile = {
            cibilScore: session.cibil,
            income: preferences.income,
            age: 30, // Default age
            spendingCategories: preferences.spendingCategories,
            preferredRewards: preferences.preferredRewards,
            annualFeeTolerance: preferences.annualFeeTolerance,
            desiredFeatures: [],
        };

        const recommendations = await recommendationService.getRecommendations(customerProfile);
        
        if (recommendations.recommendations && recommendations.recommendations.length > 0) {
            let reply = `🎯 Based on your profile, here are my AI-powered recommendations:\n\n`;
            
            recommendations.recommendations.forEach((rec, index) => {
            reply += `${index + 1}. **${rec.cardName}** (${rec.matchScore} Match)\n`;
            reply += `   ${rec.whyRecommended}\n`;
            reply += `   Key Benefits: ${rec.keyBenefits?.slice(0, 2).join(', ')}\n\n`;
            });
            
            reply += `💡 ${recommendations.overallSummary}\n\n`;
            reply += `Would you like to apply for any of these cards or need more details?`;
            
            return res.json({ reply });
        } else {
            return res.json({
            reply: "I couldn't find suitable recommendations right now. Please try again or contact our support team.",
            });
        }
        } catch (error) {
        console.error('AI recommendation error:', error);
        return res.json({
            reply: "I'm having trouble generating personalized recommendations right now. Let me show you some popular options based on your CIBIL score instead.",
            options: getMockProductOptions("credit_card", session.cibil),
        });
        }
    }

    if (session.step === "recommend_product") {
        return res.json({
        reply: "Please click one of the options above to apply.",
        });
    }

    return res.json({
        reply: "I'm not sure how to help with that. Please type 'credit card', 'loan', 'account', or 'cibil score' to get started.",
    });
};