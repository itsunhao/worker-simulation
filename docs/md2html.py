# -*- coding: utf-8 -*-
import re, html

def md_to_html(md):
    lines = md.split('\n')
    out = []
    in_code = False
    code_buf = []
    in_table = False
    table_buf = []
    in_ul = False
    i = 0
    def flush_table():
        nonlocal table_buf, in_table
        if not table_buf: return
        rows = []
        for r in table_buf:
            cells = [c.strip() for c in r.strip().strip('|').split('|')]
            rows.append(cells)
        if len(rows) < 2: return
        head, body = rows[0], rows[2:] if len(rows) > 2 else []
        th = ''.join('<th>%s</th>' % inline(c) for c in head)
        trs = ''.join('<tr>%s</tr>' % ''.join('<td>%s</td>' % inline(c) for c in r) for r in body)
        out.append('<div class="tblwrap"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (th, trs))
        table_buf = []; in_table = False
    def inline(s):
        s = html.escape(s)
        s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
        s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
        return s
    for line in lines:
        if line.startswith('```'):
            if in_code:
                out.append('<pre class="code">' + html.escape('\n'.join(code_buf)) + '</pre>')
                code_buf = []; in_code = False
            else:
                flush_table()
                if in_ul: out.append('</ul>'); in_ul = False
                in_code = True
            continue
        if in_code:
            code_buf.append(line); continue
        s = line.rstrip()
        if not s.strip():
            flush_table()
            if in_ul: out.append('</ul>'); in_ul = False
            continue
        if s.startswith('# '):
            flush_table()
            out.append('<h1>%s</h1>' % inline(s[2:]))
        elif s.startswith('## '):
            flush_table(); out.append('<h2>%s</h2>' % inline(s[3:]))
        elif s.startswith('### '):
            flush_table(); out.append('<h3>%s</h3>' % inline(s[4:]))
        elif s.startswith('|'):
            table_buf.append(s); in_table = True
        elif s.startswith('- '):
            flush_table()
            if not in_ul: out.append('<ul>'); in_ul = True
            out.append('<li>%s</li>' % inline(s[2:]))
        elif s.startswith('> '):
            flush_table(); out.append('<blockquote>%s</blockquote>' % inline(s[2:]))
        elif re.match(r'^\d+\. ', s):
            flush_table(); out.append('<p class="li">%s</p>' % inline(re.sub(r'^\d+\. ', '', s)))
        elif re.match(r'^!\[', s):
            m = re.match(r'!\[([^\]]*)\]\(([^)]+)\)', s)
            if m:
                out.append('<figure><img src="%s" alt="%s"/><figcaption>%s</figcaption></figure>' % (m.group(2), m.group(1), m.group(1)))
        else:
            flush_table(); out.append('<p>%s</p>' % inline(s))
    flush_table()
    if in_ul: out.append('</ul>')
    if in_code: out.append('<pre class="code">' + html.escape('\n'.join(code_buf)) + '</pre>')
    return '\n'.join(out)

md = open('Worker-Simulator-游戏文档.md', encoding='utf-8').read()
body = md_to_html(md)
# 封面：从正文中提取标题（已在 body 里），在 body 前插入封面
cover = '''
<div class="cover">
  <div class="cover-badge">GAME DOCUMENT · v1.0</div>
  <h1 class="cover-title">Worker Simulator</h1>
  <div class="cover-sub">打工人模拟器 · 游戏文档</div>
  <div class="cover-line"></div>
  <p class="cover-desc">从一无所有的乡下人，到在城市立足的打工人。<br/>打工 · 培训 · 炒股 · 婚恋 · 买房 · 创业 —— 你的城市人生，从这里开始。</p>
  <div class="cover-tags"><span>Spring Boot 3.3.5</span><span>Thymeleaf</span><span>jQuery</span><span>xterm.js</span></div>
</div>
'''
tpl = '''<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"/>
<title>Worker Simulator · 打工人模拟器 游戏文档</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
         color: #d8e2f0; background: #0b1220; margin: 0; line-height: 1.75; font-size: 13.5px; }
  .page { max-width: 900px; margin: 0 auto; padding: 20px 28px 60px; }
  /* 封面 */
  .cover { text-align: center; padding: 60px 20px 40px; border-bottom: 1px solid rgba(120,150,200,.25); margin-bottom: 30px;
           background: radial-gradient(ellipse at 50% 0%, rgba(56,89,160,.35), rgba(11,18,32,0) 70%); }
  .cover-badge { display: inline-block; letter-spacing: 3px; color: #7fb2ff; font-size: 12px; border: 1px solid rgba(127,178,255,.4);
                 padding: 4px 14px; border-radius: 20px; margin-bottom: 18px; }
  .cover-title { font-size: 52px; margin: 8px 0; color: #fff; letter-spacing: 2px;
                 background: linear-gradient(90deg, #7fb2ff, #ffd76e); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .cover-sub { font-size: 20px; color: #aebdd4; letter-spacing: 8px; margin-bottom: 20px; }
  .cover-line { width: 120px; height: 2px; margin: 0 auto 20px; background: linear-gradient(90deg, transparent, #ffd76e, transparent); }
  .cover-desc { color: #9fb3c8; font-size: 14px; }
  .cover-tags { margin-top: 24px; }
  .cover-tags span { display: inline-block; margin: 4px 6px; padding: 4px 12px; border: 1px solid rgba(127,178,255,.3);
                     border-radius: 14px; color: #a8c6ff; font-size: 12px; background: rgba(127,178,255,.06); }
  /* 标题 */
  h1 { font-size: 26px; color: #ffd76e; border-bottom: 2px solid rgba(255,215,110,.35); padding-bottom: 8px; margin: 34px 0 16px; }
  h2 { font-size: 19px; color: #7fb2ff; margin: 26px 0 12px; padding-left: 10px; border-left: 4px solid #7fb2ff; }
  h3 { font-size: 15.5px; color: #d8e2f0; margin: 18px 0 8px; }
  p { margin: 8px 0; }
  .li { margin: 3px 0; padding-left: 8px; }
  ul { margin: 6px 0; padding-left: 22px; }
  li { margin: 3px 0; }
  code { background: rgba(127,178,255,.12); color: #9fd0ff; padding: 1px 6px; border-radius: 4px; font-size: 12px;
         font-family: "SF Mono", Menlo, Consolas, monospace; }
  pre.code { background: #0d1626; border: 1px solid rgba(127,178,255,.2); border-radius: 8px; padding: 12px 16px;
             overflow-x: auto; font-size: 12px; color: #a8f0c8; font-family: "SF Mono", Menlo, Consolas, monospace; line-height: 1.6; }
  blockquote { border-left: 3px solid #ffd76e; background: rgba(255,215,110,.06); margin: 10px 0; padding: 8px 14px;
               color: #e8dcb0; border-radius: 0 6px 6px 0; }
  /* 表格 */
  .tblwrap { overflow-x: auto; margin: 10px 0; }
  table { border-collapse: collapse; width: 100%; font-size: 12.5px; }
  th { background: rgba(127,178,255,.14); color: #cfe0ff; font-weight: 700; padding: 8px 10px; border: 1px solid rgba(127,178,255,.25); text-align: left; }
  td { padding: 7px 10px; border: 1px solid rgba(127,178,255,.15); }
  tr:nth-child(even) td { background: rgba(127,178,255,.04); }
  /* 图片 */
  figure { margin: 16px auto; text-align: center; page-break-inside: avoid; }
  figure img { max-width: 92%; border-radius: 10px; border: 1px solid rgba(127,178,255,.3); box-shadow: 0 8px 30px rgba(0,0,0,.5); }
  figcaption { color: #8fa3bf; font-size: 12px; margin-top: 6px; }
  a { color: #7fb2ff; text-decoration: none; }
  strong, b { color: #fff; }
</style></head>
<body><div class="page">
%s
%s
</div></body></html>
'''
open('Worker-Simulator-游戏文档.html', 'w', encoding='utf-8').write(tpl % (cover, body))
print('HTML OK, size:', len(tpl % (cover, body)))
