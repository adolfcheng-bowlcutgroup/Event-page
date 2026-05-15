import {
  db,
  collection,
  query,
  where,
  getDocs,
  limit
} from "./firebase.js?v8";
import {
  state,
  formatDateFromTimestamp,
  sortByCreatedAtDesc
} from "./user.js?v8";
import { loadUserTags } from "./tags.js?v8";
import { activities } from "./activity-registry.js?v8";

export function renderBackend() {
  if (!state.currentProfile) return;

  if (state.currentProfile.role === "admin") {
    $("#backendTabButton").text("簡易後台");
    renderAdminBackend();
  } else {
    $("#backendTabButton").text("我的後台");
    renderMemberBackend();
  }
}

async function renderMemberBackend() {
  const tags = await loadUserTags(state.currentProfile.uid);

  $("#backendContent").html(`
    <div class="section-title">
      <div>
        <h2>我的後台</h2>
        <p>查看你的會員基本資料與會員標籤。</p>
      </div>
    </div>
    <div class="data-card">
      <h3>會員基本資料</h3>
      <p><strong>Email：</strong><span class="email-text">${state.currentProfile.email}</span></p>
      <p><strong>姓名：</strong>${state.currentProfile.displayName || ""}</p>
      <p><strong>角色：</strong>${state.currentProfile.role}</p>
      <p><strong>VIP：</strong>${state.currentProfile.vipLevel}</p>
      <p><strong>積分：</strong>${state.currentProfile.points || 0}</p>
    </div>
    <div class="data-card">
      <h3>我的會員標籤</h3>
      <div class="tag-cloud">
        ${tags.length ? tags.map(tag => `<span class="crm-tag">${tag.tagName}</span>`).join("") : `<span class="muted-text">尚無標籤</span>`}
      </div>
    </div>
  `);
}

function renderAdminBackend() {
  $("#backendContent").html(`
    <div class="section-title">
      <div>
        <h2>簡易後台</h2>
        <p>會員查詢、活動匯出、會員標籤與報表儀錶板。</p>
      </div>
    </div>

    <div class="data-card">
      <h3>報表儀錶板</h3>
      <p class="muted-text">即時讀取目前 Firestore 資料並產生 MVP 統計。</p>
      <button id="loadDashboardBtn" class="btn btn-primary" type="button">載入報表</button>
      <div id="dashboardResult"></div>
    </div>

    <div class="data-card">
      <h3>指定活動匯出 CSV</h3>
      <div class="backend-row three">
        <select id="exportActivitySelect">
          ${activities.map(activity => `<option value="${activity.id}">${activity.title}</option>`).join("")}
        </select>
        <select id="exportCollectionSelect">
          <option value="activityLogs">活動紀錄</option>
          <option value="surveys">問卷作答</option>
          <option value="rewards">獎勵資料</option>
          <option value="pointLogs">積分紀錄</option>
        </select>
        <button id="exportActivityCsvBtn" class="btn btn-primary" type="button">匯出 CSV</button>
      </div>
    </div>

    <div class="data-card">
      <h3>會員標籤查詢 / 匯出</h3>
      <div class="backend-row">
        <input id="tagQueryInput" placeholder="輸入標籤名稱或 tagId，例如 高雄站參與者 / kaohsiung_participant" />
        <button id="searchTagBtn" class="btn btn-primary" type="button">查詢標籤會員</button>
      </div>
      <div id="tagSearchResult"></div>
    </div>

    <div class="data-card">
      <h3>用會員信箱查詢</h3>
      <div class="backend-row">
        <input id="memberEmailQuery" placeholder="輸入會員 Gmail，例如 member@gmail.com" />
        <button id="searchMemberBtn" class="btn btn-primary" type="button">查詢會員</button>
      </div>
      <div id="memberSearchResult"></div>
    </div>
  `);

  $("#loadDashboardBtn").on("click", loadDashboard);
  $("#exportActivityCsvBtn").on("click", exportSelectedActivityCsv);
  $("#searchMemberBtn").on("click", searchMemberByEmail);
  $("#searchTagBtn").on("click", searchUsersByTag);
}

