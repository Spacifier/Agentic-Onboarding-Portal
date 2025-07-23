import React from "react";
import './Form.css';

const DocumentUploader = ({ label, name, onChange, required = false }) => (
  <div className="form-group">
    <label>
      {label}
      {required && <span style={{ color: 'red', marginLeft: '4px' }}>*</span>}
    </label>
    <input
      type="file"
      name={name}
      accept=".pdf,.jpg,.png"
      onChange={onChange}
      required={required}
      style={{
        borderColor: required ? '#ff6b6b' : '#ccc'
      }}
    />
    {required && (
      <small style={{ color: '#ff6b6b', fontSize: '0.8em' }}>
        This document is required
      </small>
    )}
  </div>
);

export default DocumentUploader;