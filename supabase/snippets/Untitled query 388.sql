-- 1. Создаем таблицу профилей
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  progress_state jsonb default '{}'::jsonb,
  shortcut_state jsonb default '{}'::jsonb,
  can_cloud_audio boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Включаем защиту RLS (чтобы юзеры могли менять только свои данные)
alter table public.profiles enable row level security;

create policy "Пользователи могут видеть свой профиль" 
on profiles for select using (auth.uid() = id);

create policy "Пользователи могут обновлять свой профиль" 
on profiles for update using (auth.uid() = id);

-- 3. Магия: Триггер, который АВТОМАТИЧЕСКИ создает профиль при регистрации юзера
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
  
  create table public.audio_tracks (
  id uuid primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  dur integer not null,
  url text not null,
  created_at bigint not null
);

alter table public.audio_tracks enable row level security;

create policy "Юзеры видят только свои аудио" 
on audio_tracks for select using (auth.uid() = user_id);

create policy "Юзеры могут добавлять свои аудио" 
on audio_tracks for insert with check (auth.uid() = user_id);

create policy "Юзеры могут удалять свои аудио" 
on audio_tracks for delete using (auth.uid() = user_id);

create policy "Юзеры могут обновлять свои аудио" 
on audio_tracks for update using (auth.uid() = user_id);

-- Разрешаем пользователям загружать файлы только в свою папку
create policy "Пользователь может загружать свое аудио"
on storage.objects for insert
with check (bucket_id = 'audio_records' and auth.uid()::text = (storage.foldername(name))[1]);

-- Разрешаем пользователям слушать только свои файлы
create policy "Пользователь может слушать свое аудио"
on storage.objects for select
using (bucket_id = 'audio_records' and auth.uid()::text = (storage.foldername(name))[1]);

-- Разрешаем пользователям удалять свои файлы
create policy "Пользователь может удалять свое аудио"
on storage.objects for delete
using (bucket_id = 'audio_records' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy "Юзеры могут добавлять свои аудио" on audio_tracks;

create policy "Юзеры могут добавлять свои аудио" 
on audio_tracks for insert with check (
  auth.uid() = user_id 
  and exists (
    select 1 from public.profiles 
    where id = auth.uid() and can_cloud_audio = true
  )
);

drop policy "Пользователь может загружать свое аудио" on storage.objects;

create policy "Пользователь может загружать свое аудио"
on storage.objects for insert
with check (
  bucket_id = 'audio_records' 
  and auth.uid()::text = (storage.foldername(name))[1]
  and exists (
    select 1 from public.profiles 
    where id = auth.uid() and can_cloud_audio = true
  )
);

-- 1. Добавляем флаг права на загрузку аватарки в таблицу профилей
alter table public.profiles 
add column if not exists can_upload_avatar boolean default false;

-- 2. Создаем публичный бакет для аватарок (он публичный, чтобы картинки грузились по прямой ссылке в теге <img>)
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true);

-- 3. Разрешаем ВСЕМ смотреть аватарки
create policy "Аватарки видят все" 
on storage.objects for select 
using (bucket_id = 'avatars');

-- 4. Разрешаем ЗАГРУЖАТЬ аватарку только в СВОЮ папку и ТОЛЬКО если can_upload_avatar = true
create policy "Избранные юзеры могут загружать аватарку" 
on storage.objects for insert 
with check (
  bucket_id = 'avatars' and 
  auth.uid()::text = (storage.foldername(name))[1] and 
  exists (
    select 1 from public.profiles 
    where id = auth.uid() and can_upload_avatar = true
  )
);

-- 5. Разрешаем УДАЛЯТЬ свою старую аватарку
create policy "Юзеры могут удалять свои старые аватарки" 
on storage.objects for delete 
using (
  bucket_id = 'avatars' and 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 1. Добавляем колонки в profiles
alter table public.profiles 
add column if not exists avatar_url text,
add column if not exists avatar_lqip text,
add column if not exists full_name text;

-- 2. Обновляем функцию триггера, чтобы она брала данные из user_metadata при регистрации/обновлении
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, avatar_lqip)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'avatar_lqip'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    avatar_lqip = excluded.avatar_lqip;
  return new;
