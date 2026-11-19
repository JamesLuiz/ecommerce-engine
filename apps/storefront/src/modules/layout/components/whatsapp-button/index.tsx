"use client"

import { useStoreConfig } from "@lib/config-provider"

/**
 * Floating WhatsApp contact button. Rendered only when the merchant enables
 * it in Settings → Storefront → Navigation & features and sets a number.
 * The number may include spaces, plus signs, or dashes — only digits are
 * sent to wa.me.
 */
export default function WhatsAppButton() {
  const { settings } = useStoreConfig()

  const enabled = settings?.features?.whatsappEnabled ?? false
  const rawNumber = settings?.features?.whatsappNumber ?? ""
  const digits = rawNumber.replace(/\D/g, "")

  if (!enabled || !digits) {
    return null
  }

  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_16px_40px_rgba(37,211,102,0.45)] transition-transform duration-200 hover:scale-110"
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-7 w-7"
        aria-hidden
      >
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 2a8 8 0 1 1-4.1 14.9l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 0 1 12 4Zm-3.2 3.6c-.2 0-.5 0-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 3.1 4.8 4.1 2.4.9 2.9.7 3.4.7.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3l-2-1c-.3-.1-.5-.2-.7.1l-.9 1.1c-.2.2-.3.2-.6.1a7.6 7.6 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5L9.7 7c-.2-.4-.4-.4-.9-.4Z" />
      </svg>
    </a>
  )
}
