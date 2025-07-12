import React from "react";
import './Form.css';

const DocumentUploader = ({ label, name, onChange, required = false }) => (
  <div className="form-group">
    <label>{label}</label>
    <input
      type="file"
      name={name}
      accept=".pdf,.jpg,.png"
      onChange={onChange}
      required={required}
    />
  </div>
);

export default DocumentUploader;