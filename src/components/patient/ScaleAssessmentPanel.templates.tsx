/** Scale templates and admin-level metadata for ScaleAssessmentPanel. */

/** 量表评定分级：控制哪些量表可以下发给家长，哪些必须由康复师执行 */
export type ScaleAdminLevel = 'parent' | 'parent_adapted' | 'clinician_only';

export const ADMIN_LEVEL_LABELS: Record<ScaleAdminLevel, { label: string; color: string; desc: string }> = {
  parent:          { label: '家长自评',   color: 'bg-emerald-100 text-emerald-700 border-emerald-300', desc: '家长可直接在Chatbot端填写' },
  parent_adapted:  { label: '适配版',     color: 'bg-amber-100 text-amber-700 border-amber-300',     desc: '需经过通俗化适配后可下发给家长' },
  clinician_only:  { label: '专业评定',   color: 'bg-red-100 text-red-700 border-red-300',           desc: '必须由康复师在诊所内现场评定' },
};

export interface ScaleTemplate {
  id: 'SRS-22' | 'ODI' | 'VAS' | 'MBI' | 'Berg' | 'MMT' | 'MAS' | 'HAM-A';
  name: string;
  description: string;
  maxScore: number;
  adminLevel: ScaleAdminLevel;
  questions: {
    id: number;
    text: string;
    category: 'pain' | 'function' | 'self_image' | 'mental_health' | 'satisfaction';
    options: { score: number; text: string }[];
  }[];
}

