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
    ├── config.js         # Firebase設定・ステータス定義・共通ユーティリティ
    ├── list.js           # 案件一覧画面のロジック
    └── case.js           # 新規登録・詳細編集画面のロジック
```

## 機能一覧

- **案件一覧** (`index.html`)：7つのステータスをタブで切り替え、該当件数を表示。カードタップで詳細画面へ。
- **新規登録・詳細編集** (`case.html`)：現場名、住所、連絡先、業者情報、注文住宅営業担当者名、日程、金額、ステータス、備考を入力・編集。削除も可能（確認ダイアログあり）。
- ステータス変更はドロップダウンで手動選択（自動遷移はなし）。
- 「次にやるべきアクションの予定日時」項目を保持しており、将来のLINE通知連携に備えた設計になっています（今回は表示のみで通知機能自体は未実装）。

## 今回のMVPで対応していないこと

- 複数ユーザー・権限管理、ログイン認証
- 業者マスタ管理（案件ごとに都度手入力）
- 写真・書類添付
- 原価と売上を分けた損益自動計算
- プッシュ通知・LINE通知の実装
