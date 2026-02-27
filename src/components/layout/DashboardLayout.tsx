// import { useState, useEffect } from 'react';
// import { Link, useLocation } from 'react-router-dom';
// import { useAuth } from '@/contexts/AuthContext';
// import { useStore } from '@/contexts/StoreContext';
// import { Button } from '@/components/ui/button';
// import logo from '@/assets/logo.webp';
// import {
//   Package,
//   Store,
//   TrendingUp,
//   ShoppingBag,
//   Users,
//   Settings,
//   LogOut,
//   FileText,
//   ChevronDown,
//   Check,
//   Menu,
//   X,
//   Wallet,
// } from 'lucide-react';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu';
// import NotificationBell from '@/components/layout/NotificationBell';

// interface DashboardLayoutProps {
//   children: React.ReactNode;
// }

// const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
//   const { user, logout, isAdmin } = useAuth();
//   const { stores, selectedStore, selectStoreById, loading: storesLoading } = useStore();
//   const location = useLocation();
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);

//   // Close sidebar when route changes on mobile
//   useEffect(() => {
//     setIsSidebarOpen(false);
//   }, [location.pathname]);

//   // Prevent scroll when sidebar is open on mobile
//   useEffect(() => {
//     if (isSidebarOpen) {
//       document.body.style.overflow = 'hidden';
//     } else {
//       document.body.style.overflow = '';
//     }
//   }, [isSidebarOpen]);

//   // Determine which nav item is active based on current route
//   const isActiveRoute = (path: string) => {
//     return location.pathname === path || location.pathname.startsWith(path + '/');
//   };

//   return (
//     <div className="min-h-screen bg-background">
//       {/* Mobile Header */}
//       <header className="lg:hidden flex items-center justify-between p-4 border-b bg-card sticky top-0 z-40">
//         <Link to="/" className="flex items-center space-x-2">
//           <img src={logo} alt="ShelfMerch" className="h-6 w-auto" />
//         </Link>
//         <div className="flex items-center gap-2">
//           <NotificationBell tooltipSide="bottom" />
//           <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
//             <Menu className="h-6 w-6" />
//           </Button>
//         </div>
//       </header>

//       {/* Backdrop for mobile */}
//       {isSidebarOpen && (
//         <div
//           className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
//           onClick={() => setIsSidebarOpen(false)}
//         />
//       )}

//       {/* Sidebar */}
//       <aside className={`fixed left-0 top-0 h-full w-64 border-r bg-card p-6 z-50 transition-transform duration-300 transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:block shadow-xl lg:shadow-none`}>
//         <div className="flex items-center justify-between mb-4">
//           <Link to="/" className="flex items-center space-x-2">
//             <img src={logo} alt="ShelfMerch" className="h-8 w-auto" />
//           </Link>
//           <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
//             <X className="h-5 w-5" />
//           </Button>
//         </div>

//         {/* Store Switcher in sidebar */}
//         <div className="pb-4 mb-4 border-b">
//           {storesLoading ? (
//             <p className="text-xs text-muted-foreground">Loading stores...</p>
//           ) : stores.length > 0 ? (
//             <DropdownMenu>
//               <DropdownMenuTrigger asChild>
//                 <Button variant="ghost" className="w-full justify-between px-2 py-2">
//                   <div className="flex items-center gap-2">
//                     <Store className="h-4 w-4" />
//                     <div className="text-left">
//                       <p className="font-medium text-sm truncate max-w-[120px]">
//                         {selectedStore?.storeName || 'Select Store'}
//                       </p>
//                       {selectedStore && (
//                         <p className="text-xs text-muted-foreground truncate max-w-[120px]">
//                           {selectedStore.subdomain}.shelfmerch.com
//                         </p>
//                       )}
//                     </div>
//                   </div>
//                   <ChevronDown className="h-4 w-4" />
//                 </Button>
//               </DropdownMenuTrigger>
//               <DropdownMenuContent align="start" className="w-64">
//                 <DropdownMenuLabel>Switch Store</DropdownMenuLabel>
//                 <DropdownMenuSeparator />
//                 {stores.map((store) => {
//                   const isSelected =
//                     selectedStore &&
//                     ((selectedStore.id === store.id || selectedStore._id === store._id) ||
//                       (selectedStore.id === store._id || selectedStore._id === store.id));