export const SCALE_TEMPLATES: ScaleTemplate[] = [
  {
    id: 'SRS-22', name: 'SRS-22 脊柱侧弯患者问卷',
    description: '用于评估青少年及成人脊柱侧弯患者的功能活动、疼痛、自我形象、精神健康以及对治疗的满意度。',
    maxScore: 25, adminLevel: 'parent',
    questions: [
      { id: 1, text: '在过去 6 个月中，您觉得背部的疼痛程度如何？', category: 'pain', options: [
        { score: 1, text: '极度疼痛' }, { score: 2, text: '重度疼痛' }, { score: 3, text: '中度疼痛' }, { score: 4, text: '轻度疼痛' }, { score: 5, text: '完全无痛' }] },
      { id: 2, text: '因为背部原因，您的日常家务、学习等活动受限程度如何？', category: 'function', options: [
        { score: 1, text: '极度受限' }, { score: 2, text: '严重受限' }, { score: 3, text: '中度受限' }, { score: 4, text: '轻微受限' }, { score: 5, text: '完全不受限' }] },
      { id: 3, text: '您如何评价自己穿衣服时的外观与体态形象？', category: 'self_image', options: [
        { score: 1, text: '非常不满意' }, { score: 2, text: '不满意' }, { score: 3, text: '中立' }, { score: 4, text: '满意' }, { score: 5, text: '非常满意' }] },
      { id: 4, text: '在过去的一个月中，您有多少时间感到焦虑或情绪沮丧？', category: 'mental_health', options: [
        { score: 1, text: '几乎总是' }, { score: 2, text: '经常如此' }, { score: 3, text: '有时如此' }, { score: 4, text: '很少如此' }, { score: 5, text: '从未如此' }] },
      { id: 5, text: '您对目前进行的脊柱侧弯针对性康复训练效果感到满意吗？', category: 'satisfaction', options: [
        { score: 1, text: '非常不满意' }, { score: 2, text: '不满意' }, { score: 3, text: '中立' }, { score: 4, text: '满意' }, { score: 5, text: '非常满意' }] },
    ],
  },
  {
    id: 'ODI', name: 'ODI 功能障碍指数量表',
    description: '下背痛（腰椎病）患者的常用评估表，评估日常生活活动障碍程度。',
    maxScore: 25, adminLevel: 'parent',
    questions: [
      { id: 1, text: '背痛对您目前疼痛强度的影响程度：', category: 'pain', options: [
        { score: 1, text: '疼痛极度剧烈，无法忍受' }, { score: 2, text: '疼痛很重，不吃药无法工作' }, { score: 3, text: '疼痛较重，但吃药可缓解' }, { score: 4, text: '轻微疼痛，无需服药' }, { score: 5, text: '完全没有背痛' }] },
      { id: 2, text: '背痛对您日常生活自理（洗漱、穿衣）的影响：', category: 'function', options: [
        { score: 1, text: '完全无法自理，需要他人全天照料' }, { score: 2, text: '非常困难，需要部分帮助' }, { score: 3, text: '有些困难，动作缓慢但可独立完成' }, { score: 4, text: '轻度影响，偶尔需要注意姿势' }, { score: 5, text: '完全没有任何障碍，非常轻松' }] },
      { id: 3, text: '背痛对您提重物能力的影响：', category: 'function', options: [
        { score: 1, text: '完全无法提起任何地上的物品' }, { score: 2, text: '只能提起较轻物品，十分困难' }, { score: 3, text: '可以提起中等重物，但会诱发疼痛' }, { score: 4, text: '只能轻度限制提拿非常沉重的物品' }, { score: 5, text: '完全不受限，可提拿任何重物' }] },
      { id: 4, text: '背痛对您社交生活（外出、游玩）的影响：', category: 'self_image', options: [
        { score: 1, text: '完全没有任何社交，被迫闭门不出' }, { score: 2, text: '社交受到严重限制，无法外出' }, { score: 3, text: '社交有些许影响，只能局限于近处' }, { score: 4, text: '社交基本无影响，但稍微缩短时间' }, { score: 5, text: '完全没有影响，社交生活极其丰富' }] },
      { id: 5, text: '您对目前腰椎康复方案和自愈信心的情绪状态：', category: 'mental_health', options: [
        { score: 1, text: '极度焦虑恐慌，感觉无法恢复' }, { score: 2, text: '比较沮丧，偶尔感到焦虑' }, { score: 3, text: '情绪中立，顺其自然' }, { score: 4, text: '比较乐观，对恢复充满希望' }, { score: 5, text: '充满绝对信心，积极乐观配合' }] },
    ],
  },
  {
    id: 'VAS', name: 'VAS 疼痛视觉模拟评分',
    description: '采用最常用的直观分级卡，快速评估患者当下的主观疼痛值。',
    maxScore: 5, adminLevel: 'parent',
    questions: [
      { id: 1, text: '请评估您当下身体背部/颈部的主观疼痛级别：', category: 'pain', options: [
        { score: 1, text: '剧烈疼痛（痛苦不堪，影响睡眠）' }, { score: 2, text: '重度疼痛（疼痛难忍，影响日常）' }, { score: 3, text: '中度疼痛（明显疼痛，但可忍受）' }, { score: 4, text: '轻度疼痛（轻微隐痛，不影响工作）' }, { score: 5, text: '完全无痛（身体感觉极其轻松）' }] },
    ],
  },
  {
    id: 'MBI', name: 'MBI 改良 Barthel 指数',
    description: '日常生活活动能力（ADL）常用评定表，量化自理障碍及独立程度。',
    maxScore: 25, adminLevel: 'parent_adapted',
    questions: [
      { id: 1, text: '您的进食自理能力：', category: 'function', options: [
        { score: 1, text: '完全依赖' }, { score: 2, text: '极大帮助' }, { score: 3, text: '中度帮助' }, { score: 4, text: '小部分帮助' }, { score: 5, text: '完全独立' }] },
      { id: 2, text: '您的穿衣及个人卫生自理能力：', category: 'function', options: [
        { score: 1, text: '完全依赖' }, { score: 2, text: '极大帮助' }, { score: 3, text: '中度帮助' }, { score: 4, text: '小部分帮助' }, { score: 5, text: '完全独立' }] },
      { id: 3, text: '您的如厕及洗澡能力：', category: 'function', options: [
        { score: 1, text: '完全依赖' }, { score: 2, text: '极大帮助' }, { score: 3, text: '中度帮助' }, { score: 4, text: '小部分帮助' }, { score: 5, text: '完全独立' }] },
      { id: 4, text: '您的床椅转移能力：', category: 'function', options: [
        { score: 1, text: '完全依赖' }, { score: 2, text: '极大帮助' }, { score: 3, text: '中度帮助' }, { score: 4, text: '小部分帮助' }, { score: 5, text: '完全独立' }] },
      { id: 5, text: '您的步行与上下楼梯移动能力：', category: 'function', options: [
        { score: 1, text: '完全依赖' }, { score: 2, text: '极大帮助' }, { score: 3, text: '中度帮助' }, { score: 4, text: '小部分帮助' }, { score: 5, text: '完全独立' }] },
    ],
  },
  {
    id: 'Berg', name: 'Berg 平衡量表',
    description: '平衡能力评估（BBS），针对老年人或神经/肌肉损伤患者的重心及姿势稳定性评估。',
    maxScore: 25, adminLevel: 'clinician_only',
    questions: [
      { id: 1, text: '静态站立平衡（双脚并拢站立，无支持）：', category: 'function', options: [
        { score: 1, text: '完全无法站立（<10秒）' }, { score: 2, text: '能站立但极为摇晃' }, { score: 3, text: '能独立站立1分钟，时有晃动' }, { score: 4, text: '能安全站立2分钟，略微紧张' }, { score: 5, text: '极其稳定站立2分钟以上' }] },
      { id: 2, text: '坐/站转换平衡（从椅子上站起及坐下）：', category: 'function', options: [
        { score: 1, text: '无法自行站起/坐下' }, { score: 2, text: '需借助双手和支撑物' }, { score: 3, text: '需尝试多次或动作缓慢' }, { score: 4, text: '独立平稳完成，动作稍慢' }, { score: 5, text: '非常快速优美平稳完成' }] },
      { id: 3, text: '闭眼站立或单脚站立稳定性：', category: 'function', options: [
        { score: 1, text: '立即倾斜无法维持' }, { score: 2, text: '短时间维持但剧烈摇晃' }, { score: 3, text: '闭眼站立10秒，单脚困难' }, { score: 4, text: '闭眼15秒以上，单脚5秒' }, { score: 5, text: '闭眼极其稳定，单脚轻松10秒以上' }] },
      { id: 4, text: '重心移动与伸展能力（弯腰拾物）：', category: 'function', options: [
        { score: 1, text: '弯腰即失去平衡' }, { score: 2, text: '仅能微小幅度前伸' }, { score: 3, text: '能前伸弯腰但动作僵硬' }, { score: 4, text: '独立平稳前伸>12cm弯腰拾物' }, { score: 5, text: '躯干灵活伸展极大角度' }] },
      { id: 5, text: '动态旋转与跨越平衡（转身、踏台）：', category: 'function', options: [
        { score: 1, text: '转身即倾斜易跌倒' }, { score: 2, text: '需搀扶缓慢转身' }, { score: 3, text: '独立完成但需十分小心' }, { score: 4, text: '独立连贯完成偶有失衡' }, { score: 5, text: '敏捷连贯无任何失衡' }] },
    ],
  },
  {
    id: 'MMT', name: 'MMT 徒手肌力检查',
    description: '临床 0-5 级标准肌力检查，评估核心及肢体主要肌群抗阻力及抗重力表现。',
    maxScore: 25, adminLevel: 'clinician_only',
    questions: [
      { id: 1, text: '躯干核心与腹背肌群肌力：', category: 'function', options: [
        { score: 1, text: '0-1级' }, { score: 2, text: '2级' }, { score: 3, text: '3级' }, { score: 4, text: '4级' }, { score: 5, text: '5级正常' }] },
      { id: 2, text: '上肢与肩带主要肌群肌力：', category: 'function', options: [
        { score: 1, text: '0-1级' }, { score: 2, text: '2级' }, { score: 3, text: '3级' }, { score: 4, text: '4级' }, { score: 5, text: '5级正常' }] },
      { id: 3, text: '髋部与大腿近端肌群肌力：', category: 'function', options: [
        { score: 1, text: '0-1级' }, { score: 2, text: '2级' }, { score: 3, text: '3级' }, { score: 4, text: '4级' }, { score: 5, text: '5级正常' }] },
      { id: 4, text: '膝踝远端及小腿肌群肌力：', category: 'function', options: [
        { score: 1, text: '0-1级' }, { score: 2, text: '2级' }, { score: 3, text: '3级' }, { score: 4, text: '4级' }, { score: 5, text: '5级正常' }] },
      { id: 5, text: '全身主要肌群的双侧对称性与平衡协调度：', category: 'function', options: [
        { score: 1, text: '极度不对称' }, { score: 2, text: '重度不对称' }, { score: 3, text: '中度不对称' }, { score: 4, text: '轻度不对称' }, { score: 5, text: '完全对称' }] },
    ],
  },
  {
    id: 'MAS', name: 'MAS 改良 Ashworth 痉挛量表',
    description: '肌张力与痉挛评定，评估肌肉在被动拉伸时的阻力。',
    maxScore: 25, adminLevel: 'clinician_only',
    questions: [
      { id: 1, text: '颈部及躯干旁主要肌群被动运动时的肌张力：', category: 'function', options: [
        { score: 1, text: '4级-强直' }, { score: 2, text: '3级-重度' }, { score: 3, text: '2级-中度' }, { score: 4, text: '1/1+级-轻度' }, { score: 5, text: '0级-正常' }] },
      { id: 2, text: '上肢屈肌肌群被动拉伸时的阻力：', category: 'function', options: [
        { score: 1, text: '4级-强直' }, { score: 2, text: '3级-重度' }, { score: 3, text: '2级-中度' }, { score: 4, text: '1/1+级-轻度' }, { score: 5, text: '0级-正常' }] },
      { id: 3, text: '下肢伸肌肌群被动拉伸时的阻力：', category: 'function', options: [
        { score: 1, text: '4级-强直' }, { score: 2, text: '3级-重度' }, { score: 3, text: '2级-中度' }, { score: 4, text: '1/1+级-轻度' }, { score: 5, text: '0级-正常' }] },
      { id: 4, text: '被动运动时阻力出现的持续行程：', category: 'function', options: [
        { score: 1, text: '全程极重阻力' }, { score: 2, text: '大部分行程显著阻力' }, { score: 3, text: '半程阻力' }, { score: 4, text: '瞬间阻力' }, { score: 5, text: '零阻力' }] },
      { id: 5, text: '关节活动终端僵硬程度与痉挛频次：', category: 'function', options: [
        { score: 1, text: '极重度僵硬频繁痉挛' }, { score: 2, text: '重度僵硬偶见阵挛' }, { score: 3, text: '中度僵硬痉挛偶发' }, { score: 4, text: '轻度僵硬无痉挛' }, { score: 5, text: '完全正常' }] },
    ],
  },
  {
    id: 'HAM-A', name: 'HAM-A 汉密尔顿焦虑量表',
    description: '临床经典焦虑症状严重程度评估工具，从焦虑心境、紧张、恐惧、睡眠障碍及躯体化症状五个核心维度评定患者心理状况。',
    maxScore: 25, adminLevel: 'parent_adapted',
    questions: [
      { id: 1, text: '您最近一周感到焦虑、紧张、担忧的频率与程度？', category: 'mental_health', options: [
        { score: 1, text: '极度严重' }, { score: 2, text: '重度' }, { score: 3, text: '中度' }, { score: 4, text: '轻度' }, { score: 5, text: '完全无焦虑' }] },
      { id: 2, text: '您最近一周身体紧张感（肌肉紧绷、坐立不安、易惊吓）：', category: 'mental_health', options: [
        { score: 1, text: '极度严重' }, { score: 2, text: '重度' }, { score: 3, text: '中度' }, { score: 4, text: '轻度' }, { score: 5, text: '完全放松' }] },
      { id: 3, text: '您最近一周是否有莫名的恐惧感？', category: 'mental_health', options: [
        { score: 1, text: '极度严重' }, { score: 2, text: '重度' }, { score: 3, text: '中度' }, { score: 4, text: '轻度' }, { score: 5, text: '毫无恐惧' }] },
      { id: 4, text: '您最近一周的睡眠质量如何？', category: 'function', options: [
        { score: 1, text: '极度严重' }, { score: 2, text: '重度' }, { score: 3, text: '中度' }, { score: 4, text: '轻度' }, { score: 5, text: '睡眠极佳' }] },
      { id: 5, text: '是否出现焦虑相关的躯体不适（头痛、心慌、胃部不适等）：', category: 'pain', options: [
        { score: 1, text: '极度严重' }, { score: 2, text: '重度' }, { score: 3, text: '中度' }, { score: 4, text: '轻度' }, { score: 5, text: '完全无躯体症状' }] },
    ],
  },
];
