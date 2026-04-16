import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Menu, X, PawPrint, LogOut, LayoutDashboard } from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const scrollToSection = (id) => {
    setMobileOpen(false);
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: id } });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const dashboardPath = user?.role === 'doctor' ? '/doctor-dashboard' : '/dashboard';

  return (
    <nav className="nav-glass fixed top-0 left-0 right-0 z-50" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
            <PawPrint className="h-7 w-7 text-[#E07A5F] transition-transform duration-300 group-hover:rotate-12" />
            <span className="text-xl font-bold text-[#1E392A] tracking-tight" style={{ fontFamily: 'Outfit' }}>
              VetCare
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('hero')} className="text-[#4A5568] hover:text-[#1E392A] text-sm font-medium transition-colors" data-testid="nav-home">Home</button>
            <button onClick={() => scrollToSection('doctors')} className="text-[#4A5568] hover:text-[#1E392A] text-sm font-medium transition-colors" data-testid="nav-doctors">Doctors</button>
            <button onClick={() => scrollToSection('about')} className="text-[#4A5568] hover:text-[#1E392A] text-sm font-medium transition-colors" data-testid="nav-about">About</button>
            <button onClick={() => scrollToSection('contact')} className="text-[#4A5568] hover:text-[#1E392A] text-sm font-medium transition-colors" data-testid="nav-contact">Contact</button>
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <NotificationBell />
                <Link to={dashboardPath}>
                  <Button variant="ghost" className="text-[#1E392A] gap-2" data-testid="nav-dashboard-btn">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Button onClick={handleLogout} variant="outline" className="gap-2 rounded-xl border-[#E2E8F0]" data-testid="nav-logout-btn">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-[#1E392A] rounded-xl" data-testid="nav-login-btn">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-[#E07A5F] hover:bg-[#D56A4F] text-white rounded-xl" data-testid="nav-register-btn">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} data-testid="nav-mobile-toggle">
            {mobileOpen ? <X className="h-6 w-6 text-[#1E392A]" /> : <Menu className="h-6 w-6 text-[#1E392A]" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-[#E2E8F0]">
            <div className="flex flex-col gap-3">
              <button onClick={() => scrollToSection('hero')} className="text-left py-2 text-[#4A5568] hover:text-[#1E392A]" data-testid="nav-mobile-home">Home</button>
              <button onClick={() => scrollToSection('doctors')} className="text-left py-2 text-[#4A5568] hover:text-[#1E392A]" data-testid="nav-mobile-doctors">Doctors</button>
              <button onClick={() => scrollToSection('about')} className="text-left py-2 text-[#4A5568] hover:text-[#1E392A]" data-testid="nav-mobile-about">About</button>
              <button onClick={() => scrollToSection('contact')} className="text-left py-2 text-[#4A5568] hover:text-[#1E392A]" data-testid="nav-mobile-contact">Contact</button>
              <div className="border-t border-[#E2E8F0] pt-3 flex flex-col gap-2">
                {user ? (
                  <>
                    <Link to={dashboardPath} onClick={() => setMobileOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2" data-testid="nav-mobile-dashboard">
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </Button>
                    </Link>
                    <Button onClick={handleLogout} variant="outline" className="w-full justify-start gap-2" data-testid="nav-mobile-logout">
                      <LogOut className="h-4 w-4" /> Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="ghost" className="w-full" data-testid="nav-mobile-login">Sign In</Button>
                    </Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)}>
                      <Button className="w-full bg-[#E07A5F] hover:bg-[#D56A4F] text-white" data-testid="nav-mobile-register">Get Started</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
