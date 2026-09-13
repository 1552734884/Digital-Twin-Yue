/** 细节镜头与巡游点位 */
export const detailCameras = [
  {
    id: 'overview',
    label: '基地总览',
    position: [105, 72, 125],
    target: [0, 4, -12],
    duration: 3.5,
  },
  {
    id: 'workshop',
    label: '车间',
    position: [42, 28, 36],
    target: [0, 8, 0],
    duration: 3.2,
  },
  {
    id: 'arm',
    label: '机械臂',
    position: [-10, 7, 44],
    target: [-2, 3.2, 34],
    duration: 3.0,
  },
  {
    id: 'inspection',
    label: '检测工位',
    position: [14, 6.5, 42],
    target: [7, 2.2, 35],
    duration: 3.0,
  },
  {
    id: 'port',
    label: '港口码头',
    position: [-28, 22, -18],
    target: [0, 5, -44],
    duration: 3.4,
  },
  {
    id: 'wh-a',
    label: '原料仓储',
    position: [-30, 18, 42],
    target: [-52, 5, 18],
    duration: 3.0,
  },
];

export function getCameraById(id) {
  return detailCameras.find((c) => c.id === id) || detailCameras[0];
}
