export const AGENT_ANALYSIS_JSON_SCHEMA = `{
  "imageType": "landscape | portrait_with_people | pure_portrait",
  "imageTypeReason": "Brief rationale for the chosen image type",
  "deficiencies": [
    {
      "category": "color | clarity | composition | portrait_detail | lighting | other",
      "description": "Specific deficiency description",
      "severity": "low | medium | high"
    }
  ],
  "summary": "Brief overall quality summary and main issues",
  "editPrompt": "Concrete edit instructions for the edit model: first declare local edit on original plate with no redraw and identical output pixel dimensions, then preservation list, then at most one mild photo-post adjustment, end by restating dimensions must not change—in English"
}`;
