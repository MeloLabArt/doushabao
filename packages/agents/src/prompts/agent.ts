export const AGENT_ANALYSIS_JSON_SCHEMA = `{
  "imageType": "landscape | portrait_with_people | pure_portrait",
  "imageTypeReason": "判断依据，简要说明为何归类为该类型",
  "deficiencies": [
    {
      "category": "color | clarity | composition | portrait_detail | lighting | other",
      "description": "具体不足描述",
      "severity": "low | medium | high"
    }
  ],
  "summary": "对图片整体质量与主要问题的简要总结",
  "editPrompt": "给修图模型的具体修改指令：先声明在原图底片上局部调整禁止重绘且输出宽高像素与原图完全一致，再写保留项，最后至多1项轻微摄影后期调整，结尾重申尺寸不得改变，中文"
}`;
