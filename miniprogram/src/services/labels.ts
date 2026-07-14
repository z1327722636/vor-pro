/** 全部中文标签枚举，与 PC 端 frontend/lib/labels.ts 一致 */

export type LabelOption = { value: string; label: string }

/* ---- 地图 ---- */
export const mapOptions: LabelOption[] = [
  { value: 'ascent', label: '亚海悬城' },
  { value: 'bind', label: '源工重镇' },
  { value: 'haven', label: '隐世修所' },
  { value: 'split', label: '霓虹町' },
  { value: 'icebox', label: '森寒冬港' },
  { value: 'breeze', label: '微风岛屿' },
  { value: 'fracture', label: '裂变峡谷' },
  { value: 'pearl', label: '深海明珠' },
  { value: 'lotus', label: '莲华古城' },
  { value: 'sunset', label: '日落之城' },
  { value: 'abyss', label: '幽邃地窟' },
]

/* ---- 阵营 ---- */
export const sideOptions: LabelOption[] = [
  { value: 'attack', label: '进攻方' },
  { value: 'defense', label: '防守方' },
]

/* ---- 点位 ---- */
export const siteOptions: LabelOption[] = [
  { value: 'a', label: 'A 点' },
  { value: 'b', label: 'B 点' },
  { value: 'c', label: 'C 点' },
  { value: 'mid', label: '中路' },
]

/* ---- 投掷方式 ---- */
export const throwOptions: LabelOption[] = [
  { value: 'direct', label: '直接投掷' },
  { value: 'jump_throw', label: '跳投' },
  { value: 'walk_throw', label: '走投' },
  { value: 'crouch_throw', label: '蹲投' },
  { value: 'left_click', label: '左键投掷' },
  { value: 'right_click', label: '右键投掷' },
]

/* ---- 来源：小程序只暴露手动链路，保留 ai_auto 标签只用于兼容旧数据展示 ---- */
export const sourceOptions: LabelOption[] = [
  { value: 'user_upload', label: '手动传图' },
  { value: 'user_video', label: '手动标帧' },
  { value: 'user_corrected', label: '手动矫正' },
]

const legacySourceOptions: LabelOption[] = [
  { value: 'ai_auto', label: '旧智能解析' },
]

/* ---- 排序 ---- */
export const sortOptions: LabelOption[] = [
  { value: 'latest', label: '最新' },
  { value: 'popular', label: '最热' },
]

/* ---- 英雄（29位） ---- */
export const agentOptions: LabelOption[] = [
  { value: 'sova', label: '猎枭' },
  { value: 'viper', label: '蝰蛇' },
  { value: 'brimstone', label: '炼狱' },
  { value: 'killjoy', label: '奇乐' },
  { value: 'cypher', label: '零' },
  { value: 'sage', label: '贤者' },
  { value: 'phoenix', label: '不死鸟' },
  { value: 'jett', label: '捷风' },
  { value: 'omen', label: '幽影' },
  { value: 'raze', label: '雷兹' },
  { value: 'breach', label: '铁臂' },
  { value: 'reyna', label: '芮娜' },
  { value: 'skye', label: '斯凯' },
  { value: 'yoru', label: '夜露' },
  { value: 'astra', label: '星礈' },
  { value: 'kayo', label: 'K/O' },
  { value: 'chamber', label: '尚勃勒' },
  { value: 'neon', label: '霓虹' },
  { value: 'fade', label: '黑梦' },
  { value: 'harbor', label: '海神' },
  { value: 'gekko', label: '盖可' },
  { value: 'deadlock', label: '钢锁' },
  { value: 'iso', label: '壹决' },
  { value: 'clove', label: '暮蝶' },
  { value: 'vyse', label: '维斯' },
  { value: 'tejo', label: '钛狐' },
  { value: 'waylay', label: '幻棱' },
  { value: 'veto', label: '禁灭' },
  { value: 'miks', label: '迷核' },
]

