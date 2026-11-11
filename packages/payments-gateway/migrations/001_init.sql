create extension if not exists pgcrypto;

create table if not exists vendors (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  status          text not null default 'active' check (status in ('active', 'suspended')),
  token_hash      text not null unique,
  webhook_url     text not null,
  allowed_origins text[] not null default '{}',
  currency        text not null default 'NGN',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists settlements (
  vendor_id            uuid primary key references vendors(id) on delete cascade,
  bank_code            text not null,
  bank_name            text not null,
  account_number_last4 text not null,
  account_name         text not null,
  subaccount_code      text not null unique,
  status               text not null default 'active',
  verified_at          timestamptz not null,
  updated_at           timestamptz not null default now()
);

create table if not exists settlement_audit (
  id           bigserial primary key,
  vendor_id    uuid not null references vendors(id) on delete cascade,
  action       text not null check (action in ('created', 'updated')),
  bank_code    text not null,
  account_number_last4 text not null,
  account_name text not null,
  actor        text,
  created_at   timestamptz not null default now()
);

create table if not exists transactions (
  reference        text primary key,
  vendor_id        uuid not null references vendors(id),
  external_ref     text,
  amount           bigint not null,
  currency         text not null,
  status           text not null default 'pending'
    check (status in ('pending', 'success', 'failed', 'abandoned', 'refunded', 'partially_refunded')),
  customer_email   text not null,
  channel          text,
  fees             bigint,
  paid_at          timestamptz,
  gateway_response text,
  paystack_id      bigint,
  subaccount_code  text not null,
  metadata         jsonb not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists transactions_vendor_created_idx on transactions (vendor_id, created_at desc);
create index if not exists transactions_vendor_status_created_idx on transactions (vendor_id, status, created_at desc);
create index if not exists transactions_external_ref_idx on transactions (external_ref);
create index if not exists transactions_vendor_email_idx on transactions (vendor_id, customer_email);

create table if not exists refunds (
  id             uuid primary key default gen_random_uuid(),
  reference      text not null references transactions(reference),
  vendor_id      uuid not null references vendors(id),
  amount         bigint not null,
  status         text not null default 'pending',
  paystack_refund_id bigint,
  reason         text,
  created_at     timestamptz not null default now()
);

create table if not exists webhook_events (
  id           uuid primary key default gen_random_uuid(),
  dedupe_key   text unique not null,
  event        text not null,
  reference    text,
  vendor_id    uuid references vendors(id),
  payload      jsonb not null,
  raw_body     text not null,
  status       text not null default 'received'
    check (status in ('received', 'delivered', 'failed', 'ignored')),
  attempts     int not null default 0,
  last_error   text,
  created_at   timestamptz not null default now(),
  delivered_at timestamptz
);
