import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AuthPage.css"; 

function AuthPage(){
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [form, setForm] = useState({
        fullname: "",
        username: "",   
        email: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const toggleForm = () => {
        setIsLogin(!isLogin);
        setForm({ fullname: "", username: "", email: "", password: "" });
        setError("");
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

    const endpoint = isLogin ? "/api/v1/users/login" : "/api/v1/users/register";
    const payload = isLogin
      ? { email: form.email, password: form.password }
      : form;

    try {
      const res = await fetch(`http://localhost:7000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const {data,message} = await res.json();

      if (!res.ok) throw new Error(message || "Something went wrong"); 

      if (isLogin) {
        localStorage.setItem("accessToken", data.accessToken);
        navigate("/chat");
      } else {
        alert("Account created successfully. Please login.");
        toggleForm();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

return (
    <div className="auth-container">
        <div className="form-wrapper">
            <form onSubmit={handleSubmit} className="auth-form">
                <h2>{isLogin ? "Login" : "Sign Up"}</h2>
                {!isLogin && (
                    <>
                        <input
                        name="fullname"
                        placeholder="Full Name"
                        value={form.fullname}
                        onChange={handleChange}
                        required
                        />
                        <input
                        name="username"
                        placeholder="Username"
                        value={form.username}
                        onChange={handleChange}
                        required
                        />
                    </>
                )}
                <input
                    name="email"
                    placeholder="Email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                />
                <input
                    name="password"
                    placeholder="Password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                />
                {error && <p className="error-msg">{error}</p>}
                <button type="submit" disabled={loading}>
                    {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
                </button>
                <p>
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                    <span className="link" onClick={toggleForm}>
                        {isLogin ? "Sign Up" : "Login"}
                    </span>
                </p>
            </form>
        </div>
    </div>
  );
};

export default AuthPage;
