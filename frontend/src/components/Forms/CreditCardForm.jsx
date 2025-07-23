import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import FormInputGroup from "../Common/Forms/FormInputGroup.jsx";
import DocumentUploader from "../Common/Forms/DocumentUploader";
import ApplicationSummary from "../Common/Forms/ApplicationSummary";

const CreditCardForm = () => {
  const [searchParams] = useSearchParams();
  const selectedProduct = searchParams.get("product");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    aadhaarNumber: "",
    panNumber: "",
    passportNumber: "",
    voterIdNumber: "",
    dob: "",
    salary: "",
  });

  const [documents, setDocuments] = useState({
    aadhaar: null,
    pan: null,
    passport: null,
    voterId: null,
    payslip: null,
    bankStatement: null,
  });

  const [statusMessage, setStatusMessage] = useState("");
  const [validationSummary, setValidationSummary] = useState([]);
  const [applicationNumber, setApplicationNumber] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [showRAGRecommendations, setShowRAGRecommendations] = useState(false);
  const [ragRecommendations, setRAGRecommendations] = useState(null);
  const [cibilScore, setCibilScore] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setDocuments((prev) => ({ ...prev, [name]: files[0] }));
  };

  const getRAGRecommendations = async () => {
    if (!formData.panNumber || !formData.salary) {
      alert("Please fill PAN number and salary to get AI recommendations");
      return;
    }

    setLoadingRecommendations(true);
    const token = localStorage.getItem("accessToken");

    try {
      const response = await axios.post(
        "https://agentic-onboarding-backend.onrender.com/api/v1/rag/recommendations",
        {
          panNumber: formData.panNumber,
          income: parseInt(formData.salary),
          employmentType: "salaried", // You can add this field to form
          spendingCategories: ["shopping", "dining"], // You can add this field to form
          preferredRewards: ["cashback", "points"], // You can add this field to form
          annualFeeTolerance: "moderate", // You can add this field to form
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setRAGRecommendations(response.data.data.recommendations);
      setCibilScore(response.data.data.cibilData);
      setShowRAGRecommendations(true);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      alert("Failed to get AI recommendations. Please try again.");
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage("Processing your application...");

    const uploadForm = new FormData();
    const token = localStorage.getItem("accessToken");
    const appNumber = `CC-${Math.floor(100000 + Math.random() * 900000)}`;
    uploadForm.append("applicationNumber", appNumber);
    uploadForm.append("serviceType", "credit_card");

    Object.entries(formData).forEach(([key, val]) => {
      if (key === "aadhaarNumber") uploadForm.append("aadharNumber", val);
      else if (key === "voterIdNumber") uploadForm.append("voterId", val);
      else uploadForm.append(key, val);
    });

    Object.entries(documents).forEach(([key, file]) => {
      if (file) uploadForm.append(key, file);
    });

    try {
      const response = await axios.post(
        "https://agentic-onboarding-backend.onrender.com/api/v1/application/upload-docs",
        uploadForm,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setStatusMessage("Document processing success.");
      setValidationSummary(response.data.validationResults || []);

      const failed = response.data.validationResults?.some((item) =>
        item.status.toLowerCase().includes("fail")
      );
      const status = failed ? "Rejected ❌" : "Approved ✅";
      setApplicationNumber(appNumber);
      setApplicationStatus(status);
    } catch (error) {
      console.error("Error uploading documents:", error);
      setStatusMessage("Failed to process documents.");
    }
  };

  return (
    <div className="credit-form">
      {!showRAGRecommendations && (
        <div className="rag-section" style={{ marginBottom: "2rem", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
          <h3 style={{ color: "#1e4eb2", marginBottom: "1rem" }}>🤖 Get AI-Powered Credit Card Recommendations</h3>
          <p style={{ marginBottom: "1rem", color: "#666" }}>
            Get personalized credit card recommendations based on your profile and CIBIL score using our advanced AI system.
          </p>
          <button 
            type="button" 
            onClick={getRAGRecommendations}
            disabled={loadingRecommendations}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#1e4eb2",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: loadingRecommendations ? "not-allowed" : "pointer",
              opacity: loadingRecommendations ? 0.7 : 1,
            }}
          >
            {loadingRecommendations ? "Getting Recommendations..." : "Get AI Recommendations"}
          </button>
        </div>
      )}

      {showRAGRecommendations && ragRecommendations && (
        <div className="rag-recommendations" style={{ marginBottom: "2rem", padding: "1rem", backgroundColor: "#e8f4fd", borderRadius: "8px" }}>
          <h3 style={{ color: "#1e4eb2", marginBottom: "1rem" }}>🎯 AI-Powered Recommendations</h3>
          
          {cibilScore && (
            <div style={{ marginBottom: "1rem", padding: "0.5rem", backgroundColor: "white", borderRadius: "4px" }}>
              <strong>Your CIBIL Score: {cibilScore.cibilScore} ({cibilScore.scoreRange})</strong>
              {cibilScore.isMock && <span style={{ color: "#666", fontSize: "0.9em" }}> (Simulated)</span>}
            </div>
          )}

          {ragRecommendations.recommendations?.map((rec, index) => (
            <div key={index} style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "white", borderRadius: "6px", border: "1px solid #ddd" }}>
              <h4 style={{ color: "#1e4eb2", marginBottom: "0.5rem" }}>
                {index + 1}. {rec.cardName} 
                <span style={{ 
                  marginLeft: "0.5rem", 
                  padding: "0.2rem 0.5rem", 
                  backgroundColor: rec.matchScore === 'High' ? '#28a745' : rec.matchScore === 'Medium' ? '#ffc107' : '#6c757d',
                  color: 'white',
                  borderRadius: "4px",
                  fontSize: "0.8em"
                }}>
                  {rec.matchScore} Match
                </span>
              </h4>
              <p style={{ marginBottom: "0.5rem" }}><strong>Why Recommended:</strong> {rec.whyRecommended}</p>
              <p style={{ marginBottom: "0.5rem" }}><strong>Key Benefits:</strong> {rec.keyBenefits?.join(", ")}</p>
              <p style={{ marginBottom: "0.5rem" }}><strong>Eligibility:</strong> {rec.eligibilityMatch}</p>
              <p style={{ marginBottom: "0.5rem" }}><strong>Fees:</strong> {rec.feesAndCharges}</p>
              {rec.considerations && (
                <p style={{ color: "#856404", fontSize: "0.9em" }}><strong>Considerations:</strong> {rec.considerations}</p>
              )}
            </div>
          ))}

          {ragRecommendations.overallSummary && (
            <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#fff3cd", borderRadius: "6px" }}>
              <strong>Overall Summary:</strong> {ragRecommendations.overallSummary}
            </div>
          )}

          <button 
            type="button" 
            onClick={() => setShowRAGRecommendations(false)}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Continue with Application
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <h2>Credit Card Application Form</h2>
        {selectedProduct && <p>Selected Product: <strong>{selectedProduct}</strong></p>}

        <div className="form-row">
          <FormInputGroup label="Full Name" name="fullName" required value={formData.fullName} onChange={handleChange} />
          <FormInputGroup label="Email" name="email" type="email" required value={formData.email} onChange={handleChange} />
          <FormInputGroup label="DOB" name="dob" type="date" required value={formData.dob} onChange={handleChange} />
        </div>

        <div className="form-row">
          <FormInputGroup label="Aadhaar Number" name="aadhaarNumber" required value={formData.aadhaarNumber} onChange={handleChange} />
          <FormInputGroup label="PAN Number" name="panNumber" required value={formData.panNumber} onChange={handleChange} />
          <FormInputGroup label="Passport Number" name="passportNumber" value={formData.passportNumber} onChange={handleChange} />
        </div>

        <div className="form-row">
          <FormInputGroup label="Voter ID Number" name="voterIdNumber" value={formData.voterIdNumber} onChange={handleChange} />
          <FormInputGroup label="Monthly Salary" name="salary" type="number" required value={formData.salary} onChange={handleChange} />
        </div>

        <h3>Upload Documents</h3>
        <div className="form-row">
          <DocumentUploader label="Aadhaar (PDF/JPG/PNG)" name="aadhaar" onChange={handleFileChange} required />
          <DocumentUploader label="PAN (PDF/JPG/PNG)" name="pan" onChange={handleFileChange} required />
          <DocumentUploader label="Passport (PDF/JPG/PNG)" name="passport" onChange={handleFileChange} />
        </div>

        <div className="form-row">
          <DocumentUploader label="Voter ID (PDF/JPG/PNG)" name="voterId" onChange={handleFileChange} />
          <DocumentUploader label="Payslip (PDF/JPG/PNG)" name="payslip" onChange={handleFileChange} />
          <DocumentUploader label="Bank Statement (PDF/JPG/PNG)" name="bankStatement" onChange={handleFileChange} />
        </div>

        <button type="submit">Submit</button>
      </form>

      {statusMessage && <p style={{ marginTop: "1rem" }}>{statusMessage}</p>}

      <ApplicationSummary
        validationSummary={validationSummary}
        applicationNumber={applicationNumber}
        applicationStatus={applicationStatus}
      />
    </div>
  );
};

export default CreditCardForm;
