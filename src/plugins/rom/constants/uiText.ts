export const ROM_TEXTS = {
  title: '关节活动度筛查',
  description: '面向筛查场景记录各关节活动范围，比较左右差异并为后续复测留档。',
  joints: {
    cervical: '颈椎',
    shoulder: '肩关节',
    elbow: '肘关节',
    wrist: '腕关节',
    hip: '髋关节',
    knee: '膝关节',
    ankle: '踝关节',
  },
  directions: {
    flexion: '屈曲',
    extension: '伸展',
    abduction: '外展',
    adduction: '内收',
    internal_rotation: '内旋',
    external_rotation: '外旋',
  },
  status: {
    normal: '正常',
    limited: '活动受限',
    excessive: '活动过度',
  },
  messages: {
    start: '准备就绪后开始采集。',
    measuring: '正在采集中，请保持动作稳定。',
    completed: '本次测量已完成。',
    save: '保存筛查结果',
  },
} as const;

export const getROMDirectionLabel = (
  joint: keyof typeof ROM_TEXTS.joints,
  direction: keyof typeof ROM_TEXTS.directions,
) => {
  if (joint === 'cervical') {
    if (direction === 'internal_rotation') {
      return '左旋';
    }
    if (direction === 'external_rotation') {
      return '右旋';
    }
    if (direction === 'abduction') {
      return '左侧屈';
    }
    if (direction === 'adduction') {
      return '右侧屈';
    }
  }

  return ROM_TEXTS.directions[direction];
};

export const getROMSideLabel = (joint: keyof typeof ROM_TEXTS.joints, side: 'left' | 'right') => {
  if (joint === 'cervical') {
    return '中线位';
  }

  return side === 'left' ? '左侧' : '右侧';
};
