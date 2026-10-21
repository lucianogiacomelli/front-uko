-- Links de contacto de la tienda (footer y pedidos por WhatsApp), editables desde el admin.
-- Una sola fila (id = 1). Lectura pública; solo los admins la modifican.

create table public.contacto (
  id integer primary key default 1 check (id = 1),
  -- Formato internacional, solo dígitos (ej. 5492616512823). Vacío = sin configurar
  whatsapp text not null default '' check (whatsapp ~ '^([0-9]{8,15})?$'),
  -- Solo links https: evita que se guarde algo como "javascript:" que se mostraría en la tienda
  instagram text not null default '' check (instagram = '' or instagram ~* '^https://'),
  google_maps text not null default '' check (google_maps = '' or google_maps ~* '^https://'),
  actualizado_en timestamptz not null default now()
);

insert into public.contacto (id) values (1);

create trigger contacto_actualizado_en before update on public.contacto
for each row execute function public.tocar_actualizado_en();

alter table public.contacto enable row level security;

create policy "contacto visible" on public.contacto for select using (true);
create policy "contacto admin update" on public.contacto for update using (public.es_admin()) with check (public.es_admin());
