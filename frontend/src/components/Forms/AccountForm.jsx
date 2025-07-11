import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import FormInputGroup from '../Common/FormInputGroup.jsx'
import DocumentUploader from "../Common/DocumentUploader";
import ApplicationSummary from "../Common/ApplicationSummary";

const AccountForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedProduct = searchParams.get("product");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    dob: "",
    occupation: "",
    salary: "",
    aadhaarNumber: "",
    panNumber: "",
    passportNumber: "",
    voterIdNumber: "",
    address: "",
    country: "",
  });

  const [documents, setDocuments] = useState({
    aadhaar: null,
    pan: null,
    passport: null,
    voterId: null,
    payslip: null,
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
    Object.values(documents).forEach((file) => {
      if (file) uploadForm.append("documents", file);
    });

    const randomAppNumber = Math.floor(100000 + Math.random() * 900000);
    const appNumber = `BA-${randomAppNumber}`;
    uploadForm.append("applicationNumber", appNumber);

    Object.entries(formData).forEach(([key, val]) => {
      if (key === "aadhaarNumber") uploadForm.append("aadharNumber", val);
      else uploadForm.append(key, val);
    });

    try {
      const response = await axios.post("https://agentic-onboarding-backend.onrender.com/api/upload-docs", uploadForm, {
        headers: { "Content-Type": "multipart/form-data" },
      });

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
        <h2>Bank Account Opening Form</h2>
        {selectedProduct && <p>Selected Product: <strong>{selectedProduct}</strong></p>}

        <div className="form-row">
          <FormInputGroup label="Full Name" name="fullName" required value={formData.fullName} onChange={handleChange} />
          <FormInputGroup label="Email" name="email" type="email" required value={formData.email} onChange={handleChange} />
          <FormInputGroup label="Mobile Number" name="mobile" required value={formData.mobile} onChange={handleChange} />
        </div>

        <div className="form-row">
          <FormInputGroup label="DOB" name="dob" type="date" required value={formData.dob} onChange={handleChange} />
          <FormInputGroup label="Occupation" name="occupation" value={formData.occupation} onChange={handleChange} />
          <FormInputGroup label="Salary" name="salary" type="number" value={formData.salary} onChange={handleChange} />
        </div>

        <div className="form-row">
          <FormInputGroup label="Aadhaar Number" name="aadhaarNumber" required value={formData.aadhaarNumber} onChange={handleChange} />
          <FormInputGroup label="PAN Number" name="panNumber" required value={formData.panNumber} onChange={handleChange} />
          <FormInputGroup label="Passport Number" name="passportNumber" value={formData.passportNumber} onChange={handleChange} />
        </div>

        <div className="form-row">
          <FormInputGroup label="Voter ID Number" name="voterIdNumber" value={formData.voterIdNumber} onChange={handleChange} />
          <FormInputGroup label="Address" name="address" value={formData.address} onChange={handleChange} />
          <FormInputGroup label="Country" name="country" value={formData.country} onChange={handleChange} />
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

export default AccountForm;
