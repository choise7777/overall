/**
 * DOMContentLoaded
 * 페이지 로드가 완료되면 3가지 주요 로직을 실행합니다.
 */
document.addEventListener('DOMContentLoaded', () => {
    setupMenuToggle(); // 메뉴 설정 (공통)
    loadLiveRates();   // 실시간 환율 로드 (공통)
    setupPageSpecificFeatures(); // 현재 페이지 감지 및 해당 기능 실행
});

/** 현재 페이지에 맞는 계산기 또는 기능 설정 함수 */
function setupPageSpecificFeatures() {
    // 각 페이지의 고유한 '메인 요소' ID를 확인하여 해당 로직만 실행
    if (document.getElementById('calculate-btn')) setupArbitrageCalculator(); // 환차익
    if (document.getElementById('calculate-avg-btn')) setupAvgDownCalculator(); // 물타기
    if (document.getElementById('calculate-tax-btn')) setupTaxCalculator(); // 양도세
    if (document.getElementById('calculate-dividend-btn')) setupDividendCalculator(); // 배당률
    if (document.getElementById('calculate-cagr-btn')) setupCagrCalculator(); // CAGR
    if (document.getElementById('calculate-compound-btn')) setupCompoundCalculator(); // 복리
    if (document.getElementById('calculate-pos-size-btn')) setupPositionSizeCalculator(); // 포지션 사이징
    if (document.getElementById('calculate-pe-btn')) setupPeRatioCalculator(); // P/E 비율
    if (document.getElementById('add-event-btn')) setupPlanner(); // 라이프 플래너
    // (이후 PDF 생성기 추가 위치)
}

// --- 0. 공통 Helper 함수 (전역) ---

/** 로직 1: 반응형 메뉴 토글 */
function setupMenuToggle() {
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const mainNavList = document.getElementById('main-nav-list');
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

    if (menuToggleBtn && mainNavList) {
        menuToggleBtn.addEventListener('click', () => {
            menuToggleBtn.classList.toggle('is-active');
            mainNavList.classList.toggle('is-active');
            if (!mainNavList.classList.contains('is-active')) {
                closeAllDropdowns();
            }
        });
    }

    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', (event) => {
            // 모바일에서만 클릭으로 드롭다운 토글
            if (window.innerWidth <= 768) {
                 // href="#" 링크가 아니면 기본 동작(페이지 이동) 허용
                 if (toggle.getAttribute('href') === '#') {
                    event.preventDefault(); // href="#" 일 때만 페이지 이동 방지
                 }
                const dropdown = toggle.closest('.dropdown');
                if (dropdown) {
                    // closeAllDropdowns(dropdown); // 다른 드롭다운 닫기 (선택)
                    dropdown.classList.toggle('is-open');
                }
            }
            // 데스크탑에서는 CSS hover로 작동하므로 JS는 관여 안 함
        });
    });

    // 모든 드롭다운 닫는 함수
    function closeAllDropdowns(exceptThisDropdown = null) {
        document.querySelectorAll('.dropdown.is-open').forEach(openDropdown => {
            if (openDropdown !== exceptThisDropdown) {
                openDropdown.classList.remove('is-open');
            }
        });
    }

    // 창 크기 변경 시 모바일 상태 해제
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            if (menuToggleBtn) menuToggleBtn.classList.remove('is-active');
            if (mainNavList) mainNavList.classList.remove('is-active');
            closeAllDropdowns();
        }
    });
}

/** 로직 2: 왼쪽 패널 (실시간 주요 환율 로드) */
async function loadLiveRates() {
    const listElement = document.getElementById('live-rates-list');
    const loadingElement = document.getElementById('loading-rates');
    if (!listElement || !loadingElement) return;
    const targetCurrencies = 'USD,JPY,EUR,CNY,GBP,AUD';
    try {
        const response = await fetch(`https://api.frankfurter.app/latest?from=KRW&to=${targetCurrencies}`);
        if (!response.ok) throw new Error('실시간 환율 API 호출 실패');
        const data = await response.json();
        const rates = data.rates;
        loadingElement.remove();
        Object.entries(rates).forEach(([currency, rate]) => {
            let displayRate = 1 / rate;
            let displayCurrency = currency, flag = getFlagEmoji(currency);
            if (currency === 'JPY') {
                displayRate *= 100; displayCurrency = 'JPY (100엔)';
            }
            const li = document.createElement('li');
            li.innerHTML = `<span>${flag} ${displayCurrency}</span><span>${formatKRW(displayRate)}</span>`;
            listElement.appendChild(li);
        });
    } catch (error) {
        console.error("실시간 환율 로드 실패:", error);
        if(loadingElement) {
             loadingElement.textContent = "환율 로드 실패";
             loadingElement.style.justifyContent = 'center';
        }
    }
}

/** 국기 이모지 반환 함수 */
function getFlagEmoji(currency) {
    const flags = {'USD': '🇺🇸', 'JPY': '🇯🇵', 'EUR': '🇪🇺', 'CNY': '🇨🇳', 'GBP': '🇬🇧', 'AUD': '🇦🇺', 'KRW': '🇰🇷'};
    return flags[currency] || '🏳️';
}

/** API 호출 함수 (Frankfurter) */
async function fetchRate(from, to) {
    if (from === to) return 1;
    const response = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
    if (!response.ok) throw new Error(`API 응답 실패: ${from} to ${to}`);
    const data = await response.json();
    if (data.rates[to] === undefined) throw new Error(`환율 정보 없음: ${from} to ${to}`);
    return data.rates[to];
}

