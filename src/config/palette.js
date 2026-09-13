/** 工业白灰 + 工业橙色板 */
export const palette = {
  paper: 0xf0f2f5,
  fog: 0xe8ebef,
  ground: 0xd9dde3,
  groundDark: 0xc5cad2,
  road: 0x4a5058,
  roadMark: 0xf0f2f5,
  ink: 0x1a1d21,
  panel: 0xffffff,
  orange: 0xff6b1a,
  orangeDeep: 0xe85d04,
  metal: 0x9aa3ad,
  metalDark: 0x5c6570,
  glass: 0xa8c0d4,
  warehouse: 0xe8eaee,
  factory: 0xf5f6f8,
  roof: 0xb8bec6,
  water: 0x7a9bb0,
  quay: 0x8a929c,
  containerBlue: 0x3d6b8c,
  containerGreen: 0x4a7c59,
  containerOrange: 0xc45c26,
  crane: 0xff8a3d,
  grass: 0xc5d0b8,
  tree: 0x5a7a4a,
  highlight: 0xff6b1a,
};

export const facilities = [
  {
    id: 'assembly',
    name: '总装工厂',
    type: 'ASSEMBLY',
    desc: '电池模组主装配线，含电芯上料、模组堆叠与 PACK 测试工位。',
    stats: {
      产线数: '4 条',
      当前负载: '86%',
      在制品: '312 件',
      节拍: '48 s',
    },
    camera: {
      position: [18, 14, 54],
      target: [0, 2, 34],
    },
  },
  {
    id: 'warehouse-a',
    name: '原料仓储 A',
    type: 'WAREHOUSE',
    desc: '电芯与结构件原料仓储，支持温湿度分区与 FIFO 出库。',
    stats: {
      库容: '12,400 托',
      占用率: '73%',
      出入库: '186 车/日',
      温区: '双温区',
    },
    camera: {
      position: [-58, 22, 36],
      target: [-52, 4, 18],
    },
  },
  {
    id: 'warehouse-b',
    name: '成品仓储 B',
    type: 'WAREHOUSE',
    desc: '模组与 PACK 成品仓，对接发运月台与港口集卡通道。',
    stats: {
      库容: '8,600 托',
      占用率: '61%',
      出库时效: '2.1 h',
      月台: '6 位',
    },
    camera: {
      position: [72, 24, 48],
      target: [48, 4, 28],
    },
  },
  {
    id: 'port',
    name: '港区码头',
    type: 'PORT',
    desc: '沿江散杂货码头，负责原料进口与成品模块出运。',
    stats: {
      泊位: '3 个',
      岸桥: '2 台',
      在港箱量: '1,240 TEU',
      今日吞吐: '486 TEU',
    },
    camera: {
      position: [-18, 34, -78],
      target: [2, 5, -44],
    },
  },
  {
    id: 'control',
    name: '中控中心',
    type: 'CONTROL',
    desc: '基地调度与数字孪生监控中心，汇聚产线、仓储与港口实时数据。',
    stats: {
      监控点位: '1,024',
      告警: '0 条',
      值班席位: '8',
      联网率: '100%',
    },
    camera: {
      position: [18, 18, 28],
      target: [16, 4, 12],
    },
  },
];

export const globalMetrics = {
  online: facilities.length,
  output: '2.4k',
  throughput: '486',
  status: '正常',
};

export const processLayers = [
  { key: 'tray', label: '底托' },
  { key: 'cells', label: '电芯组' },
  { key: 'busbar', label: '汇流排' },
  { key: 'insulator', label: '绝缘罩' },
  { key: 'cover', label: '顶盖' },
];
