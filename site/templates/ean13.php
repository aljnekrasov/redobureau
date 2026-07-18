<?php snippet('header', ['pageCss' => ['assets/css/ean13.css']]) ?>

<div class="main pt-75 md:pt-100">
    <div class="page">
        <div class="container e13">
            <div class="mb-15 extra"><?= t('ean13_title') ?></div>
            <p class="e13-lede"><?= t('ean13_lede') ?></p>

            <div class="e13-grid">
                <div>
                    <div class="e13-field">
                        <label class="e13-lab" for="e13-code"><?= t('ean13_code_label') ?></label>
                        <input id="e13-code" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" value="4670283011268">
                        <div id="e13-msg" class="e13-msg"></div>
                    </div>

                    <div class="e13-field">
                        <label class="e13-lab" for="e13-mag"><?= t('ean13_scale') ?> <span id="e13-magLabel">100%</span></label>
                        <div class="e13-row">
                            <input id="e13-mag" type="range" min="80" max="200" step="5" value="100">
                            <span class="e13-magval" id="e13-magval">100%</span>
                        </div>
                    </div>

                    <div class="e13-field">
                        <label class="e13-lab"><?= t('ean13_options') ?></label>
                        <div class="e13-checks">
                            <label><input id="e13-gt" type="checkbox" checked> <?= t('ean13_opt_gt') ?></label>
                            <label><input id="e13-bg" type="checkbox" checked> <?= t('ean13_opt_bg') ?></label>
                        </div>
                    </div>
                </div>

                <div>
                    <div class="e13-preview" id="e13-preview"></div>
                    <div class="e13-dims" id="e13-dims"></div>
                    <div class="e13-actions">
                        <button class="e13-btn e13-btn--primary" id="e13-download"><?= t('ean13_download') ?></button>
                        <button class="e13-btn e13-btn--ghost" id="e13-copy"><?= t('ean13_copy') ?></button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
"use strict";
const I18N = <?= json_encode([
    'cd'        => t('ean13_cd'),
    'checkMust' => t('ean13_check_must'),
    'errDigits' => t('ean13_err_digits'),
    'errLen'    => t('ean13_err_len'),
    'mm'        => t('ean13_mm'),
    'module'    => t('ean13_module'),
    'copied'    => t('ean13_copied'),
    'copyLabel' => t('ean13_copy'),
    'copyFail'  => t('ean13_copyfail'),
], JSON_UNESCAPED_UNICODE) ?>;

