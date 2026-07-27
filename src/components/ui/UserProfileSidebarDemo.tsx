import {
  Truck,
  Star,
  Home,
  Eye,
  Settings,
  LogOut
} from 'lucide-react';
import { UserProfileSidebar } from './UserProfileSidebar';

export default function UserProfileSidebarDemo() {
  const user = {
    name: 'Emma Yella',
    email: 'emma@sspharmacy.com',
    avatarUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0'
  };

  const navItems = [
    {
      label: 'My orders',
      href: '/account',
      icon: <Truck className="h-full w-full" />
    },
    {
      label: 'Ayurvedic Reviews',
      href: '/why-choose-us',
      icon: <Star className="h-full w-full" />
    },
    {
      label: 'Delivery addresses',
      href: '/account',
      icon: <Home className="h-full w-full" />
    },
    {
      label: 'Recently viewed',
      href: '/products',
      icon: <Eye className="h-full w-full" />
    },
    {
      label: 'Settings',
      href: '/account',
      icon: <Settings className="h-full w-full" />,
      isSeparator: true
    }
  ];

  const logoutItem = {
    label: 'Log out',
    icon: <LogOut className="h-full w-full" />,
    onClick: () => alert('Signing out of S.S. Pharmacy...')
  };

  return (
    <div className="flex min-h-[480px] w-full items-center justify-center bg-[#FEFDF8] p-6">
      <UserProfileSidebar user={user} navItems={navItems} logoutItem={logoutItem} />
    </div>
  );
}