/* ---- 技能（按英雄） ---- */
export const agentAbilityMap: Record<string, LabelOption[]> = {
  sova: [
    { value: 'owl_drone', label: '枭型无人机' },
    { value: 'shock_dart', label: '雷击箭' },
    { value: 'recon_dart', label: '寻敌箭' },
    { value: 'hunters_fury', label: '猎人怒焰' },
  ],
  viper: [
    { value: 'snake_bite', label: '蛇吻' },
    { value: 'poison_cloud', label: '瘴云' },
    { value: 'toxic_screen', label: '毒幕' },
    { value: 'vipers_pit', label: '蝰腹' },
  ],
  brimstone: [
    { value: 'stim_beacon', label: '激励信标' },
    { value: 'incendiary', label: '燃烧弹' },
    { value: 'sky_smoke', label: '空投烟幕' },
    { value: 'orbital_strike', label: '天基光束' },
  ],
  killjoy: [
    { value: 'alarmbot', label: '警戒机器人' },
    { value: 'nanoswarm', label: '纳米蜂群' },
    { value: 'turret', label: '炮台' },
    { value: 'lockdown', label: '全面封锁' },
  ],
  cypher: [
    { value: 'trapwire', label: '绊线' },
    { value: 'cyber_cage', label: '赛博囚笼' },
    { value: 'spycam', label: '战术监控' },
    { value: 'neural_theft', label: '神经取析' },
  ],
  sage: [
    { value: 'barrier_orb', label: '屏障法球' },
    { value: 'slow_orb', label: '迟缓法球' },
    { value: 'healing_orb', label: '治疗法球' },
    { value: 'resurrection', label: '再起' },
  ],
  phoenix: [
    { value: 'blaze', label: '烈焰之墙' },
    { value: 'curveball', label: '闪光曲球' },
    { value: 'hot_hands', label: '火冒三丈' },
    { value: 'run_it_back', label: '再来一局' },
  ],
  jett: [
    { value: 'cloudburst', label: '浮空烟雾' },
    { value: 'updraft', label: '凌空' },
    { value: 'tailwind', label: '逐风' },
    { value: 'blade_storm', label: '利刃风暴' },
  ],
  omen: [
    { value: 'shrouded_step', label: '暗影步' },
    { value: 'paranoia', label: '闪现梦魇' },
    { value: 'dark_cover', label: '黑瘴' },
    { value: 'from_the_shadows', label: '离魂' },
  ],
  raze: [
    { value: 'boom_bot', label: '爆破机器人' },
    { value: 'blast_pack', label: '惊喜翻腾' },
    { value: 'paint_shells', label: '彩雷飞溅' },
    { value: 'showstopper', label: '晚安焰火' },
  ],
  breach: [
    { value: 'aftershock', label: '余震' },
    { value: 'flashpoint', label: '闪点爆破' },
    { value: 'fault_line', label: '裂地冲击' },
    { value: 'rolling_thunder', label: '惊雷卷地' },
  ],
  reyna: [
    { value: 'leer', label: '睥睨' },
    { value: 'devour', label: '汲取' },
    { value: 'dismiss', label: '逐散' },
    { value: 'empress', label: '女皇指令' },
  ],
  skye: [
    { value: 'regrowth', label: '愈生之息' },
    { value: 'trailblazer', label: '辟林之虎' },
    { value: 'guiding_light', label: '引路之隼' },
    { value: 'seekers', label: '追猎之灵' },
  ],
  yoru: [
    { value: 'fakeout', label: '佯攻' },
    { value: 'blindside', label: '攻其不备' },
    { value: 'gatecrash', label: '不请自来' },
    { value: 'dimensional_drift', label: '空间转移' },
  ],
  astra: [
    { value: 'gravity_well', label: '重力陷阱' },
    { value: 'nova_pulse', label: '新星脉冲' },
    { value: 'nebula', label: '星云' },
    { value: 'cosmic_divide', label: '星界鸿沟' },
  ],
  kayo: [
    { value: 'fragment', label: '碎片溢出' },
    { value: 'flashdrive', label: '闪存过载' },
    { value: 'zeropoint', label: '零点嗅探' },
    { value: 'nullcmd', label: '无效命令' },
  ],
  chamber: [
    { value: 'trademark', label: '贵宾限行' },
    { value: 'headhunter', label: '猎头' },
    { value: 'rendezvous', label: '传送定点' },
    { value: 'tour_de_force', label: '孤高火力' },
  ],
  neon: [
    { value: 'fast_lane', label: '高速通道' },
    { value: 'relay_bolt', label: '闪电弹球' },
    { value: 'high_gear', label: '充能疾驰' },
    { value: 'overdrive', label: '超限暴走' },
  ],
  fade: [
    { value: 'prowler', label: '诡眼' },
    { value: 'seize', label: '黯兽' },
    { value: 'haunt', label: '幽爪' },
    { value: 'nightfall', label: '夜临' },
  ],
  harbor: [
    { value: 'cascade', label: '激流' },
    { value: 'cove', label: '水湾' },
    { value: 'high_tide', label: '巨浪' },
    { value: 'reckoning', label: '清算' },
  ],
  gekko: [
    { value: 'mosh_pit', label: '无敌超鲨' },
    { value: 'wingman', label: '嗨宝' },
    { value: 'dizzy', label: '丢丢' },
    { value: 'thrash', label: '鲨鲨' },
  ],
  deadlock: [
    { value: 'gravnet', label: '重力捕网' },
    { value: 'sonic_sensor', label: '声感陷阱' },
    { value: 'barrier_mesh', label: '阻域屏障' },
    { value: 'annihilation', label: '全面扑灭' },
  ],
  iso: [
    { value: 'undercut', label: '弱点打击' },
    { value: 'double_tap', label: '双重火力' },
    { value: 'contingency', label: '应急护盾' },
    { value: 'kill_contract', label: '一决高下' },
  ],
  clove: [
    { value: 'pick_me_up', label: '活力激发' },
    { value: 'meddle', label: '干涉' },
    { value: 'ruse', label: '诡计烟幕' },
    { value: 'not_dead_yet', label: '死而未僵' },
  ],
  vyse: [
    { value: 'shear', label: '剪切' },
    { value: 'razorvine', label: '剃刀藤蔓' },
    { value: 'arc_rose', label: '弧光玫瑰' },
    { value: 'steel_garden', label: '钢铁花园' },
  ],
  tejo: [
    { value: 'guided_salvo', label: '精准投放' },
    { value: 'special_delivery', label: '特快专递' },
    { value: 'armageddon', label: '末日审判' },
    { value: 'stealth_drone', label: '潜袭爬虫' },
  ],
  waylay: [
    { value: 'refract', label: '溯流回光' },
    { value: 'saturate', label: '光棱闪爆' },
    { value: 'lightspeed', label: '光速飞跃' },
    { value: 'convergent_paths', label: '时光修罗场' },
  ],
  veto: [
    { value: 'interceptor', label: '噬源体' },
    { value: 'crosscut', label: '涡流折跃' },
    { value: 'evolution', label: '完全进化' },
    { value: 'chokehold', label: '裂变残片' },
  ],
  miks: [
    { value: 'm_pulse', label: '电音脉冲' },
    { value: 'waveform', label: '声波帷幕' },
    { value: 'harmonize', label: '共振谐律' },
    { value: 'bassquake', label: '音脉强袭' },
  ],
}

