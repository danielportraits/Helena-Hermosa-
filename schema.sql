-- Ejecutar en Supabase SQL Editor. Revisa las políticas antes de usar con datos reales.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Helena',
  role text not null default 'helena' check (role in ('helena','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$ select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'); $$;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.needs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  need_type text not null check (need_type in ('escuchar','carino','dificil','hablar')),
  message text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);
create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1500),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  body text not null check (char_length(body) between 1 and 3000),
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.meter_events (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  change numeric(5,2) not null check (change between -10 and 10),
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.needs enable row level security;
alter table public.entries enable row level security;
alter table public.replies enable row level security;
alter table public.letters enable row level security;
alter table public.meter_events enable row level security;

create policy "profile owner or admin reads profiles" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "user can update own display name" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));
create policy "owner creates own need" on public.needs for insert to authenticated with check (user_id = auth.uid());
create policy "owner or admin reads needs" on public.needs for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "owner creates own entry" on public.entries for insert to authenticated with check (user_id = auth.uid());
create policy "owner or admin reads entries" on public.entries for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "admin creates replies" on public.replies for insert to authenticated with check (public.is_admin() and author_id = auth.uid());
create policy "recipient or admin reads replies" on public.replies for select to authenticated using (recipient_id = auth.uid() or public.is_admin());
create policy "admin manages letters" on public.letters for all to authenticated using (public.is_admin()) with check (public.is_admin() and author_id = auth.uid());
create policy "users read published letters" on public.letters for select to authenticated using (published = true or public.is_admin());
create policy "admin manages meter events" on public.meter_events for all to authenticated using (public.is_admin()) with check (public.is_admin() and created_by = auth.uid());
create policy "authenticated can read symbolic meter history" on public.meter_events for select to authenticated using (true);

-- Crea un perfil cuando se registra un usuario. El administrador puede cambiar role a 'admin' en SQL Editor.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id,display_name,role)
  values(new.id, coalesce(new.raw_user_meta_data->>'display_name','Helena'),'helena')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Importante: no se crean usuarios ni se concede rol admin automáticamente.
