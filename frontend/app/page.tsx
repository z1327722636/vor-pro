import { ArrowUpRight, Crosshair, Database, GitCompareArrows, Route } from "lucide-react";
import Link from "next/link";
import { HomeTacticalVisual } from "@/components/home-tactical-visual";
import styles from "./home.module.css";

const features = [
  {
    index: "01 / CAPTURE",
    icon: Database,
    title: "把每一个关键帧变成知识",
    description: "上传截图或截取视频画面，快速沉淀站位、准星与落点信息。"
  },
  {
    index: "02 / CALIBRATE",
    icon: Crosshair,
    title: "像素级还原投掷路线",
    description: "通过地图标注和多帧校准，把模糊经验转成可复现的战术步骤。"
  },
  {
    index: "03 / EVOLVE",
    icon: GitCompareArrows,
    title: "由玩家共同验证与进化",
    description: "搜索、收藏、纠错，让高质量 Lineup 在真实对局中持续迭代。"
  }
];

const tickerContent = (
  <>
    <span>TACTICAL LINEUP DATABASE</span><b>◆</b>
    <span>FRAME EXTRACTION ACTIVE</span><b>◆</b>
    <span>COMMUNITY VERIFIED</span><b>◆</b>
    <span>PRECISION OVER GUESSWORK</span><b>◆</b>
  </>
);

export default function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.redSlash} aria-hidden="true" />
        <div className={styles.heroGrid}>
          <div className={styles.content}>
            <p className={styles.eyebrow}>Lineup intelligence system</p>
            <h1 className={styles.title}>
              让每一颗<br />
              <span className={styles.titleLine}>
                <span className={styles.titleAccent}>技能</span> 精准落点
              </span>
            </h1>
            <p className={styles.description}>
              面向无畏契约玩家的战术点位知识库。记录站位、准星与轨迹，
              把临场猜测变成可重复执行的致胜方案。
            </p>

            <div className={styles.actions}>
              <Link href="/lineups" className={styles.primaryAction}>
                开始探索
                <ArrowUpRight className={styles.actionIcon} size={17} strokeWidth={2.5} />
              </Link>
              <Link href="/contribute/upload" className={styles.secondaryAction}>
                创建 Lineup
                <Route className={styles.actionIcon} size={17} strokeWidth={2.2} />
              </Link>
            </div>

            <div className={styles.metrics} aria-label="平台能力">
              <div className={styles.metric}>
                <strong>FRAME / VIDEO</strong>
                <span>双模式采集</span>
              </div>
              <div className={styles.metric}>
                <strong>MAP / SKILL</strong>
                <span>精准筛选</span>
              </div>
              <div className={styles.metric}>
                <strong>OPEN / VERIFY</strong>
                <span>社区校准</span>
              </div>
            </div>
          </div>

          <div className={styles.visualWrap}>
            <HomeTacticalVisual />
          </div>
        </div>

        <div className={styles.ticker} aria-hidden="true">
          <div className={styles.tickerTrack}>
            {tickerContent}
            {tickerContent}
          </div>
        </div>
      </section>

      <section className={styles.features} aria-labelledby="feature-heading">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionKicker}>From clip to clutch</p>
            <h2 id="feature-heading" className={styles.sectionTitle}>从灵感到实战，只差三步</h2>
          </div>
          <p className={styles.sectionDescription}>
            不堆砌攻略，只保留可以复现的信息。每条 Lineup 都围绕站位、瞄点和落点建立。
          </p>
        </div>

        <div className={styles.featureGrid}>
          {features.map(({ index, icon: Icon, title, description }) => (
            <article key={index} className={styles.featureCard}>
              <span className={styles.featureIndex}>{index}</span>
              <Icon className={styles.featureIcon} size={28} strokeWidth={1.8} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
