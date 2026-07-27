import * as React from 'react';
import { ChevronRight } from 'lucide-react';

export interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  isSeparator?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
}

export interface UserProfileSidebarProps {
  user: UserProfile;
  navItems: NavItem[];
  logoutItem: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const UserProfileSidebar = React.forwardRef<HTMLDivElement, UserProfileSidebarProps>(
  ({ user, navItems, logoutItem, className = '' }, ref) => {
    return (
      <aside
        ref={ref}
        className={`user-profile-sidebar-card ${className}`}
        aria-label="User Profile Navigation Menu"
      >
        {/* User Profile Header */}
        <div className="user-sidebar-header">
          <img
            src={user.avatarUrl}
            alt={`${user.name}'s profile avatar`}
            className="user-sidebar-avatar"
            loading="lazy"
            decoding="async"
          />
          <div className="user-sidebar-info">
            <span className="user-sidebar-name">{user.name}</span>
            <span className="user-sidebar-email">{user.email}</span>
          </div>
        </div>

        <div className="user-sidebar-divider" />

        {/* Navigation Links */}
        <nav className="user-sidebar-nav" role="navigation">
          {navItems.map((item, index) => (
            <React.Fragment key={index}>
              {item.isSeparator && <div className="user-sidebar-spacer" />}
              <a
                href={item.href}
                onClick={item.onClick}
                className="user-sidebar-item group"
              >
                <span className="user-sidebar-icon">{item.icon}</span>
                <span className="user-sidebar-label">{item.label}</span>
                <ChevronRight className="user-sidebar-arrow" size={16} />
              </a>
            </React.Fragment>
          ))}
        </nav>

        {/* Logout Action */}
        <div className="user-sidebar-footer">
          <button
            type="button"
            onClick={logoutItem.onClick}
            className="user-sidebar-logout-btn"
          >
            <span className="user-sidebar-icon">{logoutItem.icon}</span>
            <span>{logoutItem.label}</span>
          </button>
        </div>
      </aside>
    );
  }
);

UserProfileSidebar.displayName = 'UserProfileSidebar';