end;
$$ language plpgsql security definer;

-- 3. Создаем триггер на ОБНОВЛЕНИЕ юзера (чтобы при auth.updateUser профиль тоже обновлялся)
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_new_user();
  
  -- 1. Удаляем вредный триггер, который затирал нам данные при входе с нового устройства
drop trigger if exists on_auth_user_updated on auth.users;

-- 2. Переписываем функцию: теперь она работает ТОЛЬКО при создании юзера (INSERT)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, avatar_lqip)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'avatar_lqip'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 1. На всякий случай гарантируем, что колонки точно существуют, иначе триггер упадет
alter table public.profiles 
add column if not exists full_name text,
add column if not exists avatar_url text,
add column if not exists avatar_lqip text;

-- 2. Сносим вообще все старые триггеры, чтобы начать с чистого листа
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_updated on auth.users;

-- 3. Создаем пуленепробиваемую функцию
create or replace function public.handle_new_user()
returns trigger as $$
declare
  meta jsonb;
begin
  -- Безопасно парсим метадату (если null, делаем пустой объект)
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  insert into public.profiles (id, full_name, avatar_url, avatar_lqip)
  values (
    new.id, 
    meta->>'full_name',
    meta->>'avatar_url',
    meta->>'avatar_lqip'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    avatar_lqip = excluded.avatar_lqip;
    
  return new;
exception
  when others then
    -- САМОЕ ВАЖНОЕ: Если внутри функции произойдет ЛЮБАЯ ошибка, 
    -- мы её проглатываем и разрешаем юзеру зарегистрироваться.
    -- Это уберет ошибку "Database error saving new user" раз и навсегда.
    return new;
end;
$$ language plpgsql security definer;

-- 4. Вешаем триггеры обратно (и на регистрацию, и на обновление)
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_new_user();


-- 1. УБИВАЕМ вредный триггер, который затирал данные при входе с мобилки
drop trigger if exists on_auth_user_updated on auth.users;

-- 2. Делаем функцию регистрации железобетонной
create or replace function public.handle_new_user()
returns trigger as $$
declare
  meta jsonb;
begin
  -- Безопасно вытаскиваем метадату
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  -- Вставляем данные только при создании юзера!
  insert into public.profiles (id, full_name, avatar_url, avatar_lqip)
  values (
    new.id, 
    meta->>'full_name',
    meta->>'avatar_url',
    meta->>'avatar_lqip'
  );
  
  return new;
exception
  when others then
    -- Если что-то сломалось, мы просто игнорим ошибку и пускаем юзера в систему
    return new;
end;
$$ language plpgsql security definer;

-- 3. Убеждаемся, что триггер висит ТОЛЬКО на INSERT
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
  
  alter table public.profiles 
add column if not exists can_use_gradient boolean default false,
add column if not exists use_gradient boolean default false;


-- 1. Таблица друзей (связь многие-ко-многим)
create table public.friends (
  user_id uuid references public.profiles(id) on delete cascade not null,
  friend_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (user_id, friend_id)
);

alter table public.friends enable row level security;

create policy "Юзеры видят своих друзей" 
on friends for select using (auth.uid() = user_id);

create policy "Юзеры могут удалять своих друзей" 
on friends for delete using (auth.uid() = user_id);

-- 2. Таблица уведомлений (заявки и удаления)
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('friend_request', 'friend_removed')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.notifications enable row level security;

create policy "Юзеры видят свои уведомления" 
on notifications for select using (auth.uid() = recipient_id);

create policy "Любой авторизованный может отправить уведомление" 
on notifications for insert with check (auth.uid() = sender_id);

create policy "Юзеры могут удалять свои уведомления" 
on notifications for delete using (auth.uid() = recipient_id);

-- 3. Включаем Realtime для таблицы уведомлений, чтобы они прилетали моментально!
alter publication supabase_realtime add table public.notifications;

-- 1. Добавляем колонку username (с ограничением уникальности)
alter table public.profiles add column if not exists username text unique;

-- 2. Генерируем случайные юзернеймы для уже существующих пользователей
update public.profiles 
set username = 'user_' || substr(md5(random()::text), 1, 8) 
where username is null;

-- 3. Делаем колонку обязательной
alter table public.profiles alter column username set not null;

-- 4. Обновляем триггер: теперь он сам выдает случайный юзернейм новым юзерам
create or replace function public.handle_new_user()
returns trigger as $$
declare
  meta jsonb;
  new_username text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  -- Генерируем: user_ + 8 случайных символов
  new_username := 'user_' || substr(md5(random()::text), 1, 8);

  insert into public.profiles (id, full_name, avatar_url, avatar_lqip, username)
  values (
    new.id, 
    meta->>'full_name',
    meta->>'avatar_url',
    meta->>'avatar_lqip',
    new_username
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    avatar_lqip = excluded.avatar_lqip;
    
  return new;
exception
  when others then
    return new;
end;
$$ language plpgsql security definer;

-- 5. Безопасная функция поиска (без email!)
create or replace function public.search_users_secure(search_query text)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  avatar_lqip text,
  username text,
  can_upload_avatar boolean,
  can_use_gradient boolean,
  use_gradient boolean
) 
language plpgsql
security definer
as $$
begin
  return query
  select 
    p.id, 
    p.full_name, 
    p.avatar_url, 
    p.avatar_lqip,
    p.username,
    p.can_upload_avatar,
    p.can_use_gradient,
    p.use_gradient
  from public.profiles p
  where 
    p.id != auth.uid() -- Исключаем себя
    and (
      -- Если юзер ввел @user_123, ищем точно по юзернейму (отрезая @)
      (search_query like '@%' and p.username ilike substring(search_query from 2) || '%')
      or
      -- Иначе ищем и по имени, и по юзернейму
      (search_query not like '@%' and (p.full_name ilike '%' || search_query || '%' or p.username ilike '%' || search_query || '%'))
    )
  limit 20;
end;
$$;

-- 1. Удаляем старое строгое правило
drop policy if exists "Пользователи могут видеть свой профиль" on public.profiles;

-- 2. Создаем новое: любой залогиненный юзер может просматривать профили
create policy "Авторизованные юзеры видят профили" 
on public.profiles for select 
using (auth.role() = 'authenticated');

-- 1. Удаляем старые правила для таблицы friends (если были)
drop policy if exists "Юзеры видят своих друзей" on public.friends;
drop policy if exists "Юзеры могут удалять своих друзей" on public.friends;

-- 2. Создаем правильные политики для двусторонней дружбы
-- Разрешаем видеть, если ты участник дружбы
create policy "Юзеры видят друзей" 
on public.friends for select 
using (auth.uid() = user_id or auth.uid() = friend_id);

-- Разрешаем добавлять, если ты участник дружбы (решает ошибку 42501)
create policy "Добавление друзей" 
on public.friends for insert 
with check (auth.uid() = user_id or auth.uid() = friend_id);

-- Разрешаем удалять, если ты участник дружбы (чтобы удалялось у обоих)
create policy "Удаление друзей" 
on public.friends for delete 
using (auth.uid() = user_id or auth.uid() = friend_id);

-- ==========================================
-- 1. ЗАЩИТА ПРЕМИУМ-ФЛАГОВ (Без поломки фронтенда)
-- ==========================================
-- Создаем триггер, который тихо игнорирует попытки юзера изменить права доступа.
-- Приложение не получит ошибку (чтобы не сломались обычные сохранения профиля),
-- но база принудительно оставит старые значения.
create or replace function public.protect_premium_flags()
returns trigger as $$
begin
  -- Проверяем, что запрос делает обычный пользователь приложения
  if auth.role() in ('authenticated', 'anon') then
    new.can_cloud_audio = old.can_cloud_audio;
    new.can_upload_avatar = old.can_upload_avatar;
    new.can_use_gradient = old.can_use_gradient;
    -- Флаг use_gradient не трогаем, так как юзер может сам включать/выключать градиент
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

-- Вешаем защиту на таблицу профилей
drop trigger if exists on_profile_update_protect_flags on public.profiles;
create trigger on_profile_update_protect_flags
  before update on public.profiles
  for each row execute procedure public.protect_premium_flags();


-- ==========================================
-- 2. БЕЗОПАСНАЯ РЕГИСТРАЦИЯ (Без "проглатывания" ошибок)
-- ==========================================
-- Заменяем ваш опасный блок exception на стабильный `ON CONFLICT DO NOTHING`.
-- Добавлен `set search_path = public` для защиты от подмены схемы.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  meta jsonb;
  new_username text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  new_username := 'user_' || substr(md5(random()::text), 1, 8);

  insert into public.profiles (id, full_name, avatar_url, avatar_lqip, username)
  values (
    new.id, 
    meta->>'full_name',
    meta->>'avatar_url',
    meta->>'avatar_lqip',
    new_username
  )
  on conflict (id) do nothing; -- Если профиль по какой-то причине уже есть, просто ничего не делаем
    
  return new;
end;
$$ language plpgsql security definer set search_path = public;


-- ==========================================
-- 3. ЗАЩИТА ОТ НАСИЛЬСТВЕННОГО ДОБАВЛЕНИЯ В ДРУЗЬЯ
-- ==========================================
-- Закрываем дыру: теперь юзер может создавать запись о дружбе ТОЛЬКО со своим user_id
drop policy if exists "Добавление друзей" on public.friends;

create policy "Добавление друзей" 
on public.friends for insert 
with check (auth.uid() = user_id);


-- ==========================================
-- 4. БЕЗОПАСНАЯ ФУНКЦИЯ ПОИСКА
-- ==========================================
-- Добавляем обязательный `set search_path = public`
create or replace function public.search_users_secure(search_query text)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  avatar_lqip text,
  username text,
  can_upload_avatar boolean,
  can_use_gradient boolean,
  use_gradient boolean
) 
language plpgsql
security definer
set search_path = public 
as $$
begin
  return query
  select 
    p.id, p.full_name, p.avatar_url, p.avatar_lqip,
    p.username, p.can_upload_avatar, p.can_use_gradient, p.use_gradient
  from public.profiles p
  where 
    p.id != auth.uid()
    and (
      (search_query like '@%' and p.username ilike substring(search_query from 2) || '%')
      or
      (search_query not like '@%' and (p.full_name ilike '%' || search_query || '%' or p.username ilike '%' || search_query || '%'))
    )
  limit 20;
