-- Categorías como tabla propia (nombre e imagen editables desde el admin).
-- Reemplaza la columna de texto productos.categoria por la referencia productos.categoria_id.

create table public.categorias (
  -- Slug: se usa en la URL /categoria/:id y no cambia aunque se renombre
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre text not null unique check (length(trim(nombre)) > 0),
  imagen text not null default '',
  creado_en timestamptz not null default now()
);

alter table public.categorias enable row level security;

create policy "categorias visibles" on public.categorias for select using (true);
create policy "categorias admin insert" on public.categorias for insert with check (public.es_admin());
create policy "categorias admin update" on public.categorias for update using (public.es_admin()) with check (public.es_admin());
create policy "categorias admin delete" on public.categorias for delete using (public.es_admin());

-- Mismo resultado que slugify() del front, para que las URLs actuales sigan funcionando
create function pg_temp.slug(t text) returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(translate(lower(t), 'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc'), '[^a-z0-9]+', '-', 'g'))
$$;

insert into public.categorias (id, nombre)
select distinct on (pg_temp.slug(categoria)) pg_temp.slug(categoria), categoria
from public.productos
order by pg_temp.slug(categoria), categoria;

-- Una categoría con productos no se puede borrar: primero hay que moverlos o borrarlos
alter table public.productos add column categoria_id text references public.categorias (id) on delete restrict;
update public.productos set categoria_id = pg_temp.slug(categoria);
alter table public.productos alter column categoria_id set not null;
alter table public.productos drop column categoria;

create index productos_categoria_id_idx on public.productos (categoria_id);

create or replace function public.guardar_producto(producto jsonb, variantes jsonb, nuevo boolean) returns void
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

  insert into public.productos (id, nombre, categoria_id, descripcion, imagen, etiquetas, disponible, en_oferta, descuento)
  values (
    producto ->> 'id',
    trim(producto ->> 'nombre'),
    producto ->> 'categoria_id',
    coalesce(producto ->> 'descripcion', ''),
    coalesce(producto ->> 'imagen', ''),
    coalesce(array(select jsonb_array_elements_text(producto -> 'etiquetas')), '{}'),
    coalesce((producto ->> 'disponible')::boolean, true),
    coalesce((producto ->> 'en_oferta')::boolean, false),
    coalesce((producto ->> 'descuento')::integer, 0)
  )
  on conflict (id) do update set
    nombre = excluded.nombre,
    categoria_id = excluded.categoria_id,
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
