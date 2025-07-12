import { Link, useNavigate } from "react-router-dom";

function Dashboard(){
    const username = JSON.parse(localStorage.getItem("user"))?.fullname || "User";

    return (
        <div className="max-w-4xl mx-auto mt-8 p-6 bg-white shadow rounded">
            <h2 className="text-2xl font-semibold mb-4">Welcome, {username} 👋</h2>
            <p className="mb-6 text-gray-600">Choose a service to get started:</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link to="/chat" className="bg-blue-100 p-4 rounded hover:bg-blue-200">💬 Chat with Assistant</Link>
                <Link to="/form" className="bg-green-100 p-4 rounded hover:bg-green-200">💳 Apply for Credit Card</Link>
                <Link to="/loan" className="bg-yellow-100 p-4 rounded hover:bg-yellow-200">📄 Personal Loan</Link>
                <Link to="/account" className="bg-indigo-100 p-4 rounded hover:bg-indigo-200">🏦 Open Bank Account</Link>
            </div>
        </div>
    );
}

export default Dashboard