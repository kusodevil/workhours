


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_my_profile"() RETURNS TABLE("user_id" "uuid", "department_id" "uuid", "role" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT id, department_id, role 
  FROM profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_my_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, is_admin)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.email,
    false  -- 預設新用戶為非管理者
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_user"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (SELECT is_admin FROM profiles WHERE id = user_id LIMIT 1);
END;
$$;


ALTER FUNCTION "public"."is_admin_user"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


COMMENT ON TABLE "public"."departments" IS 'Departments/Teams in the organization';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "email" "text" NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_admin" boolean DEFAULT false NOT NULL,
    "department_id" "uuid",
    "role" "text" DEFAULT 'member'::"text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['super_admin'::"text", 'department_admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."department_id" IS 'Foreign key to departments table';



COMMENT ON COLUMN "public"."profiles"."role" IS 'User role: super_admin, department_admin, or member';



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text" DEFAULT '#3B82F6'::"text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "hours" numeric(4,1) NOT NULL,
    "date" "date" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "time_entries_hours_check" CHECK ((("hours" > (0)::numeric) AND ("hours" <= (24)::numeric)))
);


ALTER TABLE "public"."time_entries" OWNER TO "postgres";


ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_profiles_department_id" ON "public"."profiles" USING "btree" ("department_id");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "update_departments_updated_at" BEFORE UPDATE ON "public"."departments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Allow authenticated users to read departments" ON "public"."departments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow super_admin to manage departments" ON "public"."departments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text")))));



CREATE POLICY "Department admins can delete department time entries" ON "public"."time_entries" FOR DELETE TO "authenticated" USING (((( SELECT "p"."role"
   FROM "public"."get_my_profile"() "p"("user_id", "department_id", "role")) = 'department_admin'::"text") AND ("user_id" IN ( SELECT "p"."id"
   FROM "public"."profiles" "p"
  WHERE ("p"."department_id" = ( SELECT "mp"."department_id"
           FROM "public"."get_my_profile"() "mp"("user_id", "department_id", "role")))))));



CREATE POLICY "Department admins can insert department time entries" ON "public"."time_entries" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "p"."role"
   FROM "public"."get_my_profile"() "p"("user_id", "department_id", "role")) = 'department_admin'::"text") AND ("user_id" IN ( SELECT "p"."id"
   FROM "public"."profiles" "p"
  WHERE ("p"."department_id" = ( SELECT "mp"."department_id"
           FROM "public"."get_my_profile"() "mp"("user_id", "department_id", "role")))))));



CREATE POLICY "Department admins can update department profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (((( SELECT "p"."role"
   FROM "public"."get_my_profile"() "p"("user_id", "department_id", "role")) = 'department_admin'::"text") AND ("department_id" = ( SELECT "p"."department_id"
   FROM "public"."get_my_profile"() "p"("user_id", "department_id", "role"))))) WITH CHECK (((( SELECT "p"."role"
   FROM "public"."get_my_profile"() "p"("user_id", "department_id", "role")) = 'department_admin'::"text") AND ("department_id" = ( SELECT "p"."department_id"
   FROM "public"."get_my_profile"() "p"("user_id", "department_id", "role"))) AND ("role" <> 'super_admin'::"text")));



CREATE POLICY "Department admins can update department time entries" ON "public"."time_entries" FOR UPDATE TO "authenticated" USING (((( SELECT "p"."role"
   FROM "public"."get_my_profile"() "p"("user_id", "department_id", "role")) = 'department_admin'::"text") AND ("user_id" IN ( SELECT "p"."id"
   FROM "public"."profiles" "p"
  WHERE ("p"."department_id" = ( SELECT "mp"."department_id"
           FROM "public"."get_my_profile"() "mp"("user_id", "department_id", "role"))))))) WITH CHECK (((( SELECT "p"."role"
   FROM "public"."get_my_profile"() "p"("user_id", "department_id", "role")) = 'department_admin'::"text") AND ("user_id" IN ( SELECT "p"."id"
   FROM "public"."profiles" "p"
  WHERE ("p"."department_id" = ( SELECT "mp"."department_id"
           FROM "public"."get_my_profile"() "mp"("user_id", "department_id", "role")))))));



