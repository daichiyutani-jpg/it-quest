// IPA公開問題（利用者が自分でダウンロードしたPDF）から、1問ずつの範囲を画素だけで切り出す処理。
// DOMにもPDFライブラリにも依存しない（Node のテストで確かめられる）。
//
// 公開問題のPDFは画像のため文字は読まない。
//   ・行の左端が「問N」の位置（いちばん左にそろう行）にある行を、問題（または中問の文章）の始まりとみなす
//   ・どのページに何問あるかはアプリに入っている年度ごとの情報（PAST_YEARS）と照合し、数が合わないページは
//     そのページ全体を各問題に付ける（誤った切り方で別の問題を見せないため）
//   ・正答はPDFからは読まず、IPAが公開している解答例をアプリに入れたものを使う

/** 画像（RGBA）から、インクのある行のまとまりを出す。座標はページ幅・高さに対する割合 */
export function inkLines(img, { dark = 128 } = {}) {
  const { width: W, height: H, data } = img;
  const rowN = new Uint16Array(H);
  const minX = new Int32Array(H).fill(W), maxX = new Int32Array(H).fill(-1);
  for (let y = 0; y < H; y++) {
    let o = y * W * 4;
    for (let x = 0; x < W; x++, o += 4) {
      // 灰色に直して暗い画素（文字・線）
      if ((data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114) < dark && data[o + 3] > 128) {
        rowN[y]++;
        if (x < minX[y]) minX[y] = x;
        if (x > maxX[y]) maxX[y] = x;
      }
    }
  }
  const lines = [];
  for (let y = 0; y < H;) {
    if (rowN[y] < 2) { y++; continue; }
    const y0 = y; let x0 = W, x1 = -1;
    while (y < H && rowN[y] >= 2) { if (minX[y] < x0) x0 = minX[y]; if (maxX[y] > x1) x1 = maxX[y]; y++; }
    lines.push({ y0: y0 / H, y1: y / H, x0: x0 / W, x1: (x1 + 1) / W });
  }
  return lines;
}

export const BODY = { top: 0.04, bottom: 0.92 }; // ヘッダー・ページ番号を除いた本文の範囲

/** 文字1行らしい行（ゴミ・罫線の枠・図の大きな塊を除く） */
const isTextLine = (l) => l.y1 - l.y0 > 0.008 && l.y1 - l.y0 < 0.02 && l.x1 - l.x0 > 0.2;

/** 全ページから「問N」の左端位置を推定する：十分な回数現れる左端位置のうち、いちばん左 */
export function marginX(pages, { win = 0.006, minCount = 30 } = {}) {
  const xs = pages.flatMap((p) => p.lines.filter((l) => l.y0 > BODY.top && l.y0 < BODY.bottom && isTextLine(l)).map((l) => l.x0)).sort((a, b) => a - b);
  // 幅 win の窓に minCount 行以上が入る、いちばん左の窓の中央値
  for (let i = 0, j = 0; i < xs.length; i++) {
    while (j < xs.length && xs[j] <= xs[i] + win) j++;
    if (j - i >= minCount) return xs[(i + j) >> 1];
  }
  return null;
}

/** ページの中の「始まりの行」（左端が問Nの位置）の上端 y を上から順に */
export function startsOnPage(lines, bx, { tol = 0.008 } = {}) {
  return lines.filter((l) => l.y0 > BODY.top && l.y0 < BODY.bottom && isTextLine(l) && Math.abs(l.x0 - bx) <= tol).map((l) => l.y0);
}

/**
 * 年度の情報から、ページごとに「始まり」の並びを作る。
 * year.questions: [{no, page}]（page はPDFの1始まりのページ）、year.stems: [{first, last, page}]（中問の文章）
 * 返り値：[{kind:'q'|'stem', no|first, page}] を読む順に
 */
export function expectedStarts(year) {
  const items = [
    ...year.questions.map((q) => ({ kind: 'q', no: q.no, page: q.page, ord: q.no })),
    ...(year.stems || []).map((s) => ({ kind: 'stem', first: s.first, last: s.last, page: s.page, ord: s.first - 0.5 })),
  ];
  return items.sort((a, b) => a.page - b.page || a.ord - b.ord);
}

/**
 * 切り出す範囲を決める。pages: [{lines}]（PDFのページ順、0始まり）
 * 返り値 {bx, items:[{kind, no|first, parts:[{page(0始まり), y0, y1, x0, x1}], exact}], mismatched:[ページ番号(1始まり)]}
 *   exact=false はそのページで検出数が合わず、ページ全体を付けたもの
 */
