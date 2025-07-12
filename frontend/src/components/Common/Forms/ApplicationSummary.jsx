import React from "react";
import './Form.css';

function ApplicationSummary({ validationSummary, applicationNumber, applicationStatus }){
  if (!validationSummary?.length) return null;

  return (
    <div className="results">
      <h4>Validation Summary:</h4>
      <ul>
        {validationSummary.map((item, idx) => (
          <li key={idx}>
            <strong>{item.file}</strong> - {item.status}
          </li>
        ))}
      </ul>
      {applicationNumber && applicationStatus && (
        <div className="application-summary">
          <h4>Application Details:</h4>
          <ul>
            <p><strong>Application Number:</strong> {applicationNumber}</p>
            <p><strong>Application Status:</strong> {applicationStatus}</p>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ApplicationSummary;