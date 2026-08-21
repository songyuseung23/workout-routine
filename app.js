// ===================================
// 운동 기록 앱 - app.js
// ===================================

// === 운동 플랜 데이터 ===
const PLANS = {
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

// === 데이터 관리 ===
const DataManager = {
  RECORDS_KEY: 'workoutRecords',
  IN_PROGRESS_KEY: 'workoutInProgress',

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
  }
};

// === 화면 관리 ===
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
}

function showOverlay(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (overlay) overlay.classList.add('active');
}

function hideOverlay(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (overlay) overlay.classList.remove('active');
}

// === 사운드 모듈 (Web Audio API) ===
const Sound = {
  ctx: null,

  getContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.ctx;
  },

  playBeep() {
    try {
      const ctx = this.getContext();
      // 두 번 짧게 비프음
      [0, 0.2].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.15);
      });
    } catch {
      // Web Audio API 미지원 시 무시
    }
  },

  // 유저 인터랙션으로 AudioContext 초기화 (iOS 등 필요)
  unlock() {
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch {
      // 무시
    }
  }
};

// === 캘린더 모듈 ===
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

    // 캘린더 그리드 생성
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay(); // 0=일요일
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    const todayStr = this.formatDate(today);

    const records = DataManager.loadRecords();

    // 이전 달 빈 칸
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const cell = this.createCell(day, true, '', null);
      grid.appendChild(cell);
    }

    // 현재 달
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = this.formatDate(new Date(year, month, d));
      const isToday = dateStr === todayStr;
      const record = records[dateStr];
      const cell = this.createCell(d, false, dateStr, record);
      if (isToday) cell.classList.add('today');
      grid.appendChild(cell);
    }

    // 다음 달 빈 칸 (6행 채우기)
    const totalCells = grid.children.length;
    const remaining = (Math.ceil(totalCells / 7) * 7) - totalCells;
    for (let i = 1; i <= remaining; i++) {
      const cell = this.createCell(i, true, '', null);
      grid.appendChild(cell);
    }
  },

  createCell(day, isOtherMonth, dateStr, record) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    if (isOtherMonth) cell.classList.add('other-month');

    const dayNum = document.createElement('span');
    dayNum.className = 'day-number';
    dayNum.textContent = day;
    cell.appendChild(dayNum);

    // 운동 기록 dot 표시
    if (record && record.plan) {
      const dot = document.createElement('span');
      dot.className = `workout-dot plan-${record.plan.toLowerCase()}`;
      cell.appendChild(dot);
    }

    // 클릭 이벤트 (현재 달만)
    if (!isOtherMonth && dateStr) {
      cell.addEventListener('click', () => {
        Sound.unlock(); // iOS AudioContext 활성화
        DayDetail.show(dateStr);
      });
    }

    return cell;
  },

  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
};

// === 날짜 상세 모듈 ===
const DayDetail = {
  selectedDate: null,

  init() {
    document.getElementById('day-detail-back').addEventListener('click', () => {
      showScreen('calendar-view');
      Calendar.render(); // 캘린더 갱신
    });

    document.getElementById('start-plan-a').addEventListener('click', () => {
      this.startPlan('A');
    });

    document.getElementById('start-plan-b').addEventListener('click', () => {
      this.startPlan('B');
    });
  },

  show(dateStr) {
    this.selectedDate = dateStr;

    // 날짜 표시
    const date = new Date(dateStr + 'T00:00:00');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const displayDate = `${date.getMonth() + 1}월 ${date.getDate()}일 (${dayNames[date.getDay()]})`;
    document.getElementById('day-detail-date').textContent = displayDate;

    // 기존 기록 표시
    const content = document.getElementById('day-detail-content');
    const record = DataManager.getRecord(dateStr);

    if (record) {
      content.innerHTML = this.renderRecordSummary(record);
    } else {
      content.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px 0;">기록이 없습니다</p>';
    }

    showScreen('day-detail-view');
  },

  renderRecordSummary(record) {
    const plan = PLANS[record.plan];
    let html = `<div class="record-summary"><h4>${plan.name} ${record.completed ? '✅' : '⏳'}</h4>`;

    record.exercises.forEach(ex => {
      html += `<div class="record-exercise">`;
      html += `<div class="record-exercise-name">${ex.name}</div>`;
      html += `<div class="record-sets">`;
      ex.sets.forEach((set, i) => {
        const cls = set.success ? 'success' : 'fail';
        html += `<span class="record-set-badge ${cls}">${i + 1}세트 ${set.actualReps}회 ${set.success ? '✓' : '✗'}</span>`;
      });
      html += `</div></div>`;
    });

    html += `</div>`;
    return html;
  },

  startPlan(planKey) {
    const existing = DataManager.getRecord(this.selectedDate);

    if (existing) {
      // 기존 기록 덮어쓰기 확인
      this.pendingPlan = planKey;
      showOverlay('overwrite-modal');
    } else {
      WorkoutSession.start(this.selectedDate, planKey);
    }
  },

  pendingPlan: null
};

