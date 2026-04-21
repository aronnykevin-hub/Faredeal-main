BEGIN;

CREATE TEMP TABLE tmp_stock_items (
  item_code TEXT PRIMARY KEY,
  item_name TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0
);

INSERT INTO tmp_stock_items (item_code, item_name, quantity) VALUES
  ('070001', 'BROADWAY CRUMBLE CAKE', 6.00),
  ('070002', 'GEEPAS VACUM FLASK 1.8L', 5.00),
  ('070005', 'FAY KITCHEN TOWELS(1''24)SINGLE', 63.00),
  ('020001', 'MAGIC BUCKET (1KG)', 4.00),
  ('020002', 'MAGIC BUCKET (500G)', 14.00),
  ('020003', 'MAGIC BUCKET (250G)', 15.00),
  ('020005', 'MAGIC SACHET (500G)', 13.00),
  ('150002', 'PROCTOR & ALLAN CORNFLAKES (500G)', 7.00),
  ('150003', 'PROCTOR & ALLAN CORNFLAKES (250G)', 3.00),
  ('150005', 'WEETABIX (450G)', 3.00),
  ('150006', 'JIREH BLEACH 750MLS', 1.00),
  ('180766', 'NEWMANS HARDCORNS 160G', 17.00),
  ('020007', 'ARIEL WASHING POWDER (1KG)', 2.00),
  ('020008', 'ARIEL WASHING POWDER (500G)', 19.00),
  ('040215', 'BLUE BAND (100G)', 9.00),
  ('040216', 'BLUE BAND (1KG)', 4.00),
  ('180006', 'CLIMAX/AERON AIR FRESHNER (50G)', 14.00),
  ('180007', 'CLIMAX AIR FRESHNERS (170G)', 8.00),
  ('020112', 'GEISHA SOAP ASSORTED (175G)', 14.00),
  ('020113', 'GEISHA SOAP ASSORTED (225G)', 37.00),
  ('040002', 'INDOMIE NOODLES ASSORTED (70G)', 77.00),
  ('040003', 'INDOMIE NOODLES ASSORTED (120G)', 17.00),
  ('110219', 'MD NOTE BOOK 3Q', 6.00),
  ('070221', 'MR GREEN SCOURING POWER', 79.00),
  ('040004', 'NESCAFE 100G', 1.00),
  ('040005', 'NESCAFE 50G', 2.00),
  ('040006', 'NESCAFE 200G', 3.00),
  ('030007', 'NUTRO CREAM WAFERS ASSORTED (150G)', 7.00),
  ('030008', 'NUTRO CREAM WAFERS ASSORTED (75G)', 9.00),
  ('020063', 'ODONIL / AEONTOILET BALLS/ (5PC)', 7.00),
  ('020013', 'OMO ASSORTED (1KG)', 11.00),
  ('040008', 'SANTA LUCIA SPAGHETTI (450G)', 142.00),
  ('040009', 'PRESTIGE MARGARINE (250G)', 19.00),
  ('040010', 'PRESTIGE MARGARINE (500G)', 10.00),
  ('040011', 'PRESTIGE MARGARINE (1KG)', 7.00),
  ('040012', 'SUPREME BAKING FLOUR (2KG)', 2.00),
  ('010001', 'PRINGLES ASSORTED 165G', 23.00),
  ('010002', 'PRINGLES ASSORTED (40G)', 8.00),
  ('180013', 'SHUYA PANTY LINERS', 4.00),
  ('180014', 'UMOJA SANDLES ASSORTED', 9.00),
  ('040013', 'ZESTA RED PLUM JAM 500GM', 8.00),
  ('040014', 'ZESTA STRAWBERRY/ RED PLUM JAM (300G)', 10.00),
  ('170203', 'MOVIT LEAVE IN 100MLS', 2.00),
  ('170204', 'HUGGIES LC SIZE 4 & 5', 4.00),
  ('181013', 'DORCO RAZORS PKT', 9.00),
  ('170206', 'HUGGIES HC SIZE 5', 1.00),
  ('170207', 'HUGGIES HC SIZE 2', 2.00),
  ('170208', 'HUGGIES HC SIZE 4', 2.00),
  ('170209', 'PAMPERS LC ASSORTED', 17.00),
  ('170214', 'PAMPERS HC SIZE 3', 5.00),
  ('110215', 'SUCCESS CARD 2 MEDIUM', 5.00),
  ('120001', 'ORS OLIVE OIL SHEEN SPRAY 472ML', 4.00),
  ('040021', 'SAFA TOMATO PASTE 400G', 10.00),
  ('050002', 'RED BULL ENERGY DRINK 250G', 12.00),
  ('120006', 'ORS OLIVE OIL SHEEN SPRAY 275ML', 1.00),
  ('180031', 'SHOE BRUSH ORDINARY', 12.00),
  ('120008', 'VASELINE BODY LOTION ASSORTED (200ML)', 12.00),
  ('120009', 'SKIN DOCTOR SOAP (120G)', 15.00),
  ('120010', 'NICE & LOVELY AVOCADO OIL 300ML', 1.00),
  ('180033', 'EUROSILK 1PC', 184.00),
  ('120013', 'RAZAC HAND & BODY LOTION (474ML)', 4.00),
  ('120014', 'RADIANT OLIVE OIL HAIR SHEEN SPRAY 470ML', 5.00),
  ('120017', 'RASASI DEO BODY SPRAYS ASSORTED (200ML)', 8.00),
  ('120019', 'VASELINE BLUESEAL JELLY ASSORTED (100ML)', 41.00),
  ('120020', 'SAMONA HERBAL SOAP 100G', 4.00),
  ('040026', 'SWT-1 RICE 2KG', 8.00),
  ('120024', 'VENUS ASSORTED BODY LOTION 200ML', 11.00),
  ('040027', 'SWT-1 RICE (5KG)', 2.00),
  ('040028', 'UGANDA TEA BAGS 50PCS', 17.00),
  ('120030', 'SOSOFT BABY FABRIC SOFTENER 750ML', 5.00),
  ('120031', 'RADIANT OLIVE OIL HAIR SHEEN SPRAY 100ML', 10.00),
  ('120522', 'NISA HAIR REMOVAL CREAM (60ML)', 3.00),
  ('040413', 'CADBURY DRINKING CHOCOLATE (125G)', 2.00),
  ('120034', 'SAMONA HERBAL JELLY 100G', 7.00),
  ('040414', 'CADBURY COCOA POWDER (125G)', 3.00),
  ('120035', 'NIGHTROSE BABY POWDER 100G', 11.00),
  ('170002', 'CAMERA BABY FEEDING BOTTLE', 6.00),
  ('120038', 'SULFO GLYCERINE 50ML', 12.00),
  ('120039', 'NIVEA DEO STRICKY ROLL ON', 1.00),
  ('180509', 'M&G calculator 240', 1.00),
  ('170003', 'BABY NIPPLES', 55.00)
