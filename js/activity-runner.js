import {
  db,
  addDoc,
  collection,
  serverTimestamp
} from "./firebase.js?v8";
import {
  state,
  canAccess,
  getVipClass,
  hasParticipated,
  completeActivity,
  createCode
} from "./user.js?v8";
import { renderAppShell } from "./app.js?v8";

let activitiesRef = [];

export const simpleSurveyActivity = {
  id: "survey-serial",
  type: "survey",
  icon: "📝",
  title: "填問卷送序號",
  description: "完成 1 分鐘問卷，可獲得 10 點積分與專屬活動序號。",
  requiredVip: "VIP1",
  points: 10,
  repeatable: false,
  render(container, context) {
    container.innerHTML = `
      <div class="section-title">
        <div>
          <h2>填問卷送序號</h2>
          <p>完成後會寫入 Firestore 並產生獎勵。</p>
        </div>
      </div>
      <form id="simpleSurveyForm" class="form-grid">
        <label>姓名 / 暱稱
          <input id="simpleName" required placeholder="例如：王小明" />
        </label>
        <label>手機號碼
          <input id="simplePhone" required placeholder="例如：0912345678" />
        </label>
        <label>年齡區間
          <select id="simpleAge" required>
            <option value="">請選擇</option>
            <option>18 以下</option>
            <option>18-24</option>
            <option>25-34</option>
            <option>35-44</option>
            <option>45 以上</option>
          </select>
        </label>
        <label>居住地區
          <select id="simpleCity" required>
            <option value="">請選擇</option>
            <option>台北市</option><option>新北市</option><option>桃園市</option>
            <option>台中市</option><option>台南市</option><option>高雄市</option><option>其他</option>
          </select>
        </label>
        <label>感興趣的活動 / 產品
          <textarea id="simpleInterest" placeholder="例如：線下展覽、會員優惠、遊戲活動、限定商品"></textarea>
        </label>
        <label class="checkbox-label">
          <input id="simpleConsent" type="checkbox" required />
          <span>我同意接收活動通知、優惠資訊與後續行銷訊息。</span>
        </label>
        <button class="btn btn-primary" type="submit">送出問卷並領取序號</button>
      </form>
    `;

    $("#simpleSurveyForm").on("submit", async function (event) {
      event.preventDefault();

      const surveyData = {
        userId: state.currentUser.uid,
        email: state.currentUser.email,
        vipLevel: state.currentProfile.vipLevel,
        activityId: context.activity.id,
        activityTitle: context.activity.title,
        name: $("#simpleName").val().trim(),
        phone: $("#simplePhone").val().trim(),
        ageRange: $("#simpleAge").val(),
        city: $("#simpleCity").val(),
        interest: $("#simpleInterest").val().trim(),
        marketingConsent: $("#simpleConsent").is(":checked"),
        createdAt: serverTimestamp()
      };

      const surveyRef = await addDoc(collection(db, "surveys"), surveyData);
      const code = createCode("SERIAL");

      await context.complete({
        surveyId: surveyRef.id,
        reward: {
          type: "serial",
          title: "問卷完成序號",
          code
        }
      });

      alert(`問卷完成！已獲得 ${context.activity.points} 點積分，序號：${code}`);
      context.close();
    });
  }
};

export function setActivities(list) {
  activitiesRef = list;
}

export function renderActivities() {
  if (!state.currentProfile || !activitiesRef.length) return;

  const generalActivities = activitiesRef.filter(activity => !isVipExclusiveActivity(activity));
  const vipActivities = activitiesRef.filter(activity => isVipExclusiveActivity(activity));

  $("#activityGrid").html(renderActivityCards(generalActivities));
  $("#vipActivityGrid").html(
    vipActivities.length
      ? renderActivityCards(vipActivities)
      : `<div class="vip-empty">目前尚無 VIP 專屬活動。</div>`
  );

  $("#activityDetail, #vipActivityDetail").addClass("hidden").empty();
}

function isVipExclusiveActivity(activity) {
  return activity.type === "benefit" || activity.requiredVip === "VIP2" || activity.requiredVip === "VIP3";
}

function getCurrentDetailContainer(activity) {
  return isVipExclusiveActivity(activity) ? $("#vipActivityDetail") : $("#activityDetail");
}

