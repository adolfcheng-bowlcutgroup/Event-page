export const psychicControlGameActivity = {
  id: "psychic-control-game",
  type: "game",
  icon: "📏",
  title: "超能100！靈力控制挑戰",
  description: "在 15 秒內讓動態刻度命中目標區 3 次即可通關，通關可獲得 10 點積分。",
  requiredVip: "VIP1",
  points: 10,
  repeatable: false,

  render(container, context) {
    let timer = null;
    let markerTimer = null;
    let remaining = 15;
    let hits = 0;
    let markerValue = 0;
    let direction = 1;
    let speed = 2.4;
    let targetMin = 35;
    let targetMax = 50;
    let playing = false;
    let finished = false;

    container.innerHTML = `
      <div class="section-title">
        <div>
          <h2>超能100！靈力控制挑戰</h2>
          <p>15 秒內命中目標區 3 次即可通關，通關 +10 點。</p>
        </div>
      </div>

      <div class="psychic-game">
        <div class="psychic-info-grid">
          <div class="psychic-info-card">
            <strong id="psychicTime">15</strong>
            <span>剩餘秒數</span>
          </div>
          <div class="psychic-info-card">
            <strong id="psychicHits">0 / 3</strong>
            <span>命中次數</span>
          </div>
          <div class="psychic-info-card">
            <strong id="psychicStatus">待機</strong>
            <span>目前狀態</span>
          </div>
        </div>

        <div class="psychic-stage">
          <div class="psychic-meter-wrap">
            <div class="psychic-meter" id="psychicMeter">
              <div class="psychic-target" id="psychicTarget"></div>
              <div class="psychic-marker" id="psychicMarker"></div>
              <div class="psychic-scale">
                ${Array.from({ length: 11 }, (_, index) => {
                  const value = index * 10;
                  return `<span style="bottom: ${value}%;">${value}</span>`;
                }).join("")}
              </div>
            </div>
          </div>

          <div class="psychic-guide">
            <h3>玩法說明</h3>
            <p>綠色到紫色的能量條代表 0 到 100。動態刻度會上下移動，請在刻度進入發光目標區時按下停止。</p>
            <p>命中 3 次即通關；時間到但未通關不會加點，也不會記為已參加，可以重新挑戰。</p>
            <div class="activity-actions">
              <button id="psychicStartBtn" class="btn btn-primary" type="button">開始挑戰</button>
              <button id="psychicStopBtn" class="btn btn-secondary" type="button" disabled>停止</button>
              <button id="psychicRetryBtn" class="btn btn-secondary hidden" type="button">重新挑戰</button>
              <button class="btn btn-secondary close-activity-detail" type="button">返回</button>
            </div>
            <div id="psychicMessage" class="notice psychic-message">準備好後，按「開始挑戰」。</div>
          </div>
        </div>
      </div>
    `;

    function randomizeTarget() {
      const targetHeight = 10 + Math.random() * 10; // 10% - 20%
      const targetBottom = 8 + Math.random() * (84 - targetHeight);
      targetMin = targetBottom;
      targetMax = targetBottom + targetHeight;

      $("#psychicTarget").css({
        bottom: `${targetMin}%`,
        height: `${targetMax - targetMin}%`
      });
    }

    function updateMarker() {
      markerValue += direction * speed;

      if (markerValue >= 100) {
        markerValue = 100;
        direction = -1;
      }

      if (markerValue <= 0) {
        markerValue = 0;
        direction = 1;
      }

      $("#psychicMarker").css("bottom", `${markerValue}%`);
    }

    function updateStatus(text) {
      $("#psychicStatus").text(text);
    }

    function startGame() {
      if (playing || finished) return;

      remaining = 15;
      hits = 0;
      markerValue = Math.floor(Math.random() * 100);
      direction = Math.random() > 0.5 ? 1 : -1;
      speed = 2.2 + Math.random() * 1.2;
      playing = true;
      finished = false;

      randomizeTarget();
      $("#psychicTime").text(remaining);
      $("#psychicHits").text(`${hits} / 3`);
      $("#psychicMessage").text("集中靈力，命中目標區 3 次！");
      updateStatus("挑戰中");

      $("#psychicStartBtn").prop("disabled", true).addClass("hidden");
      $("#psychicRetryBtn").addClass("hidden");
      $("#psychicStopBtn").prop("disabled", false).removeClass("btn-secondary").addClass("btn-primary");

      markerTimer = setInterval(updateMarker, 24);
      timer = setInterval(() => {
        remaining -= 1;
        $("#psychicTime").text(remaining);

        if (remaining <= 0) {
          failGame();
        }
      }, 1000);
    }

    function stopAttempt() {
      if (!playing || finished) return;

      const hit = markerValue >= targetMin && markerValue <= targetMax;

      if (hit) {
        hits += 1;
        $("#psychicHits").text(`${hits} / 3`);
        $("#psychicMessage").text(`命中！目前 ${hits} / 3。`);
        updateStatus("命中");
        flashMeter("hit");

        if (hits >= 3) {
          passGame();
          return;
        }

        randomizeTarget();
        speed = 2.2 + Math.random() * 1.4;
        direction = Math.random() > 0.5 ? 1 : -1;
      } else {
        $("#psychicMessage").text(`失誤！目前刻度 ${Math.round(markerValue)}，請繼續挑戰。`);
        updateStatus("失誤");
        flashMeter("miss");
        randomizeTarget();
      }
    }

    function flashMeter(type) {
      const meter = $("#psychicMeter");
      meter.removeClass("psychic-hit psychic-miss");
      meter.addClass(type === "hit" ? "psychic-hit" : "psychic-miss");

      setTimeout(() => {
        meter.removeClass("psychic-hit psychic-miss");
        if (playing) updateStatus("挑戰中");
      }, 420);
    }

    async function passGame() {
      if (finished) return;
      finished = true;
      playing = false;
      clearInterval(timer);
      clearInterval(markerTimer);

      $("#psychicStopBtn").prop("disabled", true).removeClass("btn-primary").addClass("btn-secondary");
      updateStatus("通關");
      $("#psychicMessage").text("通關成功！正在寫入積分...");

      try {
        const result = await context.complete({
          result: "通關",
          details: {
            hits,
            remainingSeconds: remaining,
            finalMarkerValue: Math.round(markerValue),
            targetMin: Math.round(targetMin),
            targetMax: Math.round(targetMax)
          }
        });

        alert(`通關成功！獲得 ${context.activity.points} 點，目前 ${result.pointResult.newVipLevel}，總積分 ${result.pointResult.newPoints} 點。`);
        context.close();
      } catch (error) {
        $("#psychicMessage").text(`通關寫入失敗：${error.message}`);
        $("#psychicRetryBtn").removeClass("hidden");
      }
    }

    function failGame() {
      if (finished) return;
      playing = false;
      clearInterval(timer);
      clearInterval(markerTimer);

      $("#psychicStopBtn").prop("disabled", true).removeClass("btn-primary").addClass("btn-secondary");
      $("#psychicRetryBtn").removeClass("hidden");
      $("#psychicStartBtn").addClass("hidden");
      updateStatus("失敗");
      $("#psychicMessage").text("挑戰失敗，但不會記為已參加。可以重新挑戰！");
    }

    function resetGame() {
      clearInterval(timer);
      clearInterval(markerTimer);

      remaining = 15;
      hits = 0;
      markerValue = 0;
      playing = false;
      finished = false;

      randomizeTarget();
      $("#psychicMarker").css("bottom", "0%");
      $("#psychicTime").text("15");
      $("#psychicHits").text("0 / 3");
      $("#psychicMessage").text("準備好後，按「開始挑戰」。");
      updateStatus("待機");

      $("#psychicStartBtn").prop("disabled", false).removeClass("hidden");
      $("#psychicRetryBtn").addClass("hidden");
      $("#psychicStopBtn").prop("disabled", true).removeClass("btn-primary").addClass("btn-secondary");
    }

    $("#psychicStartBtn").on("click", startGame);
    $("#psychicStopBtn").on("click", stopAttempt);
    $("#psychicRetryBtn").on("click", resetGame);

    randomizeTarget();
  }
};
