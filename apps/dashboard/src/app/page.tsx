import PurchaseForm from "./purchase-form"

export const dynamic = "force-dynamic"

const capabilities = [
  {
    title: "Your store never closes.",
    body: "Customers can browse, order and pay at any hour, including weekends and late nights.",
  },
  {
    title: "Every order in one place.",
    body: "See new orders, customer details and order status from one dashboard instead of scrolling through chats.",
  },
  {
    title: "A catalogue that answers questions.",
    body: "Products, prices, photos and availability are always visible, so customers can decide without asking.",
  },
  {
    title: "Payments made simple.",
    body: "Customers pay online at checkout. You manage payment-related order activity from the same store.",
  },
  {
    title: "Stock you can trust.",
    body: "Update inventory as you sell so you always know what is available.",
  },
]

const included = [
  {
    title: "Dedicated online storefront",
    body: "A branded store on your own domain that customers can visit and return to.",
  },
  {
    title: "Product catalogue management",
    body: "Add products, prices, images and descriptions from one place.",
  },
  {
    title: "Order management",
    body: "See new orders, customer details and status without searching through chats.",
  },
  {
    title: "Online payment integration",
    body: "Let customers pay at checkout and manage payment-related order activity.",
  },
  {
    title: "Inventory management",
    body: "Track stock and availability so you know what you can sell.",
  },
  {
    title: "Sales monitoring and reporting",
    body: "Understand what is selling and how the business is performing.",
  },
  {
    title: "Dedicated admin dashboard",
    body: "Run the store from one admin area built for daily operations.",
  },
  {
    title: "Deployment and initial configuration",
    body: "We deploy the store and configure the essentials for your business.",
  },
]

const steps = [
  {
    title: "Make your payment",
    body: "Secure your e-commerce setup for ₦154,900/yr.",
  },
  {
    title: "Share your business details",
    body: "Send your business name, products, branding assets and the details we need to configure your store.",
  },
  {
    title: "We set up your store",
    body: "We configure the storefront, product structure, payment integration and essential business settings.",
  },
  {
    title: "Go live",
    body: "Your dedicated online store is deployed and ready within 24 hours of receiving the required information and payment.",
  },
]

const includedInPrice = [
  "Dedicated storefront",
  "Product catalogue",
  "Orders and inventory",
  "Online payments",
  "Admin dashboard",
  "Deployment and setup",
]

const faqs = [
  {
    question: "Do I need to hire a developer?",
    answer:
      "No. We configure and deploy the store for you. You get an admin dashboard to manage products, orders and stock.",
  },
  {
    question: "How long does setup take?",
    answer:
      "Your store is deployed and ready within 24 hours of receiving the required information and payment.",
  },
  {
    question: "What do I need to provide?",
    answer:
      "Your name, email, business name and store name to get started. After payment, you can share your products, branding assets and other details so we can configure your store.",
  },
  {
    question: "Can I manage the store myself?",
    answer:
      "Yes. You can update products, prices, images, stock and order status from the admin dashboard.",
  },
  {
    question: "What does the ₦154,900/yr cover?",
    answer:
      "It covers the dedicated storefront, product catalogue, order and inventory management, online payment integration, sales reporting, the admin dashboard, deployment and initial configuration.",
  },
]

const primaryCta =
  "inline-flex items-center justify-center rounded-full px-7 py-4 text-sm font-medium text-white shadow-lg shadow-black/10 transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"

const secondaryCta =
  "inline-flex items-center justify-center rounded-full border border-black/10 bg-white/70 px-7 py-4 text-sm font-medium text-neutral-900 transition-colors duration-200 hover:bg-white"

