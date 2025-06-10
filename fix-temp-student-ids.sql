-- 临时学号修复脚本
-- 生成时间: 2025-06-08T05:16:12.827Z
-- 匹配学生数: 39
-- 新建学生数: 88

BEGIN;

-- ===== 第一部分: 创建缺失的学生记录 =====

-- 创建新学生记录
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230103', '占学乾', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230104', '郭寅麒', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230105', '刘梓潘', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230106', '陈止庸', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230107', '赵普胤', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230108', '刘栩芸', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230109', '陈思远', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230110', '刘梓灏', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230111', '蔡意超', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230112', '瞿天宇', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230113', '朱舒荣', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230114', '闵岩', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230115', '程义涵', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230116', '蔡雅欣', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230117', '黄雅煊', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230118', '梁华华', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230119', '甘奇坤', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230120', '黄梓豪', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230121', '罗宇涵', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230122', '陈家栋', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230123', '张琢', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230124', '袁梓沐', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230125', '李思颖', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230126', '陈韵颖', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230127', '黄楹欣', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230128', '黎博远', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230129', '林峻宇', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230130', '黄馨莹', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230131', '蔡淳睿', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230132', '梁碧莹', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230133', '郑洁玲', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230134', '王丹悦', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230135', '曾沛如', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230136', '黄祺伟', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230137', '李嘉豪', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230138', '莫凡', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230139', '吴苑灵', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230140', '李骏宸', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230141', '何雅韵', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230142', '常晨', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230143', '刘悦', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230144', '丘泽恒', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230145', '林创鸿', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230146', '肖享悦', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230147', '郝紫陌', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230148', '江宇涵', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230149', '唐方宇', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230150', '许嘉烨', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230151', '丁晨曦', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230152', '陈道霖', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230153', '钟媛莹', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230154', '朱政灏', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230155', '唐韵寒', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230156', '王霆筠', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230157', '易天佑', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230158', '谷沪文', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230159', '黄乐雅', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230160', '余梓彦', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230161', '丁玺菡', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230162', '刘雅昕', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230163', '赵乐凯', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230164', '方沃森', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230165', '冯璟雯', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230166', '郑力升', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230167', '庄楚仪', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230168', '杜嘉', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230169', '李星德', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230170', '唐雨嘉', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230171', '胡瑞', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230172', '巫佳浩', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230173', '陈思宇', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230174', '麦家铭', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230175', '闭芷宁', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230176', '蒋紫仪', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230177', '罗浩钦', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230178', '黄奕可', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230179', '黄云川', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230180', '陈芷欣', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230181', '蔡锦程', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230182', '周紫涵', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230183', '肖思阳', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230184', '黄梦婷', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230185', '赖雨欣', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230186', '方诗琦', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230187', '崔媛熙', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230188', '陈安然', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230189', '陈燕', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;
INSERT INTO students (student_id, name, class_name, created_at, updated_at) 
VALUES ('000020230190', '黄凯文', NULL, NOW(), NOW())
ON CONFLICT (student_id) DO NOTHING;

-- ===== 第二部分: 更新grade_data表中的临时学号 =====

