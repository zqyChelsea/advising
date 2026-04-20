import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { ChatProvider } from './contexts/ChatContext';
import MainLayout from './components/layout/MainLayout';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Tickets from './pages/Tickets';
import Resources from './pages/Resources';
import Settings from './pages/Settings';
import Login from './pages/Login';
import PDFViewer from './pages/PDFViewer';
import PRDViewer from './pages/PRDViewer';
import StudentWellnessViewer from './pages/StudentWellnessViewer';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <span className="iconify text-4xl text-[#8EB19D] animate-spin block mb-4" data-icon="solar:loading-bold"></span>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <ChatProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/chat" replace />} />
              <Route path="chat" element={<Chat />} />
              <Route path="profile" element={<Profile />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="resources" element={<Resources />} />
              <Route path="resources/student-handbook" element={<PDFViewer />} />
              <Route path="resources/wie-handbook" element={<PDFViewer pdfPath="/sao_WIEHandbook.pdf" title="WIE Handbook" />} />
              <Route path="resources/gur-guidance" element={<PDFViewer pdfPath="/GUR/Guidance_Notes_for_GUR_(For_students_admitted_from_2022-23).pdf" title="GUR Guidance Notes" />} />
              <Route path="resources/prd" element={<PRDViewer />} />
              <Route path="resources/student-wellness" element={<StudentWellnessViewer />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </ChatProvider>
      </AuthProvider>
    </DarkModeProvider>
  );
}

export default App;