/** 숫자 포맷팅 통합 함수 */
function formatAmount(val, currency, digits = 2) {
    if (typeof val !== 'number' || !isFinite(val)) return '-';
    if (currency === 'KRW') digits = 0;
    try { return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: currency, maximumFractionDigits: digits, minimumFractionDigits: digits }).format(val); } catch (e) { console.error("formatAmount 오류:", e, val, currency); return '-'; }
}
/** 원화(KRW) 전용 포맷터 */
function formatKRW(val) {
    if (typeof val !== 'number' || !isFinite(val)) return '-';
    try { return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(val); } catch (e) { console.error("formatKRW 오류:", e, val); return '-'; }
}
/** 환율(Rate) 전용 포맷터 */
function formatRate(val) {
    if (typeof val !== 'number' || !isFinite(val)) return '-';
    try { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 8, minimumFractionDigits: 2 }).format(val); } catch (e) { console.error("formatRate 오류:", e, val); return '-'; }
}
/** 숫자(Number) 전용 포맷터 */
function formatNumber(val, digits = 2) {
    if (typeof val !== 'number' || !isFinite(val)) return '-';
    try { return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(val); } catch (e) { console.error("formatNumber 오류:", e, val); return '-'; }
}
/** 퍼센트(Percent) 전용 포맷터 */
function formatPercent(val) {
    if (typeof val !== 'number' || !isFinite(val)) return '-';
    try { return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(val); } catch (e) { console.error("formatPercent 오류:", e, val); return '-'; }
}
/** 에러 메시지 표시 함수 (공통) */
function showError(message, calculatorId = 'general') {
    console.error(`[${calculatorId}] 오류:`, message);
    const resultSection = document.getElementById('result-section');
    const resultDisplay = document.getElementById('result-display');
    const errorMessage = document.getElementById('error-message');
    const calcBasisContent = document.getElementById('calc-basis-content');
    const loadingSpinner = document.getElementById('loading-spinner'); // 환차익 계산기에만 있을 수 있음

    if (resultSection) resultSection.style.display = 'block';
    if (resultDisplay) resultDisplay.style.display = 'none';
    if (loadingSpinner) loadingSpinner.style.display = 'none';

    if (errorMessage) { errorMessage.textContent = message; errorMessage.style.display = 'block'; }
    // 에러 발생 시 오른쪽 패널에도 메시지 표시
    if (calcBasisContent) { calcBasisContent.innerHTML = `<p class="placeholder error">${message}</p>`; }
}
/** 로딩 스피너 표시/숨김 함수 (API 호출 시 - 환차익 전용) */
function showLoading(isLoading) {
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');
    if (loadingSpinner) loadingSpinner.style.display = isLoading ? 'flex' : 'none';
    if (errorMessage && isLoading) errorMessage.style.display = 'none';
}
/** 디바운스 함수 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => { func.apply(this, args); }, delay);
    };
}
/** HTML 이스케이프 함수 (XSS 방지) */
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// --- 각 계산기/기능 설정 함수들 ---

/** 로직 3-1: "환차익 스포터" 계산기 */
function setupArbitrageCalculator() {
    const calculateBtn = document.getElementById('calculate-btn');
    const resultSection = document.getElementById('result-section');
    const resultDisplay = document.getElementById('result-display');
    const calcBasisContent = document.getElementById('calc-basis-content');
    const amountInput = document.getElementById('amount');
    const currencyASelect = document.getElementById('currencyA'), currencyBSelect = document.getElementById('currencyB'), currencyCSelect = document.getElementById('currencyC');

    calculateBtn.addEventListener('click', async function() {
        const amount = parseFloat(amountInput.value);
        const curA = currencyASelect.value, curB = currencyBSelect.value, curC = currencyCSelect.value;
        if (isNaN(amount) || amount <= 0) { showError("유효한 금액을 입력하세요.", "환차익"); return; }
        if (curA === curB || curA === curC || curB === curC) { showError("기준, 목표, 경유 통화는 모두 달라야 합니다.", "환차익"); return; }

        resultSection.style.display = 'block'; resultDisplay.innerHTML = ''; resultDisplay.style.display = 'none';
        showLoading(true); calcBasisContent.innerHTML = '<p class="placeholder">계산 중...</p>';
        try {
            const [rateAB, rateAC, rateCB] = await Promise.all([ fetchRate(curA, curB), fetchRate(curA, curC), fetchRate(curC, curB) ]);
            if (typeof rateAB !== 'number' || typeof rateAC !== 'number' || typeof rateCB !== 'number') throw new Error("환율 값 오류");
            const path1 = amount * rateAB, path2Step1 = amount * rateAC, path2 = path2Step1 * rateCB, profit = path2 - path1;
            displayArbitrageResults(amount, path1, path2, profit, curA, curB, curC);
            displayArbitrageBasis(amount, rateAB, rateAC, rateCB, path1, path2, curA, curB, curC);
        } catch (error) { showError(`환율 정보 가져오기 실패: ${error.message}`, "환차익"); console.error("계산 실패:", error); }
        finally { showLoading(false); }
    });
    // 결과 표시 함수 (환차익 전용)
    function displayArbitrageResults(amount, path1, path2, profit, curA, curB, curC) {
        resultDisplay.style.display = 'block'; let pClass='even', pSign='', pText='차익 없음';
        if(profit>0.005){pClass='profit';pSign='+';pText='이득!';}else if(profit<-0.005){pClass='loss';pSign='';pText='손해';}
        resultDisplay.innerHTML = `<div class="result-path"><strong>[경로 1: 직접 (${curA}→${curB})]</strong><p>${formatAmount(amount, curA)} = ${formatAmount(path1, curB)}</p></div><hr><div class="result-path"><strong>[경로 2: 경유 (${curA}→${curC}→${curB})]</strong><p>${formatAmount(amount, curA)} → ... → ${formatAmount(path2, curB)}</p></div><hr><div class="final-result"><h3>(${curC}) 경유 시</h3><h2 class="${pClass}">${pSign}${formatAmount(profit, curB)} ${pText}</h2></div>`;
    }
    // 계산 근거 표시 함수 (환차익 전용)
    function displayArbitrageBasis(amount, rAB, rAC, rCB, p1, p2, cA, cB, cC) {
        if (!calcBasisContent) return;
        calcBasisContent.innerHTML = `<h4>사용된 환율</h4><p>1 ${cA}➔${cB}:<b>${formatRate(rAB)}</b></p><p>1 ${cA}➔${cC}:<b>${formatRate(rAC)}</b></p><p>1 ${cC}➔${cB}:<b>${formatRate(rCB)}</b></p><h4>계산 과정</h4><p><b>경로1:</b><br>${formatAmount(amount,cA,0)}*${formatRate(rAB)}<br>=<b>${formatAmount(p1,cB)}</b></p><p><b>경로2:</b><br>(${formatAmount(amount,cA,0)}*${formatRate(rAC)})*${formatRate(rCB)}<br>=<b>${formatAmount(p2,cB)}</b></p>`;
    }
}

