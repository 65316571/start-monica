-- ============================================= 
 -- 建表语句（已替换 extensions.uuid_generate_v4() 为 gen_random_uuid()） 
 -- 适用于原生 PostgreSQL 13+ 
 -- ============================================= 
 
 CREATE TABLE IF NOT EXISTS public.events ( 
   id uuid NOT NULL DEFAULT gen_random_uuid(), 
   name text NOT NULL, 
   event_date timestamp with time zone NULL DEFAULT now(), 
   type text NULL, 
   description text NULL, 
   location text NULL, 
   created_at timestamp with time zone NULL DEFAULT now(), 
   updated_at timestamp with time zone NULL DEFAULT now(), 
   CONSTRAINT events_pkey PRIMARY KEY (id) 
 ); 
 
 CREATE TABLE IF NOT EXISTS public.people ( 
   id uuid NOT NULL DEFAULT gen_random_uuid(), 
   name text NOT NULL, 
   gender text NULL, 
   contact_info text NULL, 
   notes text NULL, 
   created_at timestamp with time zone NULL DEFAULT now(), 
   updated_at timestamp with time zone NULL DEFAULT now(), 
   identity text NULL, 
   meet_date date NULL, 
   province text NULL, 
   city text NULL, 
   industry text NULL, 
   CONSTRAINT people_pkey PRIMARY KEY (id) 
 ); 
 
 CREATE TABLE IF NOT EXISTS public.tags ( 
   id uuid NOT NULL DEFAULT gen_random_uuid(), 
   name text NOT NULL, 
   created_at timestamp with time zone NULL DEFAULT now(), 
   color text NULL DEFAULT '#3b82f6'::text, 
   CONSTRAINT tags_pkey PRIMARY KEY (id), 
   CONSTRAINT tags_name_key UNIQUE (name) 
 ); 
 
 CREATE TABLE IF NOT EXISTS public.event_participants ( 
   id uuid NOT NULL DEFAULT gen_random_uuid(), 
   event_id uuid NULL, 
   person_id uuid NULL, 
   role text NULL, 
   created_at timestamp with time zone NULL DEFAULT now(), 
   CONSTRAINT event_participants_pkey PRIMARY KEY (id), 
   CONSTRAINT event_participants_event_id_person_id_key UNIQUE (event_id, person_id), 
   CONSTRAINT event_participants_event_id_fkey FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE, 
   CONSTRAINT event_participants_person_id_fkey FOREIGN KEY (person_id) REFERENCES people (id) ON DELETE CASCADE 
 ); 
 
 CREATE TABLE IF NOT EXISTS public.person_tags ( 
   person_id uuid NOT NULL, 
   tag_id uuid NOT NULL, 
   created_at timestamp with time zone NULL DEFAULT now(), 
   CONSTRAINT person_tags_pkey PRIMARY KEY (person_id, tag_id), 
   CONSTRAINT person_tags_person_id_fkey FOREIGN KEY (person_id) REFERENCES people (id) ON DELETE CASCADE, 
   CONSTRAINT person_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE 
 ); 
 
 CREATE TABLE IF NOT EXISTS public.relationships ( 
   id uuid NOT NULL DEFAULT gen_random_uuid(), 
   person_a_id uuid NULL, 
   person_b_id uuid NULL, 
   type text NULL, 
   strength integer NULL DEFAULT 0, 
   source text NULL DEFAULT 'manual'::text, 
   created_at timestamp with time zone NULL DEFAULT now(), 
   updated_at timestamp with time zone NULL DEFAULT now(), 
   CONSTRAINT relationships_pkey PRIMARY KEY (id), 
   CONSTRAINT relationships_person_a_id_person_b_id_key UNIQUE (person_a_id, person_b_id), 
   CONSTRAINT relationships_person_a_id_fkey FOREIGN KEY (person_a_id) REFERENCES people (id) ON DELETE CASCADE, 
   CONSTRAINT relationships_person_b_id_fkey FOREIGN KEY (person_b_id) REFERENCES people (id) ON DELETE CASCADE, 
   CONSTRAINT person_order CHECK ((person_a_id < person_b_id)) 
 ); 
 
 -- ============================================= 
 -- 数据插入（注意顺序：先插入被引用的表） 
 -- ============================================= 
 
 INSERT INTO public.people (id, name, gender, contact_info, notes, created_at, updated_at, identity, meet_date, province, city, industry) VALUES 
 ('097f6855-60d8-4dfb-a2e4-99fba7424352', '陶佳律', 'Male', '', '', '2026-03-03 07:46:03.000485+00', '2026-03-03 07:46:03.000485+00', '', null, '', '', ''), 
 ('142722c5-135c-4935-9db2-a42f4590a73e', '谭志鑫', 'Male', '17570758977', '', '2026-02-28 05:23:10.149981+00', '2026-02-28 06:31:57.341804+00', null, null, null, null, null), 
 ('155ee05a-3e92-461a-970e-9808de41b701', '周祎凡', 'Male', '', '', '2026-03-03 08:02:53.060875+00', '2026-03-03 08:02:53.060875+00', '', null, '', '', ''), 
 ('24a731d3-e1a9-4de0-ab43-e8b7d27a6a6a', '伍锦康', 'Male', '', '', '2026-03-03 07:47:38.760005+00', '2026-03-03 07:47:38.760005+00', '', null, '', '', ''), 
 ('3af6dd07-c48d-4b7c-83a8-e5faabf6d370', '吴晓阳', 'Male', '', '', '2026-03-03 08:05:30.798995+00', '2026-03-03 08:05:30.798995+00', '', null, '', '', ''), 
 ('42c306a6-31db-4124-aff9-79799cc4599a', '陈杰', 'Male', '', '', '2026-03-03 08:05:15.036866+00', '2026-03-03 08:05:15.036866+00', '', null, '', '', ''), 
 ('44dfc938-e7c0-43c7-94fd-884f27e2615e', '董璟', '', '', '', '2026-03-02 08:21:01.506927+00', '2026-03-02 08:21:01.506927+00', '同学', null, '贵州省', '', ''), 
 ('5521da1f-70f2-42d9-bf5c-14f5cdcc16f3', '郑小张', 'Male', '', '', '2026-03-02 08:41:51.60809+00', '2026-03-02 08:41:51.60809+00', '同学', null, '湖南省', '邵阳市', ''), 
 ('6a61129e-919b-422b-8505-66b7865461f4', '卢文辉', 'Male', '19356524693', '', '2026-02-28 05:22:38.058328+00', '2026-02-28 06:31:48.425549+00', null, null, null, null, null), 
 ('89e66fb1-c0d4-480a-83fe-4d21a0811dd9', '刘浩', 'Male', '', '', '2026-02-28 07:56:28.645672+00', '2026-02-28 07:58:41.364877+00', '同学', null, '', '', ''), 
 ('8e53001d-0306-45d8-a741-10f385f64e2a', '肖乔涛', 'Male', '', '', '2026-03-02 08:44:18.715812+00', '2026-03-02 08:45:36.996312+00', '同学', null, '湖南省', '邵阳市', ''), 
 ('97bcca0e-a34a-4d39-8645-5aee206211cf', '王全', 'Male', '', '王权', '2026-03-03 07:44:26.380749+00', '2026-03-03 07:44:26.380749+00', '同学', null, '', '', ''), 
 ('996f4bd6-009b-4fc2-9a50-a08c33b008f5', '杨铭志', 'Male', '', '', '2026-02-28 07:59:04.353647+00', '2026-02-28 07:59:04.353647+00', '', null, '', '', ''), 
 ('9fbfebc3-8bef-436d-a3b2-a531f1d5bd81', '周慧', 'Male', '', '学弟', '2026-03-03 07:44:47.714787+00', '2026-03-03 08:04:41.336365+00', '', null, '', '', ''), 
 ('a4bc1360-44e5-4521-a2f5-735ca66da6d8', '刘洲', 'Male', '', '', '2026-03-02 08:44:39.418335+00', '2026-03-02 08:45:33.604878+00', '', null, '湖南省', '衡阳市', ''), 
 ('b49a09d7-5272-4ce5-a8f8-00d08e2656be', '胡展能', '', '', '', '2026-02-28 07:59:36.102138+00', '2026-02-28 07:59:36.102138+00', '', null, '', '', ''), 
 ('bcf91cab-2926-4cac-bece-de23b3010d45', '周双学', 'Male', '', '', '2026-03-03 07:45:51.347552+00', '2026-03-03 07:45:51.347552+00', '', null, '', '', ''), 
 ('c0f21016-8139-4ba3-917b-e5ebba14719d', '钟虢', 'Male', '', '学弟', '2026-03-03 07:45:13.119526+00', '2026-03-03 08:04:54.170039+00', '同学', null, '', '', ''), 
 ('c350ebea-b19c-4751-9857-6da0546b0ab4', '余以超', 'Male', '', '', '2026-03-02 08:42:32.056511+00', '2026-03-02 08:42:32.056511+00', '同学', null, '湖南省', '张家界市', ''), 
 ('dd340006-2820-4a38-a160-43689004b7c5', '方佳奇', 'Male', '', '', '2026-03-03 07:47:57.839341+00', '2026-03-03 07:47:57.839341+00', '', null, '', '', ''), 
 ('ecbb379f-8d1b-41cf-a38f-54f4a517bdec', '唐必腾', 'Male', '', '', '2026-02-28 07:59:23.27787+00', '2026-03-02 08:19:55.630028+00', '', null, '湖南省', '永州市', ''), 
 ('f74fbef4-af68-4bf5-9396-705d08803fdb', '凌湘', 'Male', '', '', '2026-03-03 07:48:11.961628+00', '2026-03-03 07:48:11.961628+00', '', null, '', '', ''), 
 ('f8e51a2e-c6e2-40e7-9a61-5016253ed753', '张兴宇', 'Male', '', '老张', '2026-03-02 08:19:32.580504+00', '2026-03-02 08:21:49.413219+00', '同学', null, '湖南省', '张家界市', '')
 ON CONFLICT (id) DO NOTHING; 
 
 INSERT INTO public.events (id, name, event_date, type, description, location, created_at, updated_at) VALUES 
 ('0b0a16dd-9f82-43aa-8957-7259bbef79d1', '来上海找我吃饭', '2025-09-28 00:00:00+00', '游玩', '刘浩来上海找我吃饭，我请刘浩别吃了一顿羊排，一起在上海逛了逛，并且去了水族馆，看了很多谷子店，虽然下了大雨，但也还算完美。', '上海', '2026-02-28 08:34:36.238131+00', '2026-02-28 08:35:30.003144+00'), 
 ('a88b4022-18f0-40f0-aa6f-fcae802499ff', '第二次高中同学聚会', '2026-02-24 00:00:00+00', '聚餐', '玩了两局谁是大老板、去大碗先生吃了一顿饭、去KTV唱了歌', '长沙-万家丽广场', '2026-02-28 08:27:19.955798+00', '2026-03-03 08:03:02.339202+00'), 
 ('d9df7306-9329-48c3-8dff-9b3a6ef92a33', '新年后的第一次见面', '2026-02-25 00:00:00+00', '聚餐', '吃了一顿宵夜，聊下一下现在的发展', '长沙-南塘安置小区', '2026-02-28 05:24:38.770227+00', '2026-03-02 02:23:41.22095+00')
 ON CONFLICT (id) DO NOTHING; 
 
 INSERT INTO public.tags (id, name, created_at, color) VALUES 
 ('0b7cf4d3-dc6c-4d42-8b57-2095299b10d6', '#儿时玩伴', '2026-02-28 06:31:41.205372+00', '#3b82f6'), 
 ('3f8bc27c-eecf-4a57-9b9c-bce574ff4a3d', '#高中同学', '2026-02-28 07:58:28.935482+00', '#3bf78c'), 
 ('c18a7c6c-c492-485a-a3a2-9bd8d105ec46', '# 高中学弟', '2026-03-03 08:04:13.503264+00', '#3ef73b'), 
 ('e6e4d33e-dbc2-4169-8df0-2e554b6e0f89', '#大学同学', '2026-02-28 07:58:19.812406+00', '#f7a93b')
 ON CONFLICT (id) DO NOTHING; 
 
 INSERT INTO public.event_participants (id, event_id, person_id, role, created_at) VALUES 
 ('18cf389c-033b-4ba3-9796-33c919393b0a', 'a88b4022-18f0-40f0-aa6f-fcae802499ff', 'c0f21016-8139-4ba3-917b-e5ebba14719d', null, '2026-03-03 08:03:02.743561+00'), 
 ('22c47a30-12bb-4c00-a019-66910f7968bf', 'a88b4022-18f0-40f0-aa6f-fcae802499ff', 'bcf91cab-2926-4cac-bece-de23b3010d45', null, '2026-03-03 08:03:02.743561+00'), 
 ('322a70c8-1964-4eba-b33a-6e0c33d8c6d3', 'a88b4022-18f0-40f0-aa6f-fcae802499ff', '9fbfebc3-8bef-436d-a3b2-a531f1d5bd81', null, '2026-03-03 08:03:02.743561+00'), 
 ('332ae9b7-3708-4f11-8717-20a765d816df', 'a88b4022-18f0-40f0-aa6f-fcae802499ff', '97bcca0e-a34a-4d39-8645-5aee206211cf', null, '2026-03-03 08:03:02.743561+00'), 
 ('58ab1811-1f1e-4770-bade-70411f9c1a95', '0b0a16dd-9f82-43aa-8957-7259bbef79d1', '89e66fb1-c0d4-480a-83fe-4d21a0811dd9', null, '2026-02-28 08:35:30.565999+00'), 
 ('8769bccd-73f5-4204-8932-8b60a915d11d', 'a88b4022-18f0-40f0-aa6f-fcae802499ff', '89e66fb1-c0d4-480a-83fe-4d21a0811dd9', null, '2026-03-03 08:03:02.743561+00'), 
 ('aa60afae-41b6-409b-9a8d-f288bb7964c1', 'a88b4022-18f0-40f0-aa6f-fcae802499ff', '155ee05a-3e92-461a-970e-9808de41b701', null, '2026-03-03 08:03:02.743561+00'), 
 ('dcfcf4d9-e008-4fa4-81e4-3ac741aa8fa7', 'd9df7306-9329-48c3-8dff-9b3a6ef92a33', '6a61129e-919b-422b-8505-66b7865461f4', null, '2026-03-02 02:23:41.662729+00'), 
 ('e179853e-1b12-4ae9-b36f-08658db5ba81', 'd9df7306-9329-48c3-8dff-9b3a6ef92a33', '142722c5-135c-4935-9db2-a42f4590a73e', null, '2026-03-02 02:23:41.662729+00')
 ON CONFLICT (id) DO NOTHING; 
 
 INSERT INTO public.person_tags (person_id, tag_id, created_at) VALUES 
 ('097f6855-60d8-4dfb-a2e4-99fba7424352', '3f8bc27c-eecf-4a57-9b9c-bce574ff4a3d', '2026-03-03 07:46:03.227543+00'), 
 ('142722c5-135c-4935-9db2-a42f4590a73e', '0b7cf4d3-dc6c-4d42-8b57-2095299b10d6', '2026-02-28 06:31:57.814775+00'), 
 ('155ee05a-3e92-461a-970e-9808de41b701', '3f8bc27c-eecf-4a57-9b9c-bce574ff4a3d', '2026-03-03 08:02:53.287835+00'), 
 ('24a731d3-e1a9-4de0-ab43-e8b7d27a6a6a', '3f8bc27c-eecf-4a57-9b9c-bce574ff4a3d', '2026-03-03 07:47:39.08291+00'), 
 ('3af6dd07-c48d-4b7c-83a8-e5faabf6d370', '0b7cf4d3-dc6c-4d42-8b57-2095299b10d6', '2026-03-03 08:05:31.134556+00'), 
 ('42c306a6-31db-4124-aff9-79799cc4599a', '0b7cf4d3-dc6c-4d42-8b57-2095299b10d6', '2026-03-03 08:05:15.226599+00'), 
 ('44dfc938-e7c0-43c7-94fd-884f27e2615e', 'e6e4d33e-dbc2-4169-8df0-2e554b6e0f89', '2026-03-02 08:21:01.72203+00'), 
 ('5521da1f-70f2-42d9-bf5c-14f5cdcc16f3', 'e6e4d33e-dbc2-4169-8df0-2e554b6e0f89', '2026-03-02 08:41:52.112053+00'), 
 ('6a61129e-919b-422b-8505-66b7865461f4', '0b7cf4d3-dc6c-4d42-8b57-2095299b10d6', '2026-02-28 06:31:49.009572+00'), 
 ('89e66fb1-c0d4-480a-83fe-4d21a0811dd9', '3f8bc27c-eecf-4a57-9b9c-bce574ff4a3d', '2026-02-28 07:58:41.883117+00'), 
 ('89e66fb1-c0d4-480a-83fe-4d21a0811dd9', 'e6e4d33e-dbc2-4169-8df0-2e554b6e0f89', '2026-02-28 07:58:41.883117+00'), 
 ('8e53001d-0306-45d8-a741-10f385f64e2a', 'e6e4d33e-dbc2-4169-8df0-2e554b6e0f89', '2026-03-02 08:45:37.400012+00'), 
 ('97bcca0e-a34a-4d39-8645-5aee206211cf', '3f8bc27c-eecf-4a57-9b9c-bce574ff4a3d', '2026-03-03 07:44:27.17995+00'), 
 ('996f4bd6-009b-4fc2-9a50-a08c33b008f5', '3f8bc27c-eecf-4a57-9b9c-bce574ff4a3d', '2026-02-28 07:59:04.520467+00'), 
 ('996f4bd6-009b-4fc2-9a50-a08c33b008f5', 'e6e4d33e-dbc2-4169-8df0-2e554b6e0f89', '2026-02-28 07:59:04.520467+00'), 
 ('9fbfebc3-8bef-436d-a3b2-a531f1d5bd81', 'c18a7c6c-c492-485a-a3a2-9bd8d105ec46', '2026-03-03 08:04:42.178386+00'), 
 ('a4bc1360-44e5-4521-a2f5-735ca66da6d8', 'e6e4d33e-dbc2-4169-8df0-2e554b6e0f89', '2026-03-02 08:45:34.025139+00'), 
 ('b49a09d7-5272-4ce5-a8f8-00d08e2656be', '3f8bc27c-eecf-4a57-9b9c-bce574ff4a3d', '2026-02-28 07:59:36.283349+00'), 
 ('bcf91cab-2926-4cac-bece-de23b3010d45', '3f8bc27c-eecf-4a57-9b9c-bce574ff4a3d', '2026-03-03 07:45:51.560431+00'), 
 ('c0f21016-8139-4ba3-917b-e5ebba14719d', 'c18a7c6c-c492-485a-a3a2-9bd8d105ec46', '2026-03-03 08:04:55.678781+00'), 
 ('c350ebea-b19c-4751-9857-6da0546b0ab4', 'e6e4d33e-dbc2-4169-8df0-2e554b6e0f89', '2026-03-02 08:42:32.621844+00'), 
 ('dd340006-2820-4a38-a160-43689004b7c5', '3f8bc27c-eecf-4a57-9b9c-bce574ff4a3d', '2026-03-03 07:47:58.041419+00'), 
 ('ecbb379f-8d1b-41cf-a38f-54f4a517bdec', 'e6e4d33e-dbc2-4169-8df0-2e554b6e0f89', '2026-03-02 08:19:56.217709+00'), 
 ('f74fbef4-af68-4bf5-9396-705d08803fdb', '3f8bc27c-eecf-4a57-9b9c-bce574ff4a3d', '2026-03-03 07:48:12.195169+00'), 
 ('f8e51a2e-c6e2-40e7-9a61-5016253ed753', 'e6e4d33e-dbc2-4169-8df0-2e554b6e0f89', '2026-03-02 08:21:49.91926+00')
 ON CONFLICT (person_id, tag_id) DO NOTHING;
