import { Link, useLocation } from 'react-router-dom';
import { Activity, LayoutDashboard, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    { name: '测量', path: '/measure', icon: Activity },
    { name: '体态评估', path: '/posture', icon: LayoutDashboard },
    { name: '语音病例', path: '/voice', icon: FileText },
    { name: '报告', path: '/report', icon: FileText },
  ];

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center group transition-transform hover:scale-105">
              <div className="bg-gradient-to-br from-blue-600 to-violet-600 p-1.5 rounded-xl shadow-blue-200 shadow-lg group-hover:bg-blue-700 transition-colors">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <span className="ml-2.5 text-xl font-bold tracking-tight text-gray-900">Vision<span className="text-blue-600">3</span></span>
            </Link>
            <div className="hidden sm:ml-10 sm:flex sm:space-x-4">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'inline-flex items-center px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-300 relative group',
                      isActive
                        ? 'text-blue-600 bg-blue-50/80 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 mr-2 transition-transform group-hover:scale-110", isActive ? "text-blue-600" : "text-gray-400 group-hover:text-blue-500")} />
                    {item.name}
                    {isActive && (
                      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-colors">
              <Settings className="h-5 w-5" />
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-600 to-violet-600 border-2 border-white shadow-md shadow-blue-100" />
          </div>
        </div>
      </div>
    </nav>
  );
}
