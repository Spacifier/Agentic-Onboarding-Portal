import { Link, useNavigate } from "react-router-dom";
import "./Header.css";
import { useEffect, useState } from "react";
import feather from "feather-icons";
import {useLogin} from "../../../api/auth.jsx";

function Header(){
    const navigate = useNavigate();
    const { isLoggedIn, setIsLoggedIn } = useLogin();
    
    useEffect(() => {
        feather.replace();
    },[isLoggedIn])

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        setIsLoggedIn(false);
        navigate("/", { replace: true });
    };

    return (
        <nav className="navbar">
            <ul className="navbar_menu">
                <li className="navbar_item">
                <Link to="/dashboard" className="navbar_link">
                    <i data-feather="grid"></i>
                    <span>Dashboard</span>
                </Link>
                </li>
                <li className="navbar_item">
                <Link to="/chat" className="navbar_link">
                    <i data-feather="message-square"></i>
                    <span>Chatbot</span>
                </Link>
                </li>
                <li className="navbar_item">
                <Link to="/form" className="navbar_link">
                    <i data-feather="credit-card"></i>
                    <span>Credit Card</span>
                </Link>
                </li>
                <li className="navbar_item">
                <Link to="/account" className="navbar_link">
                    <i data-feather="user-plus"></i>
                    <span>Open Account</span>
                </Link>
                </li>
                <li className="navbar_item">
                <Link to="/loan" className="navbar_link">
                    <i data-feather="dollar-sign"></i>
                    <span>Loan</span>
                </Link>
                </li>
                {isLoggedIn ? (
                <li className="navbar_item">
                    <button onClick={handleLogout} className="navbar_link">
                        <i data-feather="log-out"></i>
                        <span>Logout</span>
                    </button>
                </li>
                ) : (
                <li className="navbar_item">
                    <Link to="/" className="navbar_link">
                        <i data-feather="log-in"></i>
                        <span>Login</span>
                    </Link>
                </li>
                )}
            </ul>
        </nav>

    );
};

export default Header;
