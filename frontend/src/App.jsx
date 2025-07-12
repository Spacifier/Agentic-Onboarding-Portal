import {Routes,Route} from 'react-router-dom'
import Layout from './Layout.jsx'
import AuthPage from './components/AuthPage/AuthPage.jsx'
import ChatPage from './components/ChatPage/ChatPage.jsx'
import CreditCardForm from './components/Forms/CreditCardForm.jsx'
import PersonalFinancingForm from './components/Forms/PersonalFinanceForm.jsx'
import AccountForm from './components/Forms/AccountForm.jsx'
import Dashboard from './components/Dashboard/Dashboard.jsx'
import ProtectedRoute from './components/Common/ProtectedRoute.jsx'


function App() {
  return (
    <main className='relative min-h-screen'>
        <Routes>
            <Route path='/' element ={<Layout />}>
                {/* Public Route */}
                <Route index element={<AuthPage />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                    <Route path='/chat' element={<ChatPage />} />
                    <Route path='/form' element={<CreditCardForm />} />
                    <Route path='/loan' element={<PersonalFinancingForm />} />
                    <Route path='/account' element={<AccountForm />} />
                    <Route path='/dashboard' element={<Dashboard />} />
                </Route>
            </Route>
        </Routes>
    </main>
  )
}

export default App
