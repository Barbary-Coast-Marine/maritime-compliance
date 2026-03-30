"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const adminTabs = [
  { href: "/admin/vessel", label: "Vessel" },
  { href: "/admin/crew", label: "Crew" },
  { href: "/admin/rules", label: "Rules" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/system", label: "System" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== "captain" && user.role !== "fleet_manager") {
      router.replace("/");
    }
  }, [user, router]);

  // Redirect /admin to /admin/vessel
  useEffect(() => {
    if (pathname === "/admin") {
      router.replace("/admin/vessel");
    }
  }, [pathname, router]);

  return (
    <div>
      {/* Admin sub-navigation */}
      <div className="mb-4 -mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-1">
          {adminTabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-h-[40px] flex items-center ${
                  isActive
                    ? "bg-status-blue/20 text-status-blue"
                    : "text-slate-muted hover:text-slate-text hover:bg-navy-surface"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
