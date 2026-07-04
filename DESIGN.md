---
version: alpha
name: mottain-ai
description: にんじんテーマ。食材を使い切る献立エージェントの、暖かく親しみのある家庭的な UI
colors:
  background: "oklch(0.968 0.017 80)"
  foreground: "oklch(0.33 0.045 52)"
  card: "oklch(0.986 0.01 82)"
  card-foreground: "oklch(0.33 0.045 52)"
  popover: "oklch(0.986 0.01 82)"
  popover-foreground: "oklch(0.33 0.045 52)"
  primary: "oklch(0.585 0.145 146)"
  primary-foreground: "oklch(0.985 0.02 125)"
  secondary: "oklch(0.915 0.045 62)"
  secondary-foreground: "oklch(0.37 0.06 50)"
  muted: "oklch(0.945 0.018 76)"
  muted-foreground: "oklch(0.52 0.035 58)"
  accent: "oklch(0.895 0.065 60)"
  accent-foreground: "oklch(0.33 0.05 50)"
  destructive: "oklch(0.577 0.245 27.325)"
  border: "oklch(0.895 0.022 68)"
  input: "oklch(0.895 0.022 68)"
  ring: "oklch(0.68 0.16 56)"
  chart-1: "oklch(0.7 0.17 55)"
  chart-2: "oklch(0.585 0.145 146)"
  chart-3: "oklch(0.8 0.13 82)"
  chart-4: "oklch(0.5 0.08 55)"
  chart-5: "oklch(0.68 0.1 125)"
typography:
  h1:
    fontFamily: Inter Variable
    fontSize: 2rem
    fontWeight: 700
    lineHeight: 1.2
  h2:
    fontFamily: Inter Variable
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: Inter Variable
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Inter Variable
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: Inter Variable
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: 0.525rem
  md: 0.7rem
  lg: 0.875rem
spacing:
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 12px
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 12px
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 12px
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: 24px
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: 12px
---

## Overview

mottain-ai は「冷蔵庫の食材を使い切る献立」を AI エージェントとのチャットで提案する家庭向けアプリ。UI が目指す感情は、台所に立つ人の隣に寄り添うような**暖かさ・親しみ・素朴さ**であり、洗練よりも生活感を優先する。

color story の中心は「にんじん一本」。実のオレンジ、葉のグリーン、土のブラウン、畑の光のベージュという身近な野菜の色で世界観を構成する。判断に迷ったときは、この畑のパレットと「暖かく柔らかい」トーンをフォールバックの拠り所とする。**ライトモードのみ**を提供し、ダークテーマは扱わない。

## Colors

高明度の暖色ベージュを地とし、そこに畑由来のアクセントを最小限で乗せる。主張するのはアクション（グリーン）とフォーカス（オレンジ）だけに絞り、情報の読みやすさを最優先する。

- **background（薄いベージュ / 畑の光）:** ページ全体の地。白ではなく暖色を含ませ、柔らかい印象をつくる。
- **foreground（深いブラウン / 土）:** 本文テキスト。黒を避け、ベージュ地と地続きの暖色で目に優しくする。
- **primary（グリーン / にんじんの葉）:** 主要アクション・CTA・リンク強調。画面内で最も強い誘導色。
- **secondary（淡いピーチ / オレンジの薄色）:** 副次アクション。primary と補色関係にあるオレンジ系を淡くし、うるさくせず暖かくまとめる。
- **accent（淡いオレンジ / にんじんの実）:** ホバー・選択・軽い強調。ベースカラーのオレンジを主張しすぎない濃度で使う。
- **muted（くすみベージュ）:** 補足テキスト・プレースホルダ・無効状態。背景と地続きの控えめな暖色。
- **destructive（トマトレッド）:** 削除など危険な操作。野菜つながりで違和感なく、かつ十分な明度差で警告色として機能させる。
- **ring（にんじんオレンジ）:** フォーカスリング。ベースカラーであるオレンジの主張点。
- **chart-1〜5:** オレンジ → グリーン → アンバー → ブラウン → オリーブ。畑のパレットで調和させる。

## Typography

Inter Variable を全ロールで用いる。見出しも本文も同じファミリで統一し、素朴で読みやすい印象を保つ。見出し（h1/h2）は太めのウェイトでリズムをつけ、本文（body）は行間 1.5 で可読性を確保する。補助情報は label・caption で明度を落として扱う。

## Layout

余白は 8px を基準単位とするスケール（sm 8 / md 16 / lg 24 / xl 32）で刻む。Tailwind の標準スペーシングに対応し、要素間は詰めすぎず、家庭的なゆとりを持たせる。

## Elevation & Depth

影は控えめにし、面の分離は主に色で行う。card / popover を background よりわずかに明るいクリームにすることで、影に頼らず面を浮かせる。強い drop shadow は使わず、柔らかさを損なわない。

## Shapes

角丸は `--radius: 0.875rem` を lg の基準とし、sm（0.525rem）・md（0.7rem）を派生させる。やや大きめの角丸を基調にして、鋭さを避け親しみのある柔らかい形にする。

## Components

ボタンは variant ごとに背景・文字色のみを差し替え、角丸（md）とタイポグラフィ（label）は共有する。primary はグリーン、secondary はピーチ、destructive はレッド。card は lg 角丸とクリーム面で情報のまとまりを表す。input は background 面に border を添えるだけの控えめな見た目にする。

実装は shadcn/ui（radix-luma スタイル）＋ Tailwind CSS v4。トークンの実体は `src/styles.css` の CSS 変数であり、本ファイルの front matter はその設計意図つきのミラーとする。値を変えるときは両者を同期する。

## Do's and Don'ts

- **Do:** セマンティッククラス（`bg-primary` / `text-foreground` / `ring-ring` など）を使う。生の色ユーティリティ（`bg-orange-500` など）は直書きしない。
- **Do:** 強い誘導はグリーン（primary）に一本化し、1 画面に主要 CTA を複数置かない。
- **Do:** 面の分離は色（card のクリーム）で行い、影は最小限にとどめる。
- **Don't:** ダークモード用スタイル（`dark:`）を新規に足さない。ライト固定を前提とする。
- **Don't:** オレンジ（accent / ring）を広い面積のベタ塗りに使わない。あくまでアクセントとして点で効かせる。