export default function HomePage() {
  return (
    <div className="bg-[#f5f3ef] text-neutral-900">
      <section className="relative overflow-hidden border-b border-black/5">
        <div className="content-container grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <p
              className="motion-safe:animate-fade-in-top inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-600"
              style={{ animationDelay: "0ms" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
              For business owners
            </p>

            <h1
              className="motion-safe:animate-fade-in-top mt-6 max-w-2xl text-5xl font-semibold leading-[0.95] tracking-[-0.07em] text-neutral-900 md:text-6xl lg:text-7xl"
              style={{ animationDelay: "60ms" }}
            >
              Your business deserves to sell even when you&apos;re not available.
            </h1>

            <p
              className="motion-safe:animate-fade-in-top mt-6 max-w-xl text-lg leading-8 text-neutral-600"
              style={{ animationDelay: "120ms" }}
            >
              Imagine waking up to new orders from customers who shopped while you were sleeping. Your
              own online store, open 24/7, so customers can browse, order and pay while you focus on
              the business.
            </p>

            <p
              className="motion-safe:animate-fade-in-top mt-4 max-w-xl text-base leading-7 text-neutral-600"
              style={{ animationDelay: "150ms" }}
            >
              No waiting for you to reply to WhatsApp messages. No manually confirming every order. No
              searching through conversations to remember who ordered what. Manage everything from one
              place.
            </p>

            <div
              className="motion-safe:animate-fade-in-top mt-8 flex flex-col gap-3 sm:flex-row"
              style={{ animationDelay: "180ms" }}
            >
              <a
                href="#get-started"
                className={primaryCta}
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                Get my online store
              </a>
              <a href="#included" className={secondaryCta}>
                See what&apos;s included
              </a>
            </div>
          </div>

          <div className="motion-safe:animate-fade-in-right relative" style={{ animationDelay: "140ms" }}>
            <div className="relative mx-auto max-w-[460px]">
              <div
                className="absolute -left-10 top-8 h-48 w-48 rounded-full blur-3xl"
                style={{ backgroundColor: "var(--brand-primary)", opacity: 0.12 }}
              />

              <div className="relative rounded-[32px] border border-black/5 bg-white p-3 shadow-[0_30px_80px_rgba(17,17,17,0.08)]">
                <div className="relative overflow-hidden rounded-[26px] bg-neutral-900 p-8 text-white">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_45%)]" />
                  <div className="relative">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-white/50">
                      <span>Store status</span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                        Always on
                      </span>
                    </div>
                    <p className="mt-20 text-[11px] uppercase tracking-[0.24em] text-white/50">Open</p>
                    <p className="mt-2 text-8xl font-semibold leading-none tracking-[-0.09em]">24/7</p>
                    <p className="mt-6 max-w-[17rem] text-sm leading-6 text-white/60">
                      Customers can shop, order and pay at any hour, even when you are closed.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <div className="rounded-2xl bg-[#f5f3ef] p-4">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-600">Setup</p>
                    <p className="mt-2 text-lg font-semibold tracking-[-0.04em]">24 hours</p>
                  </div>
                  <div className="rounded-2xl bg-[#f5f3ef] p-4">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-600">Per year</p>
                    <p className="mt-2 text-lg font-semibold tracking-[-0.04em]">₦154,900</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-black/5 bg-white">
        <div className="content-container grid gap-4 py-6 text-sm text-neutral-600 sm:grid-cols-3">
          <p>₦154,900/yr setup</p>
          <p>Live within 24 hours</p>
          <p>No developer needed</p>
        </div>
      </section>

      <section className="content-container py-20 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-[9rem] font-semibold leading-none tracking-[-0.1em] text-neutral-500">01</p>
          </div>
          <div>
            <h2 className="max-w-2xl text-4xl font-semibold leading-[1.02] tracking-[-0.06em] md:text-5xl">
              Your business shouldn&apos;t have to wait for you to make a sale.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
              Think about how many potential customers visit your page when you&apos;re busy, away from
              your phone or already attending to other customers. Some send messages and never get a
              reply. Others ask about products, prices and availability, then disappear.
            </p>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
              It&apos;s not always that they aren&apos;t interested. Sometimes, buying from your
              business simply takes too much effort.
            </p>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
              Whether you sell on WhatsApp, Instagram or in a physical shop, your customers should have
              a permanent place to buy. This December, give your business the freedom to sell beyond
              your physical location and your working hours.
            </p>

            <ul className="mt-10 grid gap-4 sm:grid-cols-3">
              {["Messages go unanswered.", "Buying takes too much effort.", "Sales wait for you to be available."].map(
                (item) => (
                  <li key={item} className="border-t border-black/10 pt-4 text-sm leading-6 text-neutral-600">
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-black/5 bg-white">
        <div className="content-container py-20 lg:py-28">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-semibold leading-[1.02] tracking-[-0.06em] md:text-5xl">
              Now imagine giving them a place to buy.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-600">
              A store that stays open, answers the basic questions and takes the order, even when you
              are unavailable.
            </p>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Browse all your products without asking you to send pictures.",
              "See available products and make purchasing decisions.",
              "Place orders at any time, including weekends and late nights.",
              "Pay conveniently online.",
              "Shop without having to wait for you to become available.",
            ].map((item) => (
              <li key={item} className="rounded-2xl border border-black/5 bg-[#f5f3ef] px-5 py-4 text-sm leading-6 text-neutral-700">
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-10 grid gap-4 md:grid-cols-3 md:grid-rows-3">
            <article className="relative overflow-hidden rounded-[28px] bg-neutral-900 p-8 text-white md:col-span-2 md:row-span-2 md:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_50%)]" />
              <div className="relative flex h-full flex-col justify-between">
                <span className="text-[10px] uppercase tracking-[0.24em] text-white/50">Always open</span>
                <div className="mt-16">
                  <h3 className="max-w-md text-3xl font-semibold leading-[1.05] tracking-[-0.05em] md:text-4xl">
                    {capabilities[0].title}
                  </h3>
                  <p className="mt-4 max-w-md text-base leading-7 text-white/60">{capabilities[0].body}</p>
                </div>
              </div>
            </article>

            <article className="rounded-[28px] border border-black/5 bg-[#f5f3ef] p-7 md:row-span-2">
              <span className="text-[10px] uppercase tracking-[0.24em] text-neutral-600">Operations</span>
              <h3 className="mt-10 text-2xl font-semibold leading-[1.08] tracking-[-0.04em]">
                {capabilities[1].title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{capabilities[1].body}</p>
            </article>

            {capabilities.slice(2).map((capability) => (
              <article key={capability.title} className="rounded-[28px] border border-black/5 bg-white p-7">
                <h3 className="text-xl font-semibold leading-[1.1] tracking-[-0.03em]">{capability.title}</h3>
                <p className="mt-3 text-sm leading-6 text-neutral-600">{capability.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="content-container py-20 lg:py-28">
        <div className="max-w-3xl">
          <h2 className="text-4xl font-semibold leading-[1.02] tracking-[-0.06em] md:text-5xl">
            Spend less time managing orders. Spend more time growing your business.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-600">
            Running a business already comes with enough responsibilities. You shouldn&apos;t have to
            spend your entire day switching between chats, checking payments, updating stock and
            recording sales manually. With your own e-commerce system, you can bring your sales
            operations together.
          </p>
        </div>
      </section>

      <section id="included" className="content-container pb-20 lg:pb-28">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="max-w-md text-4xl font-semibold leading-[1.02] tracking-[-0.06em] md:text-5xl">
              Everything you need to run the sale.
            </h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-neutral-600">
              Your store is more than a page. It is the catalogue, checkout, orders, stock and admin
              working together.
            </p>
            <a href="#get-started" className={`${primaryCta} mt-8`} style={{ backgroundColor: "var(--brand-primary)" }}>
              Get my online store
            </a>
          </div>

          <ul className="grid border-b border-black/10 sm:grid-cols-2 sm:gap-x-10">
            {included.map((item, index) => (
              <li key={item.title} className="border-t border-black/10 py-5">
                <div className="flex gap-4">
                  <span className="pt-1 text-[10px] font-medium tracking-[0.16em] text-neutral-600">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold tracking-[-0.02em]">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-neutral-600">{item.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-black/5 bg-white">
        <div className="content-container py-20 lg:py-28">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-semibold leading-[1.02] tracking-[-0.06em] md:text-5xl">
              Your store. Your products. Your sales. Your control.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-600">
              You don&apos;t need to figure out how to build an e-commerce platform from scratch. We&apos;ve
              already built the engine, designed the storefront and put the essential sales management
              features together. We simply configure and deploy it for your business.
            </p>
          </div>

          <div className="mt-12">
            <h3 className="text-3xl font-semibold leading-[1.05] tracking-[-0.05em] md:text-4xl">
              Get your online store ready in 24 hours.
            </h3>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
              We&apos;ve made getting started straightforward. You share the details, we handle the
              setup.
            </p>

            <ol className="mt-10 grid gap-6 md:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title} className="border-t border-black/15 pt-6">
                  <span className="text-sm font-medium text-neutral-600">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="get-started" className="content-container py-20 lg:py-28">
        <div className="overflow-hidden rounded-[32px] bg-neutral-900 text-white">
          <div className="grid gap-10 p-8 md:p-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <span className="inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70">
                December offer
              </span>
              <h2 className="mt-6 max-w-xl text-4xl font-semibold leading-[1.02] tracking-[-0.06em] md:text-5xl">
                Get your own e-commerce store for ₦154,900/yr.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/60">
                An annual plan of ₦154,900. Share your details, pay securely, and we&apos;ll configure and
                deploy your dedicated store within 24 hours of receiving your details and payment.
              </p>

              <PurchaseForm />
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 md:p-8">
              <p className="text-sm text-white/50">Per year</p>
              <p className="mt-2 text-5xl font-semibold tracking-[-0.06em]">₦154,900</p>
              <p className="mt-2 text-sm text-white/50">Everything you need to start selling online.</p>

              <ul className="mt-7 space-y-3">
                {includedInPrice.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-8 text-xs leading-5 text-white/50">
                No months of development. No complicated technical setup. No developer to hire. You
                focus on your business, we handle the technology.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="content-container pb-20 lg:pb-28">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <p className="text-[9rem] font-semibold leading-none tracking-[-0.1em] text-neutral-500">6</p>
            <p className="-mt-4 text-sm font-medium text-neutral-600">months from now</p>
          </div>

          <div>
            <h2 className="max-w-2xl text-4xl font-semibold leading-[1.02] tracking-[-0.06em] md:text-5xl">
              Imagine where your business could be six months from now.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
              More customers discovering your products. A simpler way to receive orders. Less time
              spent coordinating purchases manually. A better understanding of your sales.
            </p>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
              You don&apos;t have to wait until your business becomes big before you start putting the
              right systems in place. Build the foundation now. Your next customer shouldn&apos;t have
              to wait until you&apos;re online to buy from you.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-black/5 bg-white">
        <div className="content-container grid gap-10 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
          <div>
            <h2 className="max-w-md text-4xl font-semibold leading-[1.02] tracking-[-0.06em] md:text-5xl">
              Questions before you start?
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-neutral-600">
              If your question isn&apos;t here, send us a message and we&apos;ll answer it.
            </p>
          </div>

          <div>
            {faqs.map((faq) => (
              <details key={faq.question} className="group border-t border-black/10 py-5 last:border-b">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-medium tracking-[-0.01em] [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span className="text-xl font-light text-neutral-600 transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="content-container py-20 lg:py-28">
        <div className="relative overflow-hidden rounded-[32px] border border-black/5 bg-[#ebe6de] px-8 py-14 text-center md:px-16 md:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8),transparent_60%)]" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-4xl font-semibold leading-[1.02] tracking-[-0.06em] md:text-5xl">
              Your next customer shouldn&apos;t have to wait until you&apos;re online.
            </h2>
            <p className="mt-5 text-lg leading-8 text-neutral-600">
              Get your store today and give your business a place to sell around the clock.
            </p>
            <a href="#get-started" className={`${primaryCta} mt-8`} style={{ backgroundColor: "var(--brand-primary)" }}>
              Let&apos;s get your store online
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
