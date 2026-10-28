-- Productos creados desde una fila de la lista del proveedor: guardar_producto acepta en cada variante
-- el costo y el nombre del proveedor (opcionales). Así la próxima lista encuentra el producto directo.
-- Si no vienen (el formulario normal), la variante conserva los que ya tenía.
-- Parte de la versión de 20261024000000_etiquetas.sql (parámetro calificado y registro de etiquetas).

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

  insert into public.variantes (producto_id, etiqueta, precio, disponible, orden, costo, nombre_proveedor)
  select
    producto ->> 'id',
    trim(v ->> 'etiqueta'),
    (v ->> 'precio')::numeric,
    coalesce((v ->> 'disponible')::boolean, true),
    (o - 1)::integer,
    (v ->> 'costo')::numeric,
    v ->> 'nombre_proveedor'
  from jsonb_array_elements(guardar_producto.variantes) with ordinality as t(v, o)
  on conflict (producto_id, etiqueta) do update set
    precio = excluded.precio,
    disponible = excluded.disponible,
    orden = excluded.orden,
    costo = coalesce(excluded.costo, public.variantes.costo),
    nombre_proveedor = coalesce(excluded.nombre_proveedor, public.variantes.nombre_proveedor);
end;
$$;
