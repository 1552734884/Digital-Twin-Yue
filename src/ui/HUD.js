import { facilities, globalMetrics, processLayers } from '../config/palette.js';
import { detailCameras } from '../config/detailCameras.js';

/**
 * 轻量悬浮数据面板 + 工艺/交通控制 + 巡游
 */
export class HUD {
  constructor({
    onSelectFacility,
    onCloseDetail,
    onTogglePause,
    onExplode,
    onToggleLayer,
    onForceFault,
    onToggleTour,
    onTourNext,
    onTourPrev,
    onTourShot,
  }) {
    this.listEl = document.getElementById('facility-items');
    this.detailEl = document.getElementById('detail-panel');
    this.detailType = document.getElementById('detail-type');
    this.detailName = document.getElementById('detail-name');
    this.detailDesc = document.getElementById('detail-desc');
    this.detailStats = document.getElementById('detail-stats');
    this.metricsEl = document.getElementById('global-metrics');
    this.clockEl = document.getElementById('sim-clock');
    this.closeBtn = document.getElementById('detail-close');

    this.onSelectFacility = onSelectFacility;
    this.onTogglePause = onTogglePause || (() => {});
    this.onExplode = onExplode || (() => {});
    this.onToggleLayer = onToggleLayer || (() => {});
    this.onForceFault = onForceFault || (() => {});
    this.onToggleTour = onToggleTour || (() => {});
    this.onTourNext = onTourNext || (() => {});
    this.onTourPrev = onTourPrev || (() => {});
    this.onTourShot = onTourShot || (() => {});

    this.closeBtn.addEventListener('click', () => {
      this.hideDetail();
      onCloseDetail?.();
    });

    this.#buildList();
    this.#buildProcessPanel();
    this.#buildTourPanel();
  }

