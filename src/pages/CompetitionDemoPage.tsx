import {
  Activity,
  ArrowRight,
  BrainCircuit,
  FileText,
  Mic2,
  MoveRight,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react';

const workflowSteps = [
  {
    id: '01',
    title: '机构建档与任务发起',
    description: '在学校、班级或训练队伍下快速建档，发起一次筛查任务并锁定本轮采集对象。',
  },
  {
    id: '02',
    title: '视觉采集与异常识别',
    description: '通过三视角体态与动作采集，自动识别头前伸、圆肩、骨盆倾斜和下肢力线异常。',
  },
  {
    id: '03',
    title: 'ROM 定量测量',
    description: '对肩、髋、膝、踝等关键关节进行活动度测量，沉淀可复测、可对比的结构化数据。',
  },
  {
    id: '04',
    title: '语音问询补充归因',
    description: '补充疼痛位置、训练史、生活习惯与诱发动作，帮助解释异常来源和风险背景。',
  },
  {
    id: '05',
    title: '报告归档与复测闭环',
    description: '自动生成正式报告、风险标签和复测建议，进入报告中心持续追踪变化趋势。',
  },
];

const modules = [
  {
    icon: Activity,
    title: 'AI 体态筛查',
    subtitle: 'Vision3',
    description: '完成三视角姿态与动作识别，输出异常部位、偏移指标和风险提示。',
    accent: 'var(--posture)',
    metrics: ['异常点位 6 项', '实时反馈 < 3 秒', '风险分层已联动'],
  },
  {
    icon: MoveRight,
    title: '关节活动度测量',
    subtitle: 'ROM',
    description: '针对关键关节记录活动范围与左右差异，为复测和干预前后对比提供依据。',
    accent: 'var(--rom)',
    metrics: ['肩外展 158°', '髋屈曲差异 9°', '双侧对称度 91%'],
  },
  {
    icon: Mic2,
    title: '结构化语音问询',
    subtitle: 'MedVoice',
    description: '将问询内容整理成主诉、现病史、训练史和处理建议，减少人工整理成本。',
    accent: 'var(--voice)',
    metrics: ['病史字段自动提取', '关键线索 14 项', '摘要实时生成'],
  },
  {
    icon: FileText,
    title: '报告归档中心',
    subtitle: 'Report Hub',
    description: '统一汇总筛查结论、复测建议、干预建议和历史对比结果，支持导出与留档。',
    accent: 'var(--datacenter)',
    metrics: ['正式报告一键导出', '历史趋势持续留档', '适配学校与机构汇报'],
  },
];

const metricsOverview = [
  { label: '单次筛查时长', value: '3-5 分钟', note: '适合批量执行' },
  { label: '机构管理维度', value: '学校 / 班级 / 队伍', note: '适合组织化场景' },
  { label: '结果产出', value: '报告 + 风险 + 复测', note: '支持持续跟踪' },
];

const scoreBars = [
  { label: '筛查完成度', value: 82, color: '#2563eb' },
  { label: '体态稳定性', value: 76, color: '#16a34a' },
  { label: '关节对称性', value: 71, color: '#0f9b8e' },
  { label: '复测优先级', value: 64, color: '#f59e0b' },
];

const milestones = [
  '同一工作流覆盖筛查、归档、预警和复测，不再依赖零散工具拼接。',
  '适配校园筛查、青训机构和体教融合场景，强调批量执行与趋势追踪。',
  '把单次检测升级为可持续监控的学生体态档案体系。',
];

const scenarios = [
  {
    title: '学校筛查',
    description: '服务学校与校队，完成班级级别筛查、异常学生标记、复测提醒与学期汇总。',
  },
  {
    title: '青训机构',
    description: '用于训练前后姿态监控、关节活动度追踪和运动风险预警，提高训练管理标准化程度。',
  },
  {
    title: '康复随访',
    description: '保留康复建议与复测能力，支持异常学生或运动员在干预后的阶段性对比。',
  },
];

const valueCards = [
  {
    title: '对机构负责人',
    description: '看到的是完成率、异常率、复测率和组织维度趋势，而不是零散个案。',
  },
  {
    title: '对筛查执行员',
    description: '看到的是标准化采集流程、即时结果反馈和清晰的下一步操作。',
  },
  {
    title: '对家长与教练',
    description: '看到的是易解释的正式报告、风险提示和可执行的后续建议。',
  },
];

export function CompetitionDemoPage() {
  return (
    <div className="competition-shell">
      <div className="competition-ambient competition-ambient-a" />
      <div className="competition-ambient competition-ambient-b" />

      <header className="competition-topbar">
        <div className="competition-brand">
          <div className="competition-brand-mark">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="competition-brand-title">Adolescent Posture Screening Center</div>
            <div className="competition-brand-subtitle">青少年体态筛查监控中心展示页</div>
          </div>
        </div>
        <nav className="competition-nav">
          <a href="#overview">项目概览</a>
          <a href="#workflow">演示流程</a>
          <a href="#modules">核心模块</a>
          <a href="#value">落地场景</a>
        </nav>
      </header>

      <main className="competition-main">
        <section id="overview" className="hero-panel">
          <div className="hero-copy reveal">
            <div className="hero-badge">
              <ShieldCheck size={16} />
              面向答辩、汇报与对外展示的演示版本
            </div>
            <h1>
              用多模态 AI 重构
              <span className="text-gradient"> 青少年体态筛查 </span>
              与持续监控流程
            </h1>
            <p>
              面向学校、青训机构和体教融合场景，构建集体态识别、关节活动度测量、语音问询和报告归档于一体的筛查监控中心。
            </p>
            <div className="hero-actions">
              <a className="hero-primary" href="#workflow">
                查看演示流程
                <ArrowRight size={16} />
              </a>
              <a className="hero-secondary" href="#modules">
                查看核心模块
              </a>
            </div>
            <div className="hero-milestones">
              {milestones.map((item) => (
                <div key={item} className="hero-milestone-card">
                  <span className="hero-milestone-dot" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual reveal reveal-delay-2">
            <div className="hero-visual-card hero-visual-card-main">
              <div className="hero-visual-header">
                <span className="hero-visual-tag">Realtime Screening</span>
                <span className="hero-visual-tag muted">Vision + ROM + Voice</span>
              </div>
              <div className="hero-human-grid">
                <div className="human-outline">
                  <div className="joint-dot head" />
                  <div className="joint-dot shoulder-left" />
                  <div className="joint-dot shoulder-right" />
                  <div className="joint-dot pelvis-left" />
                  <div className="joint-dot pelvis-right" />
                  <div className="joint-dot knee-left" />
                  <div className="joint-dot knee-right" />
                </div>
                <div className="signal-card signal-card-top">
                  <span>姿态偏移</span>
                  <strong>6 项异常</strong>
                </div>
                <div className="signal-card signal-card-middle">
                  <span>ROM 差异</span>
                  <strong>9°</strong>
                </div>
                <div className="signal-card signal-card-bottom">
                  <span>综合结论</span>
                  <strong>中高复测优先级</strong>
                </div>
              </div>
            </div>

            <div className="hero-visual-card hero-visual-card-side floating-card">
              <div className="mini-stat">
                <span>筛查效率</span>
                <strong>+68%</strong>
              </div>
              <div className="mini-wave">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="mini-caption">多模态结果自动汇总到正式报告</div>
            </div>
          </div>
        </section>

        <section className="stats-grid reveal reveal-delay-1">
          {metricsOverview.map((item) => (
            <article key={item.label} className="stat-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.note}</p>
            </article>
          ))}
        </section>

        <section id="workflow" className="competition-section">
          <div className="section-heading reveal">
            <span>演示主线</span>
            <h2>让评委在 60 秒内看懂从采集到报告的完整闭环</h2>
            <p>页面按“建档、采集、分析、归档、复测”顺序展开，适合作为答辩主屏或项目介绍首页。</p>
          </div>
          <div className="workflow-timeline">
            {workflowSteps.map((step, index) => (
              <article
                key={step.id}
                className={`workflow-card reveal ${index % 2 === 0 ? 'reveal-delay-1' : 'reveal-delay-2'}`}
              >
                <div className="workflow-index">{step.id}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="modules" className="competition-section">
          <div className="section-heading reveal">
            <span>核心模块</span>
            <h2>四个模块支撑筛查、报告和复测的完整业务链路</h2>
            <p>每个模块都明确输入、处理过程和输出结果，避免页面只停留在概念介绍层。</p>
          </div>
          <div className="module-grid">
            {modules.map(({ icon: Icon, title, subtitle, description, accent, metrics }, index) => (
              <article
                key={title}
                className={`module-card reveal ${index < 2 ? 'reveal-delay-1' : 'reveal-delay-2'}`}
                style={{ ['--module-accent' as string]: accent }}
              >
                <div className="module-icon">
                  <Icon size={20} />
                </div>
                <div className="module-copy">
                  <span>{subtitle}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <div className="module-metrics">
                  {metrics.map((metric) => (
                    <div key={metric} className="module-metric-pill">
                      {metric}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="competition-section data-showcase">
          <div className="data-panel reveal">
            <div className="section-heading compact">
              <span>数据呈现</span>
              <h2>用结构化结果证明系统已经具备真实业务价值</h2>
              <p>重点展示筛查结果如何被量化、分层和沉淀，而不是停留在“识别出了问题”的表述上。</p>
            </div>
            <div className="score-list">
              {scoreBars.map((item) => (
                <div key={item.label} className="score-item">
                  <div className="score-item-head">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <div className="score-track">
                    <div className="score-fill" style={{ width: `${item.value}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="insight-panel reveal reveal-delay-2">
            <div className="insight-card insight-card-primary">
              <BrainCircuit size={20} />
              <div>
                <span>AI 综合判断</span>
                <strong>存在肩颈代偿与髋膝链失衡，建议进入二级复测并补充训练干预。</strong>
              </div>
            </div>
            <div className="insight-card">
              <Stethoscope size={20} />
              <div>
                <span>语音问询摘要</span>
                <strong>久坐、训练后腰酸、右侧肩峰压痛，近两周加重。</strong>
              </div>
            </div>
            <div className="report-preview">
              <div className="report-preview-header">
                <span>自动报告片段</span>
                <strong>结构化结论</strong>
              </div>
              <ul>
                <li>体态筛查提示圆肩与轻度骨盆前倾。</li>
                <li>右肩外展活动受限，建议补充肩袖稳定训练。</li>
                <li>建议 2 周后复测，对比训练前后变化。</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="value" className="competition-section">
          <div className="section-heading reveal">
            <span>落地场景</span>
            <h2>这不是单点检测工具，而是面向机构使用的筛查监控平台</h2>
            <p>要讲清楚谁会使用它、在什么流程里使用它，以及结果如何进入后续管理和复测闭环。</p>
          </div>
          <div className="scenario-grid">
            {scenarios.map((scenario, index) => (
              <article
                key={scenario.title}
                className={`scenario-card reveal ${index === 0 ? 'reveal-delay-1' : 'reveal-delay-2'}`}
              >
                <h3>{scenario.title}</h3>
                <p>{scenario.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="competition-section">
          <div className="section-heading reveal">
            <span>价值对象</span>
            <h2>页面同时要说服管理者、执行者和结果接收方</h2>
            <p>这部分用于把产品价值从“技术能力”翻译成“角色收益”，更适合答辩和路演。</p>
          </div>
          <div className="scenario-grid">
            {valueCards.map((card, index) => (
              <article
                key={card.title}
                className={`scenario-card reveal ${index === 1 ? 'reveal-delay-2' : 'reveal-delay-1'}`}
              >
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="competition-footer reveal">
          <div>
            <span className="competition-footer-label">讲解建议</span>
            <h2>先讲筛查痛点，再讲闭环流程，最后用报告和复测说明平台价值。</h2>
          </div>
          <a className="hero-primary" href="#overview">
            返回顶部
            <ArrowRight size={16} />
          </a>
        </section>
      </main>
    </div>
  );
}