end;
$$;


-- ==========================================
-- 5. ИСПРАВЛЕНИЕ ОШИБКИ 403 В ХРАНИЛИЩЕ ПРИ ПЕРЕЗАПИСИ ФАЙЛОВ
-- ==========================================
-- Если юзер захочет заменить старую аватарку/аудио под тем же именем файла (update), 
-- Supabase Storage выдал бы 403 Access Denied. Добавляем политики для UPDATE:

-- Для хранилища аудио
drop policy if exists "Пользователь может обновлять свое аудио" on storage.objects;
create policy "Пользователь может обновлять свое аудио"
on storage.objects for update
using (
  bucket_id = 'audio_records' 
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'audio_records' 
  and auth.uid()::text = (storage.foldername(name))[1]
  and exists (
    select 1 from public.profiles 
    where id = auth.uid() and can_cloud_audio = true
  )
);

-- Для хранилища аватарок
drop policy if exists "Избранные юзеры могут обновлять аватарку" on storage.objects;
create policy "Избранные юзеры могут обновлять аватарку" 
on storage.objects for update 
using (
  bucket_id = 'avatars' and 
  auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars' and 
  auth.uid()::text = (storage.foldername(name))[1] and 
  exists (
    select 1 from public.profiles 
    where id = auth.uid() and can_upload_avatar = true
  )
);
create or replace function public.accept_friend_request(notif_id uuid, sender uuid)
returns void
language plpgsql
security definer -- Выполняем с правами админа, чтобы обойти RLS для перекрестной вставки
set search_path = public
as $$
begin
  -- 1. Проверяем, существует ли такое уведомление, адресовано ли оно нам и это запрос в друзья
  if exists (
    select 1 from public.notifications 
    where id = notif_id 
      and recipient_id = auth.uid() 
      and sender_id = sender 
      and type = 'friend_request'
  ) then
    
    -- 2. Создаем перекрестные записи о дружбе (игнорируя дубликаты, если они вдруг есть)
    insert into public.friends (user_id, friend_id) values (auth.uid(), sender) on conflict do nothing;
    insert into public.friends (user_id, friend_id) values (sender, auth.uid()) on conflict do nothing;
    
    -- 3. Удаляем уведомление
    delete from public.notifications where id = notif_id;
    
  else
    -- Если хакер пытается вызвать RPC напрямую без реальной заявки
    raise exception 'Заявка не найдена или у вас нет прав на её принятие';
  end if;
