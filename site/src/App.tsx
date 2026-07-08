import Nav from './components/Nav';
import Hero from './components/Hero';
import EarlyAccess from './components/EarlyAccess';
import FileConvergence from './components/FileConvergence';
import ThreePlatforms from './components/ThreePlatforms';
import FlowTimeline from './components/FlowTimeline';
import FeatureGrid from './components/FeatureGrid';
import TrustBadges from './components/TrustBadges';
import Footer from './components/Footer';

/**
 * 墨览官网落地页 —— 区块组装。
 * 顺序：Hero → 预约（主转化） → 文件汇聚 → 三端 → 流程 → 能力 → 信任 → FAQ/Footer
 */
export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <EarlyAccess />
        <FileConvergence />
        <ThreePlatforms />
        <FlowTimeline />
        <FeatureGrid />
        <TrustBadges />
      </main>
      <Footer />
    </>
  );
}
