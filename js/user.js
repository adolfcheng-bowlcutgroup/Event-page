import { applyAutoTags } from "./tags.js?v8";

import {
  db,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit
} from "./firebase.js?v8";

export const state = {
  currentUser: null,
  currentProfile: null,
  rewards: [],
  participations: []
};

export const vipRank = {
  VIP1: 1,
  VIP2: 2,
  VIP3: 3
};

export const roleLabel = {
  admin: "管理員",
  member: "會員"
};

export function getEmailKey(email) {
  return String(email || "").trim().toLowerCase();
}

export function getSourceEvent() {
  const params = new URLSearchParams(window.location.search);
  return params.get("source") || "unknown_offline_event";
}

export function getVipClass(vipLevel) {
  return `vip-${String(vipLevel || "VIP1").toLowerCase()}`;
}

export function getVipLevelByPoints(points = 0) {
  if (points >= 30) return "VIP3";
  if (points >= 10) return "VIP2";
  return "VIP1";
}

export function getNextVipInfo(points = 0) {
  if (points < 10) return { nextLevel: "VIP2", need: 10 - points };
  if (points < 30) return { nextLevel: "VIP3", need: 30 - points };
  return { nextLevel: null, need: 0 };
}

export function canAccess(userVip, requiredVip) {
  return (vipRank[userVip] || 0) >= (vipRank[requiredVip] || 0);
}

export function createCode(prefix) {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const time = Date.now().toString().slice(-4);
  return `${prefix}-${random}-${time}`;
}

export async function resolveUserRole(user) {
  const emailKey = getEmailKey(user.email);
  const adminRef = doc(db, "admins", emailKey);
  const adminSnap = await getDoc(adminRef);

  if (adminSnap.exists() && adminSnap.data().role === "admin") return "admin";
  return "member";
}

export async function upsertUserProfile(user) {
  const emailKey = getEmailKey(user.email);
  const role = await resolveUserRole(user);
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const existingData = userSnap.exists() ? userSnap.data() : {};
  const points = Number(existingData.points || 0);
  const vipLevel = getVipLevelByPoints(points);

  const baseProfile = {
    uid: user.uid,
    email: user.email,
    emailKey,
    displayName: user.displayName || "未命名會員",
    photoURL: user.photoURL || "",
    role,
    points,
    vipLevel,
    sourceEvent: getSourceEvent(),
    lastLoginAt: serverTimestamp()
  };

  if (userSnap.exists()) {
    await setDoc(userRef, baseProfile, { merge: true });
  } else {
    await setDoc(userRef, {
      ...baseProfile,
      createdAt: serverTimestamp(),
      marketingConsent: false
    });
  }

  const freshSnap = await getDoc(userRef);
  return freshSnap.data();
}

export async function loadRewards(userId) {
  const q = query(collection(db, "rewards"), where("userId", "==", userId), limit(100));
  const snap = await getDocs(q);
  const rewards = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return sortByCreatedAtDesc(rewards);
}

export async function loadParticipations(userId) {
  const q = query(collection(db, "activityLogs"), where("userId", "==", userId), limit(100));
  const snap = await getDocs(q);
  const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return sortByCreatedAtDesc(logs.filter(log => log.status === "completed"));
}

export function hasParticipated(activityId) {
  return state.participations.some(log => log.activityId === activityId || log.activityType === activityId);
}

export async function addUserPoints(pointsToAdd, reason) {
  if (!state.currentUser || !state.currentProfile) return null;

  const oldPoints = Number(state.currentProfile.points || 0);
  const newPoints = oldPoints + pointsToAdd;
  const newVipLevel = getVipLevelByPoints(newPoints);

  await setDoc(doc(db, "users", state.currentUser.uid), {
    points: newPoints,
    vipLevel: newVipLevel,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await addDoc(collection(db, "pointLogs"), {
    userId: state.currentUser.uid,
    email: state.currentUser.email,
    points: pointsToAdd,
    reason,
    beforePoints: oldPoints,
    afterPoints: newPoints,
    beforeVipLevel: state.currentProfile.vipLevel,
    afterVipLevel: newVipLevel,
    sourceEvent: getSourceEvent(),
    createdAt: serverTimestamp()
  });

  state.currentProfile.points = newPoints;
  state.currentProfile.vipLevel = newVipLevel;

  return { oldPoints, newPoints, newVipLevel };
}

export async function createReward({ type, title, code, activityId }) {
  if (!state.currentUser || !state.currentProfile) return null;

  const ref = await addDoc(collection(db, "rewards"), {
    userId: state.currentUser.uid,
    email: state.currentUser.email,
    vipLevel: state.currentProfile.vipLevel,
    pointsAtIssue: state.currentProfile.points || 0,
    activityId,
    type,
    title,
    code,
    status: "issued",
    sourceEvent: getSourceEvent(),
    createdAt: serverTimestamp()
  });

  return ref.id;
}

export async function logActivity(activity, extra = {}) {
  if (!state.currentUser || !state.currentProfile) return null;

  const ref = await addDoc(collection(db, "activityLogs"), {
    userId: state.currentUser.uid,
    email: state.currentUser.email,
    vipLevel: state.currentProfile.vipLevel,
    activityId: activity.id,
    activityTitle: activity.title,
    activityType: activity.type,
    status: "completed",
    sourceEvent: getSourceEvent(),
    extra,
    createdAt: serverTimestamp()
  });

  return ref.id;
}

export async function completeActivity(activity, payload = {}) {
  if (!activity.repeatable && hasParticipated(activity.id)) {
    alert("你已參加過此活動。");
    return null;
  }

  const points = Number(activity.points || payload.points || 0);
  const pointResult = points > 0 ? await addUserPoints(points, `完成活動：${activity.title}`) : null;

  let rewardCode = payload.reward?.code || "";
  if (payload.reward) {
    await createReward({
      activityId: activity.id,
      type: payload.reward.type,
      title: payload.reward.title,
      code: payload.reward.code
    });
  }

  await logActivity(activity, {
    pointsEarned: points,
    rewardCode,
    result: payload.result || null,
    surveyId: payload.surveyId || null,
    details: payload.details || null
  });

  const appliedTags = await applyAutoTags(state.currentUser, state.currentProfile, activity, payload);

  state.rewards = await loadRewards(state.currentUser.uid);
  state.participations = await loadParticipations(state.currentUser.uid);

  return { pointResult, rewardCode, appliedTags };
}

export function sortByCreatedAtDesc(items) {
  return items.sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  });
}

export function formatDateFromTimestamp(value) {
  if (!value) return "";
  if (value.seconds) return new Date(value.seconds * 1000).toLocaleString("zh-TW");
  return String(value);
}