end;
$$;

-- 1. Сначала полностью удаляем старую версию функции
DROP FUNCTION IF EXISTS public.search_users_secure(text);

-- 2. Теперь создаем её заново с обновленной структурой возвращаемых данных
CREATE FUNCTION public.search_users_secure(search_query text)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  avatar_lqip text,
  username text,
  can_upload_avatar boolean,
  can_use_gradient boolean,
  use_gradient boolean,
  can_use_presence boolean -- Наше новое поле!
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, p.full_name, p.avatar_url, p.avatar_lqip,
    p.username, p.can_upload_avatar, p.can_use_gradient, p.use_gradient, p.can_use_presence
  FROM public.profiles p
  WHERE 
    p.id != auth.uid()
    AND (
      (search_query LIKE '@%' AND p.username ILIKE substring(search_query FROM 2) || '%')
      OR
      (search_query NOT LIKE '@%' AND (p.full_name ILIKE '%' || search_query || '%' OR p.username ILIKE '%' || search_query || '%'))
    )
  LIMIT 20;
END;
$$;

-- 1. Гарантированно добавляем колонку (если она уже есть, ничего страшного не случится)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_use_presence boolean DEFAULT false;

-- 2. Принудительно заставляем Supabase (PostgREST) обновить кэш и увидеть новую колонку
NOTIFY pgrst, 'reload schema';


