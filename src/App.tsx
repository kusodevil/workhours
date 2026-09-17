import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider, useUser } from './context/UserContext';
import { ProjectProvider } from './context/ProjectContext';
import { TimeEntryProvider } from './context/TimeEntryContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Timesheet } from './pages/Timesheet';
import { MyRecords } from './pages/MyRecords';
import { Trends } from './pages/Trends';
import { Settings } from './pages/Settings';

/** 等本機個人檔案載入完再渲染頁面，避免頁面在 loading 前後 hooks 數量不一致 */
function Ready({ children }: { children: React.ReactNode }) {
  const { isLoading } = useUser();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <ProjectProvider>
          <TimeEntryProvider>
            <BrowserRouter>
              <Layout>
                <Ready>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/timesheet" element={<Timesheet />} />
                    <Route path="/my-records" element={<MyRecords />} />
                    <Route path="/trends" element={<Trends />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Ready>
              </Layout>
            </BrowserRouter>
          </TimeEntryProvider>
        </ProjectProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