const legacyAbilityOptions: LabelOption[] = [
  { value: 'smoke', label: '烟雾' },
  { value: 'molly', label: '燃烧弹' },
  { value: 'flash', label: '闪光' },
  { value: 'grenade', label: '手雷' },
]

export const abilityOptions: LabelOption[] = [
  ...Object.values(agentAbilityMap).flat(),
  ...legacyAbilityOptions,
]

/* ---- 快速查找 ---- */
const mapLabel = _byValue(mapOptions)
const agentLabel = _byValue(agentOptions)
const abilityLabel = _byValue(abilityOptions)
const throwLabel = _byValue(throwOptions)
const sideLabel = _byValue(sideOptions)
const siteLabel = _byValue(siteOptions)
const sourceLabel = _byValue([...sourceOptions, ...legacySourceOptions])

function _byValue(opts: LabelOption[]): Record<string, string> {
  return Object.fromEntries(opts.map((o) => [o.value, o.label]))
}

export function getMapLabel(v: string) { return mapLabel[v] ?? v }
export function getAgentLabel(v: string) { return agentLabel[v.toLowerCase()] ?? v }
export function getAbilityLabel(v: string) { return abilityLabel[v.toLowerCase()] ?? '未知技能' }
export function getThrowLabel(v: string) { return throwLabel[v] ?? v.split('_').join(' ') }
export function getSideLabel(v: string) { return sideLabel[v] ?? v }
export function getSiteLabel(v: string) { return siteLabel[v] ?? v.toUpperCase() }
export function getSourceLabel(v: string) { return sourceLabel[v] ?? '未知来源' }