async function loadDashboard() {
  $("#dashboardResult").html(`<div class="notice">報表載入中...</div>`);

  try {
    const [users, activityLogs, surveys, rewards, pointLogs, userTags] = await Promise.all([
      fetchCollection("users", 1000),
      fetchCollection("activityLogs", 1000),
      fetchCollection("surveys", 1000),
      fetchCollection("rewards", 1000),
      fetchCollection("pointLogs", 1000),
      fetchCollection("userTags", 1000)
    ]);

    const completedLogs = activityLogs.filter(log => log.status === "completed");
    const totalPoints = pointLogs.reduce((sum, log) => sum + Number(log.points || 0), 0);
    const vipDistribution = countBy(users, "vipLevel");
    const activityRanking = countBy(completedLogs, "activityTitle");
    const tagRanking = countBy(userTags, "tagName");

    $("#dashboardResult").html(`
      <div class="stat-grid dashboard-stats">
        <div class="stat"><strong>${users.length}</strong><span>總會員數</span></div>
        <div class="stat"><strong>${completedLogs.length}</strong><span>活動完成數</span></div>
        <div class="stat"><strong>${surveys.length}</strong><span>問卷完成數</span></div>
        <div class="stat"><strong>${rewards.length}</strong><span>獎勵發放數</span></div>
        <div class="stat"><strong>${totalPoints}</strong><span>總發放點數</span></div>
        <div class="stat"><strong>${userTags.length}</strong><span>標籤筆數</span></div>
      </div>

      <div class="dashboard-grid">
        ${renderMiniTable("VIP 分布", vipDistribution)}
        ${renderMiniTable("活動參與排行", activityRanking)}
        ${renderMiniTable("標籤排行", tagRanking)}
      </div>
    `);
  } catch (error) {
    $("#dashboardResult").html(`<div class="notice">報表載入失敗：${error.message}</div>`);
  }
}

async function exportSelectedActivityCsv() {
  const activityId = $("#exportActivitySelect").val();
  const collectionName = $("#exportCollectionSelect").val();

  try {
    const q = query(collection(db, collectionName), where("activityId", "==", activityId), limit(1000));
    const snap = await getDocs(q);
    const rows = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (!rows.length) {
      alert("此活動目前沒有可匯出的資料。");
      return;
    }

    downloadCsv(`${activityId}_${collectionName}.csv`, rows);
  } catch (error) {
    alert(`匯出失敗：${error.message}`);
  }
}