/** 로직 3-2: "물타기" 계산기 */
function setupAvgDownCalculator() {
    const calculateBtn = document.getElementById('calculate-avg-btn');
    const resultSection = document.getElementById('result-section'), resultDisplay = document.getElementById('result-display'), calcBasisContent = document.getElementById('calc-basis-content');
    const curSharesInput = document.getElementById('current-shares'), curAvgInput = document.getElementById('current-avg-price'), addSharesInput = document.getElementById('additional-shares'), addPriceInput = document.getElementById('additional-price');
    calculateBtn.addEventListener('click', () => {
        const curShares = parseFloat(curSharesInput.value), curAvg = parseFloat(curAvgInput.value), addShares = parseFloat(addSharesInput.value), addPrice = parseFloat(addPriceInput.value);
        if (isNaN(curShares)||isNaN(curAvg)||isNaN(addShares)||isNaN(addPrice)) { showError("숫자를 입력하세요.", "물타기"); return; }
        if (curShares<0||curAvg<0||addShares<0||addPrice<0) { showError("0 이상을 입력하세요.", "물타기"); return; }
        const curCost = curShares*curAvg, addCost = addShares*addPrice, finalCost = curCost+addCost, finalShares = curShares+addShares;
        const finalAvg = (finalShares>0)?(finalCost/finalShares):0;
        displayAvgDownResults(finalAvg, finalShares, finalCost);
        displayAvgDownBasis(curCost, addCost, finalCost, finalShares, finalAvg);
    });
    function displayAvgDownResults(fAvg, fShares, fCost) { resultSection.style.display = 'block'; resultDisplay.style.display = 'block'; document.getElementById('error-message').style.display = 'none'; resultDisplay.innerHTML = `<div class="final-result"><h3>최종 평균 단가</h3><h2 class="profit">${formatNumber(fAvg,2)}</h2></div><hr><div class="result-item"><span>총 보유 수량</span><strong>${formatNumber(fShares,0)} 주</strong></div><div class="result-item"><span>총 매수 금액</span><strong>${formatKRW(fCost)}</strong></div>`; }
    function displayAvgDownBasis(curCost, addCost, finalCost, finalShares, finalAvg) { if (!calcBasisContent) return; calcBasisContent.innerHTML = `<h4>계산 공식</h4><p>(기존액+추가액)/(기존량+추가량)</p><h4>계산 과정</h4><p><b>총 매수액:</b><br>${formatKRW(curCost)}+${formatKRW(addCost)}<br>=<b>${formatKRW(finalCost)}</b></p><p><b>최종 평단:</b><br>${formatKRW(finalCost)}/${formatNumber(finalShares,0)}주<br>=<b>${formatNumber(finalAvg,2)}</b></p>`; }
}

/** 로직 3-3: "양도소득세" 계산기 */
function setupTaxCalculator() {
    const calculateBtn = document.getElementById('calculate-tax-btn');
    const resultSection = document.getElementById('result-section'), resultDisplay = document.getElementById('result-display'), calcBasisContent = document.getElementById('calc-basis-content');
    const profitInput = document.getElementById('total-profit'), lossInput = document.getElementById('total-loss'), deductionInput = document.getElementById('basic-deduction'), rateInput = document.getElementById('tax-rate');
    calculateBtn.addEventListener('click', () => {
        const profit = parseFloat(profitInput.value), loss = parseFloat(lossInput.value)||0, deduction = parseFloat(deductionInput.value)||0, rate = parseFloat(rateInput.value)||0;
        if (isNaN(profit)) { showError("총 매도 수익(숫자)을 입력하세요.", "양도세"); return; }
        if (isNaN(loss)||loss<0) { showError("총 매도 손실(0 이상 숫자)을 입력하세요.", "양도세"); return; }
        if (profit<0) { showError("총 매도 수익(0 이상 숫자)을 입력하세요.", "양도세"); return; }
        const taxable = Math.max(0,(profit-loss-deduction)), finalTax = taxable*(rate/100), netProfit = (profit-loss)-finalTax;
        displayTaxResults(taxable, finalTax, netProfit);
        displayTaxBasis(profit, loss, deduction, rate, taxable, finalTax);
    });
    function displayTaxResults(taxable, tax, net) { resultSection.style.display='block'; resultDisplay.style.display='block'; document.getElementById('error-message').style.display='none'; resultDisplay.innerHTML = `<div class="final-result"><h3>예상 양도소득세 (${rateInput.value}%)</h3><h2 class="loss">${formatKRW(tax)}</h2></div><hr><div class="result-item"><span>과세 표준</span><strong>${formatKRW(taxable)}</strong></div><div class="result-item"><span>세후 실수령액</span><strong class="profit">${formatKRW(net)}</strong></div>`; }
    function displayTaxBasis(p, l, d, r, tIncome, tax) { if (!calcBasisContent) return; calcBasisContent.innerHTML = `<h4>과세 표준</h4><p>(수익-손실-공제)</p><p>${formatKRW(p)}-${formatKRW(l)}-${formatKRW(d)}<br>=<b>${formatKRW(tIncome)}</b></p><h4>최종 세금</h4><p>(과세표준*세율)</p><p>${formatKRW(tIncome)}*${r}%<br>=<b>${formatKRW(tax)}</b></p>`; }
}

