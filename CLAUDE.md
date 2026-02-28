# CLAUDE.md

## プロジェクト概要

物流デジタルツインのコンセプトデモ。ペーパーマリオ/ヨッシーアイランド風のビジュアルスタイル。

## 技術スタック

- React 19 + TypeScript + Vite 7 + Tailwind CSS v4 (`@tailwindcss/vite`)
- HTML5 Canvas (requestAnimationFrame ベースの描画ループ)
- OpenAI gpt-image-1 API (スプライト生成用)

## ビルド & 開発

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # dist/ に出力
npx tsc --noEmit  # 型チェック
npm run lint      # Biome による lint チェック
npm run lint:fix  # Biome で自動修正
```

## スプライト生成

```bash
# .env に OPENAI_API_KEY を設定
node scripts/generate-sprites.mjs
```

出力先: `src/assets/sprites/` (12枚の透過PNG)

## ディレクトリ構成

```
src/
  components/      # React コンポーネント
    CityCanvas.tsx  # Canvas 描画 (スプライト + ペーパークラフト風背景)
    StatusPanel.tsx # 右サイドパネル (メトリクス・フィードバック・スキル)
    AgentDetailPanel.tsx # エージェント詳細スライドイン
    Header.tsx, Footer.tsx, HintBar.tsx, PhaseNav.tsx
  data/
    mockData.ts     # 全モックデータ (建物・エージェント・フィードバック等)
  types/
    index.ts        # TypeScript 型定義
  utils/
    spriteLoader.ts     # スプライト読み込み + role/state → spriteKey マッピング
    agentSimulation.ts  # エージェント行動シミュレーション (状態遷移)
  App.tsx           # メインオーケストレーター (useReducer + ゲームループ)
  index.css         # Tailwind テーマ (ペーパークラフト配色)
scripts/
  generate-sprites.mjs  # OpenAI API でスプライト生成
test/
  check.mjs        # Playwright で全5フェーズのスクリーンショット撮影
```

## 重要パターン

- **CityCanvas の ref パターン**: props を `propsRef` に格納し、`useEffect([], [])` で描画ループを1回だけ起動。毎フレーム ref から最新値を読む。依存配列に props を入れるとループが壊れる。
- **型インポート**: mockData.ts 等では `import type { ... }` を使うこと。Vite の esbuild は値エクスポートのない型を `import { ... }` で読めない。
- **テーマカラー**: index.css の `@theme` ブロックで CSS カスタムプロパティとして定義。Tailwind クラスから `text-text-primary`, `bg-bg-primary`, `border-border-warm` 等で参照可能。

## コミット規約

- `feat:`, `fix:`, `refactor:` プレフィックス
- .env は絶対にコミットしない (.gitignore 済)
- test/ ディレクトリと生成スプライト PNG も .gitignore 済

## Lint & Format

- **Biome** (ESLint + Prettier の代替) を使用
- 設定: `biome.json` — single quotes, 2-space indent, 120 line width
- `src/index.css` は Tailwind v4 の `@theme` 構文のため Biome の対象外