//                   return (
//                     <DropdownMenuItem
//                       key={store.id || store._id}
//                       onClick={() => {
//                         selectStoreById(store.id || store._id || '');
//                         setIsSidebarOpen(false);
//                       }}
//                       className="flex items-center justify-between cursor-pointer"
//                     >
//                       <div className="flex flex-col">
//                         <span className="font-medium">{store.storeName}</span>
//                         <span className="text-xs text-muted-foreground">
//                           {store.subdomain}.shelfmerch.com
//                         </span>
//                       </div>
//                       {isSelected && <Check className="h-4 w-4" />}
//                     </DropdownMenuItem>
//                   );
//                 })}
//                 <DropdownMenuSeparator />
//                 <DropdownMenuItem asChild>
//                   <Link to="/stores" className="cursor-pointer">
//                     <Store className="h-4 w-4 mr-2" />
//                     Manage Stores
//                   </Link>
//                 </DropdownMenuItem>
//               </DropdownMenuContent>
//             </DropdownMenu>
//           ) : (
//             <p className="text-xs text-muted-foreground">
//               No stores yet. <Link to="/stores" className="underline">Create one</Link>.
//             </p>
//           )}
//         </div>

//         <nav className="space-y-2 overflow-y-auto max-h-[calc(100vh-250px)] pb-4">
//           <Button
//             variant={isActiveRoute('/dashboard') ? 'secondary' : 'ghost'}
//             className="w-full justify-start"
//             asChild
//           >
//             <Link to="/dashboard">
//               <Package className="mr-2 h-4 w-4" />
//               My Products
//             </Link>
//           </Button>
//           <Button
//             variant={isActiveRoute('/orders') ? 'secondary' : 'ghost'}
//             className="w-full justify-start"
//             asChild
//           >
//             <Link to="/orders">
//               <ShoppingBag className="mr-2 h-4 w-4" />
//               Orders
//             </Link>
//           </Button>
//           <Button
//             variant={isActiveRoute('/wallet') ? 'secondary' : 'ghost'}
//             className="w-full justify-start"
//             asChild
//           >
//             <Link to="/wallet">
//               <Wallet className="mr-2 h-4 w-4" />
//               Wallet
//             </Link>
//           </Button>
//           <Button
//             variant={isActiveRoute('/invoices') ? 'secondary' : 'ghost'}
//             className="w-full justify-start"
//             asChild
//           >
//             <Link to="/invoices">
//               <FileText className="mr-2 h-4 w-4" />
//               Invoices
//             </Link>
//           </Button>
//           <Button
//             variant={isActiveRoute('/customers') ? 'secondary' : 'ghost'}
//             className="w-full justify-start"
//             asChild
//           >
//             <Link to="/customers">
//               <Users className="mr-2 h-4 w-4" />
//               Customers
//             </Link>
//           </Button>
//           <Button
//             variant={isActiveRoute('/analytics') ? 'secondary' : 'ghost'}
//             className="w-full justify-start"
//             asChild
//           >
//             <Link to="/analytics">
//               <TrendingUp className="mr-2 h-4 w-4" />
//               Analytics
//             </Link>
//           </Button>
//           {isAdmin && (
//             <Button
//               variant={isActiveRoute('/admin') ? 'secondary' : 'ghost'}
//               className="w-full justify-start"
//               asChild
//             >
//               <Link to="/admin">
//                 <Users className="mr-2 h-4 w-4" />
//                 Admin Panel
//               </Link>
//             </Button>
//           )}
//           <Button
//             variant={isActiveRoute('/settings') ? 'secondary' : 'ghost'}
//             className="w-full justify-start"
//             asChild
//           >
//             <Link to="/settings">
//               <Settings className="mr-2 h-4 w-4" />
//               Settings
//             </Link>
//           </Button>
//         </nav>

//         <div className="absolute bottom-6 left-6 right-6">
//           <div className="border-t pt-4 space-y-2">
//             <div className="flex items-center justify-between">
//               <p className="text-sm text-muted-foreground">Signed in as</p>
//               <NotificationBell tooltipSide="top" />
//             </div>
//             <p className="text-sm font-medium truncate">{user?.email}</p>
//             <Button
//               variant="ghost"
//               className="w-full justify-start text-destructive hover:text-destructive"
//               onClick={logout}
//             >
//               <LogOut className="mr-2 h-4 w-4" />
//               Log out
//             </Button>
//           </div>
//         </div>
//       </aside>

//       {/* Main Content */}
//       <main className="lg:ml-64 p-4 md:p-8">
//         {children}
//       </main>
//     </div>
//   );
// };

// export default DashboardLayout;


