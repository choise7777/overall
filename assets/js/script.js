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
    // 각 페이지의 고유한 버튼 ID를 확인하여 해당 JS 로직만 실행합니다.
    if (document.getElementById('calculate-btn')) {
        setupArbitrageCalculator(); // "환차익 스포터" (index.html)
    }
    // (이후 다른 계산기 버튼 ID가 추가될 위치)
    // if (document.getElementById('calculate-avg-btn')) {
    //     setupAvgDownCalculator(); // "물타기" (avg-down.html)
    // }
});

// --- 0. 공통으로 사용할 DOM 요소 미리 찾아두기 (전역) ---
// (이전 오류를 방지하기 위해 각 setup 함수 내에서 찾는 것으로 변경)

/**
 * 로직 1: 반응형 메뉴 토글 (햄버거 버튼)
 */
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

/**
 * 로직 2: 왼쪽 패널 (실시간 주요 환율 로드)
 */
async function loadLiveRates() {
    const listElement = document.getElementById('live-rates-list');
    const loadingElement = document.getElementById('loading-rates');
    
    if (!listElement || !loadingElement) return; // 해당 요소가 없는 페이지면 중단

    const targetCurrencies = 'USD,JPY,EUR,CNY,GBP,AUD';

    try {
        const response = await fetch(`https://api.frankfurter.app/latest?from=KRW&to=${targetCurrencies}`);
        if (!response.ok) throw new Error('실시간 환율 API 호출 실패');
        
        const data = await response.json();
        const rates = data.rates;
        
        loadingElement.remove(); // 로딩 메시지 제거
        
        Object.entries(rates).forEach(([currency, rate]) => {
            // API 결과(1 KRW = X USD)를 1 USD = Y KRW로 변환
            let displayRate = 1 / rate;
            let displayCurrency = currency;
            let flag = getFlagEmoji(currency); // 국기 이모지

            // JPY(엔화)는 100엔 기준으로 변경
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

// 간단한 통화별 국기 이모지 반환 함수
function getFlagEmoji(currency) {
    const flags = {
        'USD': '🇺🇸', 'JPY': '🇯🇵', 'EUR': '🇪🇺',
        'CNY': '🇨🇳', 'GBP': '🇬🇧', 'AUD': '🇦🇺',
        'KRW': '🇰🇷'
    };
    return flags[currency] || '🏳️';
}

/**
 * 로직 3-1: "환차익 스포터" 계산기 설정 (index.html)
 */
function setupArbitrageCalculator() {
    // 이 계산기에서만 사용할 DOM 요소들
    const calculateBtn = document.getElementById('calculate-btn');
    const resultSection = document.getElementById('result-section');
    const resultDisplay = document.getElementById('result-display');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');
    const calcBasisContent = document.getElementById('calc-basis-content');

    const amountInput = document.getElementById('amount');
    const currencyASelect = document.getElementById('currencyA');
    const currencyBSelect = document.getElementById('currencyB');
    const currencyCSelect = document.getElementById('currencyC');

    // 메인 이벤트 리스너 (계산 버튼 클릭 시)
    calculateBtn.addEventListener('click', async function() {
    const amount = parseFloat(amountInput.value.replace(/,/g, ''));
        const currencyA = currencyASelect.value;
        const currencyB = currencyBSelect.value;
        const currencyC = currencyCSelect.value;

        // 유효성 검사
        if (isNaN(amount) || amount <= 0) {
            showError("유효한 금액을 입력하세요.");
            return;
        }
        if (currencyA === currencyB || currencyA === currencyC || currencyB === currencyC) {
            showError("기준, 목표, 경유 통화는 모두 달라야 합니다.");
            return;
        }

        // UI 초기화 (로딩 스피너)
        resultSection.style.display = 'block';
        resultDisplay.innerHTML = ''; 
        resultDisplay.style.display = 'none';
        errorMessage.style.display = 'none';
        loadingSpinner.style.display = 'flex';
        calcBasisContent.innerHTML = '<p class="placeholder">계산 중...</p>'; 

        try {
            // 3개 환율 API로 가져오기 (병렬)
            const [rateAB, rateAC, rateCB] = await Promise.all([
                    fetchRate(currencyA, currencyB), // A -> B
                    fetchRate(currencyA, currencyC), // A -> C
                    fetchRate(currencyC, currencyB)  // C -> B
            ]);

            // 환차익 계산
            const path1Result = amount * rateAB; // 경로 1: A -> B
            const path2Step1 = amount * rateAC;  // 경로 2 (1단계): A -> C
            const path2Result = path2Step1 * rateCB; // 경로 2 (2단계): C -> B
            const profit = path2Result - path1Result;
            
            // 중앙 패널 (결과) 표시
            displayArbitrageResults(amount, path1Result, path2Result, profit, currencyA, currencyB, currencyC);
            
            // 오른쪽 패널 (계산 근거) 표시
            displayArbitrageBasis(amount, rateAB, rateAC, rateCB, path1Result, path2Result, currencyA, currencyB, currencyC);

        } catch (error) {
            // API 호출 실패 등 에러 발생 시
            showError("환율 정보를 가져오는 데 실패했습니다.");
            console.error("계산 실패:", error);
        }
    });

    // --- "환차익" 전용 함수들 ---

    // API 호출 전용 함수
            async function fetchRate(from, to) {
                if (from === to) return 1;
                const apiKey = document.getElementById('api-key-input')?.value || '';
                let url = `https://api.frankfurter.app/latest?from=${from}&to=${to}`;
                // API Key가 필요하다면 헤더나 쿼리스트링에 추가
                if (apiKey) {
                    url += `&apikey=${encodeURIComponent(apiKey)}`;
                }
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`API 응답 실패: ${from} to ${to}`);
                }
                const data = await response.json();
                if (!data.rates || data.rates[to] === undefined) {
                    throw new Error(`환율 정보를 찾을 수 없음: ${from} to ${to}`);
                }
                return data.rates[to];
            }
        const apiKey = document.getElementById('api-key-input')?.value || '';
        let url = `https://api.frankfurter.app/latest?from=${from}&to=${to}`;
        // API Key가 필요하다면 헤더나 쿼리스트링에 추가
        if (apiKey) {
            url += `&apikey=${encodeURIComponent(apiKey)}`;
        }
        return fetch(url)
            .then(res => res.json())
            .then(data => {
                if (!data.rates || !data.rates[to]) throw new Error('환율 데이터 오류');
                return data.rates[to];
            });
    }
    }

    // 중앙 패널 (결과) HTML 생성
    function displayArbitrageResults(amount, path1, path2, profit, curA, curB, curC) {
        loadingSpinner.style.display = 'none';
        errorMessage.style.display = 'none';
        resultDisplay.style.display = 'block';
        
        let profitClass = 'even', profitSign = '', profitText = '차익 없음';

        if (profit > 0.005) { // 0.005 (0.5 센트) 이상 차이
            profitClass = 'profit'; profitSign = '+'; profitText = '이득!';
        } else if (profit < -0.005) {
            profitClass = 'loss'; profitSign = ''; profitText = '손해';
        }

        resultDisplay.innerHTML = `
            <div class="result-path">
                <strong>[경로 1: 직접 환전 (${curA} → ${curB})]</strong>
                <p>${formatAmount(amount, curA)} = ${formatAmount(path1, curB)}</p>
            </div><hr>
            <div class="result-path">
                <strong>[경로 2: 경유 환전 (${curA} → ${curC} → ${curB})]</strong>
                <p>${formatAmount(amount, curA)} → ... → ${formatAmount(path2, curB)}</p>
            </div><hr>
            <div class="final-result">
                <h3>(${curC}) 경유 시</h3>
                <h2 class="${profitClass}">
                    ${profitSign}${formatAmount(profit, curB)} ${profitText}
                </h2>
            </div>
        `;
    }

    // 오른쪽 패널 (계산 근거) HTML 생성
    function displayArbitrageBasis(amount, rateAB, rateAC, rateCB, path1, path2, curA, curB, curC) {
        calcBasisContent.innerHTML = `
            <h4>사용된 환율 (이론값)</h4>
            <p>1 ${curA} ➔ ${curB}: <b>${formatRate(rateAB)}</b></p>
            <p>1 ${curA} ➔ ${curC}: <b>${formatRate(rateAC)}</b></p>
            <p>1 ${curC} ➔ ${curB}: <b>${formatRate(rateCB)}</b></p>
            
            <h4>계산 과정</h4>
            <p><b>경로 1 (${curA}→${curB}):</b><br>
               ${formatAmount(amount, curA, 0)} * ${formatRate(rateAB)}<br>
               = <b>${formatAmount(path1, curB)}</b>
            </p>
            <p><b>경로 2 (${curA}→${curC}→${curB}):</b><br>
               (${formatAmount(amount, curA, 0)} * ${formatRate(rateAC)}) * ${formatRate(rateCB)}<br>
               = <b>${formatAmount(path2, curB)}</b>
            </p>
        `;
    }

    // 에러 메시지 표시 함수 (이 계산기 전용)
    function showError(message) {
        loadingSpinner.style.display = 'none';
        resultDisplay.style.display = 'none';
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        calcBasisContent.innerHTML = `<p class="placeholder error">${message}</p>`;
    }
}

// --- (이후 로직 3-2, 3-3 등이 추가될 위치) ---


// --- 공통 헬퍼(Helper) 함수들 ---

/**
 * (수정) 숫자 포맷팅 통합 함수
 * (val: 숫자, currency: 'KRW', 'USD' 등, digits: 소수점 자릿수)
 */
function formatAmount(val, currency, digits = 2) {
    // KRW(원)일 경우 무조건 소수점 0자리
    if (currency === 'KRW') {
        digits = 0;
    }
    
    // 'ko-KR'은 천단위 콤마(,)를 사용
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: digits,
        minimumFractionDigits: digits
    }).format(val);
}

// (수정) 원화(KRW) 전용 포맷터 (콤마 O, 소수점 X, '원' 기호 O)
function formatKRW(val) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
        minimumFractionDigits: 0
    }).format(val);
}

// (수정) 환율(Rate) 전용 포맷터 (콤마 O, 소수점 8자리)
function formatRate(val) {
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 8,
        minimumFractionDigits: 2
    }).format(val);
}