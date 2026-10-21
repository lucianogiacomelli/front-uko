-- Catálogo de productos con variantes, administradores y bucket de imágenes.
-- Lectura pública de productos no eliminados; escritura solo para usuarios en public.admins.

create table public.productos (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre text not null check (length(trim(nombre)) > 0),
  categoria text not null check (length(trim(categoria)) > 0),
  descripcion text not null default '',
  imagen text not null default '',
  etiquetas text[] not null default '{}',
  disponible boolean not null default true,
  en_oferta boolean not null default false,
  descuento integer not null default 0 check (descuento between 0 and 100),
  -- Borrado lógico: si tiene fecha, el producto no se muestra en la tienda
  eliminado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.variantes (
  id uuid primary key default gen_random_uuid(),
  producto_id text not null references public.productos (id) on delete cascade,
  etiqueta text not null check (length(trim(etiqueta)) > 0),
  precio numeric(12, 2) not null check (precio >= 0),
  disponible boolean not null default true,
  orden integer not null default 0,
  unique (producto_id, etiqueta)
);

create index variantes_producto_id_idx on public.variantes (producto_id);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create function public.es_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

create function public.tocar_actualizado_en() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger productos_actualizado_en before update on public.productos
for each row execute function public.tocar_actualizado_en();

-- RLS
alter table public.productos enable row level security;
alter table public.variantes enable row level security;
alter table public.admins enable row level security;

create policy "productos visibles" on public.productos for select
  using (eliminado_en is null or public.es_admin());
create policy "productos admin insert" on public.productos for insert with check (public.es_admin());
create policy "productos admin update" on public.productos for update using (public.es_admin()) with check (public.es_admin());
create policy "productos admin delete" on public.productos for delete using (public.es_admin());

create policy "variantes visibles" on public.variantes for select
  using (exists (select 1 from public.productos p where p.id = producto_id));
create policy "variantes admin insert" on public.variantes for insert with check (public.es_admin());
create policy "variantes admin update" on public.variantes for update using (public.es_admin()) with check (public.es_admin());
create policy "variantes admin delete" on public.variantes for delete using (public.es_admin());

-- Cada usuario puede ver solo su propia fila (para saber si es admin). Nadie escribe desde la API.
create policy "admins propio" on public.admins for select using (user_id = auth.uid());

-- Guarda un producto y reemplaza sus variantes en una sola transacción.
-- nuevo = true falla si el id ya existe, para no pisar otro producto al crear.
-- Corre con los permisos de quien llama, así que las políticas de RLS siguen aplicando.
create function public.guardar_producto(producto jsonb, variantes jsonb, nuevo boolean) returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if jsonb_array_length(variantes) = 0 then
    raise exception 'El producto necesita al menos una variante';
  end if;
  if nuevo and exists (select 1 from public.productos where id = producto ->> 'id') then
    raise exception 'Ya existe un producto con el id %', producto ->> 'id' using errcode = '23505';
  end if;

  insert into public.productos (id, nombre, categoria, descripcion, imagen, etiquetas, disponible, en_oferta, descuento)
  values (
    producto ->> 'id',
    trim(producto ->> 'nombre'),
    trim(producto ->> 'categoria'),
    coalesce(producto ->> 'descripcion', ''),
    coalesce(producto ->> 'imagen', ''),
    coalesce(array(select jsonb_array_elements_text(producto -> 'etiquetas')), '{}'),
    coalesce((producto ->> 'disponible')::boolean, true),
    coalesce((producto ->> 'en_oferta')::boolean, false),
    coalesce((producto ->> 'descuento')::integer, 0)
  )
  on conflict (id) do update set
    nombre = excluded.nombre,
    categoria = excluded.categoria,
    descripcion = excluded.descripcion,
    imagen = excluded.imagen,
    etiquetas = excluded.etiquetas,
    disponible = excluded.disponible,
    en_oferta = excluded.en_oferta,
    descuento = excluded.descuento;

  delete from public.variantes where producto_id = producto ->> 'id';

  insert into public.variantes (producto_id, etiqueta, precio, disponible, orden)
  select producto ->> 'id', trim(v ->> 'etiqueta'), (v ->> 'precio')::numeric, coalesce((v ->> 'disponible')::boolean, true), (o - 1)::integer
  from jsonb_array_elements(variantes) with ordinality as t(v, o);
end;
$$;

-- Storage: imágenes públicas, solo los admins suben o borran
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "imagenes admin insert" on storage.objects for insert
  with check (bucket_id = 'productos' and public.es_admin());
create policy "imagenes admin update" on storage.objects for update
  using (bucket_id = 'productos' and public.es_admin());
create policy "imagenes admin delete" on storage.objects for delete
  using (bucket_id = 'productos' and public.es_admin());
