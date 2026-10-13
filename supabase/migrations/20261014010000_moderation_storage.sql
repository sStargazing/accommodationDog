-- Moderation: when an administrator removes a reported listing, its photos
-- (in the owner's storage folder) must be deleted too. Owners already manage
-- their own folders; this lets verified admins (public.admin_users) do the same.

create policy "Admins read uploaded images"
  on storage.objects for select
  to authenticated
  using (bucket_id in ('listing-images', 'avatars') and (select public.is_admin()));

create policy "Admins delete uploaded images"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('listing-images', 'avatars') and (select public.is_admin()));
