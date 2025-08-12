
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { cn } from '@/lib/utils';

import { 
  ChartIcon,
  UserGroupIcon,
  CheckListIcon,
  File01Icon,
  Calendar01Icon,
  DollarCircleIcon,
  TableIcon,
  DashboardSquare01Icon,
  MoneyBag02Icon,
  UserIcon
} from 'hugeicons-react';





const adminNavigationItems = [
  { name: 'Clients', href: '/clients', icon: UserGroupIcon, roles: ['Admin'] },
  { name: 'Quotations', href: '/quotations', icon: File01Icon, roles: ['Admin'] },
  { name: 'Events', href: '/events', icon: Calendar01Icon, roles: ['Admin'] },
  { name: 'Tasks', href: '/tasks', icon: CheckListIcon, roles: ['Admin'] },
  { name: 'Freelancers', href: '/freelancers', icon: UserIcon, roles: ['Admin'] },
  { name: 'Salary', href: '/salary', icon: MoneyBag02Icon, roles: ['Admin'] },
  { name: 'Expenses', href: '/expenses', icon: DollarCircleIcon, roles: ['Admin'] },
  { name: 'Finance', href: '/finance', icon: ChartIcon, roles: ['Admin'] },
  
  { name: 'Overview', href: '/overview', icon: TableIcon, roles: ['Admin'] },
];

const staffNavigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: DashboardSquare01Icon, roles: ['Photographer', 'Cinematographer', 'Editor'] },
  { name: 'Tasks', href: '/tasks', icon: CheckListIcon, roles: ['Photographer', 'Cinematographer', 'Editor'] },
];

const MobileFloatingDock = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  

  const navigation = profile?.role === 'Admin' 
    ? adminNavigationItems.filter(item => item.roles.includes(profile.role))
    : staffNavigationItems.filter(item => profile && item.roles.includes(profile.role));

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  return (
    <>
      <div className="fixed bottom-2 left-1 right-1 z-[9999] lg:hidden flex justify-center transform-gpu will-change-transform pointer-events-none">
        <div className="pointer-events-auto">
        {profile?.role === 'Admin' ? (
          /* Admin Navigation - Fully rounded */
          <div className="relative backdrop-blur-3xl bg-card/95 border-2 border-border/70 rounded-full shadow-2xl overflow-hidden">
            {/* Gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>
            
            {/* Navigation container */}
            <div
              className="relative flex items-center justify-between p-1.5 gap-0.5"
            >
              {navigation.map((item, index) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        "relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 group shrink-0 active:transform-none",
                        active 
                          ? "text-primary-foreground bg-primary shadow-lg shadow-primary/30" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    
                    {/* Enhanced tooltip */}
                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-popover/95 backdrop-blur-sm text-popover-foreground text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-border/40 shadow-xl scale-95 group-hover:scale-100">
                      {item.name}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-l-transparent border-r-transparent border-t-popover/95"></div>
                    </div>
                  </button>
                );
              })}
              
            </div>
          </div>
        ) : (
          /* Staff Navigation - Fully rounded capsule style */
          <div className="relative backdrop-blur-3xl bg-card/95 border-2 border-border/70 rounded-full shadow-2xl overflow-hidden">
            {/* Gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>
            
            {/* Capsule navigation */}
            <div className="relative flex items-center px-2 py-1.5">
              {navigation.map((item, index) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.href)}
                    className={cn(
                      "relative flex items-center justify-center flex-1 h-10 px-4 transition-all duration-300 group rounded-full active:transform-none",
                      active
                        ? "text-primary-foreground bg-primary shadow-lg shadow-primary/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5 mr-1" strokeWidth={2} />
                    <span className="font-medium text-sm">{item.name}</span>
                    
                    {/* Enhanced tooltip */}
                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-popover/95 backdrop-blur-sm text-popover-foreground text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-border/40 shadow-xl scale-95 group-hover:scale-100">
                      {item.name}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-l-transparent border-r-transparent border-t-popover/95"></div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default MobileFloatingDock;
