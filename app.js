// ===================================================
// 상수 (Magic Number 제거)
// ===================================================
const FEEDBACK_DISPLAY_MS = 2000;
const TIMER_END_DELAY_MS = 500;
const BEEP_FREQUENCY_HZ = 880;
const BEEP_VOLUME = 0.3;
const BEEP_DURATION_SEC = 0.15;
const BEEP_SECOND_DELAY_SEC = 0.2;

// ===================================================
// 기본 운동 플랜 데이터 (수정 불가)
// ===================================================
const DEFAULT_PLANS = {
  A: {
    name: 'A 플랜',
    exercises: [
      { name: '불가리안 스플릿 스쿼트', sets: 4, reps: 10, restSeconds: 90 },
      { name: '푸시업', sets: 4, reps: 12, restSeconds: 75 },
      { name: '턱걸이', sets: 3, reps: 6, restSeconds: 90 }
    ]
  },
  B: {
    name: 'B 플랜',
    exercises: [
      { name: '턱걸이', sets: 5, reps: 6, restSeconds: 120 },
      { name: '푸시업', sets: 3, reps: 12, restSeconds: 60 },
      { name: '불가리안 스플릿 스쿼트', sets: 3, reps: 10, restSeconds: 90 }
    ]
  }
};

// 기본 + 커스텀 플랜을 합친 활성 플랜 목록
let activePlans = {};

// 활성 플랜 목록 재로드 (기본 + 커스텀 병합)
function reloadActivePlans() {
  activePlans = { ...DEFAULT_PLANS, ...DataManager.loadCustomPlans() };
}

// ===================================================
// 공통 유틸리티 함수
// ===================================================

/**
 * 요소를 잠시 표시했다가 자동으로 숨깁니다.
 * @param {string} elementId - 대상 요소의 ID
 * @param {number} duration - 표시 시간(ms), 기본값 FEEDBACK_DISPLAY_MS
 */
function showTemporaryElement(elementId, duration = FEEDBACK_DISPLAY_MS) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.style.display = 'block';
  setTimeout(() => { element.style.display = 'none'; }, duration);
}

/**
 * 버튼 텍스트를 임시로 변경했다가 원래 텍스트로 복원합니다.
 * @param {HTMLElement} buttonElement - 대상 버튼 요소
 * @param {string} temporaryText - 임시 표시 텍스트
 * @param {string} originalText - 복원할 원래 텍스트
 * @param {number} duration - 임시 표시 시간(ms), 기본값 FEEDBACK_DISPLAY_MS
 */
function flashButtonText(buttonElement, temporaryText, originalText, duration = FEEDBACK_DISPLAY_MS) {
  buttonElement.textContent = temporaryText;
  setTimeout(() => { buttonElement.textContent = originalText; }, duration);
}

/**
 * 운동 기록 요약 HTML(운동 기록/커스텀 플랜/체중 기록 건수)을 생성합니다.
 * @param {Object} data - exportAll()이 반환하는 데이터 객체
 * @param {string} cssPrefix - 'export' 또는 'import'
 * @returns {string} HTML 문자열
 */
function buildDataSummaryHTML(data, cssPrefix) {
  const summaryItems = [
    { label: '운동 기록', count: Object.keys(data.workoutRecords || {}).length },
    { label: '커스텀 플랜', count: Object.keys(data.customPlans || {}).length },
    { label: '체중 기록', count: Object.keys(data.weightRecords || {}).length },
  ];
  return summaryItems.map(({ label, count }) =>
    `<div class="${cssPrefix}-summary-item">
       <span>${label}</span>
       <span class="${cssPrefix}-count">${count}개</span>
     </div>`
  ).join('');
}

// ===================================================
// 화면/오버레이 전환 함수
// ===================================================
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) targetScreen.classList.add('active');
}

function showOverlay(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (overlay) overlay.classList.add('active');
}

function hideOverlay(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (overlay) overlay.classList.remove('active');
}

