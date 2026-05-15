import {
  auth,
  provider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "./firebase.js?v8";
import {
  state,
  upsertUserProfile,
  loadRewards,
  loadParticipations
} from "./user.js?v8";
import { renderAppShell } from "./app.js?v8";
import { renderActivities } from "./activity-runner.js?v8";
import { renderBackend } from "./admin.js?v8";

export function bindAuth() {
  $("#loginBtn").on("click", async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert(`Google 登入失敗：${error.message}`);
    }
  });

  $("#logoutBtn").on("click", async () => {
    await signOut(auth);
  });

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        state.currentUser = user;
        state.currentProfile = await upsertUserProfile(user);
        state.rewards = await loadRewards(user.uid);
        state.participations = await loadParticipations(user.uid);

        $("#landingView").addClass("hidden");
        $("#appView").removeClass("hidden");

        renderAppShell();
        renderActivities();
        renderBackend();
      } catch (error) {
        console.error(error);
        alert(`載入會員資料失敗：${error.message}`);
      }
    } else {
      state.currentUser = null;
      state.currentProfile = null;
      state.rewards = [];
      state.participations = [];

      $("#landingView").removeClass("hidden");
      $("#appView").addClass("hidden");
      $("#navUser").addClass("hidden");
    }
  });
}