function renderActivityCards(list) {
  return list.map((activity) => {
    const allowed = canAccess(state.currentProfile.vipLevel, activity.requiredVip);
    const participated = hasParticipated(activity.id);
    const isBenefit = activity.type === "benefit";

    let statusText = "可參加";
    let statusClass = "status-ok";
    let buttonText = "開始";

    if (!allowed) {
      statusText = "資格不符";
      statusClass = "status-bad";
      buttonText = "資格不符";
    } else if (isBenefit) {
      statusText = "已解鎖";
      statusClass = "status-ok";
      buttonText = "查看權益";
    } else if (participated && !activity.repeatable) {
      statusText = "已參加";
      statusClass = "status-tag";
      buttonText = "已參加";
    }

    return `
      <article class="activity-card" data-activity-id="${activity.id}">
        <button class="activity-summary" type="button" data-toggle-activity="${activity.id}">
          <div class="activity-icon">${activity.icon || "🎯"}</div>
          <div class="activity-copy">
            <h3>${activity.title}</h3>
            <p>${activity.description}</p>
          </div>
          <div class="activity-meta">
            <span class="tag ${getVipClass(activity.requiredVip)}">需 ${activity.requiredVip}</span>
            <span class="tag ${statusClass}">${statusText}</span>
          </div>
        </button>
        <div class="activity-body">
          <p>${activity.description}</p>
          <div class="activity-actions">
            <button
              class="btn ${allowed && !(participated && !activity.repeatable) ? "btn-primary" : "btn-secondary"} start-activity-btn"
              data-start-activity="${activity.id}"
              ${allowed && !(participated && !activity.repeatable) ? "" : "disabled"}
              type="button"
            >${buttonText}</button>
          </div>
          <div class="activity-inline-detail hidden" data-inline-detail="${activity.id}"></div>
        </div>
      </article>
    `;
  }).join("");
}
export function bindActivityEvents() {
  $(document).on("click", "[data-toggle-activity]", function () {
    const id = $(this).data("toggle-activity");
    const card = $(`.activity-card[data-activity-id="${id}"]`);
    const wasOpen = card.hasClass("open");

    $(".activity-card").not(card).removeClass("open active-card");
    $(".activity-inline-detail").not(card.find(".activity-inline-detail")).addClass("hidden").empty();

    card.toggleClass("open", !wasOpen);
    if (wasOpen) {
      card.removeClass("active-card");
      card.find(".activity-inline-detail").addClass("hidden").empty();
    }
  });

  $(document).on("click", "[data-start-activity]", function () {
    const id = $(this).data("start-activity");
    const activity = activitiesRef.find(item => item.id === id);
    if (!activity) return;

    const card = $(`.activity-card[data-activity-id="${id}"]`);
    const inlineDetail = card.find(`[data-inline-detail="${id}"]`);

    $(".activity-card").not(card).removeClass("open active-card");
    $(".activity-inline-detail").not(inlineDetail).addClass("hidden").empty();
    $("#activityDetail, #vipActivityDetail").addClass("hidden").empty();

    card.addClass("open active-card");
    inlineDetail.removeClass("hidden").empty();

    if (activity.type === "benefit") {
      inlineDetail.html(`
        <div class="section-title">
          <div>
            <h2>${activity.title}</h2>
            <p>會員權益說明</p>
          </div>
        </div>
        ${activity.benefitHtml || ""}
        <div class="activity-actions">
          <button class="btn btn-secondary close-activity-detail" type="button">返回</button>
        </div>
      `);
      return;
    }

    const context = buildActivityContext(activity);
    activity.render(inlineDetail[0], context);
  });

  $(document).on("click", "#closeActivityDetail, .close-activity-detail", function () {
    $(".activity-inline-detail").addClass("hidden").empty();
    $(".activity-card").removeClass("active-card");
    $("#activityDetail, #vipActivityDetail").addClass("hidden").empty();
  });
}
export function buildActivityContext(activity) {
  return {
    activity,
    state,
    createCode,
    async complete(payload = {}) {
      const result = await completeActivity(activity, payload);
      renderAppShell();
      renderActivities();
      return result;
    },
    close() {
      $(".activity-inline-detail").addClass("hidden").empty();
      $(".activity-card").removeClass("active-card");
      $("#activityDetail, #vipActivityDetail").addClass("hidden").empty();
      renderActivities();
    }
  };
}
