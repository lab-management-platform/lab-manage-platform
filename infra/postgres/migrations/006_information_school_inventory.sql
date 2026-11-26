-- Replace the original demo catalog while preserving user-entered inventory.
WITH original_demo_application AS (
  SELECT id FROM inventory.application
  WHERE id = 'a-1001'
    AND material_id = 'm-002'
    AND material_name = '移液枪枪头'
    AND applicant_id = 'student001'
    AND quantity = 2
    AND reason = '细胞培养实验补充耗材'
    AND status = 'pending'
    AND project_id IS NULL
), updated_material AS (
UPDATE inventory.material AS material
SET name = replacement.new_name,
    spec = replacement.new_spec,
    unit = replacement.new_unit,
    location = replacement.new_location,
    category_id = replacement.new_category
FROM (VALUES
  ('m-001', '一次性丁腈手套', 'M 码 / 100 只', '杜邦跳线套装', '2.54 mm / 公对母 / 40 根', '盒', 'A-01 电子耗材柜', 'category-consumable'),
  ('m-002', '移液枪枪头', '10uL / 无菌盒装', 'RJ45 水晶头', '六类非屏蔽 / 50 个', '盒', 'B-03 网络布线耗材架', 'category-consumable'),
  ('m-003', '离心管', '1.5mL / 500 支', 'ESP32 开发板', 'ESP32-WROOM-32 / Wi-Fi ＋ 蓝牙', '块', 'B-01 嵌入式设备柜', 'category-equipment'),
  ('m-004', '无水乙醇', 'AR 500mL', 'USB-C 扩展坞', 'HDMI / USB-A / 千兆网口', '台', 'C-02 计算机配件柜', 'category-equipment')
) AS replacement(id, old_name, old_spec, new_name, new_spec, new_unit, new_location, new_category)
WHERE material.id = replacement.id
  AND material.name = replacement.old_name
  AND material.spec = replacement.old_spec
  AND NOT EXISTS (
    SELECT 1 FROM inventory.stock_movement WHERE material_id = material.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM inventory.application
    WHERE material_id = material.id
      AND id NOT IN (SELECT id FROM original_demo_application)
  )
RETURNING material.id
)
UPDATE inventory.application
SET material_name = 'RJ45 水晶头',
    reason = '计算机网络实验制作网线'
WHERE id IN (SELECT id FROM original_demo_application)
  AND material_id IN (SELECT id FROM updated_material);