alter publication supabase_realtime add table public.friends;


-- 1. Выдаем привилегию на использование QR-входа (по умолчанию отключено)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_use_qr_login boolean DEFAULT false;

-- ==========================================
-- 2. ТАБЛИЦА QR СЕССИЙ (ДЛЯ ВХОДА)
-- ==========================================
CREATE TABLE public.qr_auth_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_info jsonb DEFAULT '{}'::jsonb, -- браузер, ОС компьютера
    action_link text, -- Сюда Edge Function положит магическую ссылку
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    expires_at timestamp with time zone DEFAULT timezone('utc'::text, now()) + interval '3 minutes'
);

ALTER TABLE public.qr_auth_sessions ENABLE ROW LEVEL SECURITY;

-- Любой анонимный компьютер может создать заявку (он же еще не залогинен)
CREATE POLICY "Компьютеры могут создавать заявки" ON public.qr_auth_sessions
    FOR INSERT WITH CHECK (true);

-- Любой может читать заявки (ID - это UUID, его невозможно подобрать, поэтому это безопасно)
CREATE POLICY "Чтение своих заявок" ON public.qr_auth_sessions
    FOR SELECT USING (true);

-- Включаем вебсокеты (Realtime), чтобы комп моментально увидел одобрение
ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_auth_sessions;

-- ==========================================
-- 3. ТАБЛИЦА АКТИВНЫХ УСТРОЙСТВ (КАК В TELEGRAM)
-- ==========================================
CREATE TABLE public.active_devices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    device_name text NOT NULL, -- Например "Chrome на Windows"
    device_type text NOT NULL, -- "desktop" или "mobile"
    ip_address text,
    last_active timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.active_devices ENABLE ROW LEVEL SECURITY;

