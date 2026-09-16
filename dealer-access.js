(function (global) {
  "use strict";

  function validFutureDate(value, now) {
    if (!value) return false;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) && timestamp > now.getTime();
  }

  function getAccessState(profile, now) {
    const currentTime = now instanceof Date ? now : new Date();
    const freeActive = validFutureDate(profile && profile.admin_free_until, currentTime);
    const paidActive = validFutureDate(profile && profile.paid_until, currentTime);
    return {
      freeActive,
      paidActive,
      hasCurrentAccess: freeActive || paidActive,
      isPending: Boolean(profile && profile.approval_status === "PENDING"),
      isDeclined: Boolean(profile && profile.approval_status === "DECLINED"),
      isApproved: Boolean(profile && profile.approval_status === "ACTIVE" && profile.dealer_verified === true)
    };
  }

  global.CarScoutAccess = { getAccessState };
})(window);
