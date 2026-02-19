# GitHub に載せる手順（具体的）

## 1. ターミナルを開く

Cursor で **Ctrl + `**（バッククォート）か、メニュー「表示」→「ターミナル」でターミナルを開く。

---

## 2. プロジェクトのフォルダに移動

```powershell
cd "c:\Users\siwah\dev\2026.2.18_adapp\auto_goods_adjustment_inproved"
```

（すでにこのフォルダで開いている場合は不要）

---

## 3. 現在の状態を確認（任意）

```powershell
git status
```

「Untracked files」に、まだ GitHub に載っていないファイル一覧が出ます。

---

## 4. 載せたいファイルをすべてステージングする

**すべてのファイルを追加する場合：**

```powershell
git add .
```

**特定のフォルダだけ除外したい場合（例：.cursor と .claude は載せない）：**

まず .gitignore に次の 2 行を追加して保存する：

```
.cursor/
.claude/
```

その後で：

```powershell
git add .
```

---

## 5. コミットする

```powershell
git commit -m "Viteアプリとプロジェクト一式を追加"
```

メッセージは自由に変えてよい（例：「初回リリース」「フロント追加」など）。

---

## 6. GitHub にプッシュする

```powershell
git push origin main
```

初回だけ、GitHub のログインや認証を求められたら、画面の指示に従う。

---

## 7. 確認

ブラウザで開く：

https://github.com/IWAHASHI2026/amazon-auto_goods_adjustment_inproved

`README.md`、`src/`、`package.json` などが表示されていれば成功。

---

## トラブル時

- **「nothing added to commit」**  
  → すでに全部コミット済み。`git status` で確認し、変更があれば再度 `git add .` → `git commit` → `git push`。

- **「Failed to connect to github.com」**  
  → プロキシや VPN の影響の可能性。  
  ```powershell
  git config --global --unset http.proxy
  git config --global --unset https.proxy
  ```
  を試してから再度 `git push`。

- **認証エラー**  
  → GitHub にログインした状態で、ブラウザが開く認証画面で「Authorize」する。  
  または GitHub → Settings → Developer settings → Personal access tokens でトークンを作り、パスワードの代わりにトークンを入力する。
