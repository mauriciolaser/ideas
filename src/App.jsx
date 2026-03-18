import { Navigate, Route, Routes } from 'react-router-dom';
import GoogleAnalytics from './components/GoogleAnalytics';
import Home from './pages/Home';
import Board from './pages/Board';
import './App.css'

function App() {
  return (
    <>
      <GoogleAnalytics />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/board/:id" element={<Board />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
