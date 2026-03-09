export const ROM_TEXTS = {
  title: '关节活动度评估',
  description: '评估患者各关节的活动范围与左右侧差异。',
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
    start: '准备就绪，点击开始测量',
    measuring: '正在测量，请保持动作稳定',
    completed: '测量完成',
    save: '保存评估',
  },
};
