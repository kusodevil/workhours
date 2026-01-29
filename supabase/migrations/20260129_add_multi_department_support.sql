-- Phase 1: Multi-Department Support
-- This migration adds department support and role-based permissions

-- 1. Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add department_id and role columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id),
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' CHECK (role IN ('super_admin', 'department_admin', 'member'));

-- 3. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 4. Insert default departments
INSERT INTO departments (name, code, description) VALUES
  ('QA Team', 'QA', 'Quality Assurance Team'),
  ('Development Team', 'DEV', 'Software Development Team'),
  ('Product Management', 'PM', 'Product Management Team')
ON CONFLICT (code) DO NOTHING;

-- 5. Set existing users to QA department (maintain backward compatibility)
-- This ensures existing users continue to work without disruption
UPDATE profiles
SET department_id = (SELECT id FROM departments WHERE code = 'QA' LIMIT 1)
WHERE department_id IS NULL;

-- 6. Update RLS policies for departments table
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read departments
CREATE POLICY "Allow authenticated users to read departments"
  ON departments
  FOR SELECT
  TO authenticated
  USING (true);

-- Only super_admin can insert/update/delete departments
CREATE POLICY "Allow super_admin to manage departments"
  ON departments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 7. Update profiles RLS policies to support department isolation
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can view profiles in their department
CREATE POLICY "Users can view department profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    department_id IN (
      SELECT department_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Users can update their own profile (except role and department)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND department_id = (SELECT department_id FROM profiles WHERE id = auth.uid())
  );

-- Department admins can update profiles in their department (except role changes to super_admin)
CREATE POLICY "Department admins can update department profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'department_admin'
      AND p.department_id = profiles.department_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'department_admin'
      AND p.department_id = profiles.department_id
    )
    AND role != 'super_admin'
  );

-- Super admins can update any profile
CREATE POLICY "Super admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 8. Update time_entries RLS policies to support department isolation
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can insert own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can update own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can delete own time entries" ON time_entries;
DROP POLICY IF EXISTS "Admins can view all time entries" ON time_entries;
DROP POLICY IF EXISTS "Admins can edit all time entries" ON time_entries;
DROP POLICY IF EXISTS "Admins can insert time entries for all users" ON time_entries;

-- Users can view their own time entries
CREATE POLICY "Users can view own time entries"
  ON time_entries
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view time entries from their department
CREATE POLICY "Users can view department time entries"
  ON time_entries
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT p.id FROM profiles p
      WHERE p.department_id = (SELECT department_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Super admins can view all time entries
CREATE POLICY "Super admins can view all time entries"
  ON time_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Users can insert their own time entries
CREATE POLICY "Users can insert own time entries"
  ON time_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Department admins can insert time entries for users in their department
CREATE POLICY "Department admins can insert department time entries"
  ON time_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.department_id = p2.department_id
      WHERE p1.id = auth.uid()
      AND p1.role = 'department_admin'
      AND p2.id = time_entries.user_id
    )
  );

-- Super admins can insert time entries for any user
CREATE POLICY "Super admins can insert all time entries"
  ON time_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Users can update their own time entries
CREATE POLICY "Users can update own time entries"
  ON time_entries
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Department admins can update time entries in their department
CREATE POLICY "Department admins can update department time entries"
  ON time_entries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.department_id = p2.department_id
      WHERE p1.id = auth.uid()
      AND p1.role = 'department_admin'
      AND p2.id = time_entries.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.department_id = p2.department_id
      WHERE p1.id = auth.uid()
      AND p1.role = 'department_admin'
      AND p2.id = time_entries.user_id
    )
  );

-- Super admins can update all time entries
CREATE POLICY "Super admins can update all time entries"
  ON time_entries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Users can delete their own time entries
CREATE POLICY "Users can delete own time entries"
  ON time_entries
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Department admins can delete time entries in their department
CREATE POLICY "Department admins can delete department time entries"
  ON time_entries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.department_id = p2.department_id
      WHERE p1.id = auth.uid()
      AND p1.role = 'department_admin'
      AND p2.id = time_entries.user_id
    )
  );

-- Super admins can delete all time entries
CREATE POLICY "Super admins can delete all time entries"
  ON time_entries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 9. Add updated_at trigger for departments
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Add comments for documentation
COMMENT ON TABLE departments IS 'Departments/Teams in the organization';
COMMENT ON COLUMN profiles.department_id IS 'Foreign key to departments table';
COMMENT ON COLUMN profiles.role IS 'User role: super_admin, department_admin, or member';
