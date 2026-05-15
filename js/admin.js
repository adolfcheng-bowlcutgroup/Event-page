import {
  db,
  collection,
  query,
  where,
  getDocs,
  limit
} from "./firebase.js";
import {
  state,
  formatDateFromTimestamp,
  sortByCreatedAtDesc
} from "./user.js";
import { activities } from "./activity-registry.js";

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

function renderMemberBackend() {
  $("#backendContent").html(`
    <div class="section-title">
      <div>
        <h2>我的後台</h2>
        <p>查看你的會員基本資料。</p>
      </div>
    </div>
    <div class="data-card">
      <h3>會員基本資料</h3>
      <p><strong>Email：</strong><span class="email-text">${state.currentProfile.email}</span></p>
      <p><strong>姓名：</strong>${state.currentProfile.displayName || ""}</p>
      <p><strong>角色：</strong>${state.currentProfile.role}</p>
      <p><strong>VIP：</strong>${state.currentProfile.vipLevel}</p>
      <p><strong>積分：</strong>${state.currentProfile.points || 0}</p>
      <p><strong>來源活動：</strong>${state.currentProfile.sourceEvent || ""}</p>
    </div>
  `);
}

function renderAdminBackend() {
  $("#backendContent").html(`
    <div class="section-title">
      <div>
        <h2>簡易後台</h2>
        <p>可依活動匯出 CSV，或用會員信箱查詢該會員資料與作答結果。</p>
      </div>
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
      <div class="notice">
        若匯出失敗，請確認 Firestore Rules 允許管理員讀取 activityLogs、surveys、rewards、pointLogs。
      </div>
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

  $("#exportActivityCsvBtn").on("click", exportSelectedActivityCsv);
  $("#searchMemberBtn").on("click", searchMemberByEmail);
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

    const [logs, surveys, rewards, pointLogs] = await Promise.all([
      getByUser("activityLogs", user.uid),
      getByUser("surveys", user.uid),
      getByUser("rewards", user.uid),
      getByUser("pointLogs", user.uid)
    ]);

    renderMemberSearchResult(user, logs, surveys, rewards, pointLogs);
  } catch (error) {
    $("#memberSearchResult").html(`<div class="notice">查詢失敗：${error.message}</div>`);
  }
}

async function getByUser(collectionName, uid) {
  const snap = await getDocs(query(collection(db, collectionName), where("userId", "==", uid), limit(200)));
  return sortByCreatedAtDesc(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
}

function renderMemberSearchResult(user, logs, surveys, rewards, pointLogs) {
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