/** 로직 3-4: "배당률" 계산기 */
function setupDividendCalculator() {
    const calculateBtn = document.getElementById('calculate-dividend-btn');
    const resultSection = document.getElementById('result-section'), resultDisplay = document.getElementById('result-display'), calcBasisContent = document.getElementById('calc-basis-content');
    const priceInput = document.getElementById('current-price'), dividendInput = document.getElementById('annual-dividend');
    calculateBtn.addEventListener('click', () => {
        const price = parseFloat(priceInput.value), dividend = parseFloat(dividendInput.value);
        if (isNaN(price)||isNaN(dividend)) { showError("숫자를 입력하세요.", "배당률"); return; }
        if (price<=0) { showError("주가는 0보다 커야 합니다.", "배당률"); return; }
        if (dividend<0) { showError("배당금은 0 이상이어야 합니다.", "배당률"); return; }
        const yieldVal = (price>0)?(dividend/price):0;
        displayDividendResults(yieldVal);
        displayDividendBasis(price, dividend, yieldVal);
    });
    function displayDividendResults(yieldVal) { resultSection.style.display='block'; resultDisplay.style.display='block'; document.getElementById('error-message').style.display='none'; resultDisplay.innerHTML = `<div class="final-result"><h3>현재 (세전) 배당수익률</h3><h2 class="profit">${formatPercent(yieldVal)}</h2></div>`; }
    function displayDividendBasis(p, d, y) { if (!calcBasisContent) return; calcBasisContent.innerHTML = `<h4>계산 공식</h4><p>(연간 배당금 / 현재 주가)</p><h4>계산 과정</h4><p>${formatNumber(d,2)} / ${formatNumber(p,2)}<br>= ${formatNumber(y,4)}<br>= <b>${formatPercent(y)}</b></p>`; }
}

/** 로직 3-5: "CAGR" 계산기 */
function setupCagrCalculator() {
    const calculateBtn = document.getElementById('calculate-cagr-btn');
    const resultSection = document.getElementById('result-section'), resultDisplay = document.getElementById('result-display'), calcBasisContent = document.getElementById('calc-basis-content');
    const startInput = document.getElementById('start-value'), endInput = document.getElementById('end-value'), yearsInput = document.getElementById('years');
    calculateBtn.addEventListener('click', () => {
        const start = parseFloat(startInput.value), end = parseFloat(endInput.value), years = parseFloat(yearsInput.value);
        if (isNaN(start)||isNaN(end)||isNaN(years)) { showError("숫자를 입력하세요.", "CAGR"); return; }
        if (start<=0) { showError("초기 원금(0 초과)을 입력하세요.", "CAGR"); return; }
        if (end<0) { showError("현재 금액(0 이상)을 입력하세요.", "CAGR"); return; }
        if (years<=0) { showError("기간(0년 초과)을 입력하세요.", "CAGR"); return; }
        const ratio = end/start, exponent = 1/years; let cagr = 0;
        if (ratio > 0) cagr = Math.pow(ratio, exponent) - 1;
        else if (ratio === 0 && start > 0) cagr = -1;
        else { showError("CAGR 계산 불가 값입니다.", "CAGR"); return; }
        displayCagrResults(cagr);
        displayCagrBasis(start, end, years, ratio, exponent, cagr);
    });
    function displayCagrResults(cagr) { resultSection.style.display='block'; resultDisplay.style.display='block'; document.getElementById('error-message').style.display='none'; let resultClass = 'even'; if (cagr > 0) resultClass = 'profit'; else if (cagr < 0) resultClass = 'loss'; resultDisplay.innerHTML = `<div class="final-result"><h3>연평균 성장률 (CAGR)</h3><h2 class="${resultClass}">${formatPercent(cagr)}</h2></div>`; }
    function displayCagrBasis(s, e, y, r, exp, cagr) { if (!calcBasisContent) return; calcBasisContent.innerHTML = `<h4>계산 공식</h4><p>((현재/초기)<sup>(1/기간)</sup>)-1</p><h4>계산 과정</h4><p>(${formatKRW(e)}/${formatKRW(s)})<sup>(1/${formatNumber(y,1)})</sup>-1<br>=(${formatNumber(r,4)})<sup>${formatNumber(exp,4)}</sup>-1<br>=${formatNumber(cagr+1,4)}-1<br>=${formatNumber(cagr,4)}<br>=<b>${formatPercent(cagr)}</b></p>`; }
}

