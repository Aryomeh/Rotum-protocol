// Items that can be unlocked either by paying Stars or by watching rewarded ads,
// and how many ad views each one requires. Has no server-only imports so it's
// safe to use from client components as well as API routes.
export const AD_UNLOCK_REQUIREMENTS: Record<string, number> = {
  hash_boost_24h: 3,
  mining_crate:   5,
}