// === 덮어쓰기 모달 ===
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('overwrite-cancel').addEventListener('click', () => {
    hideOverlay('overwrite-modal');
  });

  document.getElementById('overwrite-confirm').addEventListener('click', () => {
    hideOverlay('overwrite-modal');
    if (DayDetail.pendingPlan) {
      WorkoutSession.start(DayDetail.selectedDate, DayDetail.pendingPlan);
      DayDetail.pendingPlan = null;
    }
  });
});

// === 운동 세션 모듈 ===
const WorkoutSession = {
  date: null,
  planKey: null,
  plan: null,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  record: null, // 현재 운동 기록
  timerInterval: null,

  start(dateStr, planKey) {
    this.date = dateStr;
    this.planKey = planKey;
    this.plan = PLANS[planKey];
    this.currentExerciseIndex = 0;
    this.currentSetIndex = 0;

    // 기록 초기화
    this.record = {
      plan: planKey,
      exercises: this.plan.exercises.map(ex => ({
        name: ex.name,
        sets: [],
        targetReps: ex.reps, // 현재 목표 횟수 (실패 시 조정됨)
        completed: false
      })),
      completed: false
    };

    // 진행 상태 저장
    this.saveProgress();

    // 화면 표시
    document.getElementById('workout-plan-name').textContent = this.plan.name;
    showScreen('workout-view');
    this.renderCurrentSet();
  },

  // 페이지 리프레시 후 복원
  restore(state) {
    this.date = state.date;
    this.planKey = state.planKey;
    this.plan = PLANS[state.planKey];
    this.currentExerciseIndex = state.currentExerciseIndex;
    this.currentSetIndex = state.currentSetIndex;
    this.record = state.record;

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
      record: this.record
    });
  },

  getCurrentExercisePlan() {
    return this.plan.exercises[this.currentExerciseIndex];
  },

  getCurrentRecordExercise() {
    return this.record.exercises[this.currentExerciseIndex];
  },

  renderCurrentSet() {
    const exPlan = this.getCurrentExercisePlan();
    const exRecord = this.getCurrentRecordExercise();

    // 종목 이름
    document.getElementById('current-exercise-name').textContent = exPlan.name;

    // 세트 정보
    document.getElementById('current-set-number').textContent = this.currentSetIndex + 1;
    document.getElementById('total-sets').textContent = exPlan.sets;

    // 목표 횟수 (실패로 조정된 값 반영)
    document.getElementById('target-reps').textContent = exRecord.targetReps;

    // 종목 진행 dot
    this.renderExerciseProgress();

    // 세트 히스토리
    this.renderSetHistory();
  },

  renderExerciseProgress() {
    const container = document.getElementById('exercise-progress');
    container.innerHTML = '';

    this.plan.exercises.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'exercise-dot';
      if (i < this.currentExerciseIndex) dot.classList.add('completed');
      if (i === this.currentExerciseIndex) dot.classList.add('current');
      container.appendChild(dot);
    });
  },

  renderSetHistory() {
    const container = document.getElementById('set-history');
    container.innerHTML = '';

    const exRecord = this.getCurrentRecordExercise();
    exRecord.sets.forEach((set, i) => {
      const item = document.createElement('div');
      item.className = 'set-history-item';
      item.innerHTML = `
        <span class="set-label-text">${i + 1}세트</span>
        <span class="set-result ${set.success ? 'success' : 'fail'}">
          ${set.actualReps}회 ${set.success ? '성공' : '실패'}
        </span>
      `;
      container.appendChild(item);
    });
  },

  // 성공 처리
  handleSuccess() {
    const exRecord = this.getCurrentRecordExercise();
    const exPlan = this.getCurrentExercisePlan();

    // 세트 기록
    exRecord.sets.push({
      targetReps: exRecord.targetReps,
      success: true,
      actualReps: exRecord.targetReps
    });

    this.saveProgress();

    // 다음 세트/종목으로 이동
    this.currentSetIndex++;

    if (this.currentSetIndex >= exPlan.sets) {
      // 종목 완료
      exRecord.completed = true;
      this.moveToNextExercise();
    } else {
      // 휴식 타이머 시작
      this.saveProgress();
      this.startRestTimer(exPlan.restSeconds);
    }
  },

  // 실패 처리 - 모달 열기
  handleFail() {
    const exRecord = this.getCurrentRecordExercise();
    const input = document.getElementById('fail-reps-input');
    input.value = Math.max(0, exRecord.targetReps - 1);
    input.max = exRecord.targetReps;
    showOverlay('fail-modal');
  },

  // 실패 확인 - 실제 횟수 입력 후
  confirmFail(actualReps) {
    const exRecord = this.getCurrentRecordExercise();
    const exPlan = this.getCurrentExercisePlan();

    // 세트 기록
    exRecord.sets.push({
      targetReps: exRecord.targetReps,
      success: false,
      actualReps: actualReps
    });

    // 남은 세트의 목표 횟수를 실패 횟수로 조정
    exRecord.targetReps = actualReps;

    this.saveProgress();

    // 다음 세트/종목으로 이동
    this.currentSetIndex++;

    if (this.currentSetIndex >= exPlan.sets) {
      exRecord.completed = true;
      this.moveToNextExercise();
    } else {
      this.saveProgress();
      this.startRestTimer(exPlan.restSeconds);
    }
  },

  moveToNextExercise() {
    this.currentExerciseIndex++;
    this.currentSetIndex = 0;

    if (this.currentExerciseIndex >= this.plan.exercises.length) {
      // 모든 종목 완료
      this.completeWorkout();
    } else {
      this.saveProgress();
      this.renderCurrentSet();
    }
  },

  // 휴식 타이머
  startRestTimer(seconds) {
    let remaining = seconds;
    document.getElementById('timer-display').textContent = remaining;
    showOverlay('timer-overlay');

    this.timerInterval = setInterval(() => {
      remaining--;
      document.getElementById('timer-display').textContent = remaining;

      if (remaining <= 0) {
        this.endRestTimer();
      }
    }, 1000);
  },

  endRestTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // 알림음 + 진동
    Sound.playBeep();
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    // 짧은 딜레이 후 자동 전환
    setTimeout(() => {
      hideOverlay('timer-overlay');
      this.renderCurrentSet();
    }, 500);
  },

  skipTimer() {
    this.endRestTimer();
  },

  // 운동 완료
  completeWorkout() {
    this.record.completed = true;

    // localStorage에 기록 저장
    DataManager.saveRecord(this.date, this.record);
    DataManager.clearInProgress();

    // 완료 요약 표시
    this.renderCompleteSummary();
    showOverlay('complete-modal');
  },

  renderCompleteSummary() {
    const container = document.getElementById('complete-summary');
    container.innerHTML = '';

    this.record.exercises.forEach(ex => {
      const successCount = ex.sets.filter(s => s.success).length;
      const totalSets = ex.sets.length;

      const item = document.createElement('div');
      item.className = 'complete-exercise-item';
      item.innerHTML = `
        <span class="complete-exercise-name">${ex.name}</span>
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

// === 이벤트 바인딩 ===
document.addEventListener('DOMContentLoaded', () => {
  // 캘린더 초기화
  Calendar.init();
  DayDetail.init();

  // 운동 세션 버튼
  document.getElementById('success-btn').addEventListener('click', () => {
    WorkoutSession.handleSuccess();
  });

  document.getElementById('fail-btn').addEventListener('click', () => {
    WorkoutSession.handleFail();
  });

  // 운동 뒤로가기 (중단 확인)
  document.getElementById('workout-back').addEventListener('click', () => {
    if (confirm('운동을 중단하시겠습니까? 현재 진행 기록이 삭제됩니다.')) {
      WorkoutSession.abort();
    }
  });

  // 실패 모달 - +/- 버튼
  document.getElementById('fail-reps-minus').addEventListener('click', () => {
    const input = document.getElementById('fail-reps-input');
    const val = parseInt(input.value) || 0;
    if (val > 0) input.value = val - 1;
  });

  document.getElementById('fail-reps-plus').addEventListener('click', () => {
    const input = document.getElementById('fail-reps-input');
    const val = parseInt(input.value) || 0;
    const max = parseInt(input.max) || 99;
    if (val < max) input.value = val + 1;
  });

  // 실패 확인
  document.getElementById('fail-confirm-btn').addEventListener('click', () => {
    const reps = parseInt(document.getElementById('fail-reps-input').value) || 0;
    hideOverlay('fail-modal');
    WorkoutSession.confirmFail(reps);
  });

  // 타이머 건너뛰기
  document.getElementById('skip-timer-btn').addEventListener('click', () => {
    WorkoutSession.skipTimer();
  });

  // 완료 확인
  document.getElementById('complete-confirm-btn').addEventListener('click', () => {
    hideOverlay('complete-modal');
    showScreen('calendar-view');
    Calendar.render();
  });

  // 진행 중인 운동 복원
  const inProgress = DataManager.loadInProgress();
  if (inProgress) {
    if (confirm('진행 중이던 운동이 있습니다. 이어서 하시겠습니까?')) {
      WorkoutSession.restore(inProgress);
    } else {
      DataManager.clearInProgress();
    }
  }
});
