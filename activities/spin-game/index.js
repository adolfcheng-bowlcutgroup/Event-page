export const spinGameActivity = {
  id: "spin-discount",
  type: "game",
  icon: "🎮",
  title: "玩小遊戲送折扣",
  description: "挑戰轉盤遊戲，可獲得 5 點積分與折扣碼。",
  requiredVip: "VIP1",
  points: 5,
  repeatable: false,

  render(container, context) {
    let wheelDeg = 0;

    container.innerHTML = `
      <div class="section-title">
        <div>
          <h2>玩小遊戲送折扣</h2>
          <p>VIP 等級越高，獎勵越好。</p>
        </div>
      </div>

      <div class="game-box">
        <div id="wheel" class="wheel">
          <div class="wheel-inner">GO</div>
        </div>
        <button id="spinBtn" class="btn btn-primary" type="button">開始轉盤</button>
        <p id="gameResult" class="game-result"></p>
      </div>
    `;

    $("#spinBtn").on("click", async function () {
      $(this).prop("disabled", true).text("轉盤中...");
      wheelDeg += 720 + Math.floor(Math.random() * 360);
      $("#wheel").css("transform", `rotate(${wheelDeg}deg)`);

      setTimeout(async () => {
        let discount = "95OFF";
        const vipLevel = context.state.currentProfile.vipLevel;

        if (vipLevel === "VIP3") discount = Math.random() > 0.35 ? "85OFF" : "90OFF";
        if (vipLevel === "VIP2") discount = Math.random() > 0.45 ? "90OFF" : "95OFF";
        if (vipLevel === "VIP1") discount = Math.random() > 0.75 ? "90OFF" : "95OFF";

        const code = context.createCode(discount);
        const result = await context.complete({
          result: discount,
          reward: {
            type: "discount",
            title: `小遊戲折扣碼 ${discount}`,
            code
          }
        });

        $("#gameResult").text(`恭喜獲得 ${context.activity.points} 點積分，目前 ${result.pointResult.newVipLevel}，總積分 ${result.pointResult.newPoints} 點。折扣碼：${code}`);
        $(this).prop("disabled", false).text("完成");
      }, 1700);
    });
  }
};
