-- Upsert on storage.objects needs SELECT in addition to INSERT/UPDATE.
create policy "Users can select own covers"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'recipe-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
