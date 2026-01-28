import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { TimeEntryProvider } from './context/TimeEntryContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Timesheet } from './pages/Timesheet';
import { MyRecords } from './pages/MyRecords';
import { Trends } from './pages/Trends';
import { Settings } from './pages/Settings';
import { AdminUsers } from './pages/AdminUsers';
import { NotionTest } from './pages/NotionTest';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProjectProvider>
          <TimeEntryProvider>
            <BrowserRouter>
            <Layout>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/timesheet" element={<ProtectedRoute><Timesheet /></ProtectedRoute>} />
              <Route path="/my-records" element={<ProtectedRoute><MyRecords /></ProtectedRoute>} />
              <Route path="/trends" element={<ProtectedRoute><Trends /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
              <Route path="/notion-test" element={<ProtectedRoute><NotionTest /></ProtectedRoute>} />
            </Routes>
              </Layout>
            </BrowserRouter>
          </TimeEntryProvider>
        </ProjectProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
