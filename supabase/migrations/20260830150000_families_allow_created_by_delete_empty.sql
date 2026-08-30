-- Allow a creator to delete a family they just created if the first-member
-- insert failed, so createFamily can roll back an empty row.

drop policy "Creators can delete their families" on public.families;

create policy "Creators can delete their families"
  on public.families for delete
  using (
    private.is_family_creator(id)
    or (
      created_by = (select auth.uid())
      and not exists (
        select 1 from public.family_members m where m.family_id = families.id
      )
    )
  );
