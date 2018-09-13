# yahoo_gamelog_silencer
Yahooゲームログのスレッドやコメントを非表示にするTampermonkey用のユーザースクリプト
</br>
</br>
</br>


## 使い方
- 特定のコメントやスレッドを選択して非表示にする機能
  - 動画: https://streamable.com/ne19i 

- 古いコメントやスレッドを非表示にする機能
  - 動画: https://streamable.com/128r0
  - 3日以上前のコメント、3日以上前のコメントしかないスレッドが対象
  - もう少し期間を長くしたい場合は`const fresh_period = 3;`の箇所を変更


## 動作環境
- Chrome + Tampermonkey

## Known Issue
- スレッドの詳細画面で「新着のみOFF」から「新着ON」に変更した場合にロード中を示すインジケータが消えない場合がある
