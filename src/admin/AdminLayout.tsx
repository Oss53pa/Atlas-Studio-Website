import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";

export function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-warm-bg">
      <AdminSidebar />
      <main className="flex-1 p-8 md:p-10 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
