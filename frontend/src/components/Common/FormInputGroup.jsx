import React from "react";
import './Form.css';

function FormInputGroup({ label, name, type = "text", required = false, value, onChange }){
    return(
        <>
        <div className="form-group">
            <label>{label}</label>
            <input
                type={type}
                name={name}
                placeholder={label}
                required={required}
                value={value}
                onChange={onChange}
            />
        </div>
        </>
    )
};

export default FormInputGroup;