/* OCR-B glyph contours (inlined) */
const OCRB = {"unitsPerEm":1024,"glyphs":{"0":{"bbox":[120,-10,764,982],"d":"M442 110Q370 110 348 117Q302 130 284 183Q254 278 254 486V498Q254 676 284 789Q296 839 348 855Q369 862 442 862Q515 862 536 855Q588 839 600 789Q630 670 630 486Q630 285 600 183Q586 136 536 117Q518 110 442 110ZM442 -10Q613 -10 673 51Q764 139 764 486Q764 803 673 921Q627 982 442 982Q265 982 211 921Q120 818 120 486Q120 142 211 51Q278 -10 442 -10Z"},"1":{"bbox":[270,0,638,962],"d":"M500 0H638V962H498L270 776V602L500 800Z"},"2":{"bbox":[140,-1,720,977],"d":"M140 -1H705V119H281Q282 184 308 246Q337 312 483 401Q574 456 651 536Q720 606 720 712Q720 836 638 906Q556 977 434 977Q298 976 155 905Q154 888 154 843Q154 791 155 760Q155 761 221 800Q318 857 434 857Q482 857 519 834Q574 802 584 762Q591 735 591 710Q591 672 573 647Q525 576 392 491Q224 383 173 274Q140 216 140 -1Z"},"3":{"bbox":[130,-9,730,967],"d":"M464 596 697 832V967H130V847H547L287 584V485H418Q511 485 563 428Q611 378 611 301V295Q611 235 557 184Q498 126 400 116Q370 114 356 114Q277 114 211 142L130 184V52Q251 -9 374 -9Q388 -9 418 -7Q561 6 656 101Q730 175 730 302V305Q730 431 635 523Q590 570 517 586Z"},"4":{"bbox":[130,-9,742,964],"d":"M265 331 553 964H427L130 337V211H505V-9H625V211H742V331H625V526H505V331Z"},"5":{"bbox":[120,-3,662,965],"d":"M154 965 123 526Q143 528 174 532Q206 535 215 536Q256 539 283 539Q396 539 461 489Q525 440 525 353Q525 239 432 176Q338 114 171 114H140Q136 114 130 114Q123 115 120 116V-3H157Q394 -3 528 90Q662 183 662 345Q662 481 568 568Q474 653 328 653H287Q270 653 262 652L273 850H633V965Z"},"6":{"bbox":[130,-10,768,967],"d":"M451 496Q546 496 599 428Q640 373 645 305V294Q645 230 603 177Q545 104 451 104Q372 104 320 156Q261 217 259 302V305Q259 389 320 449Q367 496 451 496ZM367 605 510 785 679 967H511Q325 787 235 632Q132 446 130 326Q130 156 236 60Q307 -10 453 -10Q590 -10 694 94Q765 167 768 305Q768 422 700 505Q624 596 493 614Q471 617 449 617Q406 617 367 605Z"},"7":{"bbox":[140,1,758,967],"d":"M611 847Q610 840 593 799Q588 787 428 604Q350 517 296 334Q280 276 275 1H398L404 181Q422 338 440 378Q503 523 596 616Q743 763 755 910Q758 949 758 967H140V847Z"},"8":{"bbox":[120,-11,762,982],"d":"M444 606Q370 641 347 664Q308 703 303 751V762Q303 806 331 831Q371 862 444 862Q518 862 553 831Q588 799 588 754V751Q586 710 546 670Q523 647 444 606ZM444 109Q334 110 291 160Q253 204 253 255Q253 263 255 277Q264 338 329 405Q363 441 444 472Q539 436 585 384Q635 328 635 262V259Q634 187 591 154Q532 109 448 109ZM329 543 287 516Q259 509 197 442Q120 363 120 259Q120 137 179 78Q268 -11 444 -11Q622 -11 714 96Q762 152 762 258Q762 354 702 427Q648 493 589 523L558 543L583 562Q678 629 701 688Q716 733 716 773Q716 836 677 889Q605 982 444 982H432Q338 982 276 951Q207 918 180 822Q172 793 172 767Q172 712 204 654Q229 609 289 571Z"},"9":{"bbox":[120,-1,758,976],"d":"M437 470Q342 470 289 538Q248 593 243 661V672Q243 736 285 789Q343 862 437 862Q516 862 568 810Q627 749 629 664V661Q629 577 568 517Q521 470 437 470ZM521 361 378 181 209 -1H377Q563 179 653 334Q756 520 758 640Q758 810 652 906Q581 976 435 976Q298 976 194 872Q123 799 120 661Q120 544 188 461Q264 370 395 352Q418 349 439 349Q482 349 521 361Z"},">":{"bbox":[127,9,759,890],"d":"M577 453 127 159V9L759 431V476L127 890V738Z"}}};

const L = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];
const G = ["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"];
const R = L.map(c => [...c].map(b => b === "0" ? "1" : "0").join(""));
const PARITY = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"];

function checkDigit(c){ let s = 0; for (let i = 0; i < 12; i++) s += (+c[i]) * (i % 2 === 0 ? 1 : 3); return (10 - s % 10) % 10; }
function encode(c){
  const par = PARITY[+c[0]]; let b = "101";
  for (let i = 0; i < 6; i++) b += (par[i] === "L" ? L : G)[+c[1 + i]];
  b += "01010";
  for (let i = 0; i < 6; i++) b += R[+c[7 + i]];
  return b + "101";
}

const X0 = 0.330, QUIET_L = 11, TOTAL = 113;
const H_DATA0 = 22.85, H_GUARD0 = 24.50, H_FULL0 = 25.93, DIGIT_H0 = 2.75;
const GUARD = new Set([0,1,2,45,46,47,48,49,92,93,94]);
const fmt = n => (Math.round(n * 1000) / 1000).toString();

