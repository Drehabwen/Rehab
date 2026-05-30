import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Send, 
  Smartphone, 
  UserCheck, 
  RefreshCw, 
  ArrowLeft, 
  Check,
  AlertCircle,
  BarChart2,
  TrendingUp
} from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';
import { usePatientStore } from '@/store/usePatientStore';
import { IntegrationService } from '@/services/integrationService';
import { db } from '@/lib/db';
import type { Assessment, ScaleAssessmentData, ScaleAnswer } from '@/types/assessment';
import { Button, Card } from '@/components/ui';

interface ScaleAssessmentPanelProps {
  patientId: string;
  sessionId: string;
  onBack: () => void;
}

interface ScaleTemplate {
  id: 'SRS-22' | 'ODI' | 'VAS' | 'MBI' | 'Berg' | 'MMT' | 'MAS';
  name: string;
  description: string;
  maxScore: number;
  questions: {
    id: number;
    text: string;
    category: 'pain' | 'function' | 'self_image' | 'mental_health' | 'satisfaction';
    options: { score: number; text: string }[];
  }[];
}

const SCALE_TEMPLATES: ScaleTemplate[] = [
  {
    id: 'SRS-22',
    name: 'SRS-22 脊柱侧弯患者问卷',
    description: '用于评估青少年及成人脊柱侧弯患者的功能活动、疼痛、自我形象、精神健康以及对治疗的满意度。',
    maxScore: 25,
    questions: [
      {
        id: 1,
        text: '在过去 6 个月中，您觉得背部的疼痛程度如何？',
        category: 'pain',
        options: [
          { score: 1, text: '极度疼痛' },
          { score: 2, text: '重度疼痛' },
          { score: 3, text: '中度疼痛' },
          { score: 4, text: '轻度疼痛' },
          { score: 5, text: '完全无痛' }
        ]
      },
      {
        id: 2,
        text: '因为背部原因，您的日常家务、学习等活动受限程度如何？',
        category: 'function',
        options: [
          { score: 1, text: '极度受限' },
          { score: 2, text: '严重受限' },
          { score: 3, text: '中度受限' },
          { score: 4, text: '轻微受限' },
          { score: 5, text: '完全不受限' }
        ]
      },
      {
        id: 3,
        text: '您如何评价自己穿衣服时的外观与体态形象？',
        category: 'self_image',
        options: [
          { score: 1, text: '非常不满意' },
          { score: 2, text: '不满意' },
          { score: 3, text: '中立' },
          { score: 4, text: '满意' },
          { score: 5, text: '非常满意' }
        ]
      },
      {
        id: 4,
        text: '在过去的一个月中，您有多少时间感到焦虑或情绪沮丧？',
        category: 'mental_health',
        options: [
          { score: 1, text: '几乎总是' },
          { score: 2, text: '经常如此' },
          { score: 3, text: '有时如此' },
          { score: 4, text: '很少如此' },
          { score: 5, text: '从未如此' }
        ]
      },
      {
        id: 5,
        text: '您对目前进行的脊柱侧弯针对性康复训练效果感到满意吗？',
        category: 'satisfaction',
        options: [
          { score: 1, text: '非常不满意' },
          { score: 2, text: '不满意' },
          { score: 3, text: '中立' },
          { score: 4, text: '满意' },
          { score: 5, text: '非常满意' }
        ]
      }
    ]
  },
  {
    id: 'ODI',
    name: 'ODI 功能障碍指数量表',
    description: '下背痛（腰椎病）患者的常用评估表，评估日常生活活动障碍程度。',
    maxScore: 25,
    questions: [
      {
        id: 1,
        text: '背痛对您目前疼痛强度的影响程度：',
        category: 'pain',
        options: [
          { score: 1, text: '疼痛极度剧烈，无法忍受' },
          { score: 2, text: '疼痛很重，不吃药无法工作' },
          { score: 3, text: '疼痛较重，但吃药可缓解' },
          { score: 4, text: '轻微疼痛，无需服药' },
          { score: 5, text: '完全没有背痛' }
        ]
      },
      {
        id: 2,
        text: '背痛对您日常生活自理（洗漱、穿衣）的影响：',
        category: 'function',
        options: [
          { score: 1, text: '完全无法自理，需要他人全天照料' },
          { score: 2, text: '非常困难，需要部分帮助' },
          { score: 3, text: '有些困难，动作缓慢但可独立完成' },
          { score: 4, text: '轻度影响，偶尔需要注意姿势' },
          { score: 5, text: '完全没有任何障碍，非常轻松' }
        ]
      },
      {
        id: 3,
        text: '背痛对您提重物能力的影响：',
        category: 'function',
        options: [
          { score: 1, text: '完全无法提起任何地上的物品' },
          { score: 2, text: '只能提起较轻物品，十分困难' },
          { score: 3, text: '可以提起中等重物，但会诱发疼痛' },
          { score: 4, text: '只能轻度限制提拿非常沉重的物品' },
          { score: 5, text: '完全不受限，可提拿任何重物' }
        ]
      },
      {
        id: 4,
        text: '背痛对您社交生活（外出、游玩）的影响：',
        category: 'self_image',
        options: [
          { score: 1, text: '完全没有任何社交，被迫闭门不出' },
          { score: 2, text: '社交受到严重限制，无法外出' },
          { score: 3, text: '社交有些许影响，只能局限于近处' },
          { score: 4, text: '社交基本无影响，但稍微缩短时间' },
          { score: 5, text: '完全没有影响，社交生活极其丰富' }
        ]
      },
      {
        id: 5,
        text: '您对目前腰椎康复方案和自愈信心的情绪状态：',
        category: 'mental_health',
        options: [
          { score: 1, text: '极度焦虑恐慌，感觉无法恢复' },
          { score: 2, text: '比较沮丧，偶尔感到焦虑' },
          { score: 3, text: '情绪中立，顺其自然' },
          { score: 4, text: '比较乐观，对恢复充满希望' },
          { score: 5, text: '充满绝对信心，积极乐观配合' }
        ]
      }
    ]
  },
  {
    id: 'VAS',
    name: 'VAS 疼痛视觉模拟评分',
    description: '采用最常用的直观分级卡，快速评估患者当下的主观疼痛值。',
    maxScore: 5,
    questions: [
      {
        id: 1,
        text: '请评估您当下身体背部/颈部的主观疼痛级别：',
        category: 'pain',
        options: [
          { score: 1, text: '剧烈疼痛（痛苦不堪，影响睡眠）' },
          { score: 2, text: '重度疼痛（疼痛难忍，影响日常）' },
          { score: 3, text: '中度疼痛（明显疼痛，但可忍受）' },
          { score: 4, text: '轻度疼痛（轻微隐痛，不影响工作）' },
          { score: 5, text: '完全无痛（身体感觉极其轻松）' }
        ]
      }
    ]
  },
  {
    id: 'MBI',
    name: 'MBI 改良 Barthel 指数',
    description: '日常生活活动能力（ADL）常用评定表，量化自理障碍及独立程度。',
    maxScore: 25,
    questions: [
      {
        id: 1,
        text: '您的进食自理能力（包括准备、使用餐具将食物送入口中）：',
        category: 'function',
        options: [
          { score: 1, text: '完全依赖（需要他人全过程喂食）' },
          { score: 2, text: '极大帮助（需要他人切食物、盛饭等大部分协助）' },
          { score: 3, text: '中度帮助（需要他人轻微协助，如倒水、递餐具）' },
          { score: 4, text: '小部分帮助（能在他人监督或口头提示下完成）' },
          { score: 5, text: '完全独立（能自主顺利完成进食全过程）' }
        ]
      },
      {
        id: 2,
        text: '您的穿衣及个人卫生自理能力（包括系鞋带、扣纽扣、梳头、洗脸等）：',
        category: 'function',
        options: [
          { score: 1, text: '完全依赖（全部活动均需他人完成）' },
          { score: 2, text: '极大帮助（需要他人协助穿脱大部分衣物和个人卫生）' },
          { score: 3, text: '中度帮助（能自己做一半，另一半需协助）' },
          { score: 4, text: '小部分帮助（可独立完成，仅需微小协助如系鞋带）' },
          { score: 5, text: '完全独立（日常穿戴、个人卫生毫无阻碍和困难）' }
        ]
      },
      {
        id: 3,
        text: '您的如厕及洗澡能力（包括上厕所、使用手纸、洗淋浴等）：',
        category: 'function',
        options: [
          { score: 1, text: '完全依赖（进出浴室、如厕擦拭洗澡均需全人协助）' },
          { score: 2, text: '极大帮助（如厕或洗澡大部分环节需他人大力协助）' },
          { score: 3, text: '中度帮助（需他人少量协助以维持平衡或擦拭）' },
          { score: 4, text: '小部分帮助（可自主完成，但需要有人在旁监护或协助）' },
          { score: 5, text: '完全独立（能轻松且安全地独立如厕、洗澡）' }
        ]
      },
      {
        id: 4,
        text: '您的床椅转移能力（从床上坐起、移至轮椅/椅子以及站起过程）：',
        category: 'function',
        options: [
          { score: 1, text: '完全依赖（完全无法自己移动，需两人抬抱或用吊机）' },
          { score: 2, text: '极大帮助（能自己稍微借力，但仍需一人主力协助）' },
          { score: 3, text: '中度帮助（能自行坐起和站立，但需一人轻微搀扶）' },
          { score: 4, text: '小部分帮助（能独立完成转移，但需要口头提示或监护）' },
          { score: 5, text: '完全独立（床椅之间及站立转移非常轻松自如）' }
        ]
      },
      {
        id: 5,
        text: '您的步行与上下楼梯移动能力（平地步行及上下一个楼层）：',
        category: 'function',
        options: [
          { score: 1, text: '完全依赖（无法行走或上下楼，需完全依靠轮椅或抬抱）' },
          { score: 2, text: '极大帮助（能在一人大力搀扶或使用双拐下极其缓慢移动）' },
          { score: 3, text: '中度帮助（能使用助行器或单拐移动，上下楼梯需人协助）' },
          { score: 4, text: '小部分帮助（能独立行走，上下楼梯需扶扶手或旁人监护）' },
          { score: 5, text: '完全独立（行走自如，能安全独立地上下楼梯）' }
        ]
      }
    ]
  },
  {
    id: 'Berg',
    name: 'Berg 平衡量表',
    description: '平衡能力评估（BBS），针对老年人或神经/肌肉损伤患者的重心及姿势稳定性评估。',
    maxScore: 25,
    questions: [
      {
        id: 1,
        text: '静态站立平衡（双脚并拢站立，无支持）：',
        category: 'function',
        options: [
          { score: 1, text: '完全无法站立，在无支持下极易跌倒（小于10秒）' },
          { score: 2, text: '能站立，但极为摇晃，需要旁人严密保护' },
          { score: 3, text: '能独立站立 1 分钟，但身体重心时有轻微晃动' },
          { score: 4, text: '能安全稳定站立 2 分钟，但心理上略微紧张' },
          { score: 5, text: '极其安全稳定地独立站立 2 分钟以上，身体挺直' }
        ]
      },
      {
        id: 2,
        text: '坐/站转换平衡（从椅子上站起及坐下时的动作平稳度）：',
        category: 'function',
        options: [
          { score: 1, text: '无法自行站起/坐下，需他人抱起或极大力量推扶' },
          { score: 2, text: '能站起/坐下，但动作极其笨重且需要借助双手和支撑物' },
          { score: 3, text: '能自主站起/坐下，但需尝试多次或动作明显缓慢吃力' },
          { score: 4, text: '能独立平稳完成站起与坐下，但动作稍慢或需微调姿态' },
          { score: 5, text: '非常快速、优美且平稳地独立完成站起与坐下' }
        ]
      },
      {
        id: 3,
        text: '感官受限或窄支撑面稳定性（如闭眼站立或单脚站立过渡）：',
        category: 'function',
        options: [
          { score: 1, text: '一旦闭眼或改变支撑面会立即倾斜，完全无法维持平衡' },
          { score: 2, text: '能短时间闭眼或单脚站立（小于3秒），但身体剧烈摇晃' },
          { score: 3, text: '能闭眼稳定站立 10 秒，但更换单脚支撑时较困难' },
          { score: 4, text: '能稳定闭眼站立 15 秒以上，单脚短时站立可维持 5 秒' },
          { score: 5, text: '闭眼站立极其稳定，单脚站立能轻松维持 10 秒以上' }
        ]
      },
      {
        id: 4,
        text: '重心移动与伸展能力（站立时躯干前屈、左右侧屈及弯腰拾物）：',
        category: 'function',
        options: [
          { score: 1, text: '弯腰或前伸会立刻失去平衡，需旁人搀扶和保护' },
          { score: 2, text: '只能做微小幅度的弯腰或前伸（前伸小于5厘米），身体不稳' },
          { score: 3, text: '能前伸或弯腰，但动作僵硬、代偿明显，且拾物时需扶物' },
          { score: 4, text: '能独立平稳前伸（大于12厘米）或弯腰从地上捡起物品' },
          { score: 5, text: '躯干前伸、侧弯角度极大且极其灵活平稳，轻松弯腰拾物' }
        ]
      },
      {
        id: 5,
        text: '动态旋转与跨越平衡（360度转身、双脚交替踏台或跨越障碍）：',
        category: 'function',
        options: [
          { score: 1, text: '转身或踏步时极易倾斜甚至跌倒，无法独立完成该项' },
          { score: 2, text: '能在搀扶下缓慢转身，交替踏台时身体控制极差' },
          { score: 3, text: '能独立完成 360 度转身或踏台，但动作缓慢且需十分小心' },
          { score: 4, text: '能独立转身和快速交替踏台，动作连贯，偶有轻微失衡' },
          { score: 5, text: '动作非常敏捷、连贯，转身与踏步平稳，无任何失衡迹象' }
        ]
      }
    ]
  },
  {
    id: 'MMT',
    name: 'MMT 徒手肌力检查',
    description: '临床 0-5 级标准肌力检查，评估核心及肢体主要肌群抗阻力及抗重力表现。',
    maxScore: 25,
    questions: [
      {
        id: 1,
        text: '躯干核心与腹背肌群肌力（屈颈、仰卧起坐及挺胸动作表现）：',
        category: 'function',
        options: [
          { score: 1, text: '0-1级（无腹肌收缩或仅能微弱摸到腹肌紧张，无法抬头）' },
          { score: 2, text: '2级（能排除重力在侧卧位微弱完成躯干屈伸动作）' },
          { score: 3, text: '3级（抗重力下能勉强完成双肩离床的半仰卧起坐动作）' },
          { score: 4, text: '4级（抗中等阻力，双手交叉于胸前能轻松完成仰卧起坐）' },
          { score: 5, text: '5级（正常，双手抱于头后能轻松对抗重力及最大阻力起身）' }
        ]
      },
      {
        id: 2,
        text: '上肢与肩带主要肌群肌力（肩外展、肘屈伸及抓握力）：',
        category: 'function',
        options: [
          { score: 1, text: '0-1级（肌肉完全无收缩，或仅能触及肱二/三头肌微弱收缩）' },
          { score: 2, text: '2级（在平铺台面上排除重力做肘部完全屈伸或肩外展）' },
          { score: 3, text: '3级（能抗重力自主将双臂举过头顶或屈肘，但无法抗任何阻力）' },
          { score: 4, text: '4级（能抗中等阻力抬臂及屈肘，握力良好但健侧对比稍弱）' },
          { score: 5, text: '5级（正常，双臂肌肉丰满有力，能对抗最大阻力且双侧对称）' }
        ]
      },
      {
        id: 3,
        text: '髋部与大腿近端肌群肌力（仰卧抬腿、抗阻屈髋及股四头肌肌力）：',
        category: 'function',
        options: [
          { score: 1, text: '0-1级（大腿近端肌肉完全无收缩，触摸股四头肌无任何紧张）' },
          { score: 2, text: '2级（侧卧位下能做大腿前屈后伸，或仰卧位在床面上向外展腿）' },
          { score: 3, text: '3级（能独立抗重力完成直腿抬高 45 度以上，但无法承受下压阻力）' },
          { score: 4, text: '4级（能抗中等下压阻力抬大腿，踢腿有力，仅力量略逊于健侧）' },
          { score: 5, text: '5级（正常，股四头肌等主要肌群抗阻力极其强大且双侧完全对称）' }
        ]
      },
      {
        id: 4,
        text: '膝踝远端及小腿肌群肌力（踝关节主动背伸、跖屈及小腿抗阻力量）：',
        category: 'function',
        options: [
          { score: 1, text: '0-1级（无法勾脚或绷脚尖，无任何肌腱收缩反射）' },
          { score: 2, text: '2级（床面侧卧位下，足部能排除重力左右水平摆动）' },
          { score: 3, text: '3级（能对抗重力将脚尖完全勾起（背伸）或紧绷（跖屈））' },
          { score: 4, text: '4级（能对抗中等踩踏/勾脚阻力，仅在大阻力下略有颤抖或吃力）' },
          { score: 5, text: '5级（正常，小腿肌群抗阻力量饱满，可轻松完成足背伸抗大阻力）' }
        ]
      },
      {
        id: 5,
        text: '全身主要肌群的双侧对称性与平衡协调度：',
        category: 'function',
        options: [
          { score: 1, text: '极度不对称（一侧肢体完全瘫痪或废用，左右肌力相差3级以上）' },
          { score: 2, text: '重度不对称（双侧肌力相差 2 级，步行有显著跛行或偏斜）' },
          { score: 3, text: '中度不对称（双侧肌力相差 1 级，抗阻时一侧明显吃力或颤抖）' },
          { score: 4, text: '轻度不对称（双侧基本对称，仅在大阻力最大收缩时感觉微小差异）' },
          { score: 5, text: '完全对称（左右两侧肌力完全均等平衡，协调控制性极其完美）' }
        ]
      }
    ]
  },
  {
    id: 'MAS',
    name: 'MAS 改良 Ashworth 痉挛量表',
    description: '肌张力与痉挛评定，评估肌肉在被动拉伸时的阻力，反映中枢神经受损后的肢体强直状态。',
    maxScore: 25,
    questions: [
      {
        id: 1,
        text: '颈部及躯干旁主要肌群被动运动时的肌张力表现：',
        category: 'function',
        options: [
          { score: 1, text: '4级-强直（受累部分僵硬在屈曲或伸展位，完全无法被动活动）' },
          { score: 2, text: '3级-重度（肌张力严重增高，被动活动极其困难且引起患者痛苦）' },
          { score: 3, text: '2级-中度（肌张力显著增高，但关节在大部分活动范围内仍较易活动）' },
          { score: 4, text: '1/1+级-轻度（被动伸展时在关节活动范围后半段有微小阻力或卡顿）' },
          { score: 5, text: '0级-无肌张力增高（被动屈伸头部及躯干极其顺畅，毫无阻力）' }
        ]
      },
      {
        id: 2,
        text: '上肢屈肌肌群（主要是肱二头肌、腕屈肌）被动拉伸时的阻力：',
        category: 'function',
        options: [
          { score: 1, text: '4级-强直（肘关节或手腕强直呈屈曲状态，无法被动掰开）' },
          { score: 2, text: '3级-重度（上肢屈肌非常紧绷，需要很大力量才能勉强拉直肘关节）' },
          { score: 3, text: '2级-中度（拉伸肘关节时感到大部分行程有阻力，但仍易拉直）' },
          { score: 4, text: '1/1+级-轻度（拉伸肘部在终末端有轻微卡顿或“折刀”阻力）' },
          { score: 5, text: '0级-完全正常（被动拉伸肘部、手腕如行云流水，无阻力）' }
        ]
      },
      {
        id: 3,
        text: '下肢伸肌肌群（主要是股四头肌、小腿三头肌）被动拉伸时的阻力：',
        category: 'function',
        options: [
          { score: 1, text: '4级-强直（下肢屈膝或背伸极度僵硬，呈尖足或直腿强直状态）' },
          { score: 2, text: '3级-重度（股四头肌或腓肠肌严重紧张，被动屈膝或勾脚极其困难）' },
          { score: 3, text: '2级-中度（被动曲髋屈膝的大部分活动度内感觉阻力，但仍可完成）' },
          { score: 4, text: '1/1+级-轻度（被动屈膝时在末段有瞬间轻微卡顿，其余行程流畅）' },
          { score: 5, text: '0级-完全正常（被动伸屈髋膝、踝关节极其松弛顺畅，无异常）' }
        ]
      },
      {
        id: 4,
        text: '关节处于被动运动时，阻力出现的持续行程及代偿感觉：',
        category: 'function',
        options: [
          { score: 1, text: '全程极重阻力（关节被动伸展的起点到终点全程均有极其沉重的阻力）' },
          { score: 2, text: '大部分行程有显著阻力（在关节运动过半的行程中均有沉重的阻力感）' },
          { score: 3, text: '半程阻力（阻力出现在被动运动的后半部分，需用力才能克服）' },
          { score: 4, text: '瞬间阻力（仅在关节开始运动或到达终点时出现瞬间的轻微抓握感）' },
          { score: 5, text: '零阻力（被动运动的全程各个角度都均匀轻松，无任何阻力）' }
        ]
      },
      {
        id: 5,
        text: '受累关节的主动或被动活动度终端僵硬程度与痉挛频次：',
        category: 'function',
        options: [
          { score: 1, text: '极重度僵硬（活动终端呈持续性剧烈痉挛，被动活动有明显坚硬感，频繁发作）' },
          { score: 2, text: '重度僵硬（被动活动终末端出现强烈阻力，活动度受限，偶见阵挛或频繁颤抖）' },
          { score: 3, text: '中度僵硬（终端有明显阻力，但能克服并完成全范围活动，痉挛偶尔发作）' },
          { score: 4, text: '轻度僵硬（仅在终端有轻微卡顿或瞬时抓握阻力，无明显痉挛发作）' },
          { score: 5, text: '完全正常（终端只有生理性软挡阻力，活动极顺畅，绝无任何痉挛）' }
        ]
      }
    ]
  }
];

