const auraResults = [
  {
    name: "強化系",
    desc: "你是行動力強、直覺明確、越投入越強大的瓜粉。",
    className: "aura-enhance"
  },
  {
    name: "放出系",
    desc: "你擅長把熱情傳遞出去，適合號召朋友一起參與活動。",
    className: "aura-emit"
  },
  {
    name: "操作系",
    desc: "你觀察細膩、擅長掌握節奏，常能看出活動中的關鍵線索。",
    className: "aura-control"
  },
  {
    name: "變化系",
    desc: "你想像力豐富、反應靈活，總能玩出不同風格。",
    className: "aura-change"
  },
  {
    name: "特質系",
    desc: "你擁有獨特直覺與個人魅力，是難以被分類的稀有類型。",
    className: "aura-special"
  },
  {
    name: "美術系",
    desc: "你對畫面與氛圍特別敏銳，很適合拍照打卡與收藏周邊。",
    className: "aura-art"
  }
];

export const auraGameActivity = {
  id: "aura-cup-game",
  type: "game",
  icon: "🍃",
  title: "水見式能力測驗",
  description: "按住杯面 3 秒，測出你的專屬能力系別。完成後可獲得 5 點積分。",
  requiredVip: "VIP1",
  points: 5,
  repeatable: false,

  render(container, context) {
    let timer = null;
    let remaining = 3;
    let currentResult = null;

    container.innerHTML = `
      <div class="section-title">
        <div>
          <h2>水見式能力測驗</h2>
          <p>按住杯面 3 秒，顯示你的能力結果。</p>
        </div>
      </div>

      <div class="aura-game">
        <div id="auraStage" class="aura-stage">
          <div class="cup-top">
            <div class="water-ripple"></div>
            <div class="leaf">🍃</div>
          </div>
          <div id="auraCountdown" class="aura-countdown">按住杯面開始</div>
        </div>

        <div id="auraResult" class="aura-result hidden"></div>

        <div class="activity-actions">
          <button id="claimAuraPoints" class="btn btn-primary hidden" type="button">離開活動並領取 +5 點</button>
          <button id="retakeAura" class="btn btn-secondary hidden" type="button">重新測一次</button>
          <button id="closeActivityDetail" class="btn btn-secondary" type="button">返回活動列表</button>
        </div>
      </div>
    `;

    function resetPress() {
      clearInterval(timer);
      timer = null;
      remaining = 3;
      if (!currentResult) $("#auraCountdown").text("按住杯面開始");
      $("#auraStage").removeClass("charging");
    }

    function revealResult() {
      clearInterval(timer);
      timer = null;
      currentResult = auraResults[Math.floor(Math.random() * auraResults.length)];
      $("#auraStage").removeClass("charging").addClass(currentResult.className);
      $("#auraCountdown").text("測驗完成");
      $("#auraResult").removeClass("hidden").html(`
        <div class="aura-result-card">
          <div class="aura-result-label">你的結果是</div>
          <h3>${currentResult.name}</h3>
          <p>${currentResult.desc}</p>
          <small>你可以截圖保存此結果。</small>
        </div>
      `);
      $("#claimAuraPoints, #retakeAura").removeClass("hidden");
    }

    function startPress() {
      if (currentResult || timer) return;
      $("#auraStage").addClass("charging");
      $("#auraCountdown").text(`倒數 ${remaining}`);
      timer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          revealResult();
        } else {
          $("#auraCountdown").text(`倒數 ${remaining}`);
        }
      }, 1000);
    }

    $("#auraStage").on("mousedown touchstart", function (event) {
      event.preventDefault();
      startPress();
    });

    $(document).on("mouseup touchend", resetPress);

    $("#retakeAura").on("click", function () {
      currentResult = null;
      remaining = 3;
      $("#auraStage").removeClass("aura-enhance aura-emit aura-control aura-change aura-special aura-art charging");
      $("#auraResult").addClass("hidden").empty();
      $("#claimAuraPoints, #retakeAura").addClass("hidden");
      $("#auraCountdown").text("按住杯面開始");
    });

    $("#claimAuraPoints").on("click", async function () {
      if (!currentResult) return;
      const result = await context.complete({
        result: currentResult.name,
        details: currentResult
      });
      alert(`完成測驗！獲得 ${context.activity.points} 點，目前 ${result.pointResult.newVipLevel}，總積分 ${result.pointResult.newPoints} 點。`);
      context.close();
    });
  }
};
