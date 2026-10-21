-- Actualización de precios desde la lista del proveedor.
-- precio = costo * (1 + margen / 100). El margen sale del producto si tiene uno propio, si no de su categoría.

alter table public.categorias add column margen numeric(6, 2) not null default 25 check (margen >= 0);
alter table public.productos add column margen numeric(6, 2) check (margen >= 0);

alter table public.variantes
  add column costo numeric(12, 2) check (costo >= 0),
  -- Nombre normalizado con el que aparece en la lista del proveedor: la próxima lista coincide directo
  add column nombre_proveedor text;

-- guardar_producto ahora conserva las variantes existentes (mismo id, costo y nombre del proveedor)
-- en vez de borrarlas y crearlas de nuevo. Solo borra las presentaciones que se quitaron.
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

  delete from public.variantes
  where producto_id = producto ->> 'id'
    and etiqueta not in (select trim(v ->> 'etiqueta') from jsonb_array_elements(variantes) as t(v));

  insert into public.variantes (producto_id, etiqueta, precio, disponible, orden)
  select producto ->> 'id', trim(v ->> 'etiqueta'), (v ->> 'precio')::numeric, coalesce((v ->> 'disponible')::boolean, true), (o - 1)::integer
  from jsonb_array_elements(variantes) with ordinality as t(v, o)
  on conflict (producto_id, etiqueta) do update set
    precio = excluded.precio,
    disponible = excluded.disponible,
    orden = excluded.orden;
end;
$$;

-- Aplica en una sola transacción los precios calculados y los márgenes elegidos.
-- variantes: [{id, costo, precio, nombre_proveedor}]
-- categorias: [{id, margen}]
-- productos: [{id, margen}] (margen null = usar el de la categoría)
create function public.aplicar_precios(variantes jsonb, categorias jsonb, productos jsonb) returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  actualizadas integer;
begin
  if not public.es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  update public.variantes v set
    costo = (x ->> 'costo')::numeric,
    precio = (x ->> 'precio')::numeric,
    nombre_proveedor = x ->> 'nombre_proveedor'
  from jsonb_array_elements(variantes) as t(x)
  where v.id = (x ->> 'id')::uuid;
  get diagnostics actualizadas = row_count;

  update public.categorias c set margen = (x ->> 'margen')::numeric
  from jsonb_array_elements(categorias) as t(x)
  where c.id = x ->> 'id';

  update public.productos p set margen = (x ->> 'margen')::numeric
  from jsonb_array_elements(productos) as t(x)
  where p.id = x ->> 'id';

  return actualizadas;
end;
$$;
