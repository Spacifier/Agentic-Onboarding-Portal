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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setDocuments((prev) => ({ ...prev, [name]: files[0] }));
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
          <FormInputGroup label="Salary" name="salary" type="number" value={formData.salary} onChange={handleChange} />
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
