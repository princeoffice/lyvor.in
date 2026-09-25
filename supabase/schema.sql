-- Lyvor database setup for Supabase. Run this file, then seed.sql.
-- The initial admin is created separately by scripts/seed-admin.mjs.
create extension if not exists pgcrypto with schema extensions;
create sequence if not exists public.lyvor_order_number_seq;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'), description text not null default '',
  sort_order integer not null default 50 check (sort_order >= 0), is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), category_id uuid not null references public.categories(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'), name text not null check (length(name) between 2 and 140),
  description text not null default '', material text not null default '', price integer not null check (price > 0),
  compare_at_price integer check (compare_at_price is null or compare_at_price > price),
  image_url text not null check (image_url ~ '^https://'), label text,
  is_featured boolean not null default false, is_active boolean not null default true,
  sort_order integer not null default 50 check (sort_order >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  size text not null check (length(size) between 1 and 24), color text not null check (length(color) between 1 and 40),
  color_hex text not null default '#c5ae8a' check (color_hex ~ '^#[0-9A-Fa-f]{6}$'), stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(product_id,size,color)
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, username text unique, email text,
  full_name text, phone text, role text not null default 'customer' check (role in ('customer','admin')),
  must_change_password boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(), code text not null unique check (code ~ '^[A-Z0-9_-]{3,40}$'),
  discount_type text not null check (discount_type in ('percent','fixed')), discount_value integer not null check (discount_value > 0),
  min_order integer not null default 0 check (min_order >= 0), max_discount integer check (max_discount is null or max_discount > 0),
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0), redemptions integer not null default 0 check (redemptions >= 0),
  starts_at timestamptz not null default now(), ends_at timestamptz, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100), check (ends_at is null or ends_at > starts_at)
);
create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1), free_shipping_threshold integer not null default 3000 check (free_shipping_threshold >= 0),
  shipping_fee integer not null default 99 check (shipping_fee >= 0), currency text not null default 'INR' check(currency='INR'), updated_at timestamptz not null default now()
);
create table if not exists public.site_content (
  id integer primary key default 1 check (id = 1), content jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(), order_no text not null unique default ('LYV-' || to_char(now() at time zone 'Asia/Kolkata','YY') || '-' || lpad(nextval('public.lyvor_order_number_seq')::text,6,'0')),
  customer_id uuid not null references auth.users(id) on delete restrict, address jsonb not null,
  status text not null default 'pending' check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  payment_method text not null default 'cod' check(payment_method='cod'), currency text not null default 'INR' check(currency='INR'),
  subtotal integer not null check(subtotal>=0), discount_amount integer not null default 0 check(discount_amount>=0 and discount_amount<=subtotal),
  shipping_amount integer not null default 0 check(shipping_amount>=0), total_amount integer not null check(total_amount=subtotal-discount_amount+shipping_amount and total_amount>=0),
  coupon_id uuid references public.coupons(id) on delete set null, customer_note text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null, product_variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null, image_url text not null, size text not null, color text not null,
  quantity integer not null check(quantity between 1 and 10), unit_price integer not null check(unit_price>0),
  line_total integer not null check(line_total=unit_price*quantity), created_at timestamptz not null default now()
);
create index if not exists products_active_sort_idx on public.products(is_active,sort_order,created_at desc);
create index if not exists variants_product_idx on public.product_variants(product_id,size,color);
create index if not exists orders_customer_created_idx on public.orders(customer_id,created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['categories','products','product_variants','profiles','coupons','store_settings','site_content','orders'] loop
    execute format('drop trigger if exists %I on public.%I',t||'_set_updated_at',t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',t||'_set_updated_at',t);
  end loop;
end $$;

create or replace function public.handle_new_auth_user() returns trigger language plpgsql security definer set search_path=public,auth as $$
begin
  insert into public.profiles(id,username,email,full_name,role,must_change_password)
  values(new.id,nullif(new.raw_user_meta_data->>'username',''),new.email,nullif(new.raw_user_meta_data->>'full_name',''),'customer',false)
  on conflict(id) do update set email=excluded.email;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public,auth as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin')
$$;
create or replace function public.complete_initial_password_change() returns void language plpgsql security definer set search_path=public,auth as $$
begin
  if auth.uid() is null then raise exception 'Sign in is required.'; end if;
  update public.profiles set must_change_password=false where id=auth.uid() and role='admin' and must_change_password=true;
  if not found then raise exception 'No required administrator password change is pending.'; end if;
end $$;

create or replace function public.validate_coupon(p_code text,p_subtotal integer) returns jsonb
language plpgsql stable security definer set search_path=public,auth as $$
declare c public.coupons%rowtype; v_amount integer;
begin
  if p_subtotal is null or p_subtotal<0 then return jsonb_build_object('valid',false,'message','Invalid order subtotal.'); end if;
  select * into c from public.coupons where code=upper(trim(coalesce(p_code,''))) and is_active and starts_at<=now() and (ends_at is null or ends_at>now());
  if not found then return jsonb_build_object('valid',false,'message','That code isn’t available.'); end if;
  if c.max_redemptions is not null and c.redemptions>=c.max_redemptions then return jsonb_build_object('valid',false,'message','That code has been fully redeemed.'); end if;
  if p_subtotal<c.min_order then return jsonb_build_object('valid',false,'message','This order does not meet the coupon minimum.'); end if;
  if c.discount_type='percent' then v_amount:=floor(p_subtotal*c.discount_value/100.0)::integer; else v_amount:=c.discount_value; end if;
  if c.max_discount is not null then v_amount:=least(v_amount,c.max_discount); end if;
  v_amount:=least(v_amount,p_subtotal);
  if v_amount<=0 then return jsonb_build_object('valid',false,'message','The coupon does not apply to this order.'); end if;
  return jsonb_build_object('valid',true,'coupon_id',c.id,'discount_amount',v_amount,'message','Coupon applied.');
end $$;

create or replace function public.create_order(p_items jsonb,p_address jsonb,p_coupon_code text default null) returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare
  v_user uuid:=auth.uid(); v_item record; v_product record; v_coupon public.coupons%rowtype; v_order public.orders%rowtype;
  v_address jsonb; v_coupon_id uuid:=null; v_discount integer:=0; v_subtotal integer:=0; v_shipping integer:=0;
  v_total integer:=0; v_threshold integer:=3000; v_fee integer:=99; v_coupon_amount integer; v_qty integer;
begin
  if v_user is null then raise exception 'Sign in to place an order.'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>30 then raise exception 'Your bag is empty or contains too many items.'; end if;
  if jsonb_typeof(p_address)<>'object' then raise exception 'Delivery details are missing.'; end if;
  v_address:=jsonb_strip_nulls(p_address);
  if length(trim(coalesce(v_address->>'full_name','')))<2 or length(trim(coalesce(v_address->>'line1','')))<4
     or length(trim(coalesce(v_address->>'city','')))<2 or length(trim(coalesce(v_address->>'state','')))<2
     or coalesce(v_address->>'phone','') !~ '^[6-9][0-9]{9}$' or coalesce(v_address->>'pincode','') !~ '^[1-9][0-9]{5}$'
     or coalesce(v_address->>'email','') !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Please provide a valid Indian delivery name, mobile, email, address, city, state and PIN code.';
  end if;
  if exists(select 1 from jsonb_array_elements(p_items) i where coalesce(i->>'quantity','') !~ '^[1-9][0-9]?$' or coalesce(i->>'variant_id','') !~* '^[0-9a-f-]{36}$') then
    raise exception 'One of the items in your bag is invalid.';
  end if;
  for v_item in
    select (x.variant_id)::uuid as variant_id,sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(variant_id text,quantity integer)
    group by (x.variant_id)::uuid order by (x.variant_id)::uuid
  loop
    v_qty:=v_item.quantity;
    if v_qty<1 or v_qty>10 then raise exception 'The quantity for an item is out of range.'; end if;
    select pv.id as variant_id,pv.product_id,pv.size,pv.color,pv.stock,p.name,p.price,p.image_url,p.is_active into v_product
      from public.product_variants pv join public.products p on p.id=pv.product_id where pv.id=v_item.variant_id for update of pv;
    if not found or v_product.is_active is distinct from true then raise exception 'A product in your bag is no longer available.'; end if;
    if v_product.stock<v_qty then raise exception 'Insufficient stock for % (% / %).',v_product.name,v_product.color,v_product.size; end if;
    v_subtotal:=v_subtotal+v_product.price*v_qty;
    update public.product_variants set stock=stock-v_qty where id=v_product.variant_id;
  end loop;
  if v_subtotal<=0 then raise exception 'The order total is invalid.'; end if;
  if coalesce(trim(p_coupon_code),'')<>'' then
    select * into v_coupon from public.coupons where code=upper(trim(p_coupon_code)) for update;
    if not found or not v_coupon.is_active or v_coupon.starts_at>now() or (v_coupon.ends_at is not null and v_coupon.ends_at<=now()) then raise exception 'That coupon is not available.'; end if;
    if v_coupon.max_redemptions is not null and v_coupon.redemptions>=v_coupon.max_redemptions then raise exception 'That coupon has been fully redeemed.'; end if;
    if v_subtotal<v_coupon.min_order then raise exception 'This order does not meet the coupon minimum.'; end if;
    if v_coupon.discount_type='percent' then v_coupon_amount:=floor(v_subtotal*v_coupon.discount_value/100.0)::integer; else v_coupon_amount:=v_coupon.discount_value; end if;
    if v_coupon.max_discount is not null then v_coupon_amount:=least(v_coupon_amount,v_coupon.max_discount); end if;
    v_discount:=least(v_subtotal,v_coupon_amount); v_coupon_id:=v_coupon.id;
    update public.coupons set redemptions=redemptions+1 where id=v_coupon.id;
  end if;
  select free_shipping_threshold,shipping_fee into v_threshold,v_fee from public.store_settings where id=1;
  v_shipping:=case when v_subtotal>=coalesce(v_threshold,3000) then 0 else coalesce(v_fee,99) end;
  v_total:=v_subtotal-v_discount+v_shipping;
  insert into public.orders(customer_id,address,status,payment_method,subtotal,discount_amount,shipping_amount,total_amount,coupon_id,customer_note)
    values(v_user,v_address,'pending','cod',v_subtotal,v_discount,v_shipping,v_total,v_coupon_id,coalesce(v_address->>'note','')) returning * into v_order;
  for v_item in
    select (x.variant_id)::uuid as variant_id,sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(variant_id text,quantity integer)
    group by (x.variant_id)::uuid order by (x.variant_id)::uuid
  loop
    select pv.id as variant_id,pv.product_id,pv.size,pv.color,p.name,p.price,p.image_url into v_product
      from public.product_variants pv join public.products p on p.id=pv.product_id where pv.id=v_item.variant_id;
    insert into public.order_items(order_id,product_id,product_variant_id,product_name,image_url,size,color,quantity,unit_price,line_total)
      values(v_order.id,v_product.product_id,v_product.variant_id,v_product.name,v_product.image_url,v_product.size,v_product.color,v_item.quantity,v_product.price,v_product.price*v_item.quantity);
  end loop;
  return jsonb_build_object('id',v_order.id,'order_no',v_order.order_no,'status',v_order.status,'subtotal',v_order.subtotal,'discount_amount',v_order.discount_amount,'shipping_amount',v_order.shipping_amount,'total_amount',v_order.total_amount);
end $$;

create or replace function public.cancel_order(p_order_id uuid) returns void language plpgsql security definer set search_path=public,auth as $$
declare o public.orders%rowtype; i record;
begin
  if auth.uid() is null then raise exception 'Sign in is required.'; end if;
  select * into o from public.orders where id=p_order_id and customer_id=auth.uid() for update;
  if not found then raise exception 'That order could not be found.'; end if;
  if o.status not in ('pending','confirmed') then raise exception 'This order can no longer be cancelled online.'; end if;
  for i in select product_variant_id,quantity from public.order_items where order_id=o.id and product_variant_id is not null loop update public.product_variants set stock=stock+i.quantity where id=i.product_variant_id; end loop;
  if o.coupon_id is not null then update public.coupons set redemptions=greatest(0,redemptions-1) where id=o.coupon_id; end if;
  update public.orders set status='cancelled' where id=o.id;
end $$;

create or replace function public.admin_update_order_status(p_order_id uuid,p_status text) returns void language plpgsql security definer set search_path=public,auth as $$
declare o public.orders%rowtype; i record;
begin
  if not public.is_admin() then raise exception 'Administrator access is required.'; end if;
  if p_status not in ('confirmed','processing','shipped','delivered','cancelled') then raise exception 'That order status is not allowed.'; end if;
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found.'; end if;
  if p_status='cancelled' and o.status<>'cancelled' then
    if o.status in ('shipped','delivered') then raise exception 'Shipped or delivered orders cannot be cancelled.'; end if;
    for i in select product_variant_id,quantity from public.order_items where order_id=o.id and product_variant_id is not null loop update public.product_variants set stock=stock+i.quantity where id=i.product_variant_id; end loop;
    if o.coupon_id is not null then update public.coupons set redemptions=greatest(0,redemptions-1) where id=o.coupon_id; end if;
  end if;
  update public.orders set status=p_status where id=o.id;
end $$;

create or replace function public.admin_save_product(p_product jsonb,p_variants jsonb) returns uuid language plpgsql security definer set search_path=public,auth as $$
declare v_id uuid; v_row jsonb; v_price integer; v_compare integer;
begin
  if not public.is_admin() then raise exception 'Administrator access is required.'; end if;
  if jsonb_typeof(p_product)<>'object' or jsonb_typeof(p_variants)<>'array' or jsonb_array_length(p_variants)<1 or jsonb_array_length(p_variants)>100 then raise exception 'Product details or variants are invalid.'; end if;
  v_price:=(p_product->>'price')::integer; v_compare:=nullif(p_product->>'compare_at_price','')::integer;
  if v_price<=0 or (v_compare is not null and v_compare<=v_price) then raise exception 'Selling price and comparison price are invalid.'; end if;
  if exists(select 1 from jsonb_array_elements(p_variants) v where coalesce(v->>'size','')='' or coalesce(v->>'color','')='' or coalesce(v->>'stock','') !~ '^[0-9]+$') then raise exception 'A variant has invalid size, colour or stock.'; end if;
  if nullif(p_product->>'id','') is not null then
    v_id:=(p_product->>'id')::uuid;
    update public.products set category_id=(p_product->>'category_id')::uuid,slug=p_product->>'slug',name=p_product->>'name',
      description=coalesce(p_product->>'description',''),material=coalesce(p_product->>'material',''),price=v_price,compare_at_price=v_compare,
      image_url=p_product->>'image_url',label=nullif(p_product->>'label',''),is_featured=coalesce((p_product->>'is_featured')::boolean,false),
      is_active=coalesce((p_product->>'is_active')::boolean,true),sort_order=coalesce((p_product->>'sort_order')::integer,50) where id=v_id;
    if not found then raise exception 'Product not found.'; end if;
    delete from public.product_variants where product_id=v_id;
  else
    insert into public.products(category_id,slug,name,description,material,price,compare_at_price,image_url,label,is_featured,is_active,sort_order)
    values((p_product->>'category_id')::uuid,p_product->>'slug',p_product->>'name',coalesce(p_product->>'description',''),coalesce(p_product->>'material',''),v_price,v_compare,p_product->>'image_url',nullif(p_product->>'label',''),coalesce((p_product->>'is_featured')::boolean,false),coalesce((p_product->>'is_active')::boolean,true),coalesce((p_product->>'sort_order')::integer,50)) returning id into v_id;
  end if;
  for v_row in select value from jsonb_array_elements(p_variants) loop
    insert into public.product_variants(product_id,size,color,color_hex,stock) values(v_id,v_row->>'size',v_row->>'color',coalesce(v_row->>'color_hex','#c5ae8a'),(v_row->>'stock')::integer);
  end loop;
  return v_id;
end $$;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.profiles enable row level security;
alter table public.coupons enable row level security;
alter table public.store_settings enable row level security;
alter table public.site_content enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select to anon,authenticated using(is_active or public.is_admin());
drop policy if exists categories_admin_manage on public.categories;
create policy categories_admin_manage on public.categories for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select to anon,authenticated using(is_active or public.is_admin());
drop policy if exists products_admin_manage on public.products;
create policy products_admin_manage on public.products for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists variants_public_read on public.product_variants;
create policy variants_public_read on public.product_variants for select to anon,authenticated using(exists(select 1 from public.products p where p.id=product_id and p.is_active) or public.is_admin());
drop policy if exists variants_admin_manage on public.product_variants;
create policy variants_admin_manage on public.product_variants for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists profiles_own_or_admin_read on public.profiles;
create policy profiles_own_or_admin_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
drop policy if exists coupons_admin_manage on public.coupons;
create policy coupons_admin_manage on public.coupons for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists settings_public_read on public.store_settings;
create policy settings_public_read on public.store_settings for select to anon,authenticated using(true);
drop policy if exists settings_admin_manage on public.store_settings;
create policy settings_admin_manage on public.store_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists content_public_read on public.site_content;
create policy content_public_read on public.site_content for select to anon,authenticated using(true);
drop policy if exists content_admin_manage on public.site_content;
create policy content_admin_manage on public.site_content for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists orders_own_or_admin_read on public.orders;
create policy orders_own_or_admin_read on public.orders for select to authenticated using(customer_id=auth.uid() or public.is_admin());
drop policy if exists items_own_or_admin_read on public.order_items;
create policy items_own_or_admin_read on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (o.customer_id=auth.uid() or public.is_admin())));

grant usage on schema public to anon,authenticated;
grant select on public.categories,public.products,public.product_variants,public.store_settings,public.site_content to anon,authenticated;
grant insert,update,delete on public.categories,public.products,public.product_variants,public.store_settings,public.site_content to authenticated;
grant select on public.profiles,public.orders,public.order_items,public.coupons to authenticated;
grant execute on function public.is_admin() to anon,authenticated;
grant execute on function public.validate_coupon(text,integer) to anon,authenticated;
grant execute on function public.create_order(jsonb,jsonb,text) to authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;
grant execute on function public.admin_update_order_status(uuid,text) to authenticated;
grant execute on function public.admin_save_product(jsonb,jsonb) to authenticated;
grant execute on function public.complete_initial_password_change() to authenticated;
insert into public.store_settings(id,free_shipping_threshold,shipping_fee) values(1,3000,99) on conflict(id) do nothing;
insert into public.site_content(id,content) values(1,'{}'::jsonb) on conflict(id) do nothing;
