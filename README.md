# 解体案件管理アプリ

解体工事の案件を、問い合わせ受付から完工まで一気通貫で管理するiPhone向けWebアプリです。
`daily-report-app` と同じ構成（HTML/CSS/JSのみ・Firebase Firestoreでデータ永続化）で作られています。

## セットアップ手順

### 1. Firestore にコレクション用のルールを追加する

このアプリは `daily-report-app` と同じFirebaseプロジェクト（`dailyreport-e172a`）を流用し、
新しく `demolitionCases` というコレクションにデータを保存します。

[Firebase Console](https://console.firebase.google.com) → 対象プロジェクト → Firestore Database →
「ルール」タブで、既存のルールに以下を **追加** してください（既存の `reports` 等のルールはそのまま残します）。

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /reports/{document} {
      allow read, write: if true;
    }
    match /deals/{document} {
      allow read, write: if true;
    }
    match /memberKpiConfig/{document} {
      allow read, write: if true;
    }
    match /monthlyTargets/{document} {
      allow read, write: if true;
    }
    match /demolitionCases/{document} {
      allow read, write: if true;
    }
  }
}
```

> ※ 誰でも読み書きできるルールです。個人利用のツールという前提のため簡易的にしています。

### 1-2. Cloudinary の unsigned upload preset を用意する

現地写真・添付資料の保存には [Cloudinary](https://cloudinary.com) を使用します（Firebase Storageは使いません）。無料アカウントで以下を用意し、`js/config.js` の値を差し替えてください。

1. Cloudinaryダッシュボードの **Cloud name** を確認する
2. Settings → Upload → Upload presets で新規presetを作成し、**Signing Mode を「Unsigned」** にする
3. その preset 名を控える

```js
const CLOUDINARY_CLOUD_NAME = 'あなたのcloud name';
const CLOUDINARY_UPLOAD_PRESET = 'あなたのunsigned preset名';
```

> ※ Unsigned presetはクライアントから誰でもアップロードできる設定です。個人利用のツールという前提のため簡易的にしています。
> ※ アップロード済みファイルの削除はCloudinary側では行われません（アプリの一覧・編集画面から見えなくなるだけです）。実ファイルを消したい場合はCloudinaryの管理画面から手動で削除してください。

### 2. ローカルで動作確認する

```bash
# Python がある場合
python -m http.server 8000

# Node.js がある場合
npx serve .
```

ブラウザで `http://localhost:8000` を開いて動作確認してください。

### 3. Vercel にデプロイする（無料）

1. このフォルダを GitHub にプッシュ
2. [Vercel](https://vercel.com) で「New Project」→ 対象リポジトリを選択してデプロイ（設定不要）
3. 発行されたURLをiPhoneのSafariで開く
4. Safariの共有メニュー →「ホーム画面に追加」でアプリのように使えます

## ファイル構成

```
kaitai memo/
├── index.html          # 案件一覧画面（ステータスタブ＋カード一覧）
├── case.html           # 新規登録・詳細編集画面（idの有無で切り替え）
├── manifest.json        # PWA用マニフェスト
├── css/
│   └── style.css        # 全共通スタイル
└── js/
    ├── config.js         # Firebase/Cloudinary設定・ステータス定義・アップロード等の共通ユーティリティ
    ├── list.js           # 案件一覧画面のロジック
    └── case.js           # 新規登録・詳細編集画面のロジック
```

## 機能一覧

- **案件一覧** (`index.html`)：7つのステータスをタブで切り替え、該当件数を表示。カードタップで詳細画面へ。
- **新規登録** (`case.html`、idなし)：現場名・顧客名・見積もり依頼受注日・現場住所・現地写真・現地確認日候補（1〜3）・営業担当・着工予定日・完工予定日・予算希望・添付資料を入力（要件定義_5の入力順に対応）。
- **詳細編集** (`case.html`、id付き)：上記に加え、顧客連絡先・対応業者名・現地確認確定日・金額・ステータス・備考・次のアクション予定を含む全項目を表示・編集。削除も可能（確認ダイアログあり）。
- 現地写真・添付資料はCloudinaryに保存し、複数ファイルのアップロードに対応。一覧・編集画面からの「削除」はFirestore側の参照を外すのみで、Cloudinary上の実ファイルは残ります。
- ステータス変更はドロップダウンで手動選択（自動遷移はなし）。
- 「次にやるべきアクションの予定日時」項目を保持しており、将来のLINE通知連携に備えた設計になっています（今回は表示のみで通知機能自体は未実装）。
- ログイン機能は設けておらず、URLを知っている全員が同じ権限で利用できます。

## 既存データについての注意

要件定義_5対応にあたり、以下の項目は**自動移行を行っていません**。既存の案件を開いた際、必要に応じて手動で編集してください。

- 旧`現場名／顧客名`が結合して`現場名`に入っていた案件：「顧客名」欄は空欄になるため、必要なら手動で分割・追記してください
- 旧「現地立会い予定日時」（自由記述）が入っていた案件：値は残したまま編集画面に「（旧データ）」として参考表示されます。新しい「現地確認日候補」「現地確認確定日」は空欄からのスタートです

## 今回のMVPで対応していないこと

- 複数ユーザー・権限管理、ログイン認証（全員が同じ権限で利用する想定）
- 業者マスタ管理（案件ごとに都度手入力）
- 原価と売上を分けた損益自動計算
- プッシュ通知・LINE通知の実装
