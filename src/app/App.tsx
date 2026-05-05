import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate
} from 'react-router-dom';

import {
  useRef,
  useState,
  useEffect,
  lazy,
  Suspense
} from 'react';

import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import LandingPage from './components/landingPage';
import { sb } from '../utils/SBClient';

const Home = lazy(() => import('./components/dashboard/Home'));
const Live = lazy(() => import('./components/dashboard/Live'));
const Analytics = lazy(() => import('./components/dashboard/Analytics'));
const Database = lazy(() => import('./components/dashboard/Database'));

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deviceName, setDeviceName] = useState<string>('...');

  const sidebarRef = useRef<HTMLDivElement | null>(null);

  // ---------------- AUTH ----------------
  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsAuthenticated(true);
      setAuthLoading(false);
    });

    const { data: { subscription } } =
      sb.auth.onAuthStateChange((_event, session) => {
        setIsAuthenticated(!!session);
      });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = () => setIsAuthenticated(true);

  const handleLogout = async () => {
    await sb.auth.signOut();
    setIsAuthenticated(false);
    setDeviceName('...');
  };

  // ---------------- LOADING ----------------
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: 14,
        color: '#9ca3af'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>

      <Suspense fallback={<div>Loading...</div>}>

        <Routes>

          {/* PUBLIC LANDING */}
          <Route path="/" element={<LandingPage />} />

          {/* AUTH */}
          <Route
            path="/auth"
            element={
              !isAuthenticated ? (
                isSignUp ? (
                  <Signup
                    onSwitchToLogin={() => setIsSignUp(false)}
                    onSignupSuccess={handleLogin}
                  />
                ) : (
                  <Login
                    onSwitchToSignUp={() => setIsSignUp(true)}
                    onLoginSuccess={handleLogin}
                  />
                )
              ) : (
                <Navigate to="/app" />
              )
            }
          />

          {/* PROTECTED WRAPPER */}
          <Route
            path="/app"
            element={
              isAuthenticated ? (
                <div className="app">

                  {/* SIDEBAR */}
                  <div className="sidebar-container">
                    <aside ref={sidebarRef} className="sidebar">

                      <nav className="sidebar-nav">

                        <NavLink to="/app" className="nav-link">
                          <span className="material-icons">home</span>
                        </NavLink>

                        <NavLink to="/dashboard" className="nav-link">
                          <span className="material-icons">dashboard</span>
                        </NavLink>

                        <NavLink to="/analytics" className="nav-link">
                          <span className="material-icons">bar_chart</span>
                        </NavLink>

                        <NavLink to="/database" className="nav-link">
                          <span className="material-icons">storage</span>
                        </NavLink>

                        <a onClick={handleLogout} className="nav-link">
                          <span className="material-icons">logout</span>
                        </a>

                      </nav>

                    </aside>
                  </div>

                  {/* MAIN */}
                  <div className="main">
                    <div className="content">

                      <Routes>
                        <Route path="/app" element={<Home />} />
                        <Route path="/dashboard" element={<Live />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/database" element={<Database />} />
                      </Routes>

                    </div>
                  </div>

                </div>
              ) : (
                <Navigate to="/auth" />
              )
            }
          />

        </Routes>

      </Suspense>

    </BrowserRouter>
  );
}

export default App;