ON CONFLICT (item_code) DO UPDATE
SET
  item_name = EXCLUDED.item_name,
  quantity = EXCLUDED.quantity;

-- Upsert into products (cost and selling prices are initialized to 0.00)
INSERT INTO public.products (
  sku,
  barcode,
  name,
  cost_price,
  selling_price,
  is_active,
  track_inventory,
  created_at,
  updated_at
)
SELECT
  t.item_code,
  t.item_code,
  t.item_name,
  0.00,
  0.00,
  TRUE,
  TRUE,
  NOW(),
  NOW()
FROM tmp_stock_items t
ON CONFLICT (sku) DO UPDATE
SET
  barcode = EXCLUDED.barcode,
  name = EXCLUDED.name,
  is_active = TRUE,
  track_inventory = TRUE,
  updated_at = NOW();

-- Keep compatibility with UIs that read products.quantity / products.price / products.category
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'quantity'
  ) THEN
    UPDATE public.products p
    SET quantity = t.quantity::INTEGER,
        updated_at = NOW()
    FROM tmp_stock_items t
    WHERE p.sku = t.item_code;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'price'
  ) THEN
    UPDATE public.products
    SET price = COALESCE(selling_price, 0),
        updated_at = NOW()
    WHERE sku IN (SELECT item_code FROM tmp_stock_items);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'category'
  ) THEN
    UPDATE public.products
    SET category = COALESCE(category, 'General'),
        updated_at = NOW()
    WHERE sku IN (SELECT item_code FROM tmp_stock_items);
  END IF;
END $$;

-- Upsert into inventory quantities
INSERT INTO public.inventory (
  product_id,
  current_stock,
  reserved_stock,
  minimum_stock,
  reorder_point,
  reorder_quantity,
  created_at,
  updated_at
)
SELECT
  p.id,
  t.quantity,
  0,
  10,
  20,
  100,
  NOW(),
  NOW()
FROM tmp_stock_items t
JOIN public.products p ON p.sku = t.item_code
ON CONFLICT (product_id) DO UPDATE
SET
  current_stock = EXCLUDED.current_stock,
  updated_at = NOW();

-- Keep compatibility with schemas that use min_stock_level/max_stock_level columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'min_stock_level'
  ) THEN
    UPDATE public.inventory i
    SET min_stock_level = 10,
        updated_at = NOW()
    FROM public.products p
    JOIN tmp_stock_items t ON p.sku = t.item_code
    WHERE i.product_id = p.id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'max_stock_level'
  ) THEN
    UPDATE public.inventory i
    SET max_stock_level = 1000,
        updated_at = NOW()
    FROM public.products p
    JOIN tmp_stock_items t ON p.sku = t.item_code
    WHERE i.product_id = p.id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'last_restocked'
  ) THEN
    UPDATE public.inventory i
    SET last_restocked = NOW(),
        updated_at = NOW()
    FROM public.products p
    JOIN tmp_stock_items t ON p.sku = t.item_code
    WHERE i.product_id = p.id;
  END IF;
END $$;

COMMIT;
