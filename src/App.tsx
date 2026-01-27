import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { TimeEntryProvider } from './context/TimeEntryContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Timesheet } from './pages/Timesheet';
import { MyRecords } from './pages/MyRecords';
import { Trends } from './pages/Trends';
import { Settings } from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <TimeEntryProvider>
          <BrowserRouter>
          <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/timesheet" element={<Timesheet />} />
            <Route path="/my-records" element={<MyRecords />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
            </Layout>
          </BrowserRouter>
        </TimeEntryProvider>
      </ProjectProvider>
    </AuthProvider>
  );
}

export default App;
