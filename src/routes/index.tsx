import { createFileRoute } from "@tanstack/react-router";
import { ReFrameApp } from "@/components/reframe/ReFrameApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReFrame AI · 面向不同受众的短视频叙事重构" },
      { name: "description", content: "同一组素材，面向不同受众讲出不同的故事。锁定重要镜头，仅重新生成其余部分。" },
      { property: "og:title", content: "ReFrame AI · 短视频叙事重构工作台" },
      { property: "og:description", content: "同一组素材，面向不同受众讲出不同的故事。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReFrameApp,
});
