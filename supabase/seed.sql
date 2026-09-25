-- Run after schema.sql. Prices and inventory live in the database and are
-- always read again when an order is placed.
insert into public.categories(name,slug,description,sort_order,is_active) values
  ('For her','women','Easy layers and pieces with a little presence.',10,true),
  ('For him','men','The everyday, edited down to what matters.',20,true),
  ('Essentials','essentials','Quiet staples, made to earn their place.',30,true)
on conflict(slug) do update set name=excluded.name,description=excluded.description,sort_order=excluded.sort_order,is_active=true;

with catalog(slug,category_slug,name,description,material,price,compare_at_price,image_url,label,is_featured,sizes,colors) as (
  values
  ('the-weekend-shirt','women','The Weekend Shirt','A relaxed, airy cotton shirt for slow starts and long lunches. Cut with a softly dropped shoulder and just the right amount of room.','100% breathable cotton',1890,2290,'https://images.unsplash.com/photo-1752825609278-f9696bc9d7bd?auto=format&fit=crop&w=900&q=82','Bestseller',true,array['XS','S','M','L','XL'], '[{"name":"Ivory","hex":"#e9e2d4"},{"name":"Sky","hex":"#9eafbc"},{"name":"Dusty rose","hex":"#bd9690"}]'::jsonb),
  ('everyday-overshirt','men','Everyday Overshirt','A considered layer in brushed cotton twill. Wear it open over a tee or buttoned up on cooler evenings.','98% cotton, 2% elastane',2490,2990,'https://images.unsplash.com/photo-1562004760-aceed7bb0fe3?auto=format&fit=crop&w=900&q=82','New',true,array['XS','S','M','L','XL'],'[{"name":"Sand","hex":"#c4aa87"},{"name":"Olive","hex":"#68745b"},{"name":"Ink","hex":"#303630"}]'::jsonb),
  ('soft-form-tee','essentials','Soft Form Tee','A little more softness in your everyday. Midweight, pre-washed cotton with a relaxed shape that drapes just so.','100% organic cotton',990,null,'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=82','Core essential',true,array['XS','S','M','L','XL'],'[{"name":"Ivory","hex":"#e9e2d4"},{"name":"Ink","hex":"#303630"},{"name":"Olive","hex":"#68745b"},{"name":"Dusty rose","hex":"#bd9690"}]'::jsonb),
  ('easy-line-trouser','women','Easy Line Trouser','A clean, easy leg with an elasticated back waist. Made for the days you want to feel put together without trying too hard.','Cotton-linen blend',2190,null,'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=82',null,true,array['28','30','32','34','36'],'[{"name":"Sand","hex":"#c4aa87"},{"name":"Ink","hex":"#303630"}]'::jsonb),
  ('daily-polo','men','Daily Polo','A clean cotton polo with a softly structured collar and an easy shape for warmer days.','Soft cotton piqué',1790,2190,'https://images.unsplash.com/photo-1775306413232-fecd45367613?auto=format&fit=crop&w=900&q=82','Limited',false,array['XS','S','M','L','XL'],'[{"name":"Sky","hex":"#9eafbc"},{"name":"Ink","hex":"#303630"},{"name":"Ivory","hex":"#e9e2d4"}]'::jsonb),
  ('sunday-layer','essentials','Sunday Layer','A lightweight knit to keep within reach. Soft ribbed details and a comfortable shape make it an all-season favourite.','Cotton-modal blend',2690,null,'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=82','New',true,array['XS','S','M','L','XL'],'[{"name":"Sand","hex":"#c4aa87"},{"name":"Dusty rose","hex":"#bd9690"},{"name":"Sky","hex":"#9eafbc"}]'::jsonb),
  ('field-jacket','men','Field Jacket','A dependable outer layer with considered pockets and a clean, comfortable fit. Ready for the in-between weather.','Washed cotton canvas',3290,3890,'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=82','Bestseller',true,array['XS','S','M','L','XL'],'[{"name":"Olive","hex":"#68745b"},{"name":"Sand","hex":"#c4aa87"}]'::jsonb),
  ('daylight-kurta','women','Daylight Kurta','An easy, everyday kurta in a joyful print. Light cotton and a relaxed shape carry you from the first coffee to the last plan.','Printed cotton',2390,null,'https://images.unsplash.com/photo-1669199583223-41040360e0a1?auto=format&fit=crop&w=900&q=82',null,false,array['XS','S','M','L','XL'],'[{"name":"Dusty rose","hex":"#bd9690"},{"name":"Olive","hex":"#68745b"},{"name":"Ink","hex":"#303630"}]'::jsonb),
  ('straight-leg-denim','men','Straight Leg Denim','A straight leg that sits naturally and gets better with every wear. Softened indigo denim with classic five-pocket details.','99% cotton, 1% stretch',2890,null,'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=82',null,false,array['28','30','32','34','36'],'[{"name":"Washed denim","hex":"#6e7e8a"},{"name":"Ink","hex":"#303630"}]'::jsonb),
  ('the-woven-shopper','essentials','The Woven Shopper','A roomy woven shopper with sturdy handles for market mornings, travel days and everything in between.','Woven raffia with leather trim',1490,null,'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=82',null,false,array['One size'],'[{"name":"Natural","hex":"#c5ae8a"}]'::jsonb),
  ('soft-knit-cardigan','women','Soft Knit Cardigan','A softly structured layer in a fine, touchable knit. Gently cropped so it works with almost everything you own.','Cotton and recycled nylon',2990,3490,'https://images.unsplash.com/photo-1580247934869-c12922c4f6b0?auto=format&fit=crop&w=900&q=82','New',true,array['XS','S','M','L','XL'],'[{"name":"Sky","hex":"#9eafbc"},{"name":"Ivory","hex":"#e9e2d4"},{"name":"Dusty rose","hex":"#bd9690"}]'::jsonb),
  ('clean-cut-chino','men','Clean Cut Chino','An easy straight fit with a clean finish and a little stretch. Made for the daily rotation, whatever’s in it.','Cotton twill with stretch',2290,null,'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=82',null,false,array['28','30','32','34','36'],'[{"name":"Sand","hex":"#c4aa87"},{"name":"Olive","hex":"#68745b"},{"name":"Ink","hex":"#303630"}]'::jsonb)
), upserted as (
  insert into public.products(category_id,slug,name,description,material,price,compare_at_price,image_url,label,is_featured,is_active,sort_order)
  select c.id,p.slug,p.name,p.description,p.material,p.price,p.compare_at_price,p.image_url,p.label,p.is_featured,true,row_number() over(order by p.slug)::integer*10
  from catalog p join public.categories c on c.slug=p.category_slug
  on conflict(slug) do update set category_id=excluded.category_id,name=excluded.name,description=excluded.description,material=excluded.material,
    price=excluded.price,compare_at_price=excluded.compare_at_price,image_url=excluded.image_url,label=excluded.label,is_featured=excluded.is_featured,is_active=true
  returning id,slug
)
insert into public.product_variants(product_id,size,color,color_hex,stock)
select p.id,s.size,co->>'name',co->>'hex',case when s.size='One size' then 18 else 8 end
from catalog c join upserted p on p.slug=c.slug
cross join lateral unnest(c.sizes) s(size)
cross join lateral jsonb_array_elements(c.colors) co
on conflict(product_id,size,color) do update set color_hex=excluded.color_hex;

insert into public.coupons(code,discount_type,discount_value,min_order,max_discount,max_redemptions,is_active)
values ('WELCOME10','percent',10,999,750,null,true),('STUDIO15','percent',15,2500,1000,null,true)
on conflict(code) do update set discount_type=excluded.discount_type,discount_value=excluded.discount_value,min_order=excluded.min_order,max_discount=excluded.max_discount,is_active=true;
