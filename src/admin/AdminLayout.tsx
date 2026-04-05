import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AppFilterProvider } from "./contexts/AppFilterContext";
import { ToastProvider } from "./contexts/ToastContext";

export function AdminLayout() {
  return (
    <AppFilterProvider>
      <ToastProvider>
        <div className="flex min-h-screen bg-warm-bg">
          <AdminSidebar />
          <main className="flex-1 p-8 md:p-10 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </ToastProvider>
    </AppFilterProvider>
  );
}
