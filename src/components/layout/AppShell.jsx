import React from 'react';
import { SideNav } from './SideNav';

export function AppShell({ children }) {
  return (
    <main className="app-shell">
      <SideNav />
      {children}
    </main>
  );
}