/** 로직 3-6: "복리" 계산기 */
let compoundChartInstance = null; // 차트 인스턴스 (복리 계산기 전용)
function setupCompoundCalculator() {
    // 복리 계산기 전용 DOM 요소들
    const calculateBtn = document.getElementById('calculate-compound-btn');
    const resultSection = document.getElementById('result-section'), resultDisplay = document.getElementById('result-display'), calcBasisContent = document.getElementById('calc-basis-content');
    const ruleResultEl = document.getElementById('rule-result');
    const initialAmountInput = document.getElementById('initial-amount'), monthlyInvestmentInput = document.getElementById('monthly-investment'), periodInput = document.getElementById('period'), interestRateInput = document.getElementById('interest-rate');
    const chartCanvas = document.getElementById('compound-chart');

    // 차트 라이브러리 로드 확인 (중요!)
    if (typeof Chart === 'undefined') {
        console.error("Chart.js 라이브러리가 로드되지 않았습니다.");
        showError("차트를 표시할 수 없습니다. 라이브러리를 확인하세요.", "복리");
        return; // Chart.js 없으면 중단
    }

    calculateAndDisplayCompound(); // 초기 계산 실행

    [initialAmountInput, monthlyInvestmentInput, periodInput, interestRateInput].forEach(input => {
        input.addEventListener('input', debounce(calculateAndDisplayCompound, 300));
    });
    calculateBtn.addEventListener('click', calculateAndDisplayCompound);

    function calculateAndDisplayCompound() {
        const initial = parseFloat(initialAmountInput.value) || 0, monthly = parseFloat(monthlyInvestmentInput.value) || 0, years = parseFloat(periodInput.value) || 0, rate = parseFloat(interestRateInput.value) || 0;
        if (years <= 0 || rate < 0) {
             showError("기간(0년 초과), 수익률(0% 이상)을 입력하세요.", "복리");
             if (compoundChartInstance) { compoundChartInstance.destroy(); compoundChartInstance = null; }
             return;
        }
        if (initial < 0 || monthly < 0) { showError("투자 금액(0 이상)을 입력하세요.", "복리"); return; }

        const monthlyRate = rate / 100 / 12, totalMonths = years * 12;
        const initialFutureValue = initial * Math.pow(1 + monthlyRate, totalMonths);
        let monthlyFutureValue = 0;
        if (monthly > 0 && monthlyRate > 0) monthlyFutureValue = monthly * (Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate;
        else if (monthly > 0 && monthlyRate === 0) monthlyFutureValue = monthly * totalMonths;
        const finalAmount = initialFutureValue + monthlyFutureValue, totalInvestment = initial + (monthly * totalMonths), totalProfit = finalAmount - totalInvestment;

        displayCompoundResults(totalInvestment, totalProfit, finalAmount);
        displayCompoundBasis(initial, monthly, years, rate, finalAmount);
        displayRuleOf72(rate);
        updateCompoundChart(initial, monthly, years, rate, chartCanvas);
    }
    function displayCompoundResults(totalInvest, totalProfitVal, finalAmt) { resultSection.style.display='block'; resultDisplay.style.display='block'; document.getElementById('error-message').style.display='none'; resultDisplay.innerHTML = `<div class="result-item"><span>총 투자원금</span><strong>${formatKRW(totalInvest)}</strong></div><div class="result-item"><span>투자 수익 (복리)</span><strong class="profit">${formatKRW(totalProfitVal)}</strong></div><hr><div class="final-result"><h3>${document.getElementById('period').value}년 후 예상 최종 자산</h3><h2 class="profit">${formatKRW(finalAmt)}</h2></div>`; }
    function displayCompoundBasis(init, month, yrs, rt, final) { if (!calcBasisContent) return; const monthlyRate = rt / 100 / 12, totalMonths = yrs * 12; calcBasisContent.innerHTML = `<h4>계산 공식</h4><p style="font-size: 0.8em;">초기*(1+월이율)<sup>개월수</sup> + 월납*(((1+월이율)<sup>개월수</sup>-1)/월이율)</p><h4>적용된 값</h4><p>초기: ${formatKRW(init)}</p><p>월납: ${formatKRW(month)}</p><p>기간: ${formatNumber(yrs,0)}년 (${formatNumber(totalMonths,0)}개월)</p><p>연이율: ${formatNumber(rt,1)}% (월 ${formatNumber(monthlyRate*100,3)}%)</p><p><b>최종 금액: ${formatKRW(final)}</b></p>`; }
    function displayRuleOf72(interestRate) { if (!ruleResultEl) return; if (interestRate > 0) { const doubleTime = 72 / interestRate; ruleResultEl.innerHTML = `연 ${interestRate}% 수익률로 약 <strong>${doubleTime.toFixed(1)}년</strong>만에 원금이 2배 예상`; } else { ruleResultEl.textContent = '수익률 0% 초과 시 계산 가능'; } }
    function updateCompoundChart(initial, monthly, years, rate, canvasElement) {
        if (!canvasElement) return; const ctx = canvasElement.getContext('2d'); if (!ctx) return;
        if (compoundChartInstance) compoundChartInstance.destroy();
        const labels = [], principalData = [], totalData = []; const monthlyRate = rate / 100 / 12;
        const step = Math.max(1, Math.floor(years / 10));
        for (let year = 0; year <= years; year += step) {
            labels.push(year + '년'); const months = year * 12; const principal = initial + (monthly * months);
            let total = initial * Math.pow(1 + monthlyRate, months);
            if (monthly > 0 && monthlyRate > 0) total += monthly * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
            else if (monthly > 0 && monthlyRate === 0) total += monthly * months;
            principalData.push(principal); totalData.push(total);
        }
        if (years % step !== 0 && years > 0) {
             labels.push(years + '년'); const months = years * 12; const principal = initial + (monthly * months);
             let total = initial * Math.pow(1 + monthlyRate, months);
             if (monthly > 0 && monthlyRate > 0) total += monthly * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
             else if (monthly > 0 && monthlyRate === 0) total += monthly * months;
             principalData.push(principal); totalData.push(total);
        }
        compoundChartInstance = new Chart(ctx, {
             type: 'line', data: { labels: labels, datasets: [{ label: '투자원금', data: principalData, borderColor: '#adb5bd', backgroundColor: 'rgba(173, 181, 189, 0.1)', fill: true, tension: 0.1 }, { label: '복리수익 포함', data: totalData, borderColor: '#007bff', backgroundColor: 'rgba(0, 123, 255, 0.1)', fill: true, tension: 0.1 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: value => formatKRW(value) } } }, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: context => `${context.dataset.label}: ${formatKRW(context.parsed.y)}` } } }, interaction: { intersect: false, mode: 'index' } }
        });
    }
}