async function searchUsersByTag() {
  const queryText = String($("#tagQueryInput").val() || "").trim();
  if (!queryText) {
    alert("請輸入標籤名稱或 tagId。");
    return;
  }

  $("#tagSearchResult").html(`<div class="notice">查詢中...</div>`);

  try {
    const [byTagName, byTagId] = await Promise.all([
      getDocs(query(collection(db, "userTags"), where("tagName", "==", queryText), limit(500))),
      getDocs(query(collection(db, "userTags"), where("tagId", "==", queryText), limit(500)))
    ]);

    const rowsMap = new Map();
    [...byTagName.docs, ...byTagId.docs].forEach(doc => {
      rowsMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    const rows = Array.from(rowsMap.values());

    if (!rows.length) {
      $("#tagSearchResult").html(`<div class="notice">查無符合此標籤的會員。</div>`);
      return;
    }

    $("#tagSearchResult").html(`
      <div class="activity-actions">
        <button id="exportTagCsvBtn" class="btn btn-secondary" type="button">匯出此標籤會員 CSV</button>
      </div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>標籤</th>
            <th>分類</th>
            <th>來源</th>
            <th>原因</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td><span class="email-text">${row.email || ""}</span></td>
              <td>${row.tagName || ""}</td>
              <td>${row.category || ""}</td>
              <td>${row.source || ""}</td>
              <td>${row.reason || ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `);

    $("#exportTagCsvBtn").on("click", () => downloadCsv(`tag_${queryText}.csv`, rows));
  } catch (error) {
    $("#tagSearchResult").html(`<div class="notice">標籤查詢失敗：${error.message}</div>`);
  }
}

async function searchMemberByEmail() {
  const emailKey = String($("#memberEmailQuery").val() || "").trim().toLowerCase();
  if (!emailKey) {
    alert("請輸入會員 Gmail。");
    return;
  }

  $("#memberSearchResult").html(`<div class="notice">查詢中...</div>`);

  try {
    const userSnap = await getDocs(query(collection(db, "users"), where("emailKey", "==", emailKey), limit(1)));
    if (userSnap.empty) {
      $("#memberSearchResult").html(`<div class="notice">查無此會員。</div>`);
      return;
    }

    const userDoc = userSnap.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };

    const [logs, surveys, rewards, pointLogs, tags] = await Promise.all([
      getByUser("activityLogs", user.uid),
      getByUser("surveys", user.uid),
      getByUser("rewards", user.uid),
      getByUser("pointLogs", user.uid),
      getByUser("userTags", user.uid)
    ]);

    renderMemberSearchResult(user, logs, surveys, rewards, pointLogs, tags);
  } catch (error) {
    $("#memberSearchResult").html(`<div class="notice">查詢失敗：${error.message}</div>`);
  }
}

async function getByUser(collectionName, uid) {
  const snap = await getDocs(query(collection(db, collectionName), where("userId", "==", uid), limit(200)));
  return sortByCreatedAtDesc(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
}

async function fetchCollection(collectionName, max = 1000) {
  const snap = await getDocs(query(collection(db, collectionName), limit(max)));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function renderMemberSearchResult(user, logs, surveys, rewards, pointLogs, tags) {
  const activityRows = logs.map(log => {
    const relatedSurvey = surveys.find(s => s.activityId === log.activityId || s.id === log.extra?.surveyId);
    const relatedReward = rewards.find(r => r.activityId === log.activityId);
    const relatedPoints = pointLogs.filter(p => p.reason?.includes(log.activityTitle || "") || p.createdAt?.seconds === log.createdAt?.seconds);

    return `
      <tr>
        <td>${log.activityTitle || log.activityId || log.activityType || ""}</td>
        <td>${formatDateFromTimestamp(log.createdAt)}</td>
        <td>
          ${relatedSurvey ? `<details><summary>查看作答</summary><pre>${escapeHtml(JSON.stringify(relatedSurvey.answers || relatedSurvey, null, 2))}</pre></details>` : "無問卷"}
          ${log.extra?.result ? `<p><strong>活動結果：</strong>${escapeHtml(JSON.stringify(log.extra.result))}</p>` : ""}
          ${relatedReward ? `<p><strong>獎勵：</strong>${relatedReward.code || ""}</p>` : ""}
          ${relatedPoints.length ? `<p><strong>積分：</strong>${relatedPoints.map(p => `+${p.points}`).join("、")}</p>` : ""}
        </td>
      </tr>
    `;
  }).join("");

  $("#memberSearchResult").html(`
    <div class="data-card">
      <h3>會員基本資料</h3>
      <p><strong>Email：</strong><span class="email-text">${user.email}</span></p>
      <p><strong>姓名：</strong>${user.displayName || ""}</p>
      <p><strong>VIP：</strong>${user.vipLevel || ""}</p>
      <p><strong>積分：</strong>${user.points || 0}</p>
      <p><strong>手機：</strong>${user.phone || ""}</p>
      <p><strong>年齡：</strong>${user.ageRange || ""}</p>
      <p><strong>城市：</strong>${user.city || ""}</p>
    </div>

    <div class="data-card">
      <h3>會員標籤</h3>
      <div class="tag-cloud">
        ${tags.length ? tags.map(tag => `<span class="crm-tag">${tag.tagName}</span>`).join("") : `<span class="muted-text">尚無標籤</span>`}
      </div>
    </div>

    <div class="data-card">
      <h3>參加的活動項目</h3>
      <table class="admin-table">
        <thead>
          <tr>
            <th>活動</th>
            <th>時間</th>
            <th>作答 / 結果</th>
          </tr>
        </thead>
        <tbody>${activityRows || `<tr><td colspan="3">尚無活動紀錄</td></tr>`}</tbody>
      </table>
    </div>
  `);
}

function renderMiniTable(title, data) {
  const rows = Object.entries(data || {})
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 10);

  return `
    <div class="data-card">
      <h3>${title}</h3>
      <table class="admin-table">
        <thead>
          <tr><th>項目</th><th>數量</th></tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map(([key, value]) => `<tr><td>${key}</td><td>${value}</td></tr>`).join("") : `<tr><td colspan="2">尚無資料</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "未分類";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function flattenObject(obj, prefix = "") {
  return Object.entries(obj || {}).reduce((acc, [key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value) && !value.seconds) {
      Object.assign(acc, flattenObject(value, nextKey));
    } else if (value?.seconds) {
      acc[nextKey] = formatDateFromTimestamp(value);
    } else if (Array.isArray(value)) {
      acc[nextKey] = value.join(" | ");
    } else {
      acc[nextKey] = value ?? "";
    }
    return acc;
  }, {});
}

function downloadCsv(filename, rows) {
  const flatRows = rows.map(row => flattenObject(row));
  const headers = Array.from(new Set(flatRows.flatMap(row => Object.keys(row))));
  const csv = [
    headers.join(","),
    ...flatRows.map(row => headers.map(header => csvCell(row[header])).join(","))
  ].join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}
