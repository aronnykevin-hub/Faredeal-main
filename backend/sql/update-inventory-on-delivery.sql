-- =====================================================
-- AUTOMATIC INVENTORY UPDATE ON ORDER DELIVERY
-- =====================================================
-- Updates inventory when purchase orders are received/delivered
-- Increases stock levels and logs inventory movements
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_inventory_on_delivery(UUID);

-- Create function to update inventory when order is delivered
CREATE OR REPLACE FUNCTION update_inventory_on_delivery(
  p_order_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  updated_products JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_inventory_id UUID;
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_updated_products JSONB := '[]'::JSONB;
  v_product_info JSONB;
BEGIN
  -- Get order details
  SELECT * INTO v_order
  FROM purchase_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Order not found', '[]'::JSONB;
    RETURN;
  END IF;

  -- Check if order is in correct status to update inventory
  IF v_order.status NOT IN ('received', 'completed') THEN
    RETURN QUERY SELECT FALSE, 
      'Order must be in received or completed status. Current status: ' || v_order.status, 
      '[]'::JSONB;
    RETURN;
  END IF;

  -- Loop through all items in the order
  FOR v_item IN 
    SELECT 
      poi.product_id,
      poi.quantity,
      poi.unit_price,
      p.name as product_name,
      p.sku
    FROM purchase_order_items poi
    JOIN products p ON p.id = poi.product_id
    WHERE poi.purchase_order_id = p_order_id
  LOOP
    -- Check if inventory record exists for this product
    SELECT id, current_stock INTO v_inventory_id, v_current_stock
    FROM inventory
    WHERE product_id = v_item.product_id;

    IF v_inventory_id IS NULL THEN
      -- Create new inventory record if it doesn't exist
      INSERT INTO inventory (
        product_id,
        current_stock,
        reserved_stock,
        minimum_stock,
        maximum_stock,
        reorder_point,
        reorder_quantity,
        status
      ) VALUES (
        v_item.product_id,
        v_item.quantity,
        0,
        10, -- Default minimum
        1000, -- Default maximum
        20, -- Default reorder point
        50, -- Default reorder quantity
        CASE 
          WHEN v_item.quantity = 0 THEN 'out_of_stock'
          WHEN v_item.quantity <= 10 THEN 'low_stock'
          ELSE 'in_stock'
        END
      )
      RETURNING id, current_stock INTO v_inventory_id, v_new_stock;

      v_current_stock := 0;
    ELSE
      -- Update existing inventory - add received quantity
      v_new_stock := v_current_stock + v_item.quantity;
      
      UPDATE inventory
      SET 
        current_stock = v_new_stock,
        status = CASE 
          WHEN v_new_stock = 0 THEN 'out_of_stock'
          WHEN v_new_stock <= minimum_stock THEN 'low_stock'
          ELSE 'in_stock'
        END,
        last_restock_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = v_inventory_id;
    END IF;

    -- Log the inventory movement
    INSERT INTO inventory_movements (
      product_id,
      movement_type,
      quantity,
      previous_stock,
      new_stock,
      unit_cost,
      reference_type,
      reference_id,
      notes
    ) VALUES (
      v_item.product_id,
      'purchase',
      v_item.quantity,
      v_current_stock,
      v_new_stock,
      v_item.unit_price,
      'purchase_order',
      p_order_id,
      'Stock received from PO #' || v_order.po_number
    );

    -- Build updated products info
    v_product_info := jsonb_build_object(
      'product_id', v_item.product_id,
      'product_name', v_item.product_name,
      'sku', v_item.sku,
      'quantity_received', v_item.quantity,
      'previous_stock', v_current_stock,
      'new_stock', v_new_stock
    );

    v_updated_products := v_updated_products || v_product_info;
  END LOOP;

  -- Update order to mark inventory updated
  UPDATE purchase_orders
  SET 
    notes = COALESCE(notes, '') || E'\n✅ Inventory updated: ' || 
            TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_order_id;

  -- Return success with details
  RETURN QUERY SELECT 
    TRUE,
    'Successfully updated inventory for ' || jsonb_array_length(v_updated_products) || ' products',
    v_updated_products;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_inventory_on_delivery(UUID) TO authenticated;

-- Create a trigger function to auto-update inventory when order status changes
CREATE OR REPLACE FUNCTION trigger_inventory_update_on_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Only update inventory when order moves to 'received' or 'completed' status
  IF (NEW.status IN ('received', 'completed') AND 
      (OLD.status IS NULL OR OLD.status NOT IN ('received', 'completed'))) THEN
    
    -- Call the inventory update function
    SELECT * INTO v_result
    FROM update_inventory_on_delivery(NEW.id);

    IF v_result.success THEN
      RAISE NOTICE 'Inventory auto-updated for order %: %', NEW.po_number, v_result.message;
    ELSE
      RAISE WARNING 'Failed to auto-update inventory for order %: %', NEW.po_number, v_result.message;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_update_inventory_on_delivery ON purchase_orders;

-- Create trigger on purchase_orders table
CREATE TRIGGER auto_update_inventory_on_delivery
  AFTER UPDATE OF status ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_inventory_update_on_order_status_change();

COMMENT ON FUNCTION update_inventory_on_delivery IS 
'Updates inventory stock levels when a purchase order is received/delivered. Creates inventory records if they don''t exist, adds received quantities to current stock, updates status, and logs movements.';

COMMENT ON TRIGGER auto_update_inventory_on_delivery ON purchase_orders IS 
'Automatically updates inventory when purchase order status changes to received or completed';