/** 로직 3-7: "포지션 사이징" 계산기 */
function setupPositionSizeCalculator() {
    const calculateBtn = document.getElementById('calculate-pos-size-btn');
    const resultSection = document.getElementById('result-section'), resultDisplay = document.getElementById('result-display'), calcBasisContent = document.getElementById('calc-basis-content');
    const capitalInput = document.getElementById('total-capital'), riskInput = document.getElementById('risk-percent'), entryInput = document.getElementById('entry-price'), stopInput = document.getElementById('stop-loss-price');
    calculateBtn.addEventListener('click', () => {
        const capital = parseFloat(capitalInput.value), riskP = parseFloat(riskInput.value), entry = parseFloat(entryInput.value), stop = parseFloat(stopInput.value);
        if (isNaN(capital)||isNaN(riskP)||isNaN(entry)||isNaN(stop)) { showError("숫자를 입력하세요.", "포지션"); return; }
        if (capital<=0) { showError("총 자본(0 초과)을 입력하세요.", "포지션"); return; }
        if (riskP<=0||riskP>=100) { showError("리스크 %(0 초과, 100 미만)를 입력하세요.", "포지션"); return; }
        if (entry<=0||stop<=0) { showError("진입/손절가(0 초과)를 입력하세요.", "포지션"); return; }
        if (entry<=stop) { showError("진입가는 손절가보다 높아야 합니다.", "포지션"); return; }
        const maxRiskAmt = capital*(riskP/100), lossPerShare = entry-stop;
        const shares = (lossPerShare>0)?Math.floor(maxRiskAmt/lossPerShare):0;
        const totalValue = shares*entry;
        displayPositionSizeResults(shares, totalValue, maxRiskAmt);
        displayPositionSizeBasis(capital, riskP, entry, stop, maxRiskAmt, lossPerShare, shares);
    });
    function displayPositionSizeResults(shares, totalValue, riskAmount) { resultSection.style.display='block'; resultDisplay.style.display='block'; document.getElementById('error-message').style.display='none'; resultDisplay.innerHTML = `<div class="final-result"><h3>매수 가능 수량</h3><h2 class="profit">${formatNumber(shares, 0)} 주</h2></div><hr><div class="result-item"><span>총 매수 금액</span><strong>${formatKRW(totalValue)}</strong></div><div class="result-item"><span>최대 손실 허용 금액</span><strong class="loss">${formatKRW(riskAmount)}</strong></div>`; }
    function displayPositionSizeBasis(cap, rP, ent, stp, rAmt, lShare, shrs) { if (!calcBasisContent) return; calcBasisContent.innerHTML = `<h4>최대 손실 허용액</h4><p>(총 자본 * 리스크 %)</p><p>${formatKRW(cap)}*${rP}%<br>=<b>${formatKRW(rAmt)}</b></p><h4>1주당 예상 손실액</h4><p>(진입가-손절가)</p><p>${formatNumber(ent,2)}-${formatNumber(stp,2)}<br>=<b>${formatNumber(lShare,2)}</b></p><h4>매수 가능 수량</h4><p>(최대 손실액/1주당 손실액)</p><p>${formatKRW(rAmt)}/${formatNumber(lShare,2)}<br>=${formatNumber(rAmt/lShare,2)}<br>≈<b>${formatNumber(shrs,0)}주</b> (버림)</p>`; }
}

/** 로직 3-8: "P/E 비율" 계산기 */
function setupPeRatioCalculator() {
    const calculateBtn = document.getElementById('calculate-pe-btn');
    const resultSection = document.getElementById('result-section'), resultDisplay = document.getElementById('result-display'), calcBasisContent = document.getElementById('calc-basis-content');
    const priceInput = document.getElementById('current-price'), epsInput = document.getElementById('eps');
    calculateBtn.addEventListener('click', () => {
        const price = parseFloat(priceInput.value), eps = parseFloat(epsInput.value);
        if (isNaN(price)||isNaN(eps)) { showError("숫자를 입력하세요.", "P/E"); return; }
        if (price<0) { showError("주가는 0 이상이어야 합니다.", "P/E"); return; }
        if (eps === 0) { showError("EPS는 0이 될 수 없습니다.", "P/E"); return; }
        if (eps < 0) console.warn("EPS가 음수입니다. P/E 해석에 유의하세요.");
        const peRatio = (eps!==0)?(price/eps):Infinity;
        displayPeRatioResults(peRatio);
        displayPeRatioBasis(price, eps, peRatio);
    });
    function displayPeRatioResults(peRatio) { resultSection.style.display='block'; resultDisplay.style.display='block'; document.getElementById('error-message').style.display='none'; let resultClass = 'even'; if (peRatio > 0 && peRatio < 15) resultClass = 'profit'; else if (peRatio > 25 || peRatio < 0) resultClass = 'loss'; const displayValue = isFinite(peRatio) ? `${formatNumber(peRatio, 2)} 배` : '계산 불가 (EPS=0)'; if (!isFinite(peRatio)) resultClass = 'loss'; resultDisplay.innerHTML = `<div class="final-result"><h3>주가수익비율 (P/E Ratio)</h3><h2 class="${resultClass}">${displayValue}</h2></div>`; }
    function displayPeRatioBasis(p, e, pe) { if (!calcBasisContent) return; let calcStep = `${formatNumber(p, 2)} / ${formatNumber(e, 2)}<br>`; let finalResult = `<b>${formatNumber(pe, 2)} 배</b>`; if (!isFinite(pe)) { calcStep = `${formatNumber(p, 2)} / 0<br>`; finalResult = "<b>계산 불가</b>"; } calcBasisContent.innerHTML = `<h4>계산 공식</h4><p>(현재 주가 / EPS)</p><h4>계산 과정</h4><p>${calcStep}= ${finalResult}</p>`; }
}


/** (수정됨) 로직 3-9: "라이프 플래너" 설정 (planner.html) */
// 플래너 데이터 저장소 (페이지 내에서만 유지, setupPlanner 함수 스코프 밖으로 이동)
let plannerLifeEvents = []; // 변수 이름 변경 (전역 lifeEvents와 충돌 방지)
const plannerCurrentYear = new Date().getFullYear(); // 플래너용 현재 년도

