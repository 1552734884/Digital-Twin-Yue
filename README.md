# 电池模组装配基地 · 数字孪生总览

Three.js 工业虚拟仿真项目：全屏 3D 基地总览，含总装工厂、原料/成品仓储、港区码头与中控中心。

## 快速开始

```powershell
npm install
npm run dev
```

浏览器打开终端提示的本地地址（默认 http://localhost:5173）。

## 操作

- 左键拖动：旋转
- 右键拖动：平移
- 滚轮：缩放
- 点击设施 / 左侧列表：选中并镜头聚焦

## 模块结构

```
src/
  config/       配色与设施数据
  scene/        场景管理、光照、环境
  models/       程序化设施建模
  interaction/  Orbit 辅助、Raycaster 选中与聚焦
  simulation/   轻量仿真（车辆、指标）
  ui/           悬浮 HUD 面板
  main.js       组装入口
```

## 技术

- Three.js + Vite
- OrbitControls（旋转 / 缩放 / 平移）
- Raycaster（点击选中）
- 程序化几何（无外部模型）
