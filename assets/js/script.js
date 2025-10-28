/**
 * DOMContentLoaded
 * 페이지 로드가 완료되면 3가지 주요 로직을 실행합니다.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 로직 1: 반응형 메뉴 설정 (모든 페이지 공통)
    setupMenuToggle();
    
    // 로직 2: 왼쪽 패널 (실시간 환율) 로드 (모든 페이지 공통)
    loadLiveRates();
    
    // --- 로직 3: 현재 페이지에 맞는 계산기 설정 ---
    if (document.getElementById('calculate-btn')) {
        setupArbitrageCalculator(); // "환차익 스포터" (index.html)
    }
    if (document.getElementById('calculate-avg-btn')) {
        setupAvgDownCalculator(); // "물타기" (avg-down.html)
    }
    if (document.getElementById('calculate-tax-btn')) {
        setupTaxCalculator(); // "양도소득세" (tax.html)
    }
    // (NEW) "배당률" 계산기 버튼 ID 확인
    if (document.getElementById('calculate-dividend-btn')) {
        setupDividendCalculator(); // "배당률" (dividend.html)
    }
});

// --- 0. 공통 Helper 함수 (전역) ---

/** 로직 1: 반응형 메뉴 토글 */
function setupMenuToggle() {
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const mainNavList = document.getElementById('main-nav-list');

    if (menuToggleBtn && mainNavList) {
        menuToggleBtn.addEventListener('click', () => {
            menuToggleBtn.classList.toggle('is-active');
            mainNavList.classList.toggle('is-active');
        });
    }
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
            let displayCurrency = currency;
            let flag = getFlagEmoji(currency); 

            if (currency === 'JPY') {
                displayRate = displayRate * 100;
                displayCurrency = 'JPY (100엔)';
            }
            
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${flag} ${displayCurrency}</span>
                <span>${formatKRW(displayRate)}</span>
            `;
            listElement.appendChild(li);
        });

    } catch (error) {
        console.error("실시간 환율 로드 실패:", error);
        loadingElement.textContent = "환율 로드에 실패했습니다.";
        loadingElement.style.justifyContent = 'center';
    }
}

/** 국기 이모지 반환 함수 */
function getFlagEmoji(currency) {
    const flags = {
        'USD': '🇺🇸', 'JPY': '🇯🇵', 'EUR': '🇪🇺',
        'CNY': '🇨🇳', 'GBP': '🇬🇧', 'AUD': '🇦🇺',
        'KRW': '🇰🇷'
    };
    return flags[currency] || '🏳️';
}

/** API 호출 함수 (Frankfurter) */
async function fetchRate(from, to) {
    if (from === to) return 1; 
    const response = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
    if (!response.ok) {
        throw new Error(`API 응답 실패: ${from} to ${to}`);
    }
    const data = await response.json();
    if (data.rates[to] === undefined) {
        throw new Error(`환율 정보를 찾을 수 없음: ${from} to ${to}`);
    }
    return data.rates[to];
}

/** 숫자 포맷팅 통합 함수 */
function formatAmount(val, currency, digits = 2) {
    if (typeof val !== 'number' || !isFinite(val)) return '-';
    if (currency === 'KRW') digits = 0;
    try {
        return new Intl.NumberFormat('ko-KR', { 
            style: 'currency', currency: currency,
            maximumFractionDigits: digits, minimumFractionDigits: digits
        }).format(val);
    } catch (e) { console.error("formatAmount 오류:", e); return '-'; }
}

/** 원화(KRW) 전용 포맷터 */
function formatKRW(val) {
    if (typeof val !== 'number' || !isFinite(val)) return '-';
    try {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency', currency: 'KRW',
            maximumFractionDigits: 0, minimumFractionDigits: 0
        }).format(val);
    } catch (e) { console.error("formatKRW 오류:", e); return '-'; }
}

/** 환율(Rate) 전용 포맷터 */
function formatRate(val) {
    if (typeof val !== 'number' || !isFinite(val)) return '-';
    try {
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 8, minimumFractionDigits: 2
        }).format(val);
    } catch (e) { console.error("formatRate 오류:", e); return '-'; }
}

/** 숫자(Number) 전용 포맷터 (콤마 O, 소수점 N자리) */
function formatNumber(val, digits = 2) {
    if (typeof val !== 'number' || !isFinite(val)) return '-';
    try {
        return new Intl.NumberFormat('ko-KR', { // ko-KR로 천단위 콤마
            maximumFractionDigits: digits,
            minimumFractionDigits: digits
        }).format(val);
    } catch (e) { console.error("formatNumber 오류:", e); return '-'; }
}

/** 퍼센트(Percent) 전용 포맷터 (소수점 2자리) */
function formatPercent(val) {
    if (typeof val !== 'number' || !isFinite(val)) return '-';
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'percent',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        }).format(val);
    } catch (e) { console.error("formatPercent 오류:", e); return '-'; }
}


/** 에러 메시지 표시 함수 (모든 계산기 공통 사용 가능) */
function showError(message) {
    const resultSection = document.getElementById('result-section');
    const resultDisplay = document.getElementById('result-display');
    const errorMessage = document.getElementById('error-message');
    const calcBasisContent = document.getElementById('calc-basis-content');
    const loadingSpinner = document.getElementById('loading-spinner'); // 환차익 계산기에만 있음

    if (resultSection) resultSection.style.display = 'block';
    if (resultDisplay) resultDisplay.style.display = 'none';
    if (loadingSpinner) loadingSpinner.style.display = 'none'; // 로딩 스피너 숨김
    
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
    
    if (calcBasisContent) {
        calcBasisContent.innerHTML = `<p class="placeholder error">${message}</p>`;
    }
}

/** 로딩 스피너 표시/숨김 함수 (API 호출 시 사용) */
function showLoading(isLoading) {
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');
    
    if (loadingSpinner) {
        loadingSpinner.style.display = isLoading ? 'flex' : 'none';
    }
    // 로딩 시작 시 에러 메시지 숨김
    if (errorMessage && isLoading) {
        errorMessage.style.display = 'none';
    }
}


// --- 로직 3-1: "환차익 스포터" 계산기 설정 (index.html) ---
function setupArbitrageCalculator() {
    const calculateBtn = document.getElementById('calculate-btn');
    const resultSection = document.getElementById('result-section');
    const resultDisplay = document.getElementById('result-display');
    const calcBasisContent = document.getElementById('calc-basis-content');
    const amountInput = document.getElementById('amount');
    const currencyASelect = document.getElementById('currencyA');
    const currencyBSelect = document.getElementById('currencyB');
    const currencyCSelect = document.getElementById('currencyC');

    calculateBtn.addEventListener('click', async function() {
        const amount = parseFloat(amountInput.value);
        const currencyA = currencyASelect.value;
        const currencyB = currencyBSelect.value;
        const currencyC = currencyCSelect.value;

        if (isNaN(amount) || amount <= 0) { showError("유효한 금액을 입력하세요."); return; }
        if (currencyA === currencyB || currencyA === currencyC || currencyB === currencyC) {
            showError("기준, 목표, 경유 통화는 모두 달라야 합니다."); return;
        }

        resultSection.style.display = 'block';
        resultDisplay.innerHTML = ''; 
        resultDisplay.style.display = 'none';
        showLoading(true); // 로딩 표시
        calcBasisContent.innerHTML = '<p class="placeholder">계산 중...</p>'; 

        try {
            const [rateAB, rateAC, rateCB] = await Promise.all([
                fetchRate(currencyA, currencyB), fetchRate(currencyA, currencyC), fetchRate(currencyC, currencyB)  
            ]);
            
            if (typeof rateAB !== 'number' || typeof rateAC !== 'number' || typeof rateCB !== 'number') {
                throw new Error("유효하지 않은 환율 값이 반환되었습니다.");
            }

            const path1Result = amount * rateAB; 
            const path2Step1 = amount * rateAC;  
            const path2Result = path2Step1 * rateCB; 
            const profit = path2Result - path1Result;
            
            displayArbitrageResults(amount, path1Result, path2Result, profit, currencyA, currencyB, currencyC);
            displayArbitrageBasis(amount, rateAB, rateAC, rateCB, path1Result, path2Result, currencyA, currencyB, currencyC);

        } catch (error) {
            showError("환율 정보를 가져오는 데 실패했습니다.");
            console.error("계산 실패:", error);
        } finally {
            showLoading(false); // 로딩 숨김 (성공/실패 모두)
        }
    });

    function displayArbitrageResults(amount, path1, path2, profit, curA, curB, curC) {
        resultDisplay.style.display = 'block';
        let profitClass = 'even', profitSign = '', profitText = '차익 없음';
        const profitThreshold = 0.005; 
        if (profit > profitThreshold) {
            profitClass = 'profit'; profitSign = '+'; profitText = '이득!';
        } else if (profit < -profitThreshold) {
            profitClass = 'loss'; profitSign = ''; profitText = '손해';
        }
        resultDisplay.innerHTML = `
            <div class="result-path"><strong>[경로 1: 직접 환전 (${curA} → ${curB})]</strong><p>${formatAmount(amount, curA)} = ${formatAmount(path1, curB)}</p></div><hr>
            <div class="result-path"><strong>[경로 2: 경유 환전 (${curA} → ${curC} → ${curB})]</strong><p>${formatAmount(amount, curA)} → ... → ${formatAmount(path2, curB)}</p></div><hr>
            <div class="final-result"><h3>(${curC}) 경유 시</h3><h2 class="${profitClass}">${profitSign}${formatAmount(profit, curB)} ${profitText}</h2></div>
        `;
    }
    function displayArbitrageBasis(amount, rateAB, rateAC, rateCB, path1, path2, curA, curB, curC) {
        if (!calcBasisContent) return; 
        calcBasisContent.innerHTML = `
            <h4>사용된 환율 (이론값)</h4><p>1 ${curA} ➔ ${curB}: <b>${formatRate(rateAB)}</b></p><p>1 ${curA} ➔ ${curC}: <b>${formatRate(rateAC)}</b></p><p>1 ${curC} ➔ ${curB}: <b>${formatRate(rateCB)}</b></p>
            <h4>계산 과정</h4><p><b>경로 1 (${curA}→${curB}):</b><br>${formatAmount(amount, curA, 0)} * ${formatRate(rateAB)}<br>= <b>${formatAmount(path1, curB)}</b></p>
            <p><b>경로 2 (${curA}→${curC}→${curB}):</b><br>(${formatAmount(amount, curA, 0)} * ${formatRate(rateAC)}) * ${formatRate(rateCB)}<br>= <b>${formatAmount(path2, curB)}</b></p>
        `;
    }
}


// --- 로직 3-2: "물타기" 계산기 설정 (avg-down.html) ---
function setupAvgDownCalculator() {
    const calculateBtn = document.getElementById('calculate-avg-btn');
    const resultSection = document.getElementById('result-section');
    const resultDisplay = document.getElementById('result-display');
    const calcBasisContent = document.getElementById('calc-basis-content');
    const currentSharesInput = document.getElementById('current-shares');
    const currentAvgPriceInput = document.getElementById('current-avg-price');
    const additionalSharesInput = document.getElementById('additional-shares');
    const additionalPriceInput = document.getElementById('additional-price');

    calculateBtn.addEventListener('click', () => {
        const currentShares = parseFloat(currentSharesInput.value);
        const currentAvgPrice = parseFloat(currentAvgPriceInput.value);
        const additionalShares = parseFloat(additionalSharesInput.value);
        const additionalPrice = parseFloat(additionalPriceInput.value);

        if (isNaN(currentShares) || isNaN(currentAvgPrice) || isNaN(additionalShares) || isNaN(additionalPrice)) {
            showError("모든 필드에 유효한 숫자를 입력하세요."); return;
        }
        if (currentShares < 0 || currentAvgPrice < 0 || additionalShares < 0 || additionalPrice < 0) {
            showError("0 이상의 숫자를 입력해야 합니다."); return;
        }

        const currentTotalCost = currentShares * currentAvgPrice;
        const additionalTotalCost = additionalShares * additionalPrice;
        const finalTotalCost = currentTotalCost + additionalTotalCost;
        const finalTotalShares = currentShares + additionalShares;
        const finalAvgPrice = (finalTotalShares > 0) ? (finalTotalCost / finalTotalShares) : 0;
        
        displayAvgDownResults(finalAvgPrice, finalTotalShares, finalTotalCost);
        displayAvgDownBasis(currentTotalCost, additionalTotalCost, finalTotalCost, finalTotalShares, finalAvgPrice);
    });

    function displayAvgDownResults(finalAvgPrice, finalTotalShares, finalTotalCost) {
        resultSection.style.display = 'block';
        resultDisplay.style.display = 'block';
        document.getElementById('error-message').style.display = 'none';
        resultDisplay.innerHTML = `
            <div class="final-result"><h3>최종 평균 단가</h3><h2 class="profit">${formatNumber(finalAvgPrice, 2)}</h2></div><hr>
            <div class="result-item"><span>총 보유 수량</span><strong>${formatNumber(finalTotalShares, 0)} 주</strong></div>
            <div class="result-item"><span>총 매수 금액</span><strong>${formatNumber(finalTotalCost, 0)}</strong></div>
        `;
    }
    function displayAvgDownBasis(currentCost, addCost, finalCost, finalShares, finalAvg) {
        if (!calcBasisContent) return;
        calcBasisContent.innerHTML = `
            <h4>계산 공식</h4><p>(기존 매수액 + 추가 매수액) / (기존 수량 + 추가 수량)</p>
            <h4>계산 과정</h4><p><b>총 매수 금액:</b><br>${formatNumber(currentCost, 0)} + ${formatNumber(addCost, 0)}<br>= <b>${formatNumber(finalCost, 0)}</b></p>
            <p><b>최종 평균 단가:</b><br>${formatNumber(finalCost, 0)} / ${formatNumber(finalShares, 0)} 주<br>= <b>${formatNumber(finalAvg, 2)}</b></p>
        `;
    }
}


// --- 로직 3-3: "양도소득세" 계산기 설정 (tax.html) ---
function setupTaxCalculator() {
    const calculateBtn = document.getElementById('calculate-tax-btn');
    const resultSection = document.getElementById('result-section');
    const resultDisplay = document.getElementById('result-display');
    const calcBasisContent = document.getElementById('calc-basis-content');
    const totalProfitInput = document.getElementById('total-profit');
    const totalLossInput = document.getElementById('total-loss');
    const basicDeductionInput = document.getElementById('basic-deduction');
    const taxRateInput = document.getElementById('tax-rate');

    calculateBtn.addEventListener('click', () => {
        const totalProfit = parseFloat(totalProfitInput.value);
        const totalLoss = parseFloat(totalLossInput.value) || 0; 
        const basicDeduction = parseFloat(basicDeductionInput.value) || 0;
        const taxRate = parseFloat(taxRateInput.value) || 0;

        if (isNaN(totalProfit)) { showError("총 매도 수익을 숫자로 입력하세요."); return; }
        if (isNaN(totalLoss) || totalLoss < 0) { showError("총 매도 손실은 0 이상의 숫자여야 합니다."); return; }
        if (totalProfit < 0) { showError("총 매도 수익은 0 이상의 숫자여야 합니다."); return; }

        const taxableIncome = Math.max(0, (totalProfit - totalLoss - basicDeduction));
        const finalTax = taxableIncome * (taxRate / 100);
        const netProfit = (totalProfit - totalLoss) - finalTax;

        displayTaxResults(taxableIncome, finalTax, netProfit);
        displayTaxBasis(totalProfit, totalLoss, basicDeduction, taxRate, taxableIncome, finalTax);
    });

    function displayTaxResults(taxableIncome, finalTax, netProfit) {
        resultSection.style.display = 'block';
        resultDisplay.style.display = 'block';
        document.getElementById('error-message').style.display = 'none';
        resultDisplay.innerHTML = `
            <div class="final-result"><h3>예상 양도소득세 (22%)</h3><h2 class="loss">${formatKRW(finalTax)}</h2></div><hr>
            <div class="result-item"><span>과세 표준</span><strong>${formatKRW(taxableIncome)}</strong></div>
            <div class="result-item"><span>세후 실수령액</span><strong class="profit">${formatKRW(netProfit)}</strong></div>
        `;
    }
    function displayTaxBasis(profit, loss, deduction, rate, taxable, tax) {
        if (!calcBasisContent) return;
        calcBasisContent.innerHTML = `
            <h4>과세 표준 계산</h4><p>(총 수익 - 총 손실 - 기본 공제)</p><p>${formatKRW(profit)} - ${formatKRW(loss)} - ${formatKRW(deduction)}<br>= <b>${formatKRW(taxable)}</b></p>
            <h4>최종 세금 계산</h4><p>(과세 표준 * 세율)</p><p>${formatKRW(taxable)} * ${rate}%<br>= <b>${formatKRW(tax)}</b></p>
        `;
    }
}


// --- (NEW) 로직 3-4: "배당률" 계산기 설정 (dividend.html) ---
function setupDividendCalculator() {
    const calculateBtn = document.getElementById('calculate-dividend-btn');
    const resultSection = document.getElementById('result-section');
    const resultDisplay = document.getElementById('result-display');
    const calcBasisContent = document.getElementById('calc-basis-content');
    const currentPriceInput = document.getElementById('current-price');
    const annualDividendInput = document.getElementById('annual-dividend');

    calculateBtn.addEventListener('click', () => {
        const currentPrice = parseFloat(currentPriceInput.value);
        const annualDividend = parseFloat(annualDividendInput.value);

        if (isNaN(currentPrice) || isNaN(annualDividend)) {
            showError("모든 필드에 유효한 숫자를 입력하세요."); return;
        }
        if (currentPrice <= 0) {
            showError("현재 주가는 0보다 커야 합니다."); return;
        }
        if (annualDividend < 0) {
            showError("배당금은 0 이상이어야 합니다."); return;
        }

        // 배당률 계산 (0 나누기 방지)
        const dividendYield = (currentPrice > 0) ? (annualDividend / currentPrice) : 0; 

        displayDividendResults(dividendYield);
        displayDividendBasis(currentPrice, annualDividend, dividendYield);
    });

    function displayDividendResults(dividendYield) {
        resultSection.style.display = 'block';
        resultDisplay.style.display = 'block';
        document.getElementById('error-message').style.display = 'none';
        resultDisplay.innerHTML = `
            <div class="final-result">
                <h3>현재 (세전) 배당수익률</h3>
                <h2 class="profit">${formatPercent(dividendYield)}</h2>
            </div>
        `;
    }

    function displayDividendBasis(price, dividend, yieldVal) {
        if (!calcBasisContent) return;
        calcBasisContent.innerHTML = `
            <h4>계산 공식</h4>
            <p>(1주당 연간 배당금 / 현재 주가)</p>
            <h4>계산 과정</h4>
            <p>${formatNumber(dividend, 2)} / ${formatNumber(price, 2)}<br>
               = ${formatNumber(yieldVal, 4)}<br>
               = <b>${formatPercent(yieldVal)}</b>
            </p>
        `;
    }
}


// --- (이후 로직 3-5, 3-6, 3-7 등이 추가될 위치) ---