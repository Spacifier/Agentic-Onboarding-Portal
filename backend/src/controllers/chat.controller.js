const sessions = {};

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

export const handleManualChat = (req, res) => {
  const message = req.body.message?.trim();
  const userId = req.user?._id;
  const lowerMsg = message.toLowerCase();

  if (!sessions[userId]) {
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
      reply: "Hi! How can I assist you today? I can help with Credit Cards, Loans, or Account Opening.",
    });
  }

  if (session.step === "awaiting_service") {
    if (lowerMsg.includes("card")) {
      session.service = "credit_card";
    } else if (lowerMsg.includes("loan")) {
      session.service = "loan";
    } else if (lowerMsg.includes("account")) {
      session.service = "account";
    }

    if (session.service) {
      session.step = "awaiting_pan";
      return res.json({
        reply: `Great! To proceed with your ${session.service.replace("_", " ")}, please provide your PAN number.`,
      });
    } else {
      return res.json({
        reply: "Sorry, I didn't get that. Please specify if you are looking for a Credit Card, Loan, or Account Opening.",
      });
    }
  }

  if (session.step === "awaiting_pan") {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
    if (panRegex.test(message)) {
      session.pan = message.toUpperCase();
      session.cibil = getMockCibilScore(session.pan);
      session.step = "recommend_product";

      const options = getMockProductOptions(session.service, session.cibil);
      return res.json({
        reply: `Thank you! Your CIBIL score is ${session.cibil}. Based on your profile, here are our recommended ${session.service.replace("_", " ")} options:`,
        options: options,
      });
    } else {
      return res.json({
        reply: "That doesn't seem to be a valid PAN. Please re-enter your PAN number (e.g., ABCDE1234F).",
      });
    }
  }

  if (session.step === "recommend_product") {
    return res.json({
      reply: "Please click one of the options above to apply.",
    });
  }

  return res.json({
    reply: "I'm not sure how to help. Please say 'card', 'loan', or 'account'.",
  });
};
