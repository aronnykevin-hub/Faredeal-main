VCREATE POLICY "Enable read for anon" ON inventory FOR SELECT TO anon USING (true);
CREATE POLICY "Enable insert for anon" ON inventory FOR INSERT TO anon WITH CHECK (true);

SELECT 'Inventory RLS policies fixed!' as status;