CREATE POLICY "Super admins can delete all time entries" ON "public"."time_entries" FOR DELETE TO "authenticated" USING ((( SELECT "p"."role"
   FROM "public"."get_my_profile"() "p"("user_id", "department_id", "role")) = 'super_admin'::"text"));



CREATE POLICY "Super admins can insert all time entries" ON "public"."time_entries" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "p"."role"
   FROM "public"."get_my_profile"() "p"("user_id", "department_id", "role")) = 'super_admin'::"text"));



CREATE POLICY "Super admins can update all profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "p"."role"
   FROM "public"."get_my_profile"() "p"("user_id", "department_id", "role")) = 'super_admin'::"text"));



CREATE POLICY "Super admins can update all time entries" ON "public"."time_entries" FOR UPDATE TO "authenticated" USING ((( SELECT "p"."role"
   FROM "public"."get_my_profile"() "p"("user_id", "department_id", "role")) = 'super_admin'::"text"));



CREATE POLICY "Super admins can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "p"."role"
   FROM "public"."get_my_profile"() "p"("user_id", "department_id", "role")) = 'super_admin'::"text"));



CREATE POLICY "Super admins can view all time entries" ON "public"."time_entries" FOR SELECT TO "authenticated" USING ((( SELECT "p"."role"
   FROM "public"."get_my_profile"() "p"("user_id", "department_id", "role")) = 'super_admin'::"text"));



CREATE POLICY "Users can delete own time entries" ON "public"."time_entries" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own time entries" ON "public"."time_entries" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert projects" ON "public"."projects" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK ((("id" = "auth"."uid"()) AND ("role" = ( SELECT "p"."role"
   FROM "public"."get_my_profile"() "p"("user_id", "department_id", "role"))) AND ("department_id" = ( SELECT "p"."department_id"
   FROM "public"."get_my_profile"() "p"("user_id", "department_id", "role")))));



CREATE POLICY "Users can update own time entries" ON "public"."time_entries" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view all projects" ON "public"."projects" FOR SELECT USING (true);



CREATE POLICY "Users can view department profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("department_id" = ( SELECT "p"."department_id"
   FROM "public"."get_my_profile"() "p"("user_id", "department_id", "role"))));



CREATE POLICY "Users can view department time entries" ON "public"."time_entries" FOR SELECT TO "authenticated" USING (("user_id" IN ( SELECT "p"."id"
   FROM "public"."profiles" "p"
  WHERE ("p"."department_id" = ( SELECT "mp"."department_id"
           FROM "public"."get_my_profile"() "mp"("user_id", "department_id", "role"))))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can view own time entries" ON "public"."time_entries" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_all" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "id") OR "public"."is_admin_user"("auth"."uid"()))) WITH CHECK ((("auth"."uid"() = "id") OR "public"."is_admin_user"("auth"."uid"())));



ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."time_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "time_entries_delete" ON "public"."time_entries" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true))))));



COMMENT ON POLICY "time_entries_delete" ON "public"."time_entries" IS '允許用戶刪除自己的時數記錄，或管理者刪除所有記錄';



CREATE POLICY "time_entries_insert" ON "public"."time_entries" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true))))));



COMMENT ON POLICY "time_entries_insert" ON "public"."time_entries" IS '允許用戶新增自己的時數記錄，或管理者為任何用戶新增記錄';



CREATE POLICY "time_entries_update" ON "public"."time_entries" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true))))));



COMMENT ON POLICY "time_entries_update" ON "public"."time_entries" IS '允許用戶編輯自己的時數記錄，或管理者編輯所有記錄';



CREATE POLICY "建立者可更新 projects" ON "public"."projects" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "所有人可查看 projects" ON "public"."projects" FOR SELECT USING (true);



CREATE POLICY "所有人可查看 time_entries" ON "public"."time_entries" FOR SELECT USING (true);



CREATE POLICY "用戶可刪除自己的 time_entries" ON "public"."time_entries" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "用戶可建立自己的 time_entries" ON "public"."time_entries" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "用戶可更新自己的 time_entries" ON "public"."time_entries" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "登入用戶可建立 projects" ON "public"."projects" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";








GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."get_my_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_user"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_user"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_user"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."time_entries" TO "anon";
GRANT ALL ON TABLE "public"."time_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."time_entries" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