import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { storeApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.webp';
import type { Store as StoreType } from '@/types';
import {
  Package,
  Store,
  TrendingUp,
  ShoppingBag,
  Users,
  Settings,
  LogOut,
  FileText,
  ChevronDown,
  Check,
  Menu,
  X,
  Wallet,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotificationBell from '@/components/layout/NotificationBell';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const { selectedStore, selectStoreById, stores, loading: storesLoading } = useStore();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Prevent scroll when sidebar is open on mobile
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isSidebarOpen]);

  const isActiveRoute = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Use selectedStore from context directly
  // If we have stores but no selectedStore, fallback to the first one (though context handles this too)
  const activeStore = selectedStore || (stores.length > 0 ? stores[0] : null);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 border-b bg-card sticky top-0 z-40">
        <Link to="/" className="flex items-center space-x-2">
          <img src={logo} alt="ShelfMerch" className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell tooltipSide="bottom" />
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </header>

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 border-r bg-card p-6 z-50 transition-transform duration-300 transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:block shadow-xl lg:shadow-none`}>
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="flex items-center space-x-2">
            <img src={logo} alt="ShelfMerch" className="h-8 w-auto" />
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Store Switcher */}
        <div className="pb-4 mb-4 border-b">
          {storesLoading ? (
            <p className="text-xs text-muted-foreground">Loading stores...</p>
          ) : stores.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-2 py-2">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    <div className="text-left">
                      <p className="font-medium text-sm truncate max-w-[120px]">
                        {activeStore?.storeName || 'Select Store'}
                      </p>
                      {activeStore && (
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {activeStore.subdomain}.shelfmerch.com
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Switch Store</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {stores.map((store) => {
                  const isSelected =
                    activeStore &&
                    (activeStore.id === store.id ||
                      activeStore._id === store._id ||
                      activeStore.id === store._id ||
                      activeStore._id === store.id);

                  return (
                    <DropdownMenuItem
                      key={store.id || store._id}
                      onClick={() => {
                        selectStoreById(store.id || store._id || '');
                        setIsSidebarOpen(false);
                      }}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{store.storeName}</span>
                        <span className="text-xs text-muted-foreground">
                          {store.subdomain}.shelfmerch.com
                        </span>
                      </div>
                      {isSelected && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/stores" className="cursor-pointer">
                    <Store className="h-4 w-4 mr-2" />
                    Manage Stores
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <p className="text-xs text-muted-foreground">
              No stores yet. <Link to="/stores" className="underline">Create one</Link>.
            </p>
          )}
        </div>

        <nav className="space-y-2 overflow-y-auto max-h-[calc(100vh-250px)] pb-4">
          <Button variant={isActiveRoute('/dashboard') ? 'secondary' : 'ghost'} className="w-full justify-start" asChild>
            <Link to="/dashboard"><Package className="mr-2 h-4 w-4" />My Products</Link>
          </Button>
          <Button variant={isActiveRoute('/orders') ? 'secondary' : 'ghost'} className="w-full justify-start" asChild>
            <Link to="/orders"><ShoppingBag className="mr-2 h-4 w-4" />Orders</Link>
          </Button>
          <Button variant={isActiveRoute('/wallet') ? 'secondary' : 'ghost'} className="w-full justify-start" asChild>
            <Link to="/wallet"><Wallet className="mr-2 h-4 w-4" />Wallet</Link>
          </Button>
          {/* <Button variant={isActiveRoute('/invoices') ? 'secondary' : 'ghost'} className="w-full justify-start" asChild>
            <Link to="/invoices"><FileText className="mr-2 h-4 w-4" />Invoices</Link>
          </Button> */}
          <Button variant={isActiveRoute('/customers') ? 'secondary' : 'ghost'} className="w-full justify-start" asChild>
            <Link to="/customers"><Users className="mr-2 h-4 w-4" />Customers</Link>
          </Button>
          {/* <Button variant={isActiveRoute('/analytics') ? 'secondary' : 'ghost'} className="w-full justify-start" asChild>
            <Link to="/analytics"><TrendingUp className="mr-2 h-4 w-4" />Analytics</Link>
          </Button> */}
          {isAdmin && (
            <Button variant={isActiveRoute('/admin') ? 'secondary' : 'ghost'} className="w-full justify-start" asChild>
              <Link to="/admin"><Users className="mr-2 h-4 w-4" />Admin Panel</Link>
            </Button>
          )}
          <Button variant={isActiveRoute('/settings') ? 'secondary' : 'ghost'} className="w-full justify-start" asChild>
            <Link to="/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link>
          </Button>
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Signed in as</p>
              <NotificationBell tooltipSide="top" />
            </div>
            <p className="text-sm font-medium truncate">{user?.email}</p>
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;