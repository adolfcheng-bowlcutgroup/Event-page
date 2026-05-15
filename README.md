# VIP Event Hub Modular Repo

這是一個可直接上傳到 GitHub Pages 或 Firebase Hosting 的模組化版本。

## 結構

```text
GitHub Repo
├── index.html
├── js/
│   ├── firebase.js
│   ├── auth.js
│   ├── user.js
│   ├── admin.js
│   ├── activity-registry.js
│   ├── activity-runner.js
│   └── app.js
├── css/
│   └── main.css
└── activities/
    ├── spin-game/
    │   ├── index.js
    │   └── style.css
    ├── aura-game/
    │   ├── index.js
    │   └── style.css
    └── hunter-kaohsiung-survey/
        ├── index.js
        └── style.css
```

## 活動新增方式

1. 在 `activities/{activity-name}/` 建立 `index.js` 與 `style.css`
2. 在 `js/activity-registry.js` 匯入活動 module
3. 將 activity object 加入 `activities` 陣列

活動物件範例：

```js
export const myActivity = {
  id: "my-activity",
  type: "game",
  icon: "🎯",
  title: "我的活動",
  description: "活動描述",
  requiredVip: "VIP1",
  points: 5,
  repeatable: false,
  render(container, context) {
    container.innerHTML = "...";
  }
};
```

## Firebase

Firebase 設定在 `js/firebase.js`。目前已使用既有專案設定：

- `event-page-30aea`

管理員白名單請在 Firestore 建立：

```text
admins/{管理員信箱小寫}
```

內容：

```json
{
  "role": "admin"
}
```

## 注意

目前是 MVP 前端版。正式上線建議將「加積分、發獎、防重複參加」搬到 Cloud Functions。

## 版面說明

上方主切換為「活動」「VIP專屬」「我的後台 / 簡易後台」。三個按鈕都在同一個頁面、同一個內容區塊內切換，不做頁面跳轉。`type: "benefit"`、`requiredVip: "VIP2"` 或 `requiredVip: "VIP3"` 的活動會自動顯示在「VIP專屬」分頁。