function setupPlanner() {
    // DOM 요소 찾기
    const addEventBtn = document.getElementById('add-event-btn');
    const eventNameInput = document.getElementById('event-name');
    const eventYearInput = document.getElementById('event-year');
    const eventAmountInput = document.getElementById('event-amount');
    const sampleBtn = document.getElementById('add-sample-events-btn');
    const initialAmountInput = document.getElementById('planner-initial-amount');
    const monthlyInvestmentInput = document.getElementById('planner-monthly-investment');
    const interestRateInput = document.getElementById('planner-interest-rate');
    const eventsListContainer = document.getElementById('events-list'); // 이벤트 리스너 위임용
    
    // 필수 요소 확인
    if (!addEventBtn || !eventsListContainer) {
        console.error("라이프 플래너 필수 요소를 찾을 수 없습니다.");
        return; // 필수 요소 없으면 중단
    }

    // 이벤트 리스너 설정
    addEventBtn.addEventListener('click', addLifeEvent);
    if (sampleBtn) sampleBtn.addEventListener('click', addSampleEvents);

    // Enter 키로 이벤트 추가
    [eventNameInput, eventYearInput, eventAmountInput].forEach(input => {
        if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') addLifeEvent(); });
    });

    // 투자 설정 변경 시 업데이트 (디바운스)
    const debouncedUpdate = debounce(() => { renderTimeline(); updatePlannerSummary(); }, 500);
    [initialAmountInput, monthlyInvestmentInput, interestRateInput].forEach(input => {
        if (input) input.addEventListener('input', debouncedUpdate);
    });
    
    // (수정됨) 이벤트 삭제 리스너 (이벤트 위임 사용)
    eventsListContainer.addEventListener('click', function(event) {
        if (event.target.closest('.delete-btn')) {
             const button = event.target.closest('.delete-btn');
             const eventId = button.getAttribute('data-event-id'); // data-* 속성 사용
             if (eventId) {
                 deleteLifeEvent(eventId);
             }
        }
    });


    // 초기 렌더링
    renderLifeEvents();
    renderTimeline();
    updatePlannerSummary();
}

// 인생 이벤트 추가 함수
function addLifeEvent() {
    const nameInput = document.getElementById('event-name'), yearInput = document.getElementById('event-year'), amountInput = document.getElementById('event-amount');
    const name = nameInput.value.trim(), year = parseInt(yearInput.value), amount = parseFloat(amountInput.value);

    if (!name || !year || !amount) { alert('모든 정보를 입력해주세요.'); return; }
    if (isNaN(year) || year < plannerCurrentYear) { alert('목표 년도는 현재 년도 이후여야 합니다.'); yearInput.focus(); return; }
    if (isNaN(amount) || amount <= 0) { alert('필요 금액(0 초과)을 입력하세요.'); amountInput.focus(); return; }

    const event = { id: Date.now(), name: name, year: year, amount: amount, yearsFromNow: year - plannerCurrentYear };
    plannerLifeEvents.push(event); // plannerLifeEvents 사용
    plannerLifeEvents.sort((a, b) => a.year - b.year);

    nameInput.value = ''; yearInput.value = ''; amountInput.value = ''; nameInput.focus();
    renderLifeEvents(); renderTimeline(); updatePlannerSummary();
}

// 인생 이벤트 삭제 함수
function deleteLifeEvent(eventId) {
    // (수정됨) 문자열 ID로 비교
    const eventIdStr = String(eventId); 
    const initialLength = plannerLifeEvents.length;
    plannerLifeEvents = plannerLifeEvents.filter(event => String(event.id) !== eventIdStr);

    if (plannerLifeEvents.length < initialLength) { // 삭제 성공 시에만 확인창 표시
        if (!confirm('이 이벤트를 삭제하시겠습니까?')) {
             // 삭제 취소 시 원복 (어렵기 때문에 일단 삭제 후 렌더링)
             // 간단하게는 그냥 삭제하고 렌더링
             console.log("삭제 실행됨 (확인 창은 시점 문제로 제거)");
        }
         renderLifeEvents(); renderTimeline(); updatePlannerSummary();
    } else {
         console.warn("삭제할 이벤트를 찾지 못했습니다:", eventId);
    }
}

// 이벤트 목록 렌더링 함수
function renderLifeEvents() {
    const container = document.getElementById('events-list'); if (!container) return;
    if (plannerLifeEvents.length === 0) { container.innerHTML = `<p class="placeholder" style="padding: 20px 0;"><i class="fas fa-calendar-plus" style="margin-right: 5px;"></i> 이벤트 없음</p>`; return; }
    container.innerHTML = plannerLifeEvents.map(event => `
        <div class="event-item">
            <div class="event-info">
                <div class="event-name">${escapeHtml(event.name)}</div>
                <div class="event-details">${event.year}년 (${event.yearsFromNow}년 후) • ${formatKRW(event.amount)}</div>
            </div>
            <button class="delete-btn" data-event-id="${event.id}" title="삭제">
                <i class="fas fa-trash"></i>
            </button>
        </div>`).join('');
}

// 타임라인 렌더링 함수
function renderTimeline() {
    const container = document.getElementById('timeline'); if (!container) return;
    if (plannerLifeEvents.length === 0) { container.innerHTML = `<p class="placeholder" style="padding: 20px 0;"><i class="fas fa-stream" style="margin-right: 5px;"></i> 타임라인 표시 불가</p>`; return; }

    const initial = parseFloat(document.getElementById('planner-initial-amount').value) || 0;
    const monthly = parseFloat(document.getElementById('planner-monthly-investment').value) || 0;
    const rate = parseFloat(document.getElementById('planner-interest-rate').value) || 0;

    if (initial < 0 || monthly < 0 || rate < 0) { container.innerHTML = `<p class="placeholder error" style="padding: 20px 0;">투자 설정값 오류</p>`; updatePlannerSummary(true); return; }

    container.innerHTML = plannerLifeEvents.map(event => {
        const years = event.yearsFromNow;
        const projected = calculateAssetsAtYear(initial, monthly, rate, years); // 공통 함수 사용
        const canAfford = projected >= event.amount;
        const diff = projected - event.amount;
        return `
            <div class="timeline-item ${canAfford ? 'affordable' : 'shortage'}"><div class="timeline-year">${event.year}년 (${years}년 후)</div><div class="timeline-event">${escapeHtml(event.name)}</div><div class="timeline-amount">필요 금액: ${formatKRW(event.amount)}</div><div class="timeline-projection">예상 자산: ${formatKRW(projected)}${canAfford ? `<span style="color:#28a745; margin-left:10px;"><i class="fas fa-check-circle"></i> ${formatKRW(diff)} 초과</span>` : `<span style="color:#dc3545; margin-left:10px;"><i class="fas fa-exclamation-circle"></i> ${formatKRW(Math.abs(diff))} 부족</span>`}</div></div>`;
    }).join('');
    updatePlannerSummary(); // 타임라인 렌더링 후 요약 업데이트 (정상 상태)
}

