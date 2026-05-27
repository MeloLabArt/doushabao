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
  "editPrompt": "给修图模型的具体修改指令，清晰、可执行，中文"
}`;
