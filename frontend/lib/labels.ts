export type LabelOption = { value: string; label: string; iconSrc?: string };

const VALORANT_ASSET_BASE = "/assets/valorant";
const agentIcon = (agent: string) => `${VALORANT_ASSET_BASE}/agents/${agent}.png`;
const abilityIcon = (agent: string, ability: string) => `${VALORANT_ASSET_BASE}/abilities/${agent}/${ability}.png`;

export const mapOptions = [
  { value: "ascent", label: "亚海悬城" },
  { value: "bind", label: "源工重镇" },
  { value: "haven", label: "隐世修所" },
  { value: "split", label: "霓虹町" },
  { value: "icebox", label: "森寒冬港" },
  { value: "breeze", label: "微风岛屿" },
  { value: "fracture", label: "裂变峡谷" },
  { value: "pearl", label: "深海明珠" },
  { value: "lotus", label: "莲华古城" },
  { value: "sunset", label: "日落之城" },
  { value: "abyss", label: "幽邃地窟" }
];

export const sideOptions = [
  { value: "attack", label: "进攻方" },
  { value: "defense", label: "防守方" }
];

export const siteOptions = [
  { value: "a", label: "A 点" },
  { value: "b", label: "B 点" },
  { value: "c", label: "C 点" },
  { value: "mid", label: "中路" }
];

export const throwOptions = [
  { value: "direct", label: "直接投掷" },
  { value: "jump_throw", label: "跳投" },
  { value: "walk_throw", label: "走投" },
  { value: "crouch_throw", label: "蹲投" },
  { value: "left_click", label: "左键投掷" },
  { value: "right_click", label: "右键投掷" }
];

export const sourceOptions = [
  { value: "", label: "全部来源" },
  { value: "ai_auto", label: "智能解析" },
  { value: "user_upload", label: "玩家上传" },
  { value: "user_video", label: "视频标帧" },
  { value: "user_corrected", label: "玩家矫正" }
];

export const agentOptions: LabelOption[] = [
  { value: "sova", label: "猎枭", iconSrc: agentIcon("sova") },
  { value: "viper", label: "蝰蛇", iconSrc: agentIcon("viper") },
  { value: "brimstone", label: "炼狱", iconSrc: agentIcon("brimstone") },
  { value: "killjoy", label: "奇乐", iconSrc: agentIcon("killjoy") },
  { value: "cypher", label: "零", iconSrc: agentIcon("cypher") },
  { value: "sage", label: "贤者", iconSrc: agentIcon("sage") },
  { value: "phoenix", label: "不死鸟", iconSrc: agentIcon("phoenix") },
  { value: "jett", label: "捷风", iconSrc: agentIcon("jett") },
  { value: "omen", label: "幽影", iconSrc: agentIcon("omen") },
  { value: "raze", label: "雷兹", iconSrc: agentIcon("raze") },
  { value: "breach", label: "铁臂", iconSrc: agentIcon("breach") },
  { value: "reyna", label: "芮娜", iconSrc: agentIcon("reyna") },
  { value: "skye", label: "斯凯", iconSrc: agentIcon("skye") },
  { value: "yoru", label: "夜露", iconSrc: agentIcon("yoru") },
  { value: "astra", label: "星礈", iconSrc: agentIcon("astra") },
  { value: "kayo", label: "K/O", iconSrc: agentIcon("kayo") },
  { value: "chamber", label: "尚勃勒", iconSrc: agentIcon("chamber") },
  { value: "neon", label: "霓虹", iconSrc: agentIcon("neon") },
  { value: "fade", label: "黑梦", iconSrc: agentIcon("fade") },
  { value: "harbor", label: "海神", iconSrc: agentIcon("harbor") },
  { value: "gekko", label: "盖可", iconSrc: agentIcon("gekko") },
  { value: "deadlock", label: "钢锁", iconSrc: agentIcon("deadlock") },
  { value: "iso", label: "壹决", iconSrc: agentIcon("iso") },
  { value: "clove", label: "暮蝶", iconSrc: agentIcon("clove") },
  { value: "vyse", label: "维斯", iconSrc: agentIcon("vyse") },
  { value: "tejo", label: "钛狐", iconSrc: agentIcon("tejo") },
  { value: "waylay", label: "幻棱", iconSrc: agentIcon("waylay") },
  { value: "veto", label: "禁灭", iconSrc: agentIcon("veto") },
  { value: "miks", label: "迷核", iconSrc: agentIcon("miks") }
];

