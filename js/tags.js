import {
  db,
  doc,
  setDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit,
  arrayUnion
} from "./firebase.js";

function normalizeTagId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function applyAutoTags(user, profile, activity, payload = {}) {
  if (!user || !profile || !activity) return [];

  const tags = [];

  tags.push({
    tagId: `activity_completed_${activity.id}`,
    tagName: `完成活動：${activity.title}`,
    category: "活動",
    reason: `完成活動：${activity.title}`
  });

  if (profile.vipLevel) {
    tags.push({
      tagId: `vip_${String(profile.vipLevel).toLowerCase()}`,
      tagName: `${profile.vipLevel}會員`,
      category: "VIP",
      reason: "依目前積分與等級自動標記"
    });
  }

  if (Number(profile.points || 0) >= 10) {
    tags.push({
      tagId: "vip2_or_above",
      tagName: "VIP2以上",
      category: "VIP",
      reason: "會員積分達到 VIP2 以上門檻"
    });
  }

  if (Number(profile.points || 0) >= 30) {
    tags.push({
      tagId: "vip3_member",
      tagName: "VIP3會員",
      category: "VIP",
      reason: "會員積分達到 VIP3 門檻"
    });
  }

  if (activity.type === "survey") {
    tags.push({
      tagId: "survey_responder",
      tagName: "問卷填答者",
      category: "行為",
      reason: `完成問卷活動：${activity.title}`
    });
  }

  if (activity.type === "game") {
    tags.push({
      tagId: "game_player",
      tagName: "小遊戲玩家",
      category: "行為",
      reason: `完成遊戲活動：${activity.title}`
    });
  }

  if (activity.id === "hunter-kaohsiung-survey") {
    tags.push(...getTagsFromHunterSurvey(payload.details || {}));
  }

  if (activity.id === "aura-cup-game" && payload.result) {
    tags.push({
      tagId: `aura_${normalizeTagId(payload.result)}`,
      tagName: `水見式：${payload.result}`,
      category: "遊戲結果",
      reason: "完成水見式能力測驗"
    });
  }

  const uniqueTags = dedupeTags(tags);
  await addUserTags(user, uniqueTags);
  return uniqueTags;
}

export async function addUserTags(user, tags = []) {
  if (!user || !tags.length) return [];

  const written = [];
  const tagNames = [];

  for (const tag of tags) {
    if (!tag.tagId || !tag.tagName) continue;

    const tagDocId = `${user.uid}_${tag.tagId}`;
    const tagRef = doc(db, "userTags", tagDocId);

    await setDoc(tagRef, {
      userId: user.uid,
      email: user.email,
      emailKey: String(user.email || "").toLowerCase(),
      tagId: tag.tagId,
      tagName: tag.tagName,
      category: tag.category || "未分類",
      source: tag.source || "auto",
      reason: tag.reason || "",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });

    await setDoc(doc(db, "tags", tag.tagId), {
      tagId: tag.tagId,
      tagName: tag.tagName,
      category: tag.category || "未分類",
      isActive: true,
      updatedAt: serverTimestamp()
    }, { merge: true });

    written.push(tag);
    tagNames.push(tag.tagName);
  }

  if (tagNames.length) {
    await setDoc(doc(db, "users", user.uid), {
      tags: arrayUnion(...tagNames),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  return written;
}

export async function loadUserTags(userId) {
  const snap = await getDocs(
    query(collection(db, "userTags"), where("userId", "==", userId), limit(200))
  );

  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => String(a.category || "").localeCompare(String(b.category || ""), "zh-Hant"));
}

function getTagsFromHunterSurvey(answers) {
  const tags = [
    {
      tagId: "hunter_kaohsiung_survey_completed",
      tagName: "高雄站問卷完成者",
      category: "活動",
      reason: "完成獵人高雄站滿意度調查"
    },
    {
      tagId: "kaohsiung_participant",
      tagName: "高雄站參與者",
      category: "活動",
      reason: "完成高雄站相關活動"
    },
    {
      tagId: "hunter_ip_interest",
      tagName: "獵人IP興趣者",
      category: "興趣",
      reason: "完成獵人相關活動問卷"
    }
  ];

  if (answers.playedGame === "有") {
    tags.push({
      tagId: "hunter_game_player",
      tagName: "獵人實境解謎玩家",
      category: "活動",
      reason: "問卷回覆有登入貪婪之島體驗遊戲"
    });
  }

  if (answers.playedGame === "沒有，只有逛商店區") {
    tags.push({
      tagId: "shop_only_visitor",
      tagName: "商店區訪客",
      category: "行為",
      reason: "問卷回覆只有逛商店區"
    });
  }

  const spendTagMap = {
    "未購買周邊商品": ["no_merch_purchase", "未購買周邊", "消費"],
    "300 元以下": ["low_merch_spender", "低消費周邊客", "消費"],
    "301-800 元": ["mid_low_merch_spender", "中低消費周邊客", "消費"],
    "801-1500 元": ["mid_high_merch_spender", "中高消費周邊客", "消費"],
    "1501-2000 元": ["high_merch_spender", "高消費周邊客", "消費"],
    "2000 元以上": ["super_high_merch_spender", "超高消費周邊客", "消費"]
  };

  if (spendTagMap[answers.merchSpend]) {
    const [tagId, tagName, category] = spendTagMap[answers.merchSpend];
    tags.push({ tagId, tagName, category, reason: `周邊消費金額：${answers.merchSpend}` });
  }

  const merchTypes = Array.isArray(answers.interestedMerchTypes) ? answers.interestedMerchTypes : [];

  const interestRules = [
    {
      keyword: "隨機盲抽",
      tagId: "blind_box_interest",
      tagName: "盲抽商品興趣者"
    },
    {
      keyword: "小型收藏品",
      tagId: "small_collectible_interest",
      tagName: "小型收藏品興趣者"
    },
    {
      keyword: "中高單價收藏品",
      tagId: "premium_collectible_interest",
      tagName: "收藏型商品興趣者"
    },
    {
      keyword: "實用型商品",
      tagId: "practical_merch_interest",
      tagName: "實用商品興趣者"
    },
    {
      keyword: "絨毛娃娃",
      tagId: "plush_prop_interest",
      tagName: "絨毛與道具商品興趣者"
    }
  ];

  for (const rule of interestRules) {
    if (merchTypes.some(item => String(item).includes(rule.keyword))) {
      tags.push({
        tagId: rule.tagId,
        tagName: rule.tagName,
        category: "興趣",
        reason: `周邊興趣包含：${rule.keyword}`
      });
    }
  }

  const returnReasons = Array.isArray(answers.returnReasons) ? answers.returnReasons : [];
  if (returnReasons.some(item => String(item).includes("沉浸式體驗"))) {
    tags.push({
      tagId: "immersive_experience_interest",
      tagName: "沉浸式體驗興趣者",
      category: "興趣",
      reason: "再次參加原因包含沉浸式體驗"
    });
  }

  if (returnReasons.some(item => String(item).includes("實境解謎"))) {
    tags.push({
      tagId: "puzzle_game_interest",
      tagName: "實境解謎興趣者",
      category: "興趣",
      reason: "再次參加原因包含實境解謎玩法"
    });
  }

  return tags;
}

function dedupeTags(tags) {
  const map = new Map();
  for (const tag of tags) {
    if (!tag.tagId) continue;
    map.set(tag.tagId, tag);
  }
  return Array.from(map.values());
}
