-- 갤러리 저장은 사용자가 "갤러리에 저장" 버튼을 눌렀을 때만 true로 설정
alter table public.emoticon_generations
  add column if not exists saved_to_gallery boolean not null default false;

-- 기존 완료된 생성 기록은 이미 갤러리에 노출되던 항목으로 간주
update public.emoticon_generations
  set saved_to_gallery = true
  where status = 'completed';

create index if not exists emoticon_generations_user_saved_gallery_idx
  on public.emoticon_generations (user_id, created_at desc)
  where saved_to_gallery = true;
