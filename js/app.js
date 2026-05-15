import { bindAuth } from "./auth.js";
import {
  state,
  roleLabel,
  getNextVipInfo,
  getVipClass,
  canAccess
} from "./user.js";
import { activities } from "./activity-registry.js";
import {
  setActivities,
  renderActivities,
  bindActivityEvents
} from "./activity-runner.js";
import { renderBackend } from "./admin.js";

setActivities(activities);

export function renderAppShell() {
  const profile = state.currentProfile;
  if (!profile) return;

  const avatar = profile.photoURL || "https://placehold.co/120x120?text=VIP";
  const nextInfo = getNextVipInfo(Number(profile.points || 0));
  const roleText = roleLabel[profile.role || "member"] || "會員";
  const nextText = nextInfo.nextLevel ? `｜距離 ${nextInfo.nextLevel} 還差 ${nextInfo.need} 點` : "｜已達最高等級";

  $("#navUser").removeClass("hidden");
  $("#navAvatar, #profileAvatar").attr("src", avatar);
  $("#navName").text(profile.displayName);
  $("#profileName").text(profile.displayName);
  $("#profileEmail").text(profile.email);

  $("#vipBadge")
    .removeClass("vip-vip1 vip-vip2 vip-vip3")
    .addClass(getVipClass(profile.vipLevel))
    .text(`${roleText}｜${profile.vipLevel}｜${profile.points || 0} 點${nextText}`);

  const available = activities.filter(a => canAccess(profile.vipLevel, a.requiredVip)).length;
  $("#availableCount").text(available);
  $("#rewardCount").text(state.rewards.length);

  renderRewards();
  renderBackend();
}

function renderRewards() {
  if (!state.rewards.length) {
    $("#rewardList").html(`
      <div class="reward-item">
        <strong>尚未領取獎勵</strong>
        <div style="color: var(--muted); line-height: 1.6;">完成活動後，獎勵會顯示在這裡。</div>
      </div>
    `);
    return;
  }

  $("#rewardList").html(state.rewards.map(reward => `
    <div class="reward-item">
      <strong>${reward.title || reward.type}</strong>
      <div class="reward-code">${reward.code || ""}</div>
      <small style="color: var(--muted);">狀態：${reward.status || "issued"}</small>
    </div>
  `).join(""));
}

function bindTabs() {
  $(document).on("click", ".tab-btn", function () {
    const tab = $(this).data("tab");
    $(".tab-btn").removeClass("active");
    $(this).addClass("active");
    $(".tab-panel").addClass("hidden");
    $(`#${tab}Tab`).removeClass("hidden");

    if (tab === "backend") renderBackend();
    if (tab === "activities") renderActivities();
  });
}

bindTabs();
bindActivityEvents();
bindAuth();
