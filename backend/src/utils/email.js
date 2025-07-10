import nodemailer from "nodemailer";

export const sendApplicationEmail = async (email, appNumber, appStatus, serviceTypeCode) => {
  let subject = "";
  let body = "";

  switch (serviceTypeCode) {
    case "CC":
      subject = "Credit Card Application Confirmation";
      body = `Thank you for applying for a Credit Card.`;
      break;
    case "PF":
      subject = "Personal Loan Application Confirmation";
      body = `Thank you for applying for a Personal Loan.`;
      break;
    case "BA":
      subject = "Bank Account Opening Confirmation";
      body = `Thank you for opening a new Bank Account with us.`;
      break;
    default:
      subject = "Application Confirmation";
      body = `Thank you for your application.`;
      break;
  }

  const fullBody = `
    <p>${body}</p>
    <p><strong>Application Number:</strong> ${appNumber}</p>
    <p><strong>Status:</strong> ${appStatus}</p>
    <p>We will get back to you shortly.</p>
    <p>Regards,<br/>Smart Financial Onboarding Team</p>
  `;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    cc: "Manu.Gupta@TechMahindra.com",
    subject: subject,
    html: fullBody,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent to:", email);
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
  }
};