export const agentAbilityOptions: Record<string, LabelOption[]> = {
  sova: [
    { value: "owl_drone", label: "枭型无人机", iconSrc: abilityIcon("sova", "owl_drone") },
    { value: "shock_dart", label: "雷击箭", iconSrc: abilityIcon("sova", "shock_dart") },
    { value: "recon_dart", label: "寻敌箭", iconSrc: abilityIcon("sova", "recon_dart") },
    { value: "hunters_fury", label: "猎人怒焰", iconSrc: abilityIcon("sova", "hunters_fury") }
  ],
  viper: [
    { value: "snake_bite", label: "蛇吻", iconSrc: abilityIcon("viper", "snake_bite") },
    { value: "poison_cloud", label: "瘴云", iconSrc: abilityIcon("viper", "poison_cloud") },
    { value: "toxic_screen", label: "毒幕", iconSrc: abilityIcon("viper", "toxic_screen") },
    { value: "vipers_pit", label: "蝰腹", iconSrc: abilityIcon("viper", "vipers_pit") }
  ],
  brimstone: [
    { value: "stim_beacon", label: "激励信标", iconSrc: abilityIcon("brimstone", "stim_beacon") },
    { value: "incendiary", label: "燃烧弹", iconSrc: abilityIcon("brimstone", "incendiary") },
    { value: "sky_smoke", label: "空投烟幕", iconSrc: abilityIcon("brimstone", "sky_smoke") },
    { value: "orbital_strike", label: "天基光束", iconSrc: abilityIcon("brimstone", "orbital_strike") }
  ],
  killjoy: [
    { value: "alarmbot", label: "警戒机器人", iconSrc: abilityIcon("killjoy", "alarmbot") },
    { value: "nanoswarm", label: "纳米蜂群", iconSrc: abilityIcon("killjoy", "nanoswarm") },
    { value: "turret", label: "炮台", iconSrc: abilityIcon("killjoy", "turret") },
    { value: "lockdown", label: "全面封锁", iconSrc: abilityIcon("killjoy", "lockdown") }
  ],
  cypher: [
    { value: "trapwire", label: "绊线", iconSrc: abilityIcon("cypher", "trapwire") },
    { value: "cyber_cage", label: "赛博囚笼", iconSrc: abilityIcon("cypher", "cyber_cage") },
    { value: "spycam", label: "战术监控", iconSrc: abilityIcon("cypher", "spycam") },
    { value: "neural_theft", label: "神经取析", iconSrc: abilityIcon("cypher", "neural_theft") }
  ],
  sage: [
    { value: "barrier_orb", label: "屏障法球", iconSrc: abilityIcon("sage", "barrier_orb") },
    { value: "slow_orb", label: "迟缓法球", iconSrc: abilityIcon("sage", "slow_orb") },
    { value: "healing_orb", label: "治疗法球", iconSrc: abilityIcon("sage", "healing_orb") },
    { value: "resurrection", label: "再起", iconSrc: abilityIcon("sage", "resurrection") }
  ],
  phoenix: [
    { value: "blaze", label: "烈焰之墙", iconSrc: abilityIcon("phoenix", "blaze") },
    { value: "curveball", label: "闪光曲球", iconSrc: abilityIcon("phoenix", "curveball") },
    { value: "hot_hands", label: "火冒三丈", iconSrc: abilityIcon("phoenix", "hot_hands") },
    { value: "run_it_back", label: "再来一局", iconSrc: abilityIcon("phoenix", "run_it_back") }
  ],
  jett: [
    { value: "cloudburst", label: "浮空烟雾", iconSrc: abilityIcon("jett", "cloudburst") },
    { value: "updraft", label: "凌空", iconSrc: abilityIcon("jett", "updraft") },
    { value: "tailwind", label: "逐风", iconSrc: abilityIcon("jett", "tailwind") },
    { value: "blade_storm", label: "利刃风暴", iconSrc: abilityIcon("jett", "blade_storm") }
  ],
  omen: [
    { value: "shrouded_step", label: "暗影步", iconSrc: abilityIcon("omen", "shrouded_step") },
    { value: "paranoia", label: "闪现梦魇", iconSrc: abilityIcon("omen", "paranoia") },
    { value: "dark_cover", label: "黑瘴", iconSrc: abilityIcon("omen", "dark_cover") },
    { value: "from_the_shadows", label: "离魂", iconSrc: abilityIcon("omen", "from_the_shadows") }
  ],
  raze: [
    { value: "boom_bot", label: "爆破机器人", iconSrc: abilityIcon("raze", "boom_bot") },
    { value: "blast_pack", label: "惊喜翻腾", iconSrc: abilityIcon("raze", "blast_pack") },
    { value: "paint_shells", label: "彩雷飞溅", iconSrc: abilityIcon("raze", "paint_shells") },
    { value: "showstopper", label: "晚安焰火", iconSrc: abilityIcon("raze", "showstopper") }
  ],
  breach: [
    { value: "aftershock", label: "余震", iconSrc: abilityIcon("breach", "aftershock") },
    { value: "flashpoint", label: "闪点爆破", iconSrc: abilityIcon("breach", "flashpoint") },
    { value: "fault_line", label: "裂地冲击", iconSrc: abilityIcon("breach", "fault_line") },
    { value: "rolling_thunder", label: "惊雷卷地", iconSrc: abilityIcon("breach", "rolling_thunder") }
  ],
  reyna: [
    { value: "leer", label: "睥睨", iconSrc: abilityIcon("reyna", "leer") },
    { value: "devour", label: "汲取", iconSrc: abilityIcon("reyna", "devour") },
    { value: "dismiss", label: "逐散", iconSrc: abilityIcon("reyna", "dismiss") },
    { value: "empress", label: "女皇指令", iconSrc: abilityIcon("reyna", "empress") }
  ],
  skye: [
    { value: "regrowth", label: "愈生之息", iconSrc: abilityIcon("skye", "regrowth") },
    { value: "trailblazer", label: "辟林之虎", iconSrc: abilityIcon("skye", "trailblazer") },
    { value: "guiding_light", label: "引路之隼", iconSrc: abilityIcon("skye", "guiding_light") },
    { value: "seekers", label: "追猎之灵", iconSrc: abilityIcon("skye", "seekers") }
  ],
  yoru: [
    { value: "fakeout", label: "佯攻", iconSrc: abilityIcon("yoru", "fakeout") },
    { value: "blindside", label: "攻其不备", iconSrc: abilityIcon("yoru", "blindside") },
    { value: "gatecrash", label: "不请自来", iconSrc: abilityIcon("yoru", "gatecrash") },
    { value: "dimensional_drift", label: "空间转移", iconSrc: abilityIcon("yoru", "dimensional_drift") }
  ],
  astra: [
    { value: "gravity_well", label: "重力陷阱", iconSrc: abilityIcon("astra", "gravity_well") },
    { value: "nova_pulse", label: "新星脉冲", iconSrc: abilityIcon("astra", "nova_pulse") },
    { value: "nebula", label: "星云", iconSrc: abilityIcon("astra", "nebula") },
    { value: "cosmic_divide", label: "星界鸿沟", iconSrc: abilityIcon("astra", "cosmic_divide") }
  ],
  kayo: [
    { value: "fragment", label: "碎片溢出", iconSrc: abilityIcon("kayo", "fragment") },
    { value: "flashdrive", label: "闪存过载", iconSrc: abilityIcon("kayo", "flashdrive") },
    { value: "zeropoint", label: "零点嗅探", iconSrc: abilityIcon("kayo", "zeropoint") },
    { value: "nullcmd", label: "无效命令", iconSrc: abilityIcon("kayo", "nullcmd") }
  ],
  chamber: [
    { value: "trademark", label: "贵宾限行", iconSrc: abilityIcon("chamber", "trademark") },
    { value: "headhunter", label: "猎头", iconSrc: abilityIcon("chamber", "headhunter") },
    { value: "rendezvous", label: "传送定点", iconSrc: abilityIcon("chamber", "rendezvous") },
    { value: "tour_de_force", label: "孤高火力", iconSrc: abilityIcon("chamber", "tour_de_force") }
  ],
  neon: [
    { value: "fast_lane", label: "高速通道", iconSrc: abilityIcon("neon", "fast_lane") },
    { value: "relay_bolt", label: "闪电弹球", iconSrc: abilityIcon("neon", "relay_bolt") },
    { value: "high_gear", label: "充能疾驰", iconSrc: abilityIcon("neon", "high_gear") },
    { value: "overdrive", label: "超限暴走", iconSrc: abilityIcon("neon", "overdrive") }
  ],
  fade: [
    { value: "prowler", label: "诡眼", iconSrc: abilityIcon("fade", "prowler") },
    { value: "seize", label: "黯兽", iconSrc: abilityIcon("fade", "seize") },
    { value: "haunt", label: "幽爪", iconSrc: abilityIcon("fade", "haunt") },
    { value: "nightfall", label: "夜临", iconSrc: abilityIcon("fade", "nightfall") }
  ],
  harbor: [
    { value: "cascade", label: "激流", iconSrc: abilityIcon("harbor", "cascade") },
    { value: "cove", label: "水湾", iconSrc: abilityIcon("harbor", "cove") },
    { value: "high_tide", label: "巨浪", iconSrc: abilityIcon("harbor", "high_tide") },
    { value: "reckoning", label: "清算", iconSrc: abilityIcon("harbor", "reckoning") }
  ],
  gekko: [
    { value: "mosh_pit", label: "无敌超鲨", iconSrc: abilityIcon("gekko", "mosh_pit") },
    { value: "wingman", label: "嗨宝", iconSrc: abilityIcon("gekko", "wingman") },
    { value: "dizzy", label: "丢丢", iconSrc: abilityIcon("gekko", "dizzy") },
    { value: "thrash", label: "鲨鲨", iconSrc: abilityIcon("gekko", "thrash") }
  ],
  deadlock: [
    { value: "gravnet", label: "重力捕网", iconSrc: abilityIcon("deadlock", "gravnet") },
    { value: "sonic_sensor", label: "声感陷阱", iconSrc: abilityIcon("deadlock", "sonic_sensor") },
    { value: "barrier_mesh", label: "阻域屏障", iconSrc: abilityIcon("deadlock", "barrier_mesh") },
    { value: "annihilation", label: "全面扑灭", iconSrc: abilityIcon("deadlock", "annihilation") }
  ],
  iso: [
    { value: "undercut", label: "弱点打击", iconSrc: abilityIcon("iso", "undercut") },
    { value: "double_tap", label: "双重火力", iconSrc: abilityIcon("iso", "double_tap") },
    { value: "contingency", label: "应急护盾", iconSrc: abilityIcon("iso", "contingency") },
    { value: "kill_contract", label: "一决高下", iconSrc: abilityIcon("iso", "kill_contract") }
  ],
  clove: [
    { value: "pick_me_up", label: "活力激发", iconSrc: abilityIcon("clove", "pick_me_up") },
    { value: "meddle", label: "干涉", iconSrc: abilityIcon("clove", "meddle") },
    { value: "ruse", label: "诡计烟幕", iconSrc: abilityIcon("clove", "ruse") },
    { value: "not_dead_yet", label: "死而未僵", iconSrc: abilityIcon("clove", "not_dead_yet") }
  ],
  vyse: [
    { value: "shear", label: "剪切", iconSrc: abilityIcon("vyse", "shear") },
    { value: "razorvine", label: "剃刀藤蔓", iconSrc: abilityIcon("vyse", "razorvine") },
    { value: "arc_rose", label: "弧光玫瑰", iconSrc: abilityIcon("vyse", "arc_rose") },
    { value: "steel_garden", label: "钢铁花园", iconSrc: abilityIcon("vyse", "steel_garden") }
  ],
  tejo: [
    { value: "guided_salvo", label: "精准投放", iconSrc: abilityIcon("tejo", "guided_salvo") },
    { value: "special_delivery", label: "特快专递", iconSrc: abilityIcon("tejo", "special_delivery") },
    { value: "armageddon", label: "末日审判", iconSrc: abilityIcon("tejo", "armageddon") },
    { value: "stealth_drone", label: "潜袭爬虫", iconSrc: abilityIcon("tejo", "stealth_drone") }
  ],
  waylay: [
    { value: "refract", label: "溯流回光", iconSrc: abilityIcon("waylay", "refract") },
    { value: "saturate", label: "光棱闪爆", iconSrc: abilityIcon("waylay", "saturate") },
    { value: "lightspeed", label: "光速飞跃", iconSrc: abilityIcon("waylay", "lightspeed") },
    { value: "convergent_paths", label: "时光修罗场", iconSrc: abilityIcon("waylay", "convergent_paths") }
  ],
  veto: [
    { value: "interceptor", label: "噬源体", iconSrc: abilityIcon("veto", "interceptor") },
    { value: "crosscut", label: "涡流折跃", iconSrc: abilityIcon("veto", "crosscut") },
    { value: "evolution", label: "完全进化", iconSrc: abilityIcon("veto", "evolution") },
    { value: "chokehold", label: "裂变残片", iconSrc: abilityIcon("veto", "chokehold") }
  ],
  miks: [
    { value: "m_pulse", label: "电音脉冲", iconSrc: abilityIcon("miks", "m_pulse") },
    { value: "waveform", label: "声波帷幕", iconSrc: abilityIcon("miks", "waveform") },
    { value: "harmonize", label: "共振谐律", iconSrc: abilityIcon("miks", "harmonize") },
    { value: "bassquake", label: "音脉强袭", iconSrc: abilityIcon("miks", "bassquake") }
  ]
};

