import React from "react";
import './Form.css';

function FormInputGroup({ label, name, type = "text", required = false, value, onChange }){
    const isRequired = required;
    
    return(
        <>
        <div className="form-group">
            <label>
                {label}
                {isRequired && <span style={{ color: 'red', marginLeft: '4px' }}>*</span>}
            </label>
            <input
                type={type}
                name={name}
                placeholder={label}
                required={isRequired}
                value={value}
                onChange={onChange}
                style={{
                    borderColor: isRequired && !value ? '#ff6b6b' : '#ccc'
                }}
            />
            {isRequired && !value && (
                <small style={{ color: '#ff6b6b', fontSize: '0.8em' }}>
                    This field is required
                </small>
            )}
        </div>
        </>
    )
};

export default FormInputGroup;