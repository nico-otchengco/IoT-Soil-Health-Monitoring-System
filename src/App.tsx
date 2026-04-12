import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useRef, useState, useEffect, lazy, Suspense } from 'react';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { sb } from './SBClient';

const Home = lazy(() => import('./pages/Home'));
const Live = lazy(() => import('./pages/Live'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Database = lazy(() => import('./pages/Database'));

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true); 
  const [isSignUp, setIsSignUp] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deviceName, setDeviceName] = useState<string>('...');
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {

    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        fetchDevice();
      }
      setAuthLoading(false);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        fetchDevice();
      } else {
        setIsAuthenticated(false);
        setDeviceName('...');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchDevice = async () => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const deviceId = user.user_metadata?.device_id;
    if (!deviceId) return;

    const { data } = await sb
      .from('device')
      .select('name')
      .eq('id', deviceId)
      .single();

    if (data) setDeviceName(data.name);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    fetchDevice();
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setDeviceName('...');
  };

  // rest of your useEffect for sidebar unchanged...
  useEffect(() => {
    function onOpenRequest() {
      setSidebarOpen(true);
    }

    window.addEventListener('SidebarOpen', onOpenRequest as EventListener);

    function hndlOutClick(e: MouseEvent) {
      if (!sidebarRef.current) return;
      if (!sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false);
      }
    }

    if (sidebarOpen) {
      document.addEventListener('click', hndlOutClick);
    }

    return () => {
      window.removeEventListener('SidebarOpen', onOpenRequest as EventListener);
      document.removeEventListener('click', hndlOutClick);
    };
  }, [sidebarOpen]);

  if (authLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 14, color: '#9ca3af' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <>
        {isSignUp ? (
          <Signup
            onSwitchToLogin={() => setIsSignUp(false)}
            onSignupSuccess={handleLogin}
          />
        ) : (
          <Login
            onSwitchToSignUp={() => setIsSignUp(true)}
            onLoginSuccess={handleLogin}
          />
        )}
      </>
    );
  }

  return (
    <BrowserRouter>
      <div className="app">
        <div className="sidebar-container">
          <div className="sidebar-logo">
            <div className="sidebar-logo-mark" role="button" onClick={(e) => { e.stopPropagation(); setSidebarOpen((prev) => !prev); }}>
              <img src="/assets/SMARTSOIL-LOGO.png" alt="SmartSoil Logo" className='sidebar-logo-img'/>
            </div>
            <h2 className="bar-title">SMARTSOIL</h2>
          </div>
          <aside ref={sidebarRef} className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
            <nav className="sidebar-nav">
              <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' nav-link-active' : '')}>
                <span className="material-icons">home</span>
              </NavLink>
              <NavLink to="/dashboard" className={({ isActive }) => 'nav-link' + (isActive ? ' nav-link-active' : '')}>
                <span className="material-icons">dashboard</span>
              </NavLink>
              <NavLink to="/analytics" className={({ isActive }) => 'nav-link' + (isActive ? ' nav-link-active' : '')}>
                <span className="material-icons">bar_chart</span>
              </NavLink>
              <NavLink to="/database" className={({ isActive }) => 'nav-link' + (isActive ? ' nav-link-active' : '')}>
                <span className="material-icons">storage</span>
              </NavLink>
              <a onClick={handleLogout} className="nav-link logout-button" title="Logout">
                <span className="material-icons">logout</span>
              </a>
            </nav>
          </aside>
        </div>

        <div className="main">
          <div className="content">
            <div className="header">
              <div className="header-title">Real-time Soil Monitor</div>
              <div className="header-pill">{deviceName}</div>
            </div>
            <Suspense fallback={<div className="page">Loading...</div>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Live />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/database" element={<Database />} />
              </Routes>
            </Suspense>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;