function buildSVG(code13, mag, showGt, showBg){
  const bits = encode(code13), X = X0 * mag, Wt = TOTAL * X;
  const Hdata = H_DATA0 * mag, Hguard = H_GUARD0 * mag, Hfull = H_FULL0 * mag;
  const digitTop = Hdata + X;
  const scale = (DIGIT_H0 * mag) / (OCRB.glyphs["0"].bbox[3] - OCRB.glyphs["0"].bbox[1]);
  const baseline = digitTop + OCRB.glyphs["0"].bbox[3] * scale;

  let d = "", i = 0;
  while (i < 95){
    if (bits[i] === "1"){
      let j = i; while (j < 95 && bits[j] === "1") j++;
      let allGuard = true;
      for (let k = i; k < j; k++) if (!GUARD.has(k)){ allGuard = false; break; }
      d += `M${fmt((QUIET_L + i) * X)} 0h${fmt((j - i) * X)}v${fmt(allGuard ? Hguard : Hdata)}h-${fmt((j - i) * X)}Z`;
      i = j;
    } else i++;
  }

  const glyph = (ch, tx) => { const g = OCRB.glyphs[ch]; return `<path d="${g.d}" transform="matrix(${fmt(scale)} 0 0 ${fmt(-scale)} ${fmt(tx)} ${fmt(baseline)})"/>`; };
  const cx = (ch, c) => { const b = OCRB.glyphs[ch].bbox; return c - ((b[0] + b[2]) / 2) * scale; };
  const rightEdge = (ch, e) => e - OCRB.glyphs[ch].bbox[2] * scale;

  let digits = glyph(code13[0], rightEdge(code13[0], (QUIET_L - 1) * X));
  for (let k = 0; k < 6; k++) digits += glyph(code13[1 + k], cx(code13[1 + k], (17.5 + 7 * k) * X));
  for (let k = 0; k < 6; k++) digits += glyph(code13[7 + k], cx(code13[7 + k], (64.5 + 7 * k) * X));
  if (showGt) digits += glyph(">", rightEdge(">", TOTAL * X));

  const bg = showBg ? `<rect id="background" width="${fmt(Wt)}" height="${fmt(Hfull)}" fill="#fff"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(Wt)}mm" height="${fmt(Hfull)}mm" viewBox="0 0 ${fmt(Wt)} ${fmt(Hfull)}">${bg}<path id="bars" fill="#000" d="${d}"/><g id="digits" fill="#000">${digits}</g></svg>`;
}

const $ = id => document.getElementById(id);
const codeEl = $("e13-code"), msgEl = $("e13-msg"), magEl = $("e13-mag"),
      previewEl = $("e13-preview"), dimsEl = $("e13-dims"),
      dlBtn = $("e13-download"), copyBtn = $("e13-copy"), optGt = $("e13-gt"), optBg = $("e13-bg");
let currentSVG = null, currentCode = null;

function render(){
  const raw = codeEl.value.replace(/[\s-]/g, ""); codeEl.value = raw;
  const mag = (+magEl.value) / 100;
  $("e13-magLabel").textContent = $("e13-magval").textContent = magEl.value + "%";

  let code13 = null, ok = "", err = "";
  if (!/^\d+$/.test(raw)) err = I18N.errDigits;
  else if (raw.length === 12){ const cd = checkDigit(raw); code13 = raw + cd; ok = I18N.cd + " " + cd; }
  else if (raw.length === 13){ const cd = checkDigit(raw.slice(0, 12)); if (+raw[12] !== cd) err = I18N.checkMust + " " + cd; else code13 = raw; }
  else err = I18N.errLen.replace("%d", raw.length);

  msgEl.className = "e13-msg " + (err ? "err" : "ok");
  msgEl.textContent = err || ok;

  if (!code13){ previewEl.innerHTML = ""; dimsEl.textContent = ""; currentSVG = currentCode = null; dlBtn.disabled = copyBtn.disabled = true; return; }

  currentSVG = buildSVG(code13, mag, optGt.checked, optBg.checked); currentCode = code13;
  previewEl.innerHTML = currentSVG;
  const X = X0 * mag;
  dimsEl.textContent = `${fmt(TOTAL * X)} × ${fmt(H_FULL0 * mag)} ${I18N.mm}, ${I18N.module} ${fmt(X)} ${I18N.mm}`;
  dlBtn.disabled = copyBtn.disabled = false;
}

dlBtn.addEventListener("click", () => {
  if (!currentSVG) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([currentSVG], { type: "image/svg+xml" }));
  a.download = "ean13_" + currentCode + ".svg"; a.click(); URL.revokeObjectURL(a.href);
});
copyBtn.addEventListener("click", async () => {
  if (!currentSVG) return;
  try { await navigator.clipboard.writeText(currentSVG); copyBtn.textContent = I18N.copied; }
  catch (e) { copyBtn.textContent = I18N.copyFail; }
  setTimeout(() => copyBtn.textContent = I18N.copyLabel, 1500);
});
[codeEl, magEl, optGt, optBg].forEach(el => { el.addEventListener("input", render); el.addEventListener("change", render); });

console.assert(encode("4670283011268") === "10101011110010001000110100100110001001010000101010111001011001101100110110110010100001001000101", "EAN13 encode vector mismatch");
render();
</script>

<?php snippet('footer') ?>
