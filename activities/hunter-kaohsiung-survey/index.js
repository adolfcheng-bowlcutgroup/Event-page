import {
  db,
  addDoc,
  collection,
  serverTimestamp
} from "../../js/firebase.js?v8";

export const hunterKaohsiungSurveyActivity = {
  id: "hunter-kaohsiung-survey",
  type: "survey",
  icon: "🧩",
  title: "獵人實境解謎遊戲_滿意度調查(高雄站)",
  description: "填寫高雄站活動滿意度問卷，協助我們優化未來活動體驗。完成後可獲得 10 點積分。",
  requiredVip: "VIP1",
  points: 10,
  repeatable: false,

  render(container, context) {
    container.innerHTML = `
      <div class="section-title">
        <div>
          <h2>獵人實境解謎遊戲_滿意度調查(高雄站)</h2>
          <p>本問卷預計填寫時間約 2-3 分鐘。</p>
        </div>
      </div>

      <form id="hunterSurveyForm" class="form-grid hunter-survey">
        <div class="form-section">
          <h3>基本資料</h3>
          <label>電子郵件 Email
            <input id="hunterEmail" type="email" required value="${context.state.currentProfile.email || ""}" />
          </label>
          <label>手機號碼
            <input id="hunterPhone" required placeholder="例如：0912345678" />
          </label>
          <label>您的年齡區間？
            <select id="hunterAge" required>
              <option value="">請選擇</option>
              <option>8 歲以下</option>
              <option>18-22 歲</option>
              <option>23-29 歲</option>
              <option>30-39 歲</option>
              <option>40 歲以上</option>
            </select>
          </label>
          <label>您是否有登入貪婪之島體驗遊戲？
            <select id="hunterPlayed" required>
              <option value="">請選擇</option>
              <option value="有">有</option>
              <option value="沒有，只有逛商店區">沒有，只有逛商店區</option>
            </select>
          </label>
        </div>

        <div id="hunterGameSection" class="form-section">
          <h3>遊戲體驗調查</h3>

          ${checkboxGroup("hunterChannel", "您是透過什麼管道得知本次活動？（可複選）", [
            "獵人實境解謎官方 Instagram / Threads / Facebook",
            "KOL 推薦",
            "朋友推薦",
            "網路廣告",
            "路過看到就來玩了",
            "動漫社團／論壇",
            "其他"
          ])}

          <label>您過去參與過多少次「實境解謎／密室逃脫／沉浸式互動」類型活動？
            <select id="hunterPastCount">
              <option value="">請選擇</option>
              <option>從未參加過</option>
              <option>1-3 次</option>
              <option>4-10 次</option>
              <option>10 次以上</option>
            </select>
          </label>

          ${checkboxGroup("hunterImpressive", "您此次參與活動時，印象最深刻的是什麼？（最多選 2 項）", [
            "IP／角色劇情還原度",
            "沉浸式互動體驗",
            "與朋友一起遊玩",
            "拍照打卡體驗",
            "限定周邊商品",
            "解謎／遊戲挑戰性"
          ], 2)}

          ${checkboxGroup("hunterReturnReason", "若未來有類似活動，您最有可能再次參加的原因是？（最多選 2 項）", [
            "喜歡這個 IP",
            "喜歡沉浸式體驗",
            "想購買限定商品",
            "想與朋友一起參加",
            "喜歡拍照／場景",
            "喜歡實境解謎玩法"
          ], 2)}
        </div>

        <div class="form-section">
          <h3>玩家行為調查</h3>

          <label>若您此次有購買周邊商品，您的消費金額約為？
            <select id="hunterSpend" required>
              <option value="">請選擇</option>
              <option>未購買周邊商品</option>
              <option>300 元以下</option>
              <option>301-800 元</option>
              <option>801-1500 元</option>
              <option>1501-2000 元</option>
              <option>2000 元以上</option>
            </select>
          </label>

          ${checkboxGroup("hunterMerchType", "若未來推出更多動漫 IP 快閃店，您最有興趣購買的周邊類型是？（可複選）", [
            "隨機盲抽商品（盲盒、小卡、扭蛋）",
            "小型收藏品（徽章、吊飾、貼紙）",
            "中高單價收藏品（立牌、模型、公仔）",
            "實用型商品（服飾、包袋、文具）",
            "絨毛娃娃／動畫或漫畫中的道具還原商品"
          ])}

          <label>您最希望未來能合作的動漫／遊戲 IP 是？【非必填】
            <input id="hunterFutureIp" placeholder="例如：作品名稱" />
          </label>

          ${checkboxGroup("hunterPastEvents", "您玩過西瓜皮育樂主辦的哪一檔活動／展覽？", [
            "實境解謎《獵人實境解謎遊戲-貪婪之島》",
            "沉浸式互動體驗《幻隱光靈》",
            "靜態特展《Lycoris Recoil 莉可麗絲展～seize the day～》"
          ])}

          <label>如果有任何想建議或改善的地方，歡迎留下您的意見。【非必填】
            <textarea id="hunterFeedback"></textarea>
          </label>
        </div>

        <button class="btn btn-primary" type="submit">送出滿意度調查並獲得 10 點</button>
      </form>
    `;

    $("#hunterPlayed").on("change", function () {
      if ($(this).val() === "沒有，只有逛商店區") {
        $("#hunterGameSection").addClass("hidden");
      } else {
        $("#hunterGameSection").removeClass("hidden");
      }
    });

    bindMaxCheckboxes("hunterImpressive", 2);
    bindMaxCheckboxes("hunterReturnReason", 2);

    $("#hunterSurveyForm").on("submit", async function (event) {
      event.preventDefault();

      const response = {
        userId: context.state.currentUser.uid,
        email: context.state.currentUser.email,
        vipLevel: context.state.currentProfile.vipLevel,
        activityId: context.activity.id,
        activityTitle: context.activity.title,
        formType: "hunter_kaohsiung_satisfaction",
        answers: {
          email: $("#hunterEmail").val().trim(),
          phone: $("#hunterPhone").val().trim(),
          ageRange: $("#hunterAge").val(),
          playedGame: $("#hunterPlayed").val(),
          discoveryChannels: getCheckedValues("hunterChannel"),
          pastExperienceCount: $("#hunterPastCount").val(),
          impressiveParts: getCheckedValues("hunterImpressive"),
          returnReasons: getCheckedValues("hunterReturnReason"),
          merchSpend: $("#hunterSpend").val(),
          interestedMerchTypes: getCheckedValues("hunterMerchType"),
          futureIp: $("#hunterFutureIp").val().trim(),
          pastEvents: getCheckedValues("hunterPastEvents"),
          feedback: $("#hunterFeedback").val().trim()
        },
        createdAt: serverTimestamp()
      };

      const surveyRef = await addDoc(collection(db, "surveys"), response);
      const result = await context.complete({
        surveyId: surveyRef.id,
        details: response.answers
      });

      alert(`問卷完成！獲得 ${context.activity.points} 點，目前 ${result.pointResult.newVipLevel}，總積分 ${result.pointResult.newPoints} 點。`);
      context.close();
    });
  }
};

function checkboxGroup(name, label, options, max = null) {
  const maxText = max ? ` data-max="${max}"` : "";
  return `
    <div class="form-field">
      <label>${label}</label>
      <div class="check-grid" data-checkbox-group="${name}"${maxText}>
        ${options.map(option => `
          <label class="check-option">
            <input type="checkbox" name="${name}" value="${escapeHtml(option)}" />
            <span>${option}</span>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

function bindMaxCheckboxes(name, max) {
  $(document).off("change", `input[name="${name}"]`).on("change", `input[name="${name}"]`, function () {
    const checked = $(`input[name="${name}"]:checked`);
    if (checked.length > max) {
      this.checked = false;
      alert(`此題最多只能選 ${max} 項。`);
    }
  });
}

function getCheckedValues(name) {
  return $(`input[name="${name}"]:checked`).map(function () {
    return $(this).val();
  }).get();
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