export function layoutYear(pages, year, opts = {}) {
  const bx = marginX(pages, opts);
  const exp = expectedStarts(year);
  const byPage = new Map();
  for (const e of exp) { if (!byPage.has(e.page)) byPage.set(e.page, []); byPage.get(e.page).push(e); }
  const mismatched = [];
  // 各「始まり」に y を割り当てる
  for (const [pg, list] of byPage) {
    const p = pages[pg - 1];
    const ys = p && bx != null ? startsOnPage(p.lines, bx, opts) : [];
    if (ys.length === list.length) list.forEach((e, i) => { e.y = ys[i]; e.exact = true; });
    else if (ys.length === list.length - 1 && list[0].kind === 'stem') {
      // 中問の文章が左端にそろっていない場合：ページ先頭から最初の問題の手前までを文章とみなす
      list[0].y = BODY.top; list[0].exact = true;
      list.slice(1).forEach((e, i) => { e.y = ys[i]; e.exact = true; });
    } else { mismatched.push(pg); list.forEach((e) => { e.y = null; e.exact = false; }); }
  }
  const lastPage = Math.max(...exp.map((e) => e.page));
  const items = exp.map((e, i) => {
    const parts = [];
    if (!e.exact) {
      parts.push({ page: e.page - 1, y0: BODY.top, y1: BODY.bottom });
    } else {
      // 次の「始まり」まで（ページをまたぐ場合は途中のページも含める）
      let nx = null;
      for (let j = i + 1; j < exp.length; j++) { nx = exp[j]; break; }
      const endPage = nx ? nx.page : lastPage;
      for (let pg = e.page; pg <= endPage; pg++) {
        const y0 = pg === e.page ? e.y : BODY.top;
        let y1 = BODY.bottom;
        if (nx && pg === nx.page) y1 = nx.exact ? nx.y - 0.004 : BODY.top; // 次がページ全体扱いなら、そのページは含めない
        if (pg > e.page) {
          // 次のページ先頭の「問Nから問Mまでは〇〇系の問題です」の枠からは次の分野なので含めない
          const box = (pages[pg - 1]?.lines || []).find((l) => l.y0 >= y0 && l.y0 < y1 && l.y0 < 0.15 && l.y1 - l.y0 > 0.022 && l.y1 - l.y0 < 0.045 && l.x1 - l.x0 > 0.6);
          if (box) y1 = Math.min(y1, box.y0 - 0.002);
        }
        if (y1 > y0 + 0.01) parts.push({ page: pg - 1, y0, y1 });
      }
    }
    // インクのある所まで詰める
    const out = [];
    for (const pt of parts) {
      const ls = (pages[pt.page]?.lines || []).filter((l) => l.y0 >= pt.y0 - 0.002 && l.y1 <= pt.y1 + 0.002 && l.x1 - l.x0 > 0.01 && l.y1 - l.y0 > 0.004);
      if (!ls.length) continue;
      out.push({ page: pt.page, y0: Math.min(...ls.map((l) => l.y0)), y1: Math.max(...ls.map((l) => l.y1)), x0: Math.min(...ls.map((l) => l.x0)), x1: Math.max(...ls.map((l) => l.x1)) });
    }
    return { kind: e.kind, no: e.no, first: e.first, last: e.last, exact: e.exact, parts: out };
  });
  return { bx, items, mismatched };
}

/** 取り込んだPDFがその年度のものらしいか（ページ数で判定） */
export function guessYear(numPages, years) {
  return years.filter((y) => y.pdfPages === numPages).map((y) => y.id);
}

/** 採点（分野ごと）。key: {no: 'ア'..}, fieldOf: {no: 'S'|'M'|'T'} */
export function scorePast(nos, answers, key, fieldOf) {
  const per = { S: { n: 0, c: 0 }, M: { n: 0, c: 0 }, T: { n: 0, c: 0 } };
  for (const no of nos) {
    const f = per[fieldOf[no]];
    if (!f) continue;
    f.n++;
    if (answers[no] != null && answers[no] === key[no]) f.c++;
  }
  return per;
}

/** 公開問題の回答をアプリの学習記録に入れるときのID */
export const pastQid = (yearId, no) => `P:${yearId}:${no}`;