// ===================================================
// 데이터 관리 모듈
// ===================================================
const DataManager = {
  RECORDS_KEY: 'workoutRecords',
  IN_PROGRESS_KEY: 'workoutInProgress',
  CUSTOM_PLANS_KEY: 'customPlans',
  WEIGHT_KEY: 'weightRecords',

  loadRecords() {
    try {
      const data = localStorage.getItem(this.RECORDS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveRecords(records) {
    localStorage.setItem(this.RECORDS_KEY, JSON.stringify(records));
  },

  getRecord(dateStr) {
    const records = this.loadRecords();
    return records[dateStr] || null;
  },

  saveRecord(dateStr, record) {
    const records = this.loadRecords();
    records[dateStr] = record;
    this.saveRecords(records);
  },

  // 기록 삭제
  deleteRecord(dateStr) {
    const records = this.loadRecords();
    delete records[dateStr];
    this.saveRecords(records);
  },

  // 진행 중인 운동 저장 (페이지 새로고침 대비)
  saveInProgress(state) {
    localStorage.setItem(this.IN_PROGRESS_KEY, JSON.stringify(state));
  },

  loadInProgress() {
    try {
      const data = localStorage.getItem(this.IN_PROGRESS_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  clearInProgress() {
    localStorage.removeItem(this.IN_PROGRESS_KEY);
  },

  // 커스텀 플랜 관리
  loadCustomPlans() {
    try {
      const data = localStorage.getItem(this.CUSTOM_PLANS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveCustomPlans(plans) {
    localStorage.setItem(this.CUSTOM_PLANS_KEY, JSON.stringify(plans));
  },

  addCustomPlan(key, plan) {
    const plans = this.loadCustomPlans();
    plans[key] = plan;
    this.saveCustomPlans(plans);
    reloadActivePlans();
  },

  deleteCustomPlan(key) {
    const plans = this.loadCustomPlans();
    delete plans[key];
    this.saveCustomPlans(plans);
    reloadActivePlans();
  },

  // 체중 기록 관리
  loadWeightRecords() {
    try {
      const data = localStorage.getItem(this.WEIGHT_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveWeightRecord(dateStr, weight) {
    const records = this.loadWeightRecords();
    records[dateStr] = weight;
    localStorage.setItem(this.WEIGHT_KEY, JSON.stringify(records));
  },

  getWeight(dateStr) {
    const records = this.loadWeightRecords();
    return records[dateStr] !== undefined ? records[dateStr] : null;
  },

  deleteWeight(dateStr) {
    const records = this.loadWeightRecords();
    delete records[dateStr];
    localStorage.setItem(this.WEIGHT_KEY, JSON.stringify(records));
  },

  // 전체 데이터 내보내기
  exportAll() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      workoutRecords: this.loadRecords(),
      customPlans: this.loadCustomPlans(),
      weightRecords: this.loadWeightRecords()
    };
  },

  // 전체 데이터 가져오기 (덮어쓰기)
  importAll(data) {
    if (data.workoutRecords && typeof data.workoutRecords === 'object') {
      this.saveRecords(data.workoutRecords);
    }
    if (data.customPlans && typeof data.customPlans === 'object') {
      this.saveCustomPlans(data.customPlans);
    }
    if (data.weightRecords && typeof data.weightRecords === 'object') {
      localStorage.setItem(this.WEIGHT_KEY, JSON.stringify(data.weightRecords));
    }
    reloadActivePlans();
  }
};

// ===================================================
// 내보내기/가져오기 모듈
// ===================================================
const ExportImport = {
  pendingImportData: null,

  init() {
    // 내보내기 버튼
    document.getElementById('export-btn').addEventListener('click', () => {
      this.showExportModal();
    });

    // 내보내기 모달 - 파일 저장
    document.getElementById('export-file-btn').addEventListener('click', () => {
      this.exportAsFile();
    });

    // 내보내기 모달 - 클립보드 복사
    document.getElementById('export-clipboard-btn').addEventListener('click', () => {
      this.exportToClipboard();
    });

    // 내보내기 모달 - 닫기
    document.getElementById('export-close-btn').addEventListener('click', () => {
      hideOverlay('export-modal');
    });

    // 가져오기 버튼
    document.getElementById('import-btn').addEventListener('click', () => {
      document.getElementById('import-file-input').click();
    });

    // 파일 선택 시
    document.getElementById('import-file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleFileImport(file);
      // 같은 파일 재선택 가능하도록 초기화
      e.target.value = '';
    });

    // 가져오기 확인
    document.getElementById('import-confirm-btn').addEventListener('click', () => {
      this.confirmImport();
    });

    // 가져오기 취소
    document.getElementById('import-cancel-btn').addEventListener('click', () => {
      hideOverlay('import-confirm-modal');
      this.pendingImportData = null;
    });

    // 가져오기 에러 닫기
    document.getElementById('import-error-close-btn').addEventListener('click', () => {
      hideOverlay('import-error-modal');
    });
  },

  // 내보내기 모달 표시
  showExportModal() {
    const data = DataManager.exportAll();
    document.getElementById('export-summary').innerHTML = buildDataSummaryHTML(data, 'export');
    // 클립보드 버튼 텍스트 초기화
    document.getElementById('export-clipboard-btn').textContent = '📋 클립보드 복사';
    showOverlay('export-modal');
  },

  // 파일 다운로드
  exportAsFile() {
    const data = DataManager.exportAll();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const today = new Date().toISOString().slice(0, 10);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = `운동기록_${today}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);
  },

  // 클립보드 복사 (Clipboard API → execCommand fallback)
  async exportToClipboard() {
    const data = DataManager.exportAll();
    const json = JSON.stringify(data, null, 2);
    const clipboardButton = document.getElementById('export-clipboard-btn');

    const copySucceeded = await this.copyTextToClipboard(json);
    if (copySucceeded) {
      flashButtonText(clipboardButton, '✅ 복사 완료!', '📋 클립보드 복사');
    } else {
      flashButtonText(clipboardButton, '❌ 복사 실패', '📋 클립보드 복사');
    }
  },

  // Clipboard API 시도 후 실패 시 execCommand fallback
  async copyTextToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return this.fallbackCopyToClipboard(text);
    }
  },

  // execCommand 방식 클립보드 복사 (구형 환경 대응)
  fallbackCopyToClipboard(text) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  },

  // 파일 가져오기 처리
  handleFileImport(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const validationResult = this.validate(data);

        if (!validationResult.valid) {
          this.showImportError(validationResult.message);
          return;
        }

        this.pendingImportData = data;
        this.showImportConfirmModal(data);
      } catch {
        this.showImportError('JSON 파싱에 실패했습니다. 올바른 JSON 파일인지 확인해주세요.');
      }
    };

    reader.onerror = () => {
      this.showImportError('파일을 읽을 수 없습니다.');
    };

    reader.readAsText(file);
  },

  // 가져오기 에러 모달 표시
  showImportError(message) {
    document.getElementById('import-error-message').textContent = message;
    showOverlay('import-error-modal');
  },

  // 유효성 검증
  validate(data) {
    if (!data || typeof data !== 'object') {
      return { valid: false, message: '올바른 형식이 아닙니다.' };
    }
    if (typeof data.version === 'undefined') {
      return { valid: false, message: 'version 필드가 없습니다. 이 앱에서 내보낸 파일인지 확인해주세요.' };
    }
    if (!data.workoutRecords || typeof data.workoutRecords !== 'object') {
      return { valid: false, message: 'workoutRecords 데이터가 올바르지 않습니다.' };
    }
    // customPlans는 없어도 허용 (빈 객체로 처리)
    if (data.customPlans && typeof data.customPlans !== 'object') {
      return { valid: false, message: 'customPlans 데이터가 올바르지 않습니다.' };
    }
    // weightRecords는 없어도 허용 (빈 객체로 처리)
    if (data.weightRecords && typeof data.weightRecords !== 'object') {
      return { valid: false, message: 'weightRecords 데이터가 올바르지 않습니다.' };
    }
    return { valid: true };
  },

  // 가져오기 확인 모달 표시
  showImportConfirmModal(data) {
    document.getElementById('import-summary').innerHTML = buildDataSummaryHTML(data, 'import');
    showOverlay('import-confirm-modal');
  },

  // 가져오기 실행
  confirmImport() {
    if (!this.pendingImportData) return;

    // customPlans가 없으면 빈 객체로 보정
    if (!this.pendingImportData.customPlans) {
      this.pendingImportData.customPlans = {};
    }

    DataManager.importAll(this.pendingImportData);
    this.pendingImportData = null;

    hideOverlay('import-confirm-modal');

    // 화면 갱신
    PlanManager.render();
    Calendar.render();
    WeightTracker.loadTodayWeight();

    // 완료 피드백
    const importButton = document.getElementById('import-btn');
    flashButtonText(importButton, '✅ 가져오기 완료!', '📥 가져오기');
  }
};

// ===================================================
// 사운드 모듈 (Web Audio API)
// ===================================================
const Sound = {
  audioContext: null,

  getContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  },

  playBeep() {
    try {
      const audioContext = this.getContext();
      // 두 번 짧게 비프음
      [0, BEEP_SECOND_DELAY_SEC].forEach(startDelay => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = BEEP_FREQUENCY_HZ;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(BEEP_VOLUME, audioContext.currentTime + startDelay);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + startDelay + BEEP_DURATION_SEC);
        oscillator.start(audioContext.currentTime + startDelay);
        oscillator.stop(audioContext.currentTime + startDelay + BEEP_DURATION_SEC);
      });
    } catch {
      // Web Audio API 미지원 시 무시
    }
  },

  // 유저 인터랙션으로 AudioContext 초기화 (iOS 등 필요)
  unlock() {
    try {
      const audioContext = this.getContext();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    } catch {
      // 무시
    }
  }
};

// ===================================================
// 캘린더 모듈
// ===================================================
const Calendar = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(), // 0-indexed

  init() {
    document.getElementById('prev-month-btn').addEventListener('click', () => {
      this.changeMonth(-1);
    });
    document.getElementById('next-month-btn').addEventListener('click', () => {
      this.changeMonth(1);
    });
    this.render();
  },

  changeMonth(delta) {
    this.currentMonth += delta;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.render();
  },

  render() {
    const year = this.currentYear;
    const month = this.currentMonth;

    // 월/년 표시
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월',
      '7월', '8월', '9월', '10월', '11월', '12월'];
    document.getElementById('calendar-month-year').textContent = `${year}년 ${monthNames[month]}`;

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=일요일
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const todayStr = this.formatDate(new Date());
    const workoutRecords = DataManager.loadRecords();

    // 이전 달 빈 칸
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      grid.appendChild(this.createCell(day, true, '', null));
    }

    // 현재 달
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = this.formatDate(new Date(year, month, day));
      const isToday = dateStr === todayStr;
      const workoutRecord = workoutRecords[dateStr];
      const cell = this.createCell(day, false, dateStr, workoutRecord);
      if (isToday) cell.classList.add('today');
      grid.appendChild(cell);
    }

    // 다음 달 빈 칸 (6행 채우기)
    const totalCells = grid.children.length;
    const remainingCells = (Math.ceil(totalCells / 7) * 7) - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
      grid.appendChild(this.createCell(i, true, '', null));
    }
  },

  createCell(day, isOtherMonth, dateStr, workoutRecord) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    if (isOtherMonth) cell.classList.add('other-month');

    const dayLabel = document.createElement('span');
    dayLabel.className = 'day-number';
    dayLabel.textContent = day;
    cell.appendChild(dayLabel);

    this.appendWorkoutDot(cell, workoutRecord);

    // 클릭 이벤트 (현재 달만)
    if (!isOtherMonth && dateStr) {
      cell.addEventListener('click', () => {
        Sound.unlock(); // iOS AudioContext 활성화
        DayDetail.show(dateStr);
      });
    }

    return cell;
  },

  // 운동 기록 dot 표시 (가드 클로즈 적용)
  appendWorkoutDot(cell, workoutRecord) {
    if (!workoutRecord?.plan) return;

    const dot = document.createElement('span');
    const planLower = workoutRecord.plan.toLowerCase();
    const isDefaultPlan = planLower === 'a' || planLower === 'b';
    dot.className = isDefaultPlan
      ? `workout-dot plan-${planLower}`
      : 'workout-dot plan-custom';
    cell.appendChild(dot);
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

// ===================================================
// 날짜 상세 모듈
// ===================================================
const DayDetail = {
  selectedDate: null,
  pendingPlan: null,

  init() {
    document.getElementById('day-detail-back').addEventListener('click', () => {
      showScreen('calendar-view');
      Calendar.render();
    });

    // 기록 삭제 모달 이벤트
    document.getElementById('delete-record-cancel').addEventListener('click', () => {
      hideOverlay('delete-record-modal');
    });

    document.getElementById('delete-record-confirm').addEventListener('click', () => {
      hideOverlay('delete-record-modal');
      if (!this.selectedDate) return;
      DataManager.deleteRecord(this.selectedDate);
      this.show(this.selectedDate); // 화면 갱신
    });

    // 덮어쓰기 모달 이벤트 (DayDetail 모듈 내로 이동)
    document.getElementById('overwrite-cancel').addEventListener('click', () => {
      hideOverlay('overwrite-modal');
    });

    document.getElementById('overwrite-confirm').addEventListener('click', () => {
      hideOverlay('overwrite-modal');
      if (!this.pendingPlan) return;
      WorkoutSession.start(this.selectedDate, this.pendingPlan);
      this.pendingPlan = null;
    });
  },

  show(dateStr) {
    this.selectedDate = dateStr;

    this.renderDateTitle(dateStr);
    this.renderWorkoutRecord(dateStr);
    WeightTracker.showDayWeight(dateStr);
    this.renderPlanButtons();

    showScreen('day-detail-view');
  },

  // 날짜 헤더 텍스트 렌더링
  renderDateTitle(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const displayDate = `${date.getMonth() + 1}월 ${date.getDate()}일 (${dayNames[date.getDay()]})`;
    document.getElementById('day-detail-date').textContent = displayDate;
  },

  // 기존 운동 기록 표시
  renderWorkoutRecord(dateStr) {
    const recordsContainer = document.getElementById('day-detail-records');
    const workoutRecord = DataManager.getRecord(dateStr);

    if (workoutRecord) {
      recordsContainer.innerHTML = this.buildRecordSummaryHTML(workoutRecord);
    } else {
      recordsContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px 0;">기록이 없습니다</p>';
    }
  },

  // 플랜 선택 버튼 동적 생성
  renderPlanButtons() {
    const container = document.getElementById('plan-selection');
    container.innerHTML = '';

    Object.keys(activePlans).forEach(planKey => {
      const plan = activePlans[planKey];
      const button = document.createElement('button');
      button.className = 'plan-btn';
      button.classList.add(this.getPlanButtonClass(planKey));
      button.textContent = `${plan.name} 시작`;
      button.addEventListener('click', () => this.startPlan(planKey));
      container.appendChild(button);
    });
  },

  // 플랜 키에 맞는 버튼 CSS 클래스 반환
  getPlanButtonClass(planKey) {
    if (planKey === 'A') return 'plan-a';
    if (planKey === 'B') return 'plan-b';
    return 'plan-custom-btn';
  },

  // 운동 기록 요약 HTML 빌드
  buildRecordSummaryHTML(workoutRecord) {
    const plan = activePlans[workoutRecord.plan];
    const planName = plan ? plan.name : workoutRecord.plan + ' 플랜';
    const completionIcon = workoutRecord.completed ? '✅' : '⏳';

    const exerciseRows = workoutRecord.exercises.map(exercise => {
      const setBadges = exercise.sets.map((set, index) => {
        const statusClass = set.success ? 'success' : 'fail';
        const statusIcon = set.success ? '✓' : '✗';
        return `<span class="record-set-badge ${statusClass}">${index + 1}세트 ${set.actualReps}회 ${statusIcon}</span>`;
      }).join('');

      return `<div class="record-exercise">
        <div class="record-exercise-name">${exercise.name}</div>
        <div class="record-sets">${setBadges}</div>
      </div>`;
    }).join('');

    return `<div class="record-summary">
      <div class="record-summary-header">
        <h4>${planName} ${completionIcon}</h4>
        <button class="record-delete-btn" onclick="DayDetail.confirmDeleteRecord()">삭제</button>
      </div>
      ${exerciseRows}
    </div>`;
  },

  confirmDeleteRecord() {
    showOverlay('delete-record-modal');
  },

  startPlan(planKey) {
    const existingRecord = DataManager.getRecord(this.selectedDate);
    if (existingRecord) {
      // 기존 기록 덮어쓰기 확인
      this.pendingPlan = planKey;
      showOverlay('overwrite-modal');
    } else {
      WorkoutSession.start(this.selectedDate, planKey);
    }
  }
};

// ===================================================
// 운동 세션 모듈
// ===================================================
const WorkoutSession = {
  date: null,
  planKey: null,
  plan: null,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  workoutRecord: null, // 현재 운동 기록
  timerInterval: null,

  start(dateStr, planKey) {
    this.date = dateStr;
    this.planKey = planKey;
    this.plan = activePlans[planKey];
    this.currentExerciseIndex = 0;
    this.currentSetIndex = 0;

    // 기록 초기화
    this.workoutRecord = {
      plan: planKey,
      exercises: this.plan.exercises.map(exercise => ({
        name: exercise.name,
        sets: [],
        targetReps: exercise.reps, // 현재 목표 횟수 (실패 시 조정됨)
        completed: false
      })),
      completed: false
    };

    this.saveProgress();
    this.displayWorkoutScreen();
  },

  // 페이지 리프레시 후 복원
  restore(savedState) {
    this.date = savedState.date;
    this.planKey = savedState.planKey;
    this.plan = activePlans[savedState.planKey];
    this.currentExerciseIndex = savedState.currentExerciseIndex;
    this.currentSetIndex = savedState.currentSetIndex;
    this.workoutRecord = savedState.record;

    this.displayWorkoutScreen();
  },

  // 운동 화면 표시 (공통)
  displayWorkoutScreen() {
    document.getElementById('workout-plan-name').textContent = this.plan.name;
    showScreen('workout-view');
    this.renderCurrentSet();
  },

  saveProgress() {
    DataManager.saveInProgress({
      date: this.date,
      planKey: this.planKey,
      currentExerciseIndex: this.currentExerciseIndex,
      currentSetIndex: this.currentSetIndex,
      record: this.workoutRecord
    });
  },

  getCurrentExercisePlan() {
    return this.plan.exercises[this.currentExerciseIndex];
  },

  getCurrentRecordExercise() {
    return this.workoutRecord.exercises[this.currentExerciseIndex];
  },

  renderCurrentSet() {
    const exercisePlan = this.getCurrentExercisePlan();
    const exerciseRecord = this.getCurrentRecordExercise();

    document.getElementById('current-exercise-name').textContent = exercisePlan.name;
    document.getElementById('current-set-number').textContent = this.currentSetIndex + 1;
    document.getElementById('total-sets').textContent = exercisePlan.sets;
    document.getElementById('target-reps').textContent = exerciseRecord.targetReps;

    this.renderExerciseProgress();
    this.renderSetHistory();
  },

  renderExerciseProgress() {
    const container = document.getElementById('exercise-progress');
    container.innerHTML = '';

    this.plan.exercises.forEach((_, exerciseIndex) => {
      const dot = document.createElement('div');
      dot.className = 'exercise-dot';
      if (exerciseIndex < this.currentExerciseIndex) dot.classList.add('completed');
      if (exerciseIndex === this.currentExerciseIndex) dot.classList.add('current');
      container.appendChild(dot);
    });
  },

  renderSetHistory() {
    const container = document.getElementById('set-history');
    container.innerHTML = '';

    const exerciseRecord = this.getCurrentRecordExercise();
    exerciseRecord.sets.forEach((set, index) => {
      const item = document.createElement('div');
      item.className = 'set-history-item';
      item.innerHTML = `
        <span class="set-label-text">${index + 1}세트</span>
        <span class="set-result ${set.success ? 'success' : 'fail'}">
          ${set.actualReps}회 ${set.success ? '성공' : '실패'}
        </span>
      `;
      container.appendChild(item);
    });
  },

  // 성공 처리
  handleSuccess() {
    const exerciseRecord = this.getCurrentRecordExercise();

    exerciseRecord.sets.push({
      targetReps: exerciseRecord.targetReps,
      success: true,
      actualReps: exerciseRecord.targetReps
    });

    this.saveProgress();
    this.advanceToNextSet();
  },

  // 실패 처리 - 모달 열기
  handleFail() {
    const exerciseRecord = this.getCurrentRecordExercise();
    const input = document.getElementById('fail-reps-input');
    input.value = Math.max(0, exerciseRecord.targetReps - 1);
    input.max = exerciseRecord.targetReps;
    showOverlay('fail-modal');
  },

  // 실패 확인 - 실제 수행 횟수 입력 후
  confirmFail(completedReps) {
    const exerciseRecord = this.getCurrentRecordExercise();

    exerciseRecord.sets.push({
      targetReps: exerciseRecord.targetReps,
      success: false,
      actualReps: completedReps
    });

    // 남은 세트의 목표 횟수를 실패 횟수로 조정
    exerciseRecord.targetReps = completedReps;

    this.saveProgress();
    this.advanceToNextSet();
  },

  // 세트 완료 후 다음 세트 또는 다음 종목으로 이동 (공통 로직)
  advanceToNextSet() {
    const exercisePlan = this.getCurrentExercisePlan();
    const exerciseRecord = this.getCurrentRecordExercise();
    this.currentSetIndex++;

    if (this.currentSetIndex >= exercisePlan.sets) {
      exerciseRecord.completed = true;
      this.moveToNextExercise();
    } else {
      this.saveProgress();
      this.startRestTimer(exercisePlan.restSeconds);
    }
  },

  moveToNextExercise() {
    this.currentExerciseIndex++;
    this.currentSetIndex = 0;

    if (this.currentExerciseIndex >= this.plan.exercises.length) {
      this.completeWorkout();
    } else {
      this.saveProgress();
      this.renderCurrentSet();
    }
  },

  // 휴식 타이머
  startRestTimer(seconds) {
    let remainingSeconds = seconds;
    document.getElementById('timer-display').textContent = remainingSeconds;
    showOverlay('timer-overlay');

    this.timerInterval = setInterval(() => {
      remainingSeconds--;
      document.getElementById('timer-display').textContent = remainingSeconds;

      if (remainingSeconds <= 0) {
        this.endRestTimer();
      }
    }, 1000);
  },

  endRestTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    Sound.playBeep();
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    // 짧은 딜레이 후 자동 전환
    setTimeout(() => {
      hideOverlay('timer-overlay');
      this.renderCurrentSet();
    }, TIMER_END_DELAY_MS);
  },

  skipTimer() {
    this.endRestTimer();
  },

  // 운동 완료
  completeWorkout() {
    this.workoutRecord.completed = true;

    DataManager.saveRecord(this.date, this.workoutRecord);
    DataManager.clearInProgress();

    this.renderCompleteSummary();
    showOverlay('complete-modal');
  },

  renderCompleteSummary() {
    const container = document.getElementById('complete-summary');
    container.innerHTML = '';

    this.workoutRecord.exercises.forEach(exercise => {
      const successCount = exercise.sets.filter(set => set.success).length;
      const totalSets = exercise.sets.length;

      const item = document.createElement('div');
      item.className = 'complete-exercise-item';
      item.innerHTML = `
        <span class="complete-exercise-name">${exercise.name}</span>
        <span class="complete-exercise-result">${successCount}/${totalSets} 세트 성공</span>
      `;
      container.appendChild(item);
    });
  },

  // 운동 중단 (뒤로가기)
  abort() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    hideOverlay('timer-overlay');
    DataManager.clearInProgress();
    showScreen('calendar-view');
    Calendar.render();
  }
};

// ===================================================
// 플랜 관리 모듈
// ===================================================
const PlanManager = {
  pendingDeleteKey: null,

  init() {
    // 플랜 관리 화면 열기/닫기
    document.getElementById('manage-plans-btn').addEventListener('click', () => {
      this.render();
      showScreen('plan-manage-view');
    });

    document.getElementById('plan-manage-back').addEventListener('click', () => {
      showScreen('calendar-view');
      Calendar.render();
    });

    // 플랜 생성 화면
    document.getElementById('add-plan-btn').addEventListener('click', () => {
      this.openCreateForm();
    });

    document.getElementById('plan-create-back').addEventListener('click', () => {
      this.render();
      showScreen('plan-manage-view');
    });

    document.getElementById('add-exercise-btn').addEventListener('click', () => {
      this.addExerciseFormRow();
    });

    document.getElementById('save-plan-btn').addEventListener('click', () => {
      this.savePlan();
    });

    // 플랜 삭제 모달
    document.getElementById('delete-plan-cancel').addEventListener('click', () => {
      hideOverlay('delete-plan-modal');
    });

    document.getElementById('delete-plan-confirm').addEventListener('click', () => {
      hideOverlay('delete-plan-modal');
      if (!this.pendingDeleteKey) return;
      DataManager.deleteCustomPlan(this.pendingDeleteKey);
      this.pendingDeleteKey = null;
      this.render();
    });
  },

  // 플랜 관리 화면 렌더링
  render() {
    // 기본 플랜 목록
    const defaultList = document.getElementById('default-plans-list');
    defaultList.innerHTML = '';
    Object.keys(DEFAULT_PLANS).forEach(planKey => {
      defaultList.appendChild(this.createPlanItem(planKey, DEFAULT_PLANS[planKey], false));
    });

    // 커스텀 플랜 목록
    const customList = document.getElementById('custom-plans-list');
    customList.innerHTML = '';
    const customPlans = DataManager.loadCustomPlans();
    const customPlanKeys = Object.keys(customPlans);

    if (customPlanKeys.length === 0) {
      customList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 0;">커스텀 플랜이 없습니다</p>';
    } else {
      customPlanKeys.forEach(planKey => {
        customList.appendChild(this.createPlanItem(planKey, customPlans[planKey], true));
      });
    }
  },

  createPlanItem(planKey, plan, isDeletable) {
    const item = document.createElement('div');
    item.className = 'plan-item';

    const exerciseNames = plan.exercises.map(exercise => exercise.name).join(', ');
    item.innerHTML = `
      <div class="plan-item-info">
        <div class="plan-item-name">${plan.name}</div>
        <div class="plan-item-detail">${plan.exercises.length}종목 · ${exerciseNames}</div>
      </div>
    `;

    if (isDeletable) {
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'plan-item-actions';
      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-btn';
      deleteButton.textContent = '삭제';
      deleteButton.addEventListener('click', () => {
        this.pendingDeleteKey = planKey;
        document.getElementById('delete-plan-name').textContent = plan.name;
        showOverlay('delete-plan-modal');
      });
      actionsContainer.appendChild(deleteButton);
      item.appendChild(actionsContainer);
    }

    return item;
  },

  // 플랜 생성 폼 열기
  openCreateForm() {
    document.getElementById('plan-name-input').value = '';
    const container = document.getElementById('exercise-list-form');
    container.innerHTML = '';
    this.addExerciseFormRow(); // 기본 1개 종목 폼 추가
    showScreen('plan-create-view');
  },

  exerciseFormCount: 0,

  addExerciseFormRow() {
    this.exerciseFormCount++;
    const container = document.getElementById('exercise-list-form');
    const item = document.createElement('div');
    item.className = 'exercise-form-item';
    item.dataset.exerciseIndex = this.exerciseFormCount;

    item.innerHTML = `
      <button class="remove-exercise-btn" aria-label="종목 삭제">✕</button>
      <input type="text" class="form-input exercise-name-input" placeholder="종목 이름">
      <div class="exercise-form-row">
        <div>
          <span class="form-input-small-label">세트</span>
          <input type="number" class="form-input exercise-sets-input" placeholder="4" min="1" inputmode="numeric">
        </div>
        <div>
          <span class="form-input-small-label">횟수</span>
          <input type="number" class="form-input exercise-reps-input" placeholder="10" min="1" inputmode="numeric">
        </div>
        <div>
          <span class="form-input-small-label">휴식(초)</span>
          <input type="number" class="form-input exercise-rest-input" placeholder="90" min="0" inputmode="numeric">
        </div>
      </div>
    `;

    item.querySelector('.remove-exercise-btn').addEventListener('click', () => {
      item.remove();
    });

    container.appendChild(item);
  },

  // 플랜 저장: 검증 → 수집 → 저장
  savePlan() {
    const planName = this.getValidatedPlanName();
    if (!planName) return;

    const exercises = this.collectExercisesFromForm();
    if (!exercises) return;

    const planKey = 'custom_' + Date.now();
    DataManager.addCustomPlan(planKey, { name: planName, exercises });

    this.render();
    showScreen('plan-manage-view');
  },

  // 플랜 이름 검증 후 반환 (실패 시 null)
  getValidatedPlanName() {
    const planName = document.getElementById('plan-name-input').value.trim();
    if (!planName) {
      alert('플랜 이름을 입력해주세요.');
      return null;
    }
    return planName;
  },

  // 폼에서 종목 목록 수집 후 반환 (실패 시 null)
  collectExercisesFromForm() {
    const exerciseItems = document.querySelectorAll('#exercise-list-form .exercise-form-item');
    if (exerciseItems.length === 0) {
      alert('최소 1개 종목을 추가해주세요.');
      return null;
    }

    const exercises = [];
    for (const item of exerciseItems) {
      const name = item.querySelector('.exercise-name-input').value.trim();
      const sets = parseInt(item.querySelector('.exercise-sets-input').value);
      const reps = parseInt(item.querySelector('.exercise-reps-input').value);
      const rest = parseInt(item.querySelector('.exercise-rest-input').value);

      if (!name || !sets || !reps || isNaN(rest)) {
        alert('모든 종목 정보를 입력해주세요.');
        return null;
      }

      exercises.push({ name, sets, reps, restSeconds: rest || 0 });
    }

    return exercises;
  }
};

// ===================================================
// 체중 트래커 모듈
// ===================================================
const WeightTracker = {
  isChartOpen: false,
  chartDays: 7,

  init() {
    // 오늘 체중 저장
    document.getElementById('weight-save-btn').addEventListener('click', () => {
      this.saveTodayWeight();
    });

    // 엔터키로 저장
    document.getElementById('weight-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.saveTodayWeight();
      }
    });

    // 차트 토글
    document.getElementById('weight-chart-toggle').addEventListener('click', () => {
      this.toggleChart();
    });

    // 기간 버튼
    document.querySelectorAll('.weight-period-btn').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.weight-period-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        this.chartDays = parseInt(button.dataset.days);
        this.drawChart();
      });
    });

    // 날짜 상세 체중 저장
    document.getElementById('day-weight-save-btn').addEventListener('click', () => {
      this.saveDayWeight();
    });

    // 날짜 상세 체중 삭제
    document.getElementById('day-weight-delete-btn').addEventListener('click', () => {
      this.deleteDayWeight();
    });

    // 날짜 상세 엔터키로 저장
    document.getElementById('day-weight-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.saveDayWeight();
      }
    });

    this.loadTodayWeight();
  },

  getTodayStr() {
    return Calendar.formatDate(new Date());
  },

  loadTodayWeight() {
    const today = this.getTodayStr();
    const weight = DataManager.getWeight(today);
    document.getElementById('weight-input').value = weight !== null ? weight : '';
    document.getElementById('weight-saved-msg').style.display = 'none';

    if (this.isChartOpen) this.drawChart();
  },

  saveTodayWeight() {
    const weight = parseFloat(document.getElementById('weight-input').value);
    if (isNaN(weight) || weight <= 0) return;

    DataManager.saveWeightRecord(this.getTodayStr(), weight);
    showTemporaryElement('weight-saved-msg');

    if (this.isChartOpen) this.drawChart();
  },

  toggleChart() {
    this.isChartOpen = !this.isChartOpen;
    const chartSection = document.getElementById('weight-chart-section');
    const chartArrow = document.getElementById('weight-chart-arrow');

    if (this.isChartOpen) {
      chartSection.style.display = 'block';
      chartArrow.classList.add('open');
      this.drawChart();
    } else {
      chartSection.style.display = 'none';
      chartArrow.classList.remove('open');
    }
  },

  // === drawChart: SRP 적용 — 책임별 서브 함수로 분리 ===

  drawChart() {
    const { dates, values } = this.collectChartData(this.chartDays);
    const validValues = values.filter(v => v !== null);

    if (validValues.length < 2) {
      this.renderEmptyChart();
      return;
    }

    this.renderChartStats(validValues);

    const canvas = document.getElementById('weight-chart-canvas');
    document.getElementById('weight-chart-empty').style.display = 'none';
    canvas.style.display = 'block';

    const { chartCtx, canvasWidth, canvasHeight } = this.setupCanvas(canvas);
    const bounds = this.calcChartBounds(canvasWidth, canvasHeight, validValues);
    const dataPoints = this.calcDataPoints(dates, values, bounds);

    this.drawGuidelines(chartCtx, bounds);
    this.drawDataLine(chartCtx, dataPoints, bounds, canvasHeight);
    this.drawDataPoints(chartCtx, dataPoints);
    this.drawXAxisLabels(chartCtx, dates, bounds, canvasWidth, canvasHeight);
  },

  // 기간 내 날짜별 데이터 수집
  collectChartData(days) {
    const weightRecords = DataManager.loadWeightRecords();
    const today = new Date();
    const dates = [];
    const values = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = Calendar.formatDate(date);
      const weight = weightRecords[dateStr];
      dates.push(dateStr);
      values.push(weight !== undefined ? weight : null);
    }

    return { dates, values };
  },

  // 데이터 부족 시 빈 상태 표시
  renderEmptyChart() {
    document.getElementById('weight-chart-canvas').style.display = 'none';
    document.getElementById('weight-chart-empty').style.display = 'block';
    document.getElementById('weight-chart-stats').innerHTML = '';
  },

  // 통계(최저/최고/현재) 렌더링
  renderChartStats(validValues) {
    const minValue = Math.min(...validValues);
    const maxValue = Math.max(...validValues);
    const currentValue = validValues[validValues.length - 1];

    document.getElementById('weight-chart-stats').innerHTML = `
      <div class="weight-stat-item">
        <span class="weight-stat-label">최저</span>
        <span class="weight-stat-value">${minValue.toFixed(1)}</span>
      </div>
      <div class="weight-stat-item">
        <span class="weight-stat-label">최고</span>
        <span class="weight-stat-value">${maxValue.toFixed(1)}</span>
      </div>
      <div class="weight-stat-item">
        <span class="weight-stat-label">현재</span>
        <span class="weight-stat-value">${currentValue.toFixed(1)}</span>
      </div>
    `;
  },

  // Canvas DPI 스케일링 설정
  setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const chartCtx = canvas.getContext('2d');
    chartCtx.scale(dpr, dpr);

    return { chartCtx, canvasWidth: rect.width, canvasHeight: rect.height };
  },

  // 차트 여백 및 Y축 범위 계산
  calcChartBounds(canvasWidth, canvasHeight, validValues) {
    const paddingTop = 20;
    const paddingBottom = 28;
    const paddingLeft = 10;
    const paddingRight = 10;

    const chartWidth = canvasWidth - paddingLeft - paddingRight;
    const chartHeight = canvasHeight - paddingTop - paddingBottom;

    const minValue = Math.min(...validValues);
    const maxValue = Math.max(...validValues);
    const valueRange = maxValue - minValue;
    const yPadding = valueRange > 0 ? valueRange * 0.2 : 1;
    const yMin = minValue - yPadding;
    const yMax = maxValue + yPadding;

    return { paddingTop, paddingBottom, paddingLeft, paddingRight, chartWidth, chartHeight, yMin, yMax };
  },

  // 유효 데이터 포인트의 픽셀 좌표 계산
  calcDataPoints(dates, values, bounds) {
    const { paddingLeft, paddingTop, chartWidth, chartHeight, yMin, yMax } = bounds;
    const points = [];

    for (let i = 0; i < dates.length; i++) {
      if (values[i] === null) continue;
      const x = paddingLeft + (i / (dates.length - 1)) * chartWidth;
      const y = paddingTop + (1 - (values[i] - yMin) / (yMax - yMin)) * chartHeight;
      points.push({ x, y, value: values[i], dateIndex: i });
    }

    return points;
  },

  // 수평 가이드라인 그리기
  drawGuidelines(chartCtx, bounds) {
    const { paddingTop, paddingLeft, paddingRight, chartHeight, chartWidth } = bounds;
    chartCtx.strokeStyle = 'rgba(42, 42, 74, 0.5)';
    chartCtx.lineWidth = 1;

    for (let i = 0; i <= 3; i++) {
      const y = paddingTop + (i / 3) * chartHeight;
      chartCtx.beginPath();
      chartCtx.moveTo(paddingLeft, y);
      chartCtx.lineTo(paddingLeft + chartWidth + paddingRight, y);
      chartCtx.stroke();
    }
  },

  // 데이터 라인 및 그라데이션 채우기 그리기
  drawDataLine(chartCtx, dataPoints, bounds, canvasHeight) {
    if (dataPoints.length < 2) return;

    const { paddingTop, paddingBottom } = bounds;
    const chartBottom = canvasHeight - paddingBottom;

    // 라인
    chartCtx.beginPath();
    chartCtx.strokeStyle = '#4361ee';
    chartCtx.lineWidth = 2;
    chartCtx.lineJoin = 'round';
    chartCtx.lineCap = 'round';
    chartCtx.moveTo(dataPoints[0].x, dataPoints[0].y);
    for (let i = 1; i < dataPoints.length; i++) {
      chartCtx.lineTo(dataPoints[i].x, dataPoints[i].y);
    }
    chartCtx.stroke();

    // 그라데이션 채우기
    const gradient = chartCtx.createLinearGradient(0, paddingTop, 0, chartBottom);
    gradient.addColorStop(0, 'rgba(67, 97, 238, 0.2)');
    gradient.addColorStop(1, 'rgba(67, 97, 238, 0)');

    chartCtx.beginPath();
    chartCtx.moveTo(dataPoints[0].x, dataPoints[0].y);
    for (let i = 1; i < dataPoints.length; i++) {
      chartCtx.lineTo(dataPoints[i].x, dataPoints[i].y);
    }
    chartCtx.lineTo(dataPoints[dataPoints.length - 1].x, chartBottom);
    chartCtx.lineTo(dataPoints[0].x, chartBottom);
    chartCtx.closePath();
    chartCtx.fillStyle = gradient;
    chartCtx.fill();
  },

  // 데이터 포인트(dot) 및 값 라벨 그리기
  drawDataPoints(chartCtx, dataPoints) {
    dataPoints.forEach((point, index) => {
      chartCtx.beginPath();
      chartCtx.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
      chartCtx.fillStyle = '#4361ee';
      chartCtx.fill();
      chartCtx.strokeStyle = '#1a1a2e';
      chartCtx.lineWidth = 1.5;
      chartCtx.stroke();

      // 첫번째, 마지막, 또는 점이 적을 때 값 라벨 표시
      const showLabel = index === 0 || index === dataPoints.length - 1 || dataPoints.length <= 7;
      if (showLabel) {
        chartCtx.fillStyle = '#a0a0b8';
        chartCtx.font = '10px -apple-system, sans-serif';
        chartCtx.textAlign = 'center';
        chartCtx.fillText(point.value.toFixed(1), point.x, point.y - 8);
      }
    });
  },

  // X축 날짜 라벨 그리기
  drawXAxisLabels(chartCtx, dates, bounds, canvasWidth, canvasHeight) {
    const { paddingLeft, paddingRight, chartWidth } = bounds;
    chartCtx.fillStyle = '#6c6c80';
    chartCtx.font = '9px -apple-system, sans-serif';
    chartCtx.textAlign = 'center';

    const labelStep = this.chartDays <= 7 ? 1 : Math.ceil(this.chartDays / 7);
    for (let i = 0; i < dates.length; i += labelStep) {
      const x = paddingLeft + (i / (dates.length - 1)) * chartWidth;
      const date = new Date(dates[i] + 'T00:00:00');
      chartCtx.fillText(`${date.getMonth() + 1}/${date.getDate()}`, x, canvasHeight - 6);
    }

    // 항상 마지막 날짜 라벨 표시
    if ((dates.length - 1) % labelStep !== 0) {
      const lastX = paddingLeft + chartWidth;
      const lastDate = new Date(dates[dates.length - 1] + 'T00:00:00');
      chartCtx.fillText(`${lastDate.getMonth() + 1}/${lastDate.getDate()}`, lastX, canvasHeight - 6);
    }
  },

  // 날짜 상세 체중 표시
  showDayWeight(dateStr) {
    const section = document.getElementById('day-weight-section');
    const deleteButton = document.getElementById('day-weight-delete-btn');
    const savedMsg = document.getElementById('day-weight-saved-msg');

    section.style.display = 'block';
    savedMsg.style.display = 'none';
    section.dataset.date = dateStr;

    const weight = DataManager.getWeight(dateStr);
    if (weight !== null) {
      document.getElementById('day-weight-input').value = weight;
      deleteButton.style.display = 'flex';
    } else {
      document.getElementById('day-weight-input').value = '';
      deleteButton.style.display = 'none';
    }
  },

  saveDayWeight() {
    const section = document.getElementById('day-weight-section');
    const dateStr = section.dataset.date;
    const weight = parseFloat(document.getElementById('day-weight-input').value);

    if (isNaN(weight) || weight <= 0 || !dateStr) return;

    DataManager.saveWeightRecord(dateStr, weight);
    document.getElementById('day-weight-delete-btn').style.display = 'flex';
    showTemporaryElement('day-weight-saved-msg');

    // 오늘 날짜인 경우 메인 화면 체중 동기화
    this.syncMainWeightInput(dateStr, weight);
  },

  deleteDayWeight() {
    const section = document.getElementById('day-weight-section');
    const dateStr = section.dataset.date;
    if (!dateStr) return;

    DataManager.deleteWeight(dateStr);
    document.getElementById('day-weight-input').value = '';
    document.getElementById('day-weight-delete-btn').style.display = 'none';

    // 오늘 날짜인 경우 메인 화면 체중 동기화
    this.syncMainWeightInput(dateStr, '');
  },

  // 오늘 날짜인 경우에만 메인 화면 체중 입력 동기화
  syncMainWeightInput(dateStr, value) {
    if (dateStr !== this.getTodayStr()) return;
    document.getElementById('weight-input').value = value;
  }
};

// ===================================================
// 앱 초기화 (DOMContentLoaded)
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
  reloadActivePlans();

  initModules();
  bindWorkoutEvents();
  bindFailModalEvents();
  bindTimerAndCompleteEvents();
  restoreInProgressWorkout();
});

// 각 모듈 초기화
function initModules() {
  Calendar.init();
  DayDetail.init();
  PlanManager.init();
  ExportImport.init();
  WeightTracker.init();
}

// 운동 세션 — 성공/실패/뒤로가기 이벤트
function bindWorkoutEvents() {
  document.getElementById('success-btn').addEventListener('click', () => {
    WorkoutSession.handleSuccess();
  });

  document.getElementById('fail-btn').addEventListener('click', () => {
    WorkoutSession.handleFail();
  });

  document.getElementById('workout-back').addEventListener('click', () => {
    if (confirm('운동을 중단하시겠습니까? 현재 진행 기록이 삭제됩니다.')) {
      WorkoutSession.abort();
    }
  });
}

// 실패 횟수 입력 모달 이벤트
function bindFailModalEvents() {
  document.getElementById('fail-reps-minus').addEventListener('click', () => {
    const input = document.getElementById('fail-reps-input');
    const currentValue = parseInt(input.value) || 0;
    if (currentValue > 0) input.value = currentValue - 1;
  });

  document.getElementById('fail-reps-plus').addEventListener('click', () => {
    const input = document.getElementById('fail-reps-input');
    const currentValue = parseInt(input.value) || 0;
    const maxValue = parseInt(input.max) || 99;
    if (currentValue < maxValue) input.value = currentValue + 1;
  });

  document.getElementById('fail-confirm-btn').addEventListener('click', () => {
    const completedReps = parseInt(document.getElementById('fail-reps-input').value) || 0;
    hideOverlay('fail-modal');
    WorkoutSession.confirmFail(completedReps);
  });
}

// 타이머 건너뛰기 및 완료 확인 이벤트
function bindTimerAndCompleteEvents() {
  document.getElementById('skip-timer-btn').addEventListener('click', () => {
    WorkoutSession.skipTimer();
  });

  document.getElementById('complete-confirm-btn').addEventListener('click', () => {
    hideOverlay('complete-modal');
    showScreen('calendar-view');
    Calendar.render();
  });
}

// 진행 중인 운동 복원
function restoreInProgressWorkout() {
  const savedProgress = DataManager.loadInProgress();
  if (!savedProgress) return;

  if (confirm('진행 중이던 운동이 있습니다. 이어서 하시겠습니까?')) {
    WorkoutSession.restore(savedProgress);
  } else {
    DataManager.clearInProgress();
  }
}
