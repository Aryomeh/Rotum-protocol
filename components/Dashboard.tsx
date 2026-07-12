create or replace function refresh_season_rankings(p_season_id int)
returns void
language plpgsql
as $function$
declare
  total_hash numeric;
  pool       numeric;
begin
  -- 1. Calculate the total live active network hash power
  select sum(hash_power * hash_boost) into total_hash
  from users
  where last_active_at > now() - interval '24 hours'
    and is_banned = false;

  -- 2. Grab the live current pool amount
  select pool_current into pool from seasons where id = p_season_id;

  -- 3. Clear old ranking cache for this season
  delete from season_rankings where season_id = p_season_id;

  -- 4. Re-calculate rankings, weighting each tier's payout by hash power
  --    within that tier — bigger hash power = bigger share of the tier's cut.
  insert into season_rankings (season_id, user_id, rank, hash_power, network_share, est_reward)
  with ranked as (
    select
      u.id,
      (u.hash_power * u.hash_boost) as eff_hash,
      row_number() over (order by (u.hash_power * u.hash_boost) desc) as rnk
    from users u
    where u.last_active_at > now() - interval '24 hours'
      and u.is_banned = false
  ),
  tiered as (
    select
      id,
      eff_hash,
      rnk,
      case
        when rnk <= 10   then 10
        when rnk <= 100  then 100
        when rnk <= 1000 then 1000
        else null
      end as tier
    from ranked
  ),
  tier_sums as (
    select tier, sum(eff_hash) as tier_hash
    from tiered
    where tier is not null
    group by tier
  )
  select
    p_season_id,
    t.id,
    t.rnk,
    t.eff_hash,
    case when total_hash > 0 then t.eff_hash / total_hash else 0 end as network_share,
    case
      when t.tier = 10   and ts.tier_hash > 0 then (pool * 0.40) * (t.eff_hash / ts.tier_hash)
      when t.tier = 100  and ts.tier_hash > 0 then (pool * 0.30) * (t.eff_hash / ts.tier_hash)
      when t.tier = 1000 and ts.tier_hash > 0 then (pool * 0.20) * (t.eff_hash / ts.tier_hash)
      else 0
    end as est_reward
  from tiered t
  left join tier_sums ts on ts.tier = t.tier;
end;
$function$;
