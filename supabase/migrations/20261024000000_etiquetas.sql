-- Etiquetas guardadas para reutilizar entre productos. Los productos siguen guardando sus etiquetas en
-- productos.etiquetas (la tienda las lee de ahí); esta tabla es la lista de etiquetas disponibles.

create table public.etiquetas (
  nombre text primary key check (nombre = trim(nombre) and nombre <> ''),
  creado_en timestamptz not null default now()
);

-- "Vegano" y "vegano" son la misma etiqueta
create unique index etiquetas_nombre_unico on public.etiquetas (lower(nombre));

-- Las etiquetas que ya usan los productos. Si dos difieren solo en mayúsculas, queda una.
insert into public.etiquetas (nombre)
select distinct on (lower(e)) e
from (select trim(unnest(etiquetas)) as e from public.productos) as t
where e <> ''
order by lower(e), e
on conflict do nothing;

alter table public.etiquetas enable row level security;

create policy "etiquetas visibles" on public.etiquetas for select using (true);
create policy "etiquetas admin insert" on public.etiquetas for insert with check (public.es_admin());
create policy "etiquetas admin delete" on public.etiquetas for delete using (public.es_admin());

-- guardar_producto:
-- - Arregla 'column reference "variantes" is ambiguous': dentro del delete, "variantes" podía ser el
--   parámetro o la fila de la tabla public.variantes. Ahora el parámetro va calificado con el nombre de la función.
-- - Registra en public.etiquetas las etiquetas del producto que todavía no estén.
create or replace function public.guardar_producto(producto jsonb, variantes jsonb, nuevo boolean) returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if jsonb_array_length(guardar_producto.variantes) = 0 then
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
    coalesce(array(select trim(e) from jsonb_array_elements_text(producto -> 'etiquetas') as t(e) where trim(e) <> ''), '{}'),
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

  insert into public.etiquetas (nombre)
  select distinct trim(e) from jsonb_array_elements_text(producto -> 'etiquetas') as t(e)
  where trim(e) <> ''
  on conflict do nothing;

  delete from public.variantes
  where producto_id = producto ->> 'id'
    and etiqueta not in (select trim(v ->> 'etiqueta') from jsonb_array_elements(guardar_producto.variantes) as t(v));

  insert into public.variantes (producto_id, etiqueta, precio, disponible, orden)
  select producto ->> 'id', trim(v ->> 'etiqueta'), (v ->> 'precio')::numeric, coalesce((v ->> 'disponible')::boolean, true), (o - 1)::integer
  from jsonb_array_elements(guardar_producto.variantes) with ordinality as t(v, o)
  on conflict (producto_id, etiqueta) do update set
    precio = excluded.precio,
    disponible = excluded.disponible,
    orden = excluded.orden;
end;
$$;