  #buildTourPanel() {
    this.tourBtn = document.getElementById('btn-tour');
    this.tourLabel = document.getElementById('tour-label');
    this.shotChips = document.getElementById('shot-chips');
    document.getElementById('btn-tour')?.addEventListener('click', () => this.onToggleTour());
    document.getElementById('btn-tour-next')?.addEventListener('click', () => this.onTourNext());
    document.getElementById('btn-tour-prev')?.addEventListener('click', () => this.onTourPrev());
    if (this.shotChips) {
      this.shotChips.innerHTML = '';
      for (const shot of detailCameras) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'shot-chip';
        btn.dataset.id = shot.id;
        btn.textContent = shot.label;
        btn.addEventListener('click', () => this.onTourShot(shot.id));
        this.shotChips.appendChild(btn);
      }
    }
  }

  updateTour(tour) {
    if (!tour || !this.tourBtn) return;
    this.tourBtn.textContent = tour.enabled ? '停止巡游' : '开始巡游';
    this.tourBtn.classList.toggle('is-paused', tour.enabled);
    if (this.tourLabel) this.tourLabel.textContent = tour.label;
    this.shotChips?.querySelectorAll('.shot-chip').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.id === tour.current?.id);
    });
  }

  #buildList() {
    this.listEl.innerHTML = '';
    for (const f of facilities) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.id = f.id;
      btn.innerHTML = `<span>${f.name}</span><span class="facility-tag">${f.type}</span>`;
      btn.addEventListener('click', () => this.onSelectFacility(f.id));
      li.appendChild(btn);
      this.listEl.appendChild(li);
    }
  }

  #buildProcessPanel() {
    this.pauseBtn = document.getElementById('btn-pause');
    this.faultBtn = document.getElementById('btn-fault');
    this.explodeRange = document.getElementById('explode-range');
    this.layerList = document.getElementById('layer-toggles');
    this.armList = document.getElementById('arm-status');
    this.inspEl = document.getElementById('inspection-status');
    this.signalEl = document.getElementById('signal-status');
    this.vehicleList = document.getElementById('vehicle-status');
    this.alarmEl = document.getElementById('alarm-banner');

    this.pauseBtn?.addEventListener('click', () => this.onTogglePause());
    this.faultBtn?.addEventListener('click', () => this.onForceFault());
    this.explodeRange?.addEventListener('input', (e) => {
      this.onExplode(Number(e.target.value) / 100);
    });

    if (this.layerList) {
      this.layerList.innerHTML = '';
      for (const layer of processLayers) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'layer-chip active';
        btn.dataset.key = layer.key;
        btn.textContent = layer.label;
        btn.addEventListener('click', () => {
          this.onToggleLayer(layer.key);
        });
        this.layerList.appendChild(btn);
      }
    }
  }

  setActive(id) {
    const buttons = this.listEl.querySelectorAll('button');
    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.id === id);
    });
  }

  showDetail(id) {
    const f = facilities.find((x) => x.id === id);
    if (!f) return;
    this.detailType.textContent = f.type;
    this.detailName.textContent = f.name;
    this.detailDesc.textContent = f.desc;
    this.detailStats.innerHTML = '';
    for (const [k, v] of Object.entries(f.stats)) {
      const div = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = k;
      dd.textContent = v;
      div.append(dt, dd);
      this.detailStats.appendChild(div);
    }
    this.detailEl.classList.remove('hidden');
    this.setActive(id);
  }

  hideDetail() {
    this.detailEl.classList.add('hidden');
    this.setActive(null);
  }

  updateMetrics(metrics) {
    if (!this.metricsEl) return;
    const map = metrics || globalMetrics;
    for (const [key, value] of Object.entries(map)) {
      const el = this.metricsEl.querySelector(`[data-key="${key}"]`);
      if (!el) continue;
      el.textContent = value;
      el.classList.toggle('status-warn', key === 'status' && value === '告警');
      el.classList.toggle('status-ok', key === 'status' && value === '正常');
      el.classList.toggle('status-pause', key === 'status' && value === '已暂停');
    }
  }

  updateSimView(simState) {
    if (!simState) return;
    const { process, traffic, paused } = simState;

    if (this.pauseBtn) {
      this.pauseBtn.textContent = paused ? '恢复运行' : '暂停仿真';
      this.pauseBtn.classList.toggle('is-paused', paused);
    }

    // 机械臂
    if (this.armList && process?.arms) {
      this.armList.innerHTML = process.arms
        .map(
          (a) => `
        <div class="arm-row">
          <span class="arm-id">${a.id}</span>
          <span class="arm-state">${a.stateCN}</span>
          <div class="bar"><i style="width:${Math.round(a.progress * 100)}%"></i></div>
          <span class="arm-grip">${a.hasWorkpiece ? '持件' : '空载'}</span>
        </div>`,
        )
        .join('');
    }

    // 检测
    if (this.inspEl && process?.inspection) {
      const ins = process.inspection;
      const resultText = ins.result === 'PASS' ? '合格' : ins.result === 'FAIL' ? '不合格' : '—';
      const resultCls = ins.result === 'PASS' ? 'ok' : ins.result === 'FAIL' ? 'bad' : '';
      this.inspEl.innerHTML = `
        <div class="arm-row">
          <span class="arm-id">检测</span>
          <span class="arm-state">${ins.stateCN}</span>
          <div class="bar"><i style="width:${Math.round(ins.progress * 100)}%"></i></div>
          <span class="arm-grip ${resultCls}">${resultText}</span>
        </div>`;
    }

    // 层显隐同步
    if (this.layerList && process?.module) {
      const visible = new Set(process.module.visibleLayers || []);
      this.layerList.querySelectorAll('.layer-chip').forEach((btn) => {
        btn.classList.toggle('active', visible.has(btn.dataset.key));
      });
    }

    // 信号
    if (this.signalEl && traffic?.signal) {
      this.signalEl.innerHTML = `
        <div class="arm-row">
          <span class="arm-id">路口</span>
          <span class="arm-state">${traffic.signal.phaseCN}</span>
          <span class="arm-grip">剩余 ${traffic.signal.remain}s</span>
        </div>`;
    }

    // 车辆
    if (this.vehicleList && traffic?.vehicles) {
      this.vehicleList.innerHTML = traffic.vehicles
        .map((v) => {
          const cls = v.fault ? 'bad' : v.state === 'RUN' ? 'ok' : '';
          return `<div class="arm-row">
            <span class="arm-id">${v.id}</span>
            <span class="arm-state">${v.stateCN}</span>
            <span class="arm-grip ${cls}">${v.speed} m/s</span>
          </div>`;
        })
        .join('');
    }

    // 告警横幅
    if (this.alarmEl) {
      const alarms = traffic?.alarms || [];
      if (alarms.length) {
        this.alarmEl.hidden = false;
        this.alarmEl.textContent = `警报 · ${alarms[0].message}`;
      } else if (traffic?.faulted > 0) {
        this.alarmEl.hidden = false;
        this.alarmEl.textContent = `警报 · 当前 ${traffic.faulted} 台车辆故障停驶`;
      } else {
        this.alarmEl.hidden = true;
      }
    }
  }

  updateClock(simElapsed) {
    const total = Math.floor(simElapsed || 0);
    const h = String(Math.floor(total / 3600) % 24).padStart(2, '0');
    const m = String(Math.floor(total / 60) % 60).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    const shiftH = String((8 + Math.floor(total / 3600)) % 24).padStart(2, '0');
    if (this.clockEl) {
      this.clockEl.textContent = `T+${h}:${m}:${s} · ${shiftH}:${m}:${s}`;
    }
  }
}
