-- ----------------------------------------------------------------------------
-- 0016 — let a manager delete a position or a duty, but only an unused one
--
-- Until now the catalog could only hide an entry (`is_active = false`). That
-- was deliberate: both foreign keys are `on delete set null`, so deleting a
-- position that older shifts point at does not fail — it silently blanks who
-- worked the bar last month. For a schedule people are paid from, that is data
-- loss with no warning.
--
-- So deleting is allowed, and refused the moment anything references the row.
-- The check lives in a trigger rather than in the app, for the same reason
-- every other rule here does: the client can be bypassed, the database cannot.
-- A manager who really wants an entry gone can clear it off the shifts first,
-- or hide it instead.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 1. Refuse a delete that would blank an existing shift or availability row
-- ----------------------------------------------------------------------------
create or replace function public.positions_block_used_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  shift_count integer;
  wish_count  integer;
begin
  select count(*) into shift_count
  from public.shifts where position_id = old.id;

  select count(*) into wish_count
  from public.availability_preferences where position_id = old.id;

  if shift_count > 0 or wish_count > 0 then
    raise exception
      'Delovnega mesta "%" ni mogoče izbrisati: uporabljeno je v % smenah in % željah. Raje ga izklopi.',
      old.name, shift_count, wish_count
      using errcode = '23503';
  end if;

  return old;
end;
$$;

drop trigger if exists positions_block_used_delete on public.positions;
create trigger positions_block_used_delete
  before delete on public.positions
  for each row execute function public.positions_block_used_delete();

create or replace function public.duties_block_used_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  shift_count integer;
begin
  select count(*) into shift_count
  from public.shifts where duty_id = old.id;

  if shift_count > 0 then
    raise exception
      'Zadolžitve "%" ni mogoče izbrisati: uporabljena je v % smenah. Raje jo izklopi.',
      old.name, shift_count
      using errcode = '23503';
  end if;

  return old;
end;
$$;

drop trigger if exists duties_block_used_delete on public.duties;
create trigger duties_block_used_delete
  before delete on public.duties
  for each row execute function public.duties_block_used_delete();

-- ----------------------------------------------------------------------------
-- 2. Now the grant and the policy
--
-- Narrow on purpose: only a manager, and only inside their own restaurant.
-- ----------------------------------------------------------------------------
grant delete on public.positions to authenticated;
grant delete on public.duties    to authenticated;

drop policy if exists "positions_delete_by_manager" on public.positions;
create policy "positions_delete_by_manager"
  on public.positions
  for delete
  to authenticated
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() = 'manager'
  );

drop policy if exists "duties_delete_by_manager" on public.duties;
create policy "duties_delete_by_manager"
  on public.duties
  for delete
  to authenticated
  using (
    organization_id = public.current_org_id()
    and public.current_user_role() = 'manager'
  );

-- ----------------------------------------------------------------------------
-- 3. How many things point at a catalog entry
--
-- The app asks before offering the button, so the answer is "Izbriši" or a
-- sentence explaining why not — rather than a button that fails when pressed.
-- SECURITY DEFINER because a worker may not read every shift, and the count
-- itself gives nothing away beyond their own restaurant.
-- ----------------------------------------------------------------------------
create or replace function public.catalog_usage()
returns table (kind text, id uuid, uses bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select 'position', p.id,
         (select count(*) from public.shifts s where s.position_id = p.id)
       + (select count(*) from public.availability_preferences a where a.position_id = p.id)
  from public.positions p
  where p.organization_id = public.current_org_id()

  union all

  select 'duty', d.id,
         (select count(*) from public.shifts s where s.duty_id = d.id)
  from public.duties d
  where d.organization_id = public.current_org_id();
$$;

grant execute on function public.catalog_usage() to authenticated;

notify pgrst, 'reload schema';
