import { spinGameActivity } from "../activities/spin-game/index.js";
import { auraGameActivity } from "../activities/aura-game/index.js";
import { psychicControlGameActivity } from "../activities/psychic-control-game/index.js";
import { hunterKaohsiungSurveyActivity } from "../activities/hunter-kaohsiung-survey/index.js";
import { simpleSurveyActivity } from "./activity-runner.js";

export const activities = [
  simpleSurveyActivity,
  spinGameActivity,
  auraGameActivity,
  psychicControlGameActivity,
  {
    id: "vip2-fastpass",
    type: "benefit",
    icon: "⚡",
    title: "VIP2 快速通關",
    description: "累積 10 點成為 VIP2 後，可解鎖線下活動快速通關權益。",
    requiredVip: "VIP2",
    points: 0,
    repeatable: true,
    benefitHtml: `
      <div class="notice">
        <strong>你已解鎖 VIP2 快速通關資格。</strong><br>
        請於線下活動現場向工作人員出示此畫面。正式 QR Code 核銷功能可於後續版本加入。
      </div>
    `
  },
  {
    id: "vip3-draw",
    type: "benefit",
    icon: "👑",
    title: "VIP3 限定抽獎",
    description: "累積 30 點成為 VIP3 後，可參加最高等級會員限定抽獎。",
    requiredVip: "VIP3",
    points: 0,
    repeatable: true,
    benefitHtml: `
      <div class="notice">
        <strong>你已解鎖 VIP3 限定抽獎資格。</strong><br>
        正式抽獎功能尚未開放，請留意後續活動公告。
      </div>
    `
  },
  hunterKaohsiungSurveyActivity
];
