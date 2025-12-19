-- Migration: Rename student_id to delivery_address
-- Run this in Supabase SQL Editor

-- Step 1: Add new column if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address VARCHAR(255);

-- Step 2: Copy data from student_id to delivery_address (if student_id exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'student_id'
  ) THEN
    UPDATE orders 
    SET delivery_address = student_id 
    WHERE student_id IS NOT NULL AND delivery_address IS NULL;
  END IF;
END $$;

-- Step 3: Drop old column (uncomment when ready)
-- ALTER TABLE orders DROP COLUMN IF EXISTS student_id;