const legacyAbilityOptions: LabelOption[] = [
  { value: "smoke", label: "烟雾" },
  { value: "molly", label: "燃烧弹" },
  { value: "flash", label: "闪光" },
  { value: "grenade", label: "手雷" }
];

export const abilityOptions = [...Object.values(agentAbilityOptions).flat(), ...legacyAbilityOptions];

const agentLabels = Object.fromEntries(agentOptions.map((item) => [item.value, item.label]));
const abilityLabels = Object.fromEntries(abilityOptions.map((item) => [item.value, item.label]));

function findLabel(options: LabelOption[], value: string) {
  return options.find((item) => item.value === value)?.label;
}

export function getMapLabel(value: string) {
  return findLabel(mapOptions, value) ?? value;
}

export function getSideLabel(value: string) {
  return findLabel(sideOptions, value) ?? value;
}

export function getSiteLabel(value: string) {
  return findLabel(siteOptions, value) ?? value;
}

export function getThrowLabel(value: string) {
  return findLabel(throwOptions, value) ?? value.replaceAll("_", " ");
}

export function getSourceLabel(value: string) {
  return findLabel(sourceOptions, value) ?? "未知来源";
}

export function getAgentLabel(value: string) {
  return agentLabels[value.toLowerCase()] ?? value;
}

export function getAbilityLabel(value: string) {
  return abilityLabels[value.toLowerCase()] ?? "未知技能";
}
