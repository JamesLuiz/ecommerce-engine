import Link from "next/link"
import { redirect } from "next/navigation"

import { getStaffSession } from "@lib/staff"
import { LogoutButton } from "./logout-button"

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/tenants", label: "Tenants" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/releases", label: "Releases" },
  { href: "/admin/audit", label: "Audit" },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffSession()

  if (!staff) {
    redirect("/login?next=/admin")
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-sm font-semibold">
              Flowcheq Commerce
            </Link>
            <nav className="flex items-center gap-4 text-sm text-gray-600">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-gray-900">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{staff.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
