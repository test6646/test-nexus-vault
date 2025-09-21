import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowDown01Icon } from 'hugeicons-react';
import StoodioraLogo from '../assets/Stoodiora-logo.svg';
const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const [featuresOpen, setFeaturesOpen] = useState(false);

  const navigation = [
    { name: 'Home', href: '/' },
    { 
      name: 'Features', 
      href: '/features',
      submenu: [
        { name: 'Event Management', href: '/features/events' },
        { name: 'Client Management', href: '/features/clients' },
        { name: 'Task Management', href: '/features/tasks' },
        { name: 'Financial Tracking', href: '/features/finance' }
      ]
    },
    { name: 'Tutorials', href: '/tutorials' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Contact', href: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img src={StoodioraLogo} alt="Stoodiora" className="h-10 w-auto object-contain" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navigation.map((item) => (
                <div key={item.name} className="relative">
                  {item.submenu ? (
                    <div 
                      className="relative"
                      onMouseEnter={() => setFeaturesOpen(true)}
                      onMouseLeave={() => setFeaturesOpen(false)}
                    >
                      <button
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                          location.pathname.startsWith('/features')
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                      >
                        <span>{item.name}</span>
                        <ArrowDown01Icon className="w-4 h-4" />
                      </button>
                      
                      {featuresOpen && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-background border border-border rounded-lg shadow-lg z-50">
                          {item.submenu.map((subItem) => (
                            <Link
                              key={subItem.name}
                              to={subItem.href}
                              className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent first:rounded-t-lg last:rounded-b-lg"
                            >
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={item.href}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }`}
                    >
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="hidden md:block">
            <Link
              to="/contact"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <span className="sr-only">Open main menu</span>
              {!isOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {/* Mobile Navigation */}
{isOpen && (
  <div className="md:hidden">
    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-card border-t border-border">
      {navigation.map((item) => (
        <div key={item.name}>
          {item.submenu ? (
            <div>
              <button
                onClick={() => setFeaturesOpen(!featuresOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  location.pathname.startsWith('/features')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <span>{item.name}</span>
                <ArrowDown01Icon
                  className={`w-4 h-4 transform transition-transform ${
                    featuresOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {featuresOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.submenu.map((subItem) => (
                    <Link
                      key={subItem.name}
                      to={subItem.href}
                      className="block px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
                      onClick={() => setIsOpen(false)}
                    >
                      {subItem.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Link
              to={item.href}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
              onClick={() => setIsOpen(false)}
            >
              {item.name}
            </Link>
          )}
        </div>
      ))}

      <Link
        to="/contact"
        className="block px-3 py-2 rounded-md text-base font-medium bg-primary text-primary-foreground hover:opacity-90"
        onClick={() => setIsOpen(false)}
      >
        Get Started
      </Link>
    </div>
  </div>
)}

    </nav>
  );
};

export default Navigation;