export const ScaleAssessmentPanel: React.FC<ScaleAssessmentPanelProps> = ({
  patientId,
  sessionId,
  onBack
}) => {
  const { importScaleAssessment, patients } = usePatientStore();
  const patient = patients.find(p => p.id === patientId);
  const patientName = patient?.name || '';
  
  // UI states
  const [selectedTemplate, setSelectedTemplate] = useState<ScaleTemplate>(SCALE_TEMPLATES[0]);
  const [pastScales, setPastScales] = useState<Assessment[]>([]);
  const [inClinicAnswers, setInClinicAnswers] = useState<Record<number, { score: number; text: string }>>({});
  const [fillingMode, setFillingMode] = useState<'selection' | 'inClinic' | 'remoteWait'>('selection');
  
  // Remote Push task details
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<'idle' | 'pushing' | 'pending' | 'completed'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load patient's past scale records from IndexedDB
  const loadPastScaleRecords = async () => {
    try {
      const records = await db.assessments
        .where('patientId')
        .equals(patientId)
        .filter(a => a.type === 'scale')
        .toArray();
      // Sort descending by createdAt
      records.sort((a, b) => b.createdAt - a.createdAt);
      setPastScales(records);
    } catch (err) {
      console.error('Failed to load past scale records', err);
    }
  };

  useEffect(() => {
    loadPastScaleRecords();
  }, [patientId]);

  // Handle in-clinic form submit
  const handleInClinicSubmit = async () => {
    // Validate all questions filled
    const unfilled = selectedTemplate.questions.filter(q => !inClinicAnswers[q.id]);
    if (unfilled.length > 0) {
      alert(`请完整填答所有问题！还有 ${unfilled.length} 道题未选择。`);
      return;
    }

    try {
      const answers: ScaleAnswer[] = selectedTemplate.questions.map(q => ({
        questionId: q.id,
        questionText: q.text,
        category: q.category,
        score: inClinicAnswers[q.id].score,
        answerText: inClinicAnswers[q.id].text
      }));

      // Calculate totals
      const totalScore = answers.reduce((sum, item) => sum + item.score, 0);
      const maxScore = selectedTemplate.maxScore;
      const percentageScore = Math.round((totalScore / maxScore) * 10000) / 100;

      // Extract average dimensions
      const getCategoryAvg = (cat: string) => {
        const catAnswers = answers.filter(a => a.category === cat);
        if (catAnswers.length === 0) return 5.0; // Default excellent/normal score
        return Math.round((catAnswers.reduce((s, a) => s + a.score, 0) / catAnswers.length) * 10) / 10;
      };

      const dimensions = {
        functionActive: getCategoryAvg('function'),
        pain: getCategoryAvg('pain'),
        selfImage: getCategoryAvg('self_image'),
        mentalHealth: getCategoryAvg('mental_health'),
        satisfaction: getCategoryAvg('satisfaction')
      };

      const aiInterpretation = `临床店内录入评定。患者评定总得分 ${totalScore}/${maxScore} (${percentageScore}%)。各子维度情况如下：功能活动平均 ${dimensions.functionActive}分，疼痛耐受度平均 ${dimensions.pain}分，体态形象评定 ${dimensions.selfImage}分，精神健康评定 ${dimensions.mentalHealth}分。综合提示患者处于良性康复恢复期。`;

      const scaleData: ScaleAssessmentData = {
        scaleId: selectedTemplate.id,
        scaleName: selectedTemplate.name,
        filledBy: 'therapist',
        totalScore,
        maxScore,
        percentageScore,
        dimensions,
        answers,
        aiInterpretation,
        createdAt: Date.now()
      };

      await importScaleAssessment(patientId, scaleData, sessionId);
      await loadPastScaleRecords();
      
      // Reset & go back
      setInClinicAnswers({});
      setFillingMode('selection');
      alert('量表录入成功，结果已归档！');
    } catch (err) {
      alert(`保存失败: ${err instanceof Error ? err.message : err}`);
    }
  };

  // Push remote scale task to chatbot
  const handlePushRemoteScale = async () => {
    setPushStatus('pushing');
    setErrorMsg(null);
    try {
      const response = await IntegrationService.pushScaleTask({
        patient_id: patientId,
        patient_name: patientName,
        session_id: sessionId,
        scale_id: selectedTemplate.id,
        therapist_name: '王康复师'
      });
      
      setActiveTaskId(response.task_id);
      setPushStatus('pending');
      setFillingMode('remoteWait');
    } catch (err) {
      setPushStatus('idle');
      setErrorMsg(err instanceof Error ? err.message : '远程下发推送失败，请检查网络！');
    }
  };

  // Poll for completion of remote scale task
  const checkRemoteTaskResults = async () => {
    if (!activeTaskId) return;
    try {
      const results = await IntegrationService.getScaleResults(sessionId);
      const currentTaskResult = results.find(r => r.task_id === activeTaskId);
      
      if (currentTaskResult && currentTaskResult.status === 'completed' && currentTaskResult.scale_data) {
        setPushStatus('completed');
        // Import into local Dexie store
        await importScaleAssessment(patientId, currentTaskResult.scale_data, sessionId);
        await loadPastScaleRecords();
        alert('家长已在手机端填答完成！量表得分及雷达图已同步刷新！');
        setFillingMode('selection');
        setActiveTaskId(null);
        setPushStatus('idle');
      } else {
        // Not completed yet
        alert('患者或家长尚未提交，请在手机端点击卡片完成答题后再点同步！');
      }
    } catch (err) {
      alert('同步失败，请重试！');
    }
  };

  // Cancel remote waiting
  const handleCancelWait = () => {
    setActiveTaskId(null);
    setPushStatus('idle');
    setFillingMode('selection');
  };

  // Format Recharts data for multi-round comparisons
  const getRadarChartData = () => {
    const dimensionsList = [
      { key: 'pain', label: '疼痛耐受 (Pain)' },
      { key: 'functionActive', label: '功能活动 (Function)' },
      { key: 'selfImage', label: '自我形象 (Self Image)' },
      { key: 'mentalHealth', label: '精神健康 (Mental)' },
      { key: 'satisfaction', label: '疗效满意 (Satisfaction)' }
    ];

    if (pastScales.length === 0) {
      return dimensionsList.map(d => ({
        subject: d.label,
        '标准参考': 5,
        '当前水平': 3
      }));
    }

    const latest = pastScales[0].data.scale;
    const baseline = pastScales.length > 1 ? pastScales[pastScales.length - 1].data.scale : null;

    return dimensionsList.map(d => {
      const dataPoint: any = {
        subject: d.label,
        '标准参考': 5.0,
      };

      if (latest) {
        dataPoint['最近评定'] = latest.dimensions[d.key as keyof typeof latest.dimensions] || 5.0;
      }
      if (baseline) {
        dataPoint['基线对照'] = baseline.dimensions[d.key as keyof typeof baseline.dimensions] || 5.0;
      }

      return dataPoint;
    });
  };

  const radarData = getRadarChartData();

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-800 overflow-y-auto custom-scrollbar p-6">
      
      {/* Workspace header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100/50" onClick={onBack}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <ClipboardList className="text-teal-600 animate-pulse" />
              康复量表评定中心
            </h1>
            <p className="text-xs text-slate-500 mt-1">临床 SOAP 规范的 S (Subjective) 主观维度多端联调控制舱</p>
          </div>
        </div>

        <div className="flex gap-2">
          {fillingMode === 'selection' && (
            <>
              <Button 
                variant="outline" 
                className="bg-white hover:bg-slate-50 hover:text-slate-900 text-slate-700 border-slate-200 shadow-sm text-xs py-1.5"
                onClick={() => setFillingMode('inClinic')}
              >
                <UserCheck size={14} className="mr-1 text-teal-600" />
                店内现场录入 (iPad)
              </Button>
              <Button 
                variant="primary" 
                className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs py-1.5 border-none shadow-sm shadow-teal-500/10"
                onClick={handlePushRemoteScale}
              >
                <Send size={14} className="mr-1" />
                远程下发至家长 Chatbot
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main double column workspace */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        
        {/* Left Interactive area */}
        <div className="space-y-6">
          {fillingMode === 'selection' && (
            <Card className="border-slate-200/80 bg-white/95 shadow-md shadow-slate-100/50 backdrop-blur-md p-5 rounded-2xl">
              <div className="text-sm font-black text-slate-900 mb-4">第一步：选择量表评定模板</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SCALE_TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplate.id === tpl.id;
                  return (
                    <div 
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${
                        isSelected 
                          ? 'border-teal-500 bg-teal-50/50 shadow-sm text-teal-950 font-bold' 
                          : 'border-slate-250 bg-white/70 text-slate-700 hover:border-slate-350 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold">{tpl.name}</span>
                        {isSelected && <Check size={14} className="text-teal-600" />}
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-550">{tpl.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-xl bg-amber-50/40 border border-amber-200/60 p-4 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="text-amber-600 mt-0.5 shrink-0" size={16} />
                  <div className="text-xs leading-relaxed text-slate-650">
                    <span className="text-amber-700 font-bold">SOAP临床提示：</span>
                    量表结果用于补充患者主观疼痛分级与日常生活功能障碍率。若需要进行侧弯疗效演进对比，建议首诊、中诊、出院前均评定同一种量表（推荐首选 
                    <span className="text-slate-800 mx-0.5 font-black">SRS-22</span>）。
                  </div>
                </div>
              </div>
            </Card>
          )}

          {fillingMode === 'inClinic' && (
            <Card className="border-slate-200 bg-white/95 shadow-md shadow-slate-100/50 rounded-2xl p-5">
              <div className="flex justify-between items-center mb-5 border-b border-slate-150 pb-3">
                <div>
                  <div className="text-sm font-black text-slate-900">店内iPad手工录入录像模式</div>
                  <p className="text-[11px] text-slate-500 mt-1">{selectedTemplate.name}问卷录入</p>
                </div>
                <Button 
                  variant="ghost" 
                  className="text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 py-1"
                  onClick={() => setFillingMode('selection')}
                >
                  取消返回
                </Button>
              </div>

              <div className="space-y-6 max-h-[500px] overflow-y-auto custom-scrollbar pr-2 mb-6">
                {selectedTemplate.questions.map((q, idx) => (
                  <div key={q.id} className="bg-slate-50/60 border border-slate-150/60 p-4 rounded-xl space-y-3 shadow-sm">
                    <div className="text-xs font-black text-slate-800">
                      Q{idx + 1}. {q.text}
                      <span className="ml-2 text-[10px] text-teal-700 font-bold bg-teal-50 border border-teal-200/50 px-1.5 py-0.5 rounded">
                        {q.category === 'pain' ? '疼痛' : q.category === 'function' ? '功能' : q.category === 'self_image' ? '形象' : q.category === 'mental_health' ? '心理' : '治疗满意度'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      {q.options.map((opt) => {
                        const isChosen = inClinicAnswers[q.id]?.score === opt.score;
                        return (
                          <button
                            key={opt.score}
                            onClick={() => setInClinicAnswers({
                              ...inClinicAnswers,
                              [q.id]: { score: opt.score, text: opt.text }
                            })}
                            className={`rounded-xl border p-2.5 text-left text-xs transition-all duration-200 ${
                              isChosen
                                ? 'border-teal-550 bg-teal-50 text-teal-900 font-bold shadow-sm'
                                : 'border-slate-200 bg-white text-slate-650 hover:border-slate-350 hover:bg-slate-50 shadow-sm'
                            }`}
                          >
                            <div className="font-bold text-[10px] text-slate-400 mb-1">{opt.score} 分</div>
                            <div className="text-[10px] leading-tight font-medium">{opt.text}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-150 pt-4">
                <Button 
                  variant="secondary" 
                  className="bg-slate-100 text-slate-700 text-xs hover:bg-slate-200 border-none"
                  onClick={() => setFillingMode('selection')}
                >
                  放弃录入
                </Button>
                <Button 
                  variant="primary" 
                  className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-xs border-none shadow-sm shadow-teal-500/10"
                  onClick={handleInClinicSubmit}
                >
                  <Check size={14} className="mr-1" />
                  提交临床建档
                </Button>
              </div>
            </Card>
          )}

          {fillingMode === 'remoteWait' && (
            <Card className="border-slate-200 bg-white/95 shadow-md shadow-slate-100/50 p-8 rounded-2xl text-center">
              <div className="flex justify-center mb-4">
                <div className="relative flex items-center justify-center">
                  <div className="absolute animate-ping h-14 w-14 rounded-full bg-teal-500/20" />
                  <div className="relative h-12 w-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-200">
                    <Smartphone size={24} className="animate-bounce" />
                  </div>
                </div>
              </div>
              
              <h3 className="text-base font-black text-slate-900 mb-2">已成功推送量表至家长端 Chatbot</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
                正在等待家长在 <span className="text-teal-600 font-bold">Spine Assistant (小柱)</span> 的柔和对话流交互卡片上完成答题。
                在此期间您可以照常进行其他体态或 ROM 评估。
              </p>

              {errorMsg && (
                <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 py-2 rounded-lg max-w-sm mx-auto">
                  {errorMsg}
                </div>
              )}

              <div className="mt-6 flex justify-center gap-3">
                <Button 
                  variant="secondary" 
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 text-xs shadow-sm"
                  onClick={handleCancelWait}
                >
                  取消等待
                </Button>
                <Button 
                  variant="primary" 
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs border-none shadow-sm shadow-teal-500/10"
                  onClick={checkRemoteTaskResults}
                >
                  <RefreshCw size={14} className="mr-1 animate-spin" />
                  手动同步状态
                </Button>
              </div>
            </Card>
          )}

          {/* Past historical records */}
          <div className="space-y-3">
            <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-teal-600 animate-pulse" />
              历史量表评定数据汇总 ({pastScales.length})
            </div>
            
            {pastScales.length === 0 ? (
              <div className="text-center py-8 rounded-2xl bg-white/40 border border-slate-200 text-slate-450 text-xs">
                暂无历史量表评定记录。建议进行一次 SRS-22 首诊评估建档。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {pastScales.map((record) => {
                  const scale = record.data.scale;
                  if (!scale) return null;
                  return (
                    <div 
                      key={record.id}
                      className="rounded-2xl border border-slate-200 bg-white/80 p-4 space-y-3 relative hover:border-slate-350 hover:shadow-md transition-all shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-slate-800">{scale.scaleName}</span>
                          <div className="text-[10px] text-slate-400 mt-1 font-medium">{new Date(scale.createdAt).toLocaleString('zh-CN')}</div>
                        </div>
                        <div className="bg-teal-50 text-teal-700 border border-teal-200/50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          得分: {scale.totalScore}/{scale.maxScore}
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5 py-1.5 text-center border-y border-slate-150/80">
                        <div>
                          <div className="text-[8px] text-slate-450 font-bold uppercase leading-none mb-1">疼痛</div>
                          <span className="text-[10px] font-extrabold text-slate-700">{scale.dimensions.pain}</span>
                        </div>
                        <div>
                          <div className="text-[8px] text-slate-450 font-bold uppercase leading-none mb-1">活动</div>
                          <span className="text-[10px] font-extrabold text-slate-700">{scale.dimensions.functionActive}</span>
                        </div>
                        <div>
                          <div className="text-[8px] text-slate-450 font-bold uppercase leading-none mb-1">形象</div>
                          <span className="text-[10px] font-extrabold text-slate-700">{scale.dimensions.selfImage}</span>
                        </div>
                        <div>
                          <div className="text-[8px] text-slate-450 font-bold uppercase leading-none mb-1">心理</div>
                          <span className="text-[10px] font-extrabold text-slate-700">{scale.dimensions.mentalHealth}</span>
                        </div>
                        <div>
                          <div className="text-[8px] text-slate-450 font-bold uppercase leading-none mb-1">疗效</div>
                          <span className="text-[10px] font-extrabold text-slate-700">{scale.dimensions.satisfaction ?? 5.0}</span>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 leading-normal italic line-clamp-2">
                        {scale.aiInterpretation}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Radar Chart & Analysis */}
        <div className="space-y-6">
          <Card className="border-slate-200/80 bg-white/95 shadow-md shadow-slate-100/50 backdrop-blur-md p-5 rounded-2xl flex flex-col h-full min-h-[450px]">
            <div className="mb-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="text-teal-600" size={16} />
                多维生命质量及疼痛雷达图
              </h3>
              <p className="text-[9px] text-slate-450 font-bold mt-1 uppercase tracking-widest leading-none">SOAP Multi-dimensional Radar Comparison</p>
            </div>

            <div className="flex-1 w-full min-h-[300px] relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#64748b', fontSize: 9 }} stroke="#cbd5e1" />
                  
                  <Radar name="标准上限" dataKey="标准参考" stroke="#cbd5e1" fill="#94a3b8" fillOpacity={0.06} />
                  
                  {pastScales.length > 1 && (
                    <Radar name="基线对照" dataKey="基线对照" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.08} />
                  )}
                  
                  {pastScales.length > 0 && (
                    <Radar name="最近评定" dataKey="最近评定" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                  )}
                  
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                      borderRadius: '16px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 15px 30px -5px rgba(0, 0, 0, 0.05)',
                      padding: '8px 12px',
                      color: '#0f172a'
                    }}
                    itemStyle={{ fontSize: '11px', fontWeight: 700 }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingTop: '10px', color: '#475569' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2">
              <div className="text-xs font-black text-slate-850 flex items-center gap-1">
                <span>康复多维医学解读 (AI Analysis)</span>
              </div>
              {pastScales.length === 0 ? (
                <p className="text-[10px] text-slate-500 leading-normal">
                  等待量表数据录入。系统将自动对比基线期（首次）与本周期量表，通过在疼痛分度、日常受限度、青少年身体形象心理评分等多维度的雷达阴影面积差异，量化康复疗效提升比率。
                </p>
              ) : (
                <p className="text-[10px] text-amber-800 font-medium leading-relaxed italic">
                  {pastScales[0].data.scale?.aiInterpretation}
                </p>
              )}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};
