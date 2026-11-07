const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  provisioning: "bg-blue-100 text-blue-800",
  deprovisioning: "bg-amber-100 text-amber-800",
  suspended: "bg-gray-200 text-gray-700",
  failed: "bg-red-100 text-red-800",
  deleted: "bg-gray-100 text-gray-500",
  pending: "bg-gray-100 text-gray-600",
  running: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {status}
    </span>
  )
}