-- 更新可匹配的学生学号
UPDATE grade_data SET student_id = '000020230103' WHERE student_id = 'temp_1749229758764_0';
UPDATE grade_data SET student_id = '000020230104' WHERE student_id = 'temp_1749229758765_1';
UPDATE grade_data SET student_id = '000020230105' WHERE student_id = 'temp_1749229758765_2';
UPDATE grade_data SET student_id = '000020230106' WHERE student_id = 'temp_1749229758766_3';
UPDATE grade_data SET student_id = '000020230107' WHERE student_id = 'temp_1749229758766_4';
UPDATE grade_data SET student_id = '000020230108' WHERE student_id = 'temp_1749229758766_5';
UPDATE grade_data SET student_id = '000020230109' WHERE student_id = 'temp_1749229758766_6';
UPDATE grade_data SET student_id = '000020230110' WHERE student_id = 'temp_1749229758767_7';
UPDATE grade_data SET student_id = '000020230111' WHERE student_id = 'temp_1749229758767_8';
UPDATE grade_data SET student_id = '000020230112' WHERE student_id = 'temp_1749229758767_9';
UPDATE grade_data SET student_id = '000020230113' WHERE student_id = 'temp_1749229758768_10';
UPDATE grade_data SET student_id = '000020230114' WHERE student_id = 'temp_1749229758768_11';
UPDATE grade_data SET student_id = '000020230115' WHERE student_id = 'temp_1749229758768_12';
UPDATE grade_data SET student_id = '000020230116' WHERE student_id = 'temp_1749229758768_13';
UPDATE grade_data SET student_id = '000020230117' WHERE student_id = 'temp_1749229758769_14';
UPDATE grade_data SET student_id = '000020230143' WHERE student_id = 'temp_1749229758772_40';
UPDATE grade_data SET student_id = '000020230144' WHERE student_id = 'temp_1749229758772_41';
UPDATE grade_data SET student_id = '000020230145' WHERE student_id = 'temp_1749229758772_42';
UPDATE grade_data SET student_id = '000020230146' WHERE student_id = 'temp_1749229758772_43';
UPDATE grade_data SET student_id = '000020230147' WHERE student_id = 'temp_1749229758772_44';
UPDATE grade_data SET student_id = '000020230148' WHERE student_id = 'temp_1749229758772_45';
UPDATE grade_data SET student_id = '000020230149' WHERE student_id = 'temp_1749229758773_46';
UPDATE grade_data SET student_id = '000020230150' WHERE student_id = 'temp_1749229758773_47';
UPDATE grade_data SET student_id = '000020230151' WHERE student_id = 'temp_1749229758773_48';
UPDATE grade_data SET student_id = '000020230152' WHERE student_id = 'temp_1749229758773_49';
UPDATE grade_data SET student_id = '000020230153' WHERE student_id = 'temp_1749229758773_50';
UPDATE grade_data SET student_id = '000020230154' WHERE student_id = 'temp_1749229758773_51';
UPDATE grade_data SET student_id = '000020230155' WHERE student_id = 'temp_1749229758773_52';
UPDATE grade_data SET student_id = '000020230156' WHERE student_id = 'temp_1749229758773_53';
UPDATE grade_data SET student_id = '000020230157' WHERE student_id = 'temp_1749229758774_54';
UPDATE grade_data SET student_id = '000020230158' WHERE student_id = 'temp_1749229758774_55';
UPDATE grade_data SET student_id = '000020230159' WHERE student_id = 'temp_1749229758774_56';
UPDATE grade_data SET student_id = '000020230160' WHERE student_id = 'temp_1749229758774_57';
UPDATE grade_data SET student_id = '000020230161' WHERE student_id = 'temp_1749229758774_58';
UPDATE grade_data SET student_id = '000020230162' WHERE student_id = 'temp_1749229758774_59';
UPDATE grade_data SET student_id = '000020230163' WHERE student_id = 'temp_1749229758774_60';
UPDATE grade_data SET student_id = '000020230164' WHERE student_id = 'temp_1749229758774_61';
UPDATE grade_data SET student_id = '000020230165' WHERE student_id = 'temp_1749229758775_62';
UPDATE grade_data SET student_id = '108110907002' WHERE student_id = 'temp_1749229758800_251';

