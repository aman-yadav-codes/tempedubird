/**
 * Helper to determine if a logged-in user is the owner or manager of a given business or professional profile.
 */
export function isUserStoreOwner(
  user: any | null | undefined,
  profile: {
    user_id?: number | string | null;
    institution_profile_id?: number | string | null;
    institution_id?: number | string | null;
    id?: number | string | null;
    owner_id?: number | string | null;
  } | null | undefined
): boolean {
  if (!user || !profile) return false;

  const currentUserId = user.id ? Number(user.id) : null;
  const userInstId = user.institution_id ? Number(user.institution_id) : null;
  const userUnderInstId = user.under_institution_id ? Number(user.under_institution_id) : null;

  // 1. Direct profile user_id check
  if (currentUserId && profile.user_id && Number(profile.user_id) === currentUserId) {
    return true;
  }

  // 2. Direct owner_id check
  if (currentUserId && profile.owner_id && Number(profile.owner_id) === currentUserId) {
    return true;
  }

  // 3. Institution ID check
  const profileInstId = profile.institution_profile_id
    ? Number(profile.institution_profile_id)
    : profile.institution_id
      ? Number(profile.institution_id)
      : null;

  if (profileInstId) {
    if (userInstId && userInstId === profileInstId) {
      return true;
    }
    if (userUnderInstId && userUnderInstId === profileInstId) {
      return true;
    }
    if (Array.isArray(user.memberships) && user.memberships.some((m: any) => Number(m.institution_id) === profileInstId)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if the user is the buyer of a given order.
 */
export function isOrderBuyer(
  user: any | null | undefined,
  order: {
    created_by?: number | string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
  } | null | undefined
): boolean {
  if (!user || !order) return false;
  const currentUserId = user.id ? Number(user.id) : null;
  if (currentUserId && order.created_by && Number(order.created_by) === currentUserId) {
    return true;
  }
  if (user.email && order.customer_email && user.email.toLowerCase() === order.customer_email.toLowerCase()) {
    return true;
  }
  if (user.phone && order.customer_phone && user.phone === order.customer_phone) {
    return true;
  }
  return false;
}

/**
 * Check if the user is the seller / provider / merchant of a given order.
 */
export function isOrderSeller(
  user: any | null | undefined,
  order: {
    seller_user_id?: number | string | null;
    business_id?: number | string | null;
    professional_id?: number | string | null;
    institution_id?: number | string | null;
  } | null | undefined
): boolean {
  if (!user || !order) return false;
  const currentUserId = user.id ? Number(user.id) : null;
  if (currentUserId && order.seller_user_id && Number(order.seller_user_id) === currentUserId) {
    return true;
  }
  // Check if user is platform admin
  if (
    user.role === "platform_admin" ||
    (Array.isArray(user.role_codes) && user.role_codes.includes("platform_admin"))
  ) {
    return true;
  }
  // Check via store ownership
  return isUserStoreOwner(user, {
    id: order.business_id,
    institution_id: order.institution_id,
    institution_profile_id: order.institution_id,
    user_id: order.seller_user_id,
    owner_id: order.seller_user_id,
  });
}

/**
 * Buyer can cancel order ONLY within 5 minutes of order placement.
 */
export const BUYER_CANCEL_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function getOrderCancelRemainingSeconds(order: { created_at?: string | Date | null } | null | undefined): number {
  if (!order?.created_at) return 0;
  const createdTime = new Date(order.created_at).getTime();
  if (isNaN(createdTime)) return 0;
  const diffMs = Date.now() - createdTime;
  const remainingMs = BUYER_CANCEL_WINDOW_MS - diffMs;
  return Math.max(0, Math.floor(remainingMs / 1000));
}

export function canBuyerCancelOrder(
  user: any | null | undefined,
  order: {
    created_by?: number | string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
    created_at?: string | Date | null;
    fulfillment_status?: string | null;
  } | null | undefined
): boolean {
  if (!user || !order) return false;
  if (!isOrderBuyer(user, order)) return false;

  const status = (order.fulfillment_status || "").toLowerCase().trim();
  // Order cancel option appears ONLY before order accept (i.e. status is "received" or "pending")
  return status === "received" || status === "pending" || status === "";
}