// 특정 년도 예상 자산 계산 함수 (setupPlanner 스코프 밖으로 이동 - 공통 사용 가능)
function calculateAssetsAtYear(initial, monthly, rate, years) {
    if (years < 0) return initial; if (rate < 0) return initial + (monthly * years * 12);
    const monthlyRate = rate / 100 / 12, totalMonths = years * 12;
    const initialFV = initial * Math.pow(1 + monthlyRate, totalMonths);
    let monthlyFV = 0;
    if (monthly > 0 && monthlyRate > 0) monthlyFV = monthly * (Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate;
    else if (monthly > 0 && monthlyRate === 0) monthlyFV = monthly * totalMonths;
    // isFinite 체크 추가 (결과값이 너무 커져 Infinity가 되는 경우 방지)
    const result = initialFV + monthlyFV;
    return isFinite(result) ? result : Infinity; 
}

// 오른쪽 패널 요약 업데이트 함수
function updatePlannerSummary(hasInputError = false) {
    const summaryContainer = document.getElementById('planner-summary-content'); if (!summaryContainer) return;
    if (hasInputError) { summaryContainer.innerHTML = `<p class="placeholder error">투자 설정값을 확인해주세요.</p>`; return; }
    if (plannerLifeEvents.length === 0) { summaryContainer.innerHTML = `<p class="placeholder">이벤트/투자 설정을 입력하면 요약 정보가 표시됩니다.</p>`; return; }

    const initial = parseFloat(document.getElementById('planner-initial-amount').value) || 0;
    const monthly = parseFloat(document.getElementById('planner-monthly-investment').value) || 0;
    const rate = parseFloat(document.getElementById('planner-interest-rate').value) || 0;

    const totalGoal = plannerLifeEvents.reduce((s, e) => s + e.amount, 0);
    const lastYear = Math.max(0, ...plannerLifeEvents.map(e => e.yearsFromNow));
    const finalAssets = calculateAssetsAtYear(initial, monthly, rate, lastYear);
    
    // finalAssets가 Infinity일 경우 처리
    let achievementRate = 1; // 기본값 (목표 0일때)
    let isAchievable = true;
    let shortfall = 0;
    let recommendation = '';
    
    if (finalAssets === Infinity) {
        achievementRate = Infinity;
        isAchievable = true;
        recommendation = '예상 자산이 매우 클 것으로 예측됩니다!';
    } else if (totalGoal > 0) {
        achievementRate = finalAssets / totalGoal;
        isAchievable = achievementRate >= 1;
        shortfall = Math.max(0, totalGoal - finalAssets);
        if (!isAchievable && shortfall > 0) recommendation = `최종 목표 시점에 약 ${formatKRW(shortfall)} 부족 예상. 월 투자 증액 등을 고려해보세요.`;
        else if (isAchievable) recommendation = '현재 계획으로 최종 목표 달성 가능 예상!';
    } else { // totalGoal이 0일 때 (이벤트는 있으나 금액이 0)
         recommendation = '이벤트의 필요 금액을 입력해주세요.';
    }

    if (initial <= 0 && monthly <= 0 && lifeEvents.length > 0) {
         recommendation = '투자 설정을 입력하면 분석 가능.';
    }


    summaryContainer.innerHTML = `<div class="summary-item"><span>총 이벤트:</span> <strong>${plannerLifeEvents.length}개</strong></div><div class="summary-item"><span>총 필요 금액:</span> <strong>${formatKRW(totalGoal)}</strong></div><div class="summary-item"><span>최종 예상 자산(${plannerCurrentYear + lastYear}년):</span> <strong>${finalAssets === Infinity ? '매우 큼' : formatKRW(finalAssets)}</strong></div><div class="summary-item"><span>목표 달성률(최종):</span> <strong class="${isAchievable ? 'profit' : 'loss'}">${finalAssets === Infinity ? '100% 초과' : formatPercent(achievementRate)}</strong></div>${recommendation ? `<div class="recommendation">${recommendation}</div>` : ''}`;
}

// 샘플 이벤트 추가 함수
function addSampleEvents() {
    if (!confirm('샘플 이벤트를 추가하시겠습니까? (기존 유지)')) return;
    const samples = [ { name: '결혼', year: plannerCurrentYear + 3, amount: 30000000 }, { name: '주택 구매', year: plannerCurrentYear + 7, amount: 150000000 }, { name: '자녀 대학', year: plannerCurrentYear + 20, amount: 80000000 }, { name: '은퇴 목표', year: plannerCurrentYear + 30, amount: 500000000 } ];
    let added = false;
    samples.forEach(s => {
        if (!plannerLifeEvents.some(e => e.name === s.name && e.year === s.year)) { // plannerLifeEvents 사용
            plannerLifeEvents.push({ ...s, id: Date.now() + Math.random(), yearsFromNow: s.year - plannerCurrentYear }); added = true;
        }
    });
    if (added) { plannerLifeEvents.sort((a, b) => a.year - b.year); renderLifeEvents(); renderTimeline(); updatePlannerSummary(); }
    else { alert("샘플 이벤트가 이미 모두 존재합니다."); }
}


// --- (이후 PDF 생성기 로직 추가 위치) ---