-- 更新新建学生的学号
UPDATE grade_data SET student_id = '000020230103' WHERE student_id = 'temp_1749229758800_250';
UPDATE grade_data SET student_id = '000020230104' WHERE student_id = 'temp_1749229758800_252';
UPDATE grade_data SET student_id = '000020230105' WHERE student_id = 'temp_1749229758775_63';
UPDATE grade_data SET student_id = '000020230106' WHERE student_id = 'temp_1749229758775_64';
UPDATE grade_data SET student_id = '000020230107' WHERE student_id = 'temp_1749229758775_65';
UPDATE grade_data SET student_id = '000020230108' WHERE student_id = 'temp_1749229758775_66';
UPDATE grade_data SET student_id = '000020230109' WHERE student_id = 'temp_1749229758775_67';
UPDATE grade_data SET student_id = '000020230110' WHERE student_id = 'temp_1749229758775_68';
UPDATE grade_data SET student_id = '000020230111' WHERE student_id = 'temp_1749229758776_69';
UPDATE grade_data SET student_id = '000020230112' WHERE student_id = 'temp_1749229758776_70';
UPDATE grade_data SET student_id = '000020230113' WHERE student_id = 'temp_1749229758776_71';
UPDATE grade_data SET student_id = '000020230114' WHERE student_id = 'temp_1749229758776_72';
UPDATE grade_data SET student_id = '000020230115' WHERE student_id = 'temp_1749229758776_73';
UPDATE grade_data SET student_id = '000020230116' WHERE student_id = 'temp_1749229758776_74';
UPDATE grade_data SET student_id = '000020230117' WHERE student_id = 'temp_1749229758776_75';
UPDATE grade_data SET student_id = '000020230118' WHERE student_id = 'temp_1749229758776_76';
UPDATE grade_data SET student_id = '000020230119' WHERE student_id = 'temp_1749229758777_77';
UPDATE grade_data SET student_id = '000020230120' WHERE student_id = 'temp_1749229758777_78';
UPDATE grade_data SET student_id = '000020230121' WHERE student_id = 'temp_1749229758777_79';
UPDATE grade_data SET student_id = '000020230122' WHERE student_id = 'temp_1749229758778_80';
UPDATE grade_data SET student_id = '000020230123' WHERE student_id = 'temp_1749229758778_81';
UPDATE grade_data SET student_id = '000020230124' WHERE student_id = 'temp_1749229758778_82';
UPDATE grade_data SET student_id = '000020230125' WHERE student_id = 'temp_1749229758779_83';
UPDATE grade_data SET student_id = '000020230126' WHERE student_id = 'temp_1749229758779_84';
UPDATE grade_data SET student_id = '000020230127' WHERE student_id = 'temp_1749229758779_85';
UPDATE grade_data SET student_id = '000020230128' WHERE student_id = 'temp_1749229758779_86';
UPDATE grade_data SET student_id = '000020230129' WHERE student_id = 'temp_1749229758780_87';
UPDATE grade_data SET student_id = '000020230130' WHERE student_id = 'temp_1749229758780_88';
UPDATE grade_data SET student_id = '000020230131' WHERE student_id = 'temp_1749229758780_89';
UPDATE grade_data SET student_id = '000020230132' WHERE student_id = 'temp_1749229758780_90';
UPDATE grade_data SET student_id = '000020230133' WHERE student_id = 'temp_1749229758780_91';
UPDATE grade_data SET student_id = '000020230134' WHERE student_id = 'temp_1749229758780_92';
UPDATE grade_data SET student_id = '000020230135' WHERE student_id = 'temp_1749229758780_93';
UPDATE grade_data SET student_id = '000020230136' WHERE student_id = 'temp_1749229758780_94';
UPDATE grade_data SET student_id = '000020230137' WHERE student_id = 'temp_1749229758781_95';
UPDATE grade_data SET student_id = '000020230138' WHERE student_id = 'temp_1749229758781_96';
UPDATE grade_data SET student_id = '000020230139' WHERE student_id = 'temp_1749229758781_97';
UPDATE grade_data SET student_id = '000020230140' WHERE student_id = 'temp_1749229758781_98';
UPDATE grade_data SET student_id = '000020230141' WHERE student_id = 'temp_1749229758781_99';
UPDATE grade_data SET student_id = '000020230142' WHERE student_id = 'temp_1749229758781_100';
UPDATE grade_data SET student_id = '000020230143' WHERE student_id = 'temp_1749229758781_101';
UPDATE grade_data SET student_id = '000020230144' WHERE student_id = 'temp_1749229758781_102';
UPDATE grade_data SET student_id = '000020230145' WHERE student_id = 'temp_1749229758782_103';
UPDATE grade_data SET student_id = '000020230146' WHERE student_id = 'temp_1749229758782_104';
UPDATE grade_data SET student_id = '000020230147' WHERE student_id = 'temp_1749229758782_105';
UPDATE grade_data SET student_id = '000020230148' WHERE student_id = 'temp_1749229758782_106';
UPDATE grade_data SET student_id = '000020230149' WHERE student_id = 'temp_1749229758782_107';
UPDATE grade_data SET student_id = '000020230150' WHERE student_id = 'temp_1749229758782_108';
UPDATE grade_data SET student_id = '000020230151' WHERE student_id = 'temp_1749229758782_109';
UPDATE grade_data SET student_id = '000020230152' WHERE student_id = 'temp_1749229758782_110';
UPDATE grade_data SET student_id = '000020230153' WHERE student_id = 'temp_1749229758783_111';
UPDATE grade_data SET student_id = '000020230154' WHERE student_id = 'temp_1749229758783_112';
UPDATE grade_data SET student_id = '000020230155' WHERE student_id = 'temp_1749229758783_113';
UPDATE grade_data SET student_id = '000020230156' WHERE student_id = 'temp_1749229758783_114';
UPDATE grade_data SET student_id = '000020230157' WHERE student_id = 'temp_1749229758783_115';
UPDATE grade_data SET student_id = '000020230158' WHERE student_id = 'temp_1749229758783_116';
UPDATE grade_data SET student_id = '000020230159' WHERE student_id = 'temp_1749229758783_117';
UPDATE grade_data SET student_id = '000020230160' WHERE student_id = 'temp_1749229758783_118';
UPDATE grade_data SET student_id = '000020230161' WHERE student_id = 'temp_1749229758784_119';
UPDATE grade_data SET student_id = '000020230162' WHERE student_id = 'temp_1749229758784_120';
UPDATE grade_data SET student_id = '000020230163' WHERE student_id = 'temp_1749229758784_121';
UPDATE grade_data SET student_id = '000020230164' WHERE student_id = 'temp_1749229758784_122';
UPDATE grade_data SET student_id = '000020230165' WHERE student_id = 'temp_1749229758784_123';
UPDATE grade_data SET student_id = '000020230166' WHERE student_id = 'temp_1749229758784_124';
UPDATE grade_data SET student_id = '000020230167' WHERE student_id = 'temp_1749229758807_312';
UPDATE grade_data SET student_id = '000020230168' WHERE student_id = 'temp_1749229758807_313';
UPDATE grade_data SET student_id = '000020230169' WHERE student_id = 'temp_1749229758807_314';
UPDATE grade_data SET student_id = '000020230170' WHERE student_id = 'temp_1749229758784_125';
UPDATE grade_data SET student_id = '000020230171' WHERE student_id = 'temp_1749229758785_126';
UPDATE grade_data SET student_id = '000020230172' WHERE student_id = 'temp_1749229758785_127';
UPDATE grade_data SET student_id = '000020230173' WHERE student_id = 'temp_1749229758785_128';
UPDATE grade_data SET student_id = '000020230174' WHERE student_id = 'temp_1749229758785_129';
UPDATE grade_data SET student_id = '000020230175' WHERE student_id = 'temp_1749229758785_130';
UPDATE grade_data SET student_id = '000020230176' WHERE student_id = 'temp_1749229758785_131';
UPDATE grade_data SET student_id = '000020230177' WHERE student_id = 'temp_1749229758785_132';
UPDATE grade_data SET student_id = '000020230178' WHERE student_id = 'temp_1749229758786_133';
UPDATE grade_data SET student_id = '000020230179' WHERE student_id = 'temp_1749229758786_134';
UPDATE grade_data SET student_id = '000020230180' WHERE student_id = 'temp_1749229758786_135';
UPDATE grade_data SET student_id = '000020230181' WHERE student_id = 'temp_1749229758786_136';
UPDATE grade_data SET student_id = '000020230182' WHERE student_id = 'temp_1749229758786_137';
UPDATE grade_data SET student_id = '000020230183' WHERE student_id = 'temp_1749229758786_138';
UPDATE grade_data SET student_id = '000020230184' WHERE student_id = 'temp_1749229758786_139';
UPDATE grade_data SET student_id = '000020230185' WHERE student_id = 'temp_1749229758786_140';
UPDATE grade_data SET student_id = '000020230186' WHERE student_id = 'temp_1749229758787_141';
UPDATE grade_data SET student_id = '000020230187' WHERE student_id = 'temp_1749229758787_142';
UPDATE grade_data SET student_id = '000020230188' WHERE student_id = 'temp_1749229758787_143';
UPDATE grade_data SET student_id = '000020230189' WHERE student_id = 'temp_1749229758787_144';
UPDATE grade_data SET student_id = '000020230190' WHERE student_id = 'temp_1749229758787_145';

-- ===== 第三部分: 验证修复结果 =====
SELECT 
  COUNT(*) as remaining_temp_ids,
  COUNT(DISTINCT student_id) as unique_temp_ids
FROM grade_data 
WHERE student_id LIKE 'temp_%';

-- 显示修复后的学生数统计
SELECT 
  COUNT(DISTINCT student_id) as total_students,
  COUNT(*) as total_records
FROM grade_data;

COMMIT;

-- 如果出现问题，可以执行 ROLLBACK; 来回滚更改