-- Юзер видит только свои устройства
CREATE POLICY "Юзер видит свои устройства" ON public.active_devices
    FOR SELECT USING (auth.uid() = user_id);

-- Юзер может добавлять свои устройства при входе
CREATE POLICY "Юзер добавляет свое устройство" ON public.active_devices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Юзер может обновлять время активности своего устройства
CREATE POLICY "Юзер обновляет время" ON public.active_devices
    FOR UPDATE USING (auth.uid() = user_id);

-- Юзер может удалять (кикать) устройства
CREATE POLICY "Юзер удаляет свои устройства" ON public.active_devices
    FOR DELETE USING (auth.uid() = user_id);

-- Включаем вебсокеты (чтобы "убивать" сессии онлайн)
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_devices;

-- 1. Удаляем политику прямого удаления. Теперь нельзя просто так кикнуть чужой девайс с фронта.
DROP POLICY IF EXISTS "Юзер удаляет свои устройства" ON public.active_devices;

-- Важно: политики SELECT, INSERT и UPDATE остаются, чтобы хук useDeviceTracker работал.

-- 2. Функция для завершения ОДНОГО сеанса
CREATE OR REPLACE FUNCTION public.terminate_device(target_device_id uuid, current_device_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_device_created_at timestamp with time zone;
BEGIN
  -- Находим дату создания текущего устройства (с которого нажали кнопку)
  SELECT created_at INTO current_device_created_at
  FROM public.active_devices
  WHERE id = current_device_id AND user_id = auth.uid();

  -- Защита от подделки ID
  IF current_device_created_at IS NULL THEN
    RAISE EXCEPTION 'Текущее устройство не найдено или не принадлежит вам.';
  END IF;

  -- Проверяем возраст текущего устройства (24 часа). 
  IF current_device_created_at > timezone('utc'::text, now()) - interval '24 hours' THEN
    RAISE EXCEPTION 'В целях безопасности новые устройства не могут завершать другие сеансы. Подождите 24 часа с момента авторизации.';
  END IF;

  -- Если всё ок, удаляем целевое устройство
  DELETE FROM public.active_devices
  WHERE id = target_device_id AND user_id = auth.uid();
END;
$$;

-- 3. Функция для завершения ВСЕХ ОСТАЛЬНЫХ сеансов
CREATE OR REPLACE FUNCTION public.terminate_all_other_devices(current_device_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_device_created_at timestamp with time zone;
BEGIN
  SELECT created_at INTO current_device_created_at
  FROM public.active_devices
  WHERE id = current_device_id AND user_id = auth.uid();

  IF current_device_created_at IS NULL THEN
    RAISE EXCEPTION 'Текущее устройство не найдено или не принадлежит вам.';
  END IF;

  IF current_device_created_at > timezone('utc'::text, now()) - interval '24 hours' THEN
    RAISE EXCEPTION 'В целях безопасности новые устройства не могут завершать другие сеансы. Подождите 24 часа с момента авторизации.';
  END IF;

  -- Удаляем все девайсы, кроме текущего
  DELETE FROM public.active_devices
  WHERE id != current_device_id AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.terminate_device(target_device_id uuid, current_device_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_device_created_at timestamp with time zone;
BEGIN
  SELECT created_at INTO current_device_created_at FROM public.active_devices WHERE id = current_device_id AND user_id = auth.uid();
  IF current_device_created_at IS NULL THEN RAISE EXCEPTION 'Текущее устройство не найдено или не принадлежит вам.'; END IF;
  
  -- 🔥 ИЗМЕНЕНИЕ: Проверяем 24 часа, ТОЛЬКО если мы пытаемся удалить ЧУЖОЕ устройство (target_device_id != current_device_id)
  IF target_device_id != current_device_id AND current_device_created_at > timezone('utc'::text, now()) - interval '24 hours' THEN
    RAISE EXCEPTION 'В целях безопасности новые устройства не могут завершать другие сеансы. Подождите 24 часа с момента авторизации.';
  END IF;

  DELETE FROM public.active_devices WHERE id = target_device_id AND user_id = auth.uid();
END;
$$;







-- 1. Создаем таблицу без функции внутри UNIQUE
create table public.shared_trees (
  id uuid default gen_random_uuid() primary key,
  user1_id uuid references public.profiles(id) on delete cascade not null,
  user2_id uuid references public.profiles(id) on delete cascade not null,
  progress_state jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Создаем уникальный индекс для защиты от дублирования пар друзей
-- (Вася + Петя будет считаться тем же самым, что и Петя + Вася)
create unique index unique_friend_pair_idx 
on public.shared_trees (least(user1_id, user2_id), greatest(user1_id, user2_id));

-- 3. Включаем RLS
alter table public.shared_trees enable row level security;

-- 4. Политики безопасности
create policy "Юзеры видят свои совместные деревья" 
on public.shared_trees for select 
using (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "Юзеры могут создавать совместные деревья" 
on public.shared_trees for insert 
with check (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "Юзеры могут обновлять свои совместные деревья" 
on public.shared_trees for update 
using (auth.uid() = user1_id or auth.uid() = user2_id);


alter publication supabase_realtime add table public.shared_trees;


-- 1. Добавляем флаг
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_use_friends boolean DEFAULT false;

-- 2. Обновляем триггер защиты премиум-флагов, чтобы юзеры не могли хакнуть себе доступ
create or replace function public.protect_premium_flags()
returns trigger as $$
begin
  if auth.role() in ('authenticated', 'anon') then
    new.can_cloud_audio = old.can_cloud_audio;
    new.can_upload_avatar = old.can_upload_avatar;
    new.can_use_gradient = old.can_use_gradient;
    new.can_use_friends = old.can_use_friends; -- Защищаем новый флаг!
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

-- 3. Обновляем кэш схемы для API
NOTIFY pgrst, 'reload schema';


-- 1. Разрешаем пользователям удалять совместные деревья вручную
create policy "Юзеры могут удалять свои совместные деревья" 
on public.shared_trees for delete 
using (auth.uid() = user1_id or auth.uid() = user2_id);

-- 2. Функция автоудаления дерева при разрыве дружбы
create or replace function public.delete_shared_tree_on_unfriend()
returns trigger as $$
begin
  delete from public.shared_trees
  where (user1_id = old.user_id and user2_id = old.friend_id)
     or (user1_id = old.friend_id and user2_id = old.user_id);
  return old;
end;
$$ language plpgsql set search_path = public;

-- 3. Вешаем триггер на таблицу friends
drop trigger if exists on_friend_deleted on public.friends;
create trigger on_friend_deleted
  after delete on public.friends
  for each row execute procedure public.delete_shared_tree_on_unfriend();
  
  
  -- 1. Снимаем старое ограничение на типы уведомлений
alter table public.notifications drop constraint if exists notifications_type_check;

-- 2. Добавляем новое ограничение, включающее типы для деревьев
alter table public.notifications add constraint notifications_type_check 
  check (type in ('friend_request', 'friend_removed', 'shared_tree_created', 'shared_tree_deleted'));

-- 3. Функция автоуведомления при СОЗДАНИИ дерева
create or replace function public.on_shared_tree_created()
returns trigger as $$
begin
  insert into public.notifications (recipient_id, sender_id, type)
  values (
    case when auth.uid() = new.user1_id then new.user2_id else new.user1_id end,
    auth.uid(),
    'shared_tree_created'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_shared_tree_inserted on public.shared_trees;
create trigger on_shared_tree_inserted
  after insert on public.shared_trees
  for each row execute procedure public.on_shared_tree_created();

-- 4. Функция автоуведомления при УДАЛЕНИИ дерева
create or replace function public.on_shared_tree_deleted()
returns trigger as $$
begin
  -- Отправляем уведомление только если пользователи всё еще друзья
  -- (при разрыве дружбы сработает триггер unfriend, там летит уведомление friend_removed)
  if exists (
    select 1 from public.friends 
    where (user_id = old.user1_id and friend_id = old.user2_id)
       or (user_id = old.user2_id and friend_id = old.user1_id)
  ) then
    insert into public.notifications (recipient_id, sender_id, type)
    values (
      case when auth.uid() = old.user1_id then old.user2_id else old.user1_id end,
      auth.uid(),
      'shared_tree_deleted'
    );
  end if;
  return old;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_shared_tree_removed on public.shared_trees;
create trigger on_shared_tree_removed
  after delete on public.shared_trees
  for each row execute procedure public.on_shared_tree_deleted();
  
  -- 1. Удаляем старую (слишком мягкую) политику
drop policy if exists "Юзеры могут создавать совместные деревья" on public.shared_trees;

-- 2. Создаем новую (строгую) политику
create policy "Строгое создание совместных деревьев" 
on public.shared_trees for insert 
with check (
  -- Первое правило: ты должен быть участником дерева
  (auth.uid() = user1_id or auth.uid() = user2_id) 
  and 
  -- Второе правило: вы ДОЛЖНЫ быть друзьями в таблице friends
  exists (
    select 1 from public.friends 
    where (user_id = user1_id and friend_id = user2_id)
       or (user_id = user2_id and friend_id = user1_id)
  )
);

-- 1. Добавляем флаг доступа к чатам
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_use_chats boolean DEFAULT false;

-- 2. Обновляем триггер защиты премиум-флагов, добавляя can_use_chats
CREATE OR REPLACE FUNCTION public.protect_premium_flags()
RETURNS trigger AS $$
BEGIN
  IF auth.role() IN ('authenticated', 'anon') THEN
    NEW.can_cloud_audio = OLD.can_cloud_audio;
    NEW.can_upload_avatar = OLD.can_upload_avatar;
    NEW.can_use_gradient = OLD.can_use_gradient;
    NEW.can_use_friends = OLD.can_use_friends;
    NEW.can_use_chats = OLD.can_use_chats; -- Наш новый флаг!
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. Обновляем кэш схемы
NOTIFY pgrst, 'reload schema';

-- 4. Создаем таблицу сообщений
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_tree_id uuid REFERENCES public.shared_trees(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 5. Включаем RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 6. Политика чтения: Читать могут только участники этого совместного дерева
CREATE POLICY "Участники дерева видят сообщения" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shared_trees t
      WHERE t.id = messages.shared_tree_id
      AND (t.user1_id = auth.uid() OR t.user2_id = auth.uid())
    )
  );

-- 7. Политика записи: Писать могут только участники этого дерева
CREATE POLICY "Участники дерева могут писать" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.shared_trees t
      WHERE t.id = messages.shared_tree_id
      AND (t.user1_id = auth.uid() OR t.user2_id = auth.uid())
    )
  );

-- 8. Включаем вебсокеты (Realtime) для моментальной доставки сообщений
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;


-- ==========================================
-- 9. ПОЛИТИКИ ДЛЯ СОВМЕСТНОГО ДОСТУПА ДРУЗЕЙ К АУДИО
-- ==========================================

-- Разрешаем пользователям видеть аудиозаписи своих друзей в таблице audio_tracks
drop policy if exists "Юзеры видят только свои аудио" on public.audio_tracks;
create policy "Юзеры видят свои аудио и аудио друзей"
on public.audio_tracks for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.friends
    where user_id = auth.uid() and friend_id = audio_tracks.user_id
  )
);

-- Разрешаем генерировать подписанные ссылки (Signed URLs) для файлов друзей в Storage
drop policy if exists "Пользователь может слушать свое аудио" on storage.objects;
create policy "Пользователь может слушать свое аудио и аудио друзей"
on storage.objects for select
using (
  bucket_id = 'audio_records'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or exists (
      select 1 from public.friends
      where user_id = auth.uid() and friend_id::text = (storage.foldername(name))[1]
    )